import Foundation
import CoreBluetooth
import os

// MARK: - BLEScanner

/// CoreBluetooth fallback scanner for detecting Eddystone-UID BLE frames
/// when CLBeacon ranging is unavailable or unsupported by the venue hardware.
///
/// Eddystone-UID frame format (after the 0xAAFE service data prefix):
///   Byte 0:    Frame type (0x00 = UID)
///   Byte 1:    TX power at 0m
///   Bytes 2-11:  Namespace ID (10 bytes)
///   Bytes 12-17: Instance ID (6 bytes)
///
/// This class is `@unchecked Sendable` because its mutable state is protected
/// by a serial dispatch queue and CBCentralManager delegate callbacks are serialized.
public final class BLEScanner: NSObject, @unchecked Sendable {

    // MARK: - Constants

    /// Eddystone service UUID: 0xFEAA
    private static let eddystoneServiceUUID = CBUUID(string: "FEAA")

    /// Eddystone UID frame type byte.
    private static let uidFrameType: UInt8 = 0x00

    /// Minimum length of an Eddystone-UID service data payload (frame type + tx power + namespace + instance).
    private static let minUIDFrameLength = 18

    // MARK: - Properties

    private var centralManager: CBCentralManager?
    private let logger = Logger(subsystem: "com.rally.location", category: "BLEScanner")

    /// Serial queue for CBCentralManager delegate and state protection.
    private let bleQueue = DispatchQueue(label: "com.rally.location.bleQueue")

    /// Stream continuation for emitting BLE readings.
    private var streamContinuation: AsyncStream<BLEReading>.Continuation?

    /// Whether scanning is currently active.
    private var isScanning = false

    /// Namespace filter: only emit readings whose namespace ID matches one of these values.
    /// An empty set means no filtering (emit all Eddystone-UID frames).
    private var namespaceFilter: Set<String> = []

    /// Continuation held while waiting for Bluetooth to power on.
    private var powerOnContinuation: CheckedContinuation<CBManagerState, Never>?

    // MARK: - Initialization

    public override init() {
        super.init()
    }

    // MARK: - Scanning Control

    /// Starts scanning for Eddystone-UID BLE advertisements.
    ///
    /// - Parameter namespaces: Optional set of namespace ID hex strings to filter on.
    ///   If empty, all Eddystone-UID frames are emitted.
    /// - Throws: `LocationError.bluetoothUnavailable` if Bluetooth is not powered on.
    /// - Throws: `LocationError.bluetoothUnauthorized` if the app lacks Bluetooth permission.
    public func startScanning(namespaces: Set<String> = []) async throws {
        bleQueue.sync { self.namespaceFilter = namespaces }

        // Initialize CBCentralManager if needed and wait for power-on.
        let state = await ensureBluetoothReady()

        switch state {
        case .poweredOn:
            break
        case .unauthorized:
            throw LocationError.bluetoothUnauthorized
        default:
            throw LocationError.bluetoothUnavailable
        }

        bleQueue.sync {
            guard !isScanning else { return }
            isScanning = true
            centralManager?.scanForPeripherals(
                withServices: [Self.eddystoneServiceUUID],
                options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
            )
        }

        logger.info("Started BLE scanning for Eddystone-UID frames")
    }

    /// Stops scanning for BLE advertisements.
    public func stopScanning() {
        bleQueue.sync {
            guard isScanning else { return }
            isScanning = false
            centralManager?.stopScan()
        }
        logger.info("Stopped BLE scanning")
    }

    /// Returns an `AsyncStream` of `BLEReading` values detected during scanning.
    ///
    /// Only one active stream is supported. Calling again replaces the previous stream.
    public func bleReadings() -> AsyncStream<BLEReading> {
        bleQueue.sync { streamContinuation?.finish() }

        return AsyncStream { continuation in
            bleQueue.sync { self.streamContinuation = continuation }
            continuation.onTermination = { @Sendable [weak self] _ in
                self?.bleQueue.sync { self?.streamContinuation = nil }
            }
        }
    }

    /// Whether Bluetooth scanning is currently active.
    public var isScanningActive: Bool {
        bleQueue.sync { isScanning }
    }

    // MARK: - Bluetooth Readiness

    /// Ensures the CBCentralManager is initialized and Bluetooth is powered on.
    /// Returns the current Bluetooth state.
    private func ensureBluetoothReady() async -> CBManagerState {
        let currentState: CBManagerState? = bleQueue.sync {
            centralManager?.state
        }

        if let state = currentState, state != .unknown {
            return state
        }

        // Initialize CBCentralManager and wait for state update.
        return await withCheckedContinuation { continuation in
            bleQueue.sync {
                self.powerOnContinuation = continuation
                if self.centralManager == nil {
                    self.centralManager = CBCentralManager(delegate: self, queue: self.bleQueue)
                }
            }
        }
    }

    // MARK: - Eddystone Parsing

    /// Parses an Eddystone-UID frame from the service data bytes.
    ///
    /// - Parameters:
    ///   - data: The raw service data from the advertisement.
    ///   - rssi: The received signal strength in dBm.
    /// - Returns: A `BLEReading` if the frame is valid, otherwise `nil`.
    private func parseEddystoneUID(data: Data, rssi: Int) -> BLEReading? {
        guard data.count >= Self.minUIDFrameLength else { return nil }
        guard data[0] == Self.uidFrameType else { return nil }

        let txPower = Int(Int8(bitPattern: data[1]))
        let namespaceBytes = data[2..<12]
        let instanceBytes = data[12..<18]

        let namespaceID = namespaceBytes.map { String(format: "%02x", $0) }.joined()
        let instanceID = instanceBytes.map { String(format: "%02x", $0) }.joined()

        return BLEReading(
            namespaceID: namespaceID,
            instanceID: instanceID,
            rssi: rssi,
            txPower: txPower,
            timestamp: .now
        )
    }
}

// MARK: - CBCentralManagerDelegate

extension BLEScanner: CBCentralManagerDelegate {

    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        logger.debug("Bluetooth state updated: \(String(describing: central.state.rawValue))")

        // Resume any waiting continuation.
        if let continuation = powerOnContinuation {
            powerOnContinuation = nil
            continuation.resume(returning: central.state)
        }

        // If Bluetooth powers off while scanning, log a warning.
        if central.state != .poweredOn && isScanning {
            logger.warning("Bluetooth powered off while scanning was active")
            isScanning = false
        }
    }

    public func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        // Extract Eddystone service data from the advertisement.
        guard let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data],
              let eddystoneData = serviceData[Self.eddystoneServiceUUID] else {
            return
        }

        guard let reading = parseEddystoneUID(data: eddystoneData, rssi: RSSI.intValue) else {
            return
        }

        // Apply namespace filter if configured.
        if !namespaceFilter.isEmpty && !namespaceFilter.contains(reading.namespaceID) {
            return
        }

        streamContinuation?.yield(reading)
    }
}
