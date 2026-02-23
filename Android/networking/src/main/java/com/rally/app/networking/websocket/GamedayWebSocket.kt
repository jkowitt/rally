package com.rally.app.networking.websocket

import com.rally.app.networking.api.ApiClient
import com.rally.app.networking.api.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import timber.log.Timber
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min
import kotlin.random.Random

/**
 * Manages a persistent OkHttp WebSocket connection for real-time gameday events.
 *
 * Features:
 * - Automatic reconnection with exponential back-off and jitter.
 * - 30-second heartbeat ping to keep the connection alive through proxies and NATs.
 * - Observable [connectionState] and incoming [messages] flows for consumers.
 * - Clean lifecycle management via [connect] and [disconnect].
 */
@Singleton
class GamedayWebSocket @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val tokenManager: TokenManager,
) {
    companion object {
        private const val TAG = "GamedayWebSocket"
        private const val WS_BASE_URL = "wss://ws.rally.app/v1/gameday"
        private const val HEARTBEAT_INTERVAL_MS = 30_000L
        private const val INITIAL_RECONNECT_DELAY_MS = 1_000L
        private const val MAX_RECONNECT_DELAY_MS = 30_000L
        private const val RECONNECT_BACKOFF_MULTIPLIER = 2.0
        private const val JITTER_FACTOR = 0.3
        private const val NORMAL_CLOSURE_CODE = 1000
    }

    /** Represents the current WebSocket connection state. */
    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        RECONNECTING,
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    /** Observable connection state. */
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _messages = MutableSharedFlow<String>(
        replay = 0,
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    /** Stream of incoming WebSocket text messages. */
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private var webSocket: WebSocket? = null
    private var heartbeatJob: Job? = null
    private var reconnectJob: Job? = null
    private var consecutiveFailures = 0
    private var intentionalDisconnect = false

    /** The event ID for the current gameday session. */
    private var currentEventId: String? = null

    /**
     * Opens a WebSocket connection for the given [eventId].
     *
     * If a connection is already open for a different event, the existing
     * connection is closed first.
     */
    fun connect(eventId: String) {
        if (currentEventId == eventId && _connectionState.value == ConnectionState.CONNECTED) {
            Timber.tag(TAG).d("Already connected to event %s", eventId)
            return
        }

        // Tear down any existing connection before opening a new one.
        disconnectInternal()

        currentEventId = eventId
        intentionalDisconnect = false
        consecutiveFailures = 0
        openConnection(eventId)
    }

    /**
     * Gracefully disconnects the WebSocket. No automatic reconnection will
     * occur after an intentional disconnect.
     */
    fun disconnect() {
        intentionalDisconnect = true
        disconnectInternal()
        currentEventId = null
    }

    /**
     * Sends a text message over the WebSocket. Returns `true` if the message
     * was successfully enqueued for transmission.
     */
    fun send(message: String): Boolean {
        val ws = webSocket
        if (ws == null || _connectionState.value != ConnectionState.CONNECTED) {
            Timber.tag(TAG).w("Cannot send message: not connected")
            return false
        }
        return ws.send(message)
    }

    // ── Internal helpers ────────────────────────────────────────────────

    private fun openConnection(eventId: String) {
        _connectionState.value = if (consecutiveFailures > 0) {
            ConnectionState.RECONNECTING
        } else {
            ConnectionState.CONNECTING
        }

        val url = buildUrl(eventId)
        val request = Request.Builder()
            .url(url)
            .apply {
                tokenManager.getAccessToken()?.let { token ->
                    header("Authorization", "Bearer $token")
                }
            }
            .build()

        // Build a dedicated client with a longer read timeout for WebSocket idle periods.
        val wsClient = okHttpClient.newBuilder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()

        webSocket = wsClient.newWebSocket(request, createListener())
        Timber.tag(TAG).d("Opening WebSocket to %s", url)
    }

    private fun createListener(): WebSocketListener = object : WebSocketListener() {

        override fun onOpen(webSocket: WebSocket, response: Response) {
            Timber.tag(TAG).i("WebSocket connected")
            _connectionState.value = ConnectionState.CONNECTED
            consecutiveFailures = 0
            startHeartbeat(webSocket)
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            Timber.tag(TAG).v("Message received: %s", text.take(200))
            _messages.tryEmit(text)
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            Timber.tag(TAG).d("WebSocket closing: code=%d reason=%s", code, reason)
            webSocket.close(NORMAL_CLOSURE_CODE, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            Timber.tag(TAG).i("WebSocket closed: code=%d reason=%s", code, reason)
            handleDisconnection()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            Timber.tag(TAG).e(t, "WebSocket failure (HTTP %s)", response?.code?.toString() ?: "N/A")
            handleDisconnection()
        }
    }

    private fun handleDisconnection() {
        stopHeartbeat()
        _connectionState.value = ConnectionState.DISCONNECTED

        if (!intentionalDisconnect) {
            scheduleReconnect()
        }
    }

    private fun scheduleReconnect() {
        reconnectJob?.cancel()
        val eventId = currentEventId ?: return

        consecutiveFailures++
        val baseDelay = (INITIAL_RECONNECT_DELAY_MS *
            Math.pow(RECONNECT_BACKOFF_MULTIPLIER, (consecutiveFailures - 1).toDouble())).toLong()
        val cappedDelay = min(baseDelay, MAX_RECONNECT_DELAY_MS)
        // Add random jitter to avoid thundering-herd reconnections.
        val jitter = (cappedDelay * JITTER_FACTOR * Random.nextDouble()).toLong()
        val totalDelay = cappedDelay + jitter

        Timber.tag(TAG).d(
            "Scheduling reconnect #%d in %d ms (base=%d, jitter=%d)",
            consecutiveFailures, totalDelay, cappedDelay, jitter,
        )

        reconnectJob = scope.launch {
            delay(totalDelay)
            if (isActive && !intentionalDisconnect) {
                _connectionState.value = ConnectionState.RECONNECTING
                openConnection(eventId)
            }
        }
    }

    private fun startHeartbeat(ws: WebSocket) {
        stopHeartbeat()
        heartbeatJob = scope.launch {
            while (isActive) {
                delay(HEARTBEAT_INTERVAL_MS)
                val sent = ws.send("{\"type\":\"ping\"}")
                if (!sent) {
                    Timber.tag(TAG).w("Heartbeat ping failed")
                    break
                }
                Timber.tag(TAG).v("Heartbeat ping sent")
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    private fun disconnectInternal() {
        reconnectJob?.cancel()
        reconnectJob = null
        stopHeartbeat()
        webSocket?.close(NORMAL_CLOSURE_CODE, "Client disconnect")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    private fun buildUrl(eventId: String): String {
        return "$WS_BASE_URL?eventId=$eventId"
    }
}
