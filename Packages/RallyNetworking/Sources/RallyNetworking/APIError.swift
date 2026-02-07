import Foundation

/// Comprehensive error types for Rally API communication.
///
/// Each case carries enough context for callers to present appropriate
/// user-facing messages or trigger recovery flows (e.g., re-authentication).
public enum APIError: Error, Sendable, Equatable {

    // MARK: - Authentication

    /// The request was rejected with HTTP 401. The caller should trigger
    /// a token refresh or sign-out flow.
    case unauthorized

    // MARK: - HTTP Status

    /// The requested resource does not exist (HTTP 404).
    case notFound

    /// The server returned a non-success status code that does not map to
    /// a more specific case. The associated value is the HTTP status code.
    case serverError(Int)

    /// The server asked us to slow down (HTTP 429). The optional
    /// `retryAfter` is the number of seconds the server suggested.
    case rateLimited(retryAfter: TimeInterval?)

    // MARK: - Connectivity

    /// The device has no usable network path. Checked via ``NetworkMonitor``
    /// before a request is dispatched.
    case networkUnavailable

    /// The underlying `URLSession` request timed out.
    case timeout

    // MARK: - Serialization

    /// The response body could not be decoded into the expected `Decodable` type.
    case decodingFailed(Error)

    /// The request body could not be encoded.
    case encodingFailed(Error)

    // MARK: - Request Construction

    /// The URL could not be constructed from the endpoint definition.
    case invalidURL(String)

    // MARK: - Cancellation

    /// The request was explicitly cancelled.
    case cancelled

    // MARK: - Equatable

    public static func == (lhs: APIError, rhs: APIError) -> Bool {
        switch (lhs, rhs) {
        case (.unauthorized, .unauthorized):
            return true
        case (.notFound, .notFound):
            return true
        case (.serverError(let a), .serverError(let b)):
            return a == b
        case (.rateLimited(let a), .rateLimited(let b)):
            return a == b
        case (.networkUnavailable, .networkUnavailable):
            return true
        case (.timeout, .timeout):
            return true
        case (.decodingFailed, .decodingFailed):
            return true
        case (.encodingFailed, .encodingFailed):
            return true
        case (.invalidURL(let a), .invalidURL(let b)):
            return a == b
        case (.cancelled, .cancelled):
            return true
        default:
            return false
        }
    }
}

// MARK: - LocalizedError

extension APIError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Your session has expired. Please sign in again."
        case .notFound:
            return "The requested resource could not be found."
        case .serverError(let code):
            return "Server error (\(code)). Please try again later."
        case .rateLimited:
            return "Too many requests. Please wait a moment and try again."
        case .networkUnavailable:
            return "No internet connection. Please check your network settings."
        case .timeout:
            return "The request timed out. Please try again."
        case .decodingFailed(let error):
            return "Failed to process server response: \(error.localizedDescription)"
        case .encodingFailed(let error):
            return "Failed to prepare request: \(error.localizedDescription)"
        case .invalidURL(let path):
            return "Invalid endpoint: \(path)"
        case .cancelled:
            return "The request was cancelled."
        }
    }
}

// MARK: - Retry Eligibility

extension APIError {

    /// Whether this error is eligible for automatic retry under the
    /// exponential-backoff policy. Client errors (4xx) are generally
    /// not retried, with the exception of 401 (triggers refresh) and
    /// 429 (rate-limited).
    public var isRetryable: Bool {
        switch self {
        case .unauthorized, .rateLimited:
            return true
        case .serverError(let code):
            // Retry 5xx errors
            return code >= 500
        case .networkUnavailable, .timeout:
            return true
        case .notFound, .decodingFailed, .encodingFailed, .invalidURL, .cancelled:
            return false
        }
    }
}
