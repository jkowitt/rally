import Foundation

// MARK: - HTTP Method

/// Standard HTTP methods used by the Rally API.
public enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

// MARK: - Request

/// A generic, type-safe request builder for the Rally API.
///
/// `Response` is the `Decodable` type that the API is expected to return.
/// The request captures everything needed to build a `URLRequest`:
/// HTTP method, path, query parameters, an optional `Encodable` body,
/// and additional headers.
///
/// ```swift
/// let request = Request<[School]>(
///     method: .get,
///     path: "/schools",
///     query: [("active", "true")]
/// )
/// ```
public struct Request<Response: Decodable & Sendable>: Sendable {

    /// The HTTP method for this request.
    public let method: HTTPMethod

    /// The path component appended to the base URL (e.g., "/schools").
    public let path: String

    /// URL query parameters as ordered key-value pairs.
    /// Using an array instead of a dictionary preserves insertion order
    /// and allows duplicate keys.
    public let query: [(String, String)]

    /// An optional request body. Set to `nil` for GET/DELETE requests.
    public let body: (any Encodable & Sendable)?

    /// Additional HTTP headers merged on top of the defaults set by
    /// ``APIClient``.
    public let headers: [String: String]

    /// Whether this request requires a Bearer token in the
    /// `Authorization` header. Defaults to `true`; set to `false` for
    /// unauthenticated endpoints like sign-in.
    public let requiresAuth: Bool

    /// Creates a new API request.
    ///
    /// - Parameters:
    ///   - method: The HTTP method.
    ///   - path: The endpoint path relative to the API base URL.
    ///   - query: URL query parameters.
    ///   - body: An `Encodable` request body.
    ///   - headers: Extra headers to include.
    ///   - requiresAuth: Whether to attach the Bearer token.
    public init(
        method: HTTPMethod,
        path: String,
        query: [(String, String)] = [],
        body: (any Encodable & Sendable)? = nil,
        headers: [String: String] = [:],
        requiresAuth: Bool = true
    ) {
        self.method = method
        self.path = path
        self.query = query
        self.body = body
        self.headers = headers
        self.requiresAuth = requiresAuth
    }
}

// MARK: - URLRequest Construction

extension Request {

    /// Builds a `URLRequest` from this request definition.
    ///
    /// - Parameters:
    ///   - baseURL: The API base URL (e.g., `https://api.rally.app/v1`).
    ///   - encoder: The JSON encoder to use for the body.
    ///   - accessToken: An optional Bearer token injected when
    ///     `requiresAuth` is `true`.
    /// - Throws: ``APIError/invalidURL(_:)`` if the URL cannot be formed,
    ///           or ``APIError/encodingFailed(_:)`` if the body fails to
    ///           encode.
    /// - Returns: A fully configured `URLRequest`.
    func urlRequest(
        baseURL: URL,
        encoder: JSONEncoder,
        accessToken: String? = nil
    ) throws -> URLRequest {
        // Build URL components
        guard var components = URLComponents(
            url: baseURL.appendingPathComponent(path),
            resolvingAgainstBaseURL: true
        ) else {
            throw APIError.invalidURL(path)
        }

        // Apply query items
        if !query.isEmpty {
            components.queryItems = query.map {
                URLQueryItem(name: $0.0, value: $0.1)
            }
        }

        guard let url = components.url else {
            throw APIError.invalidURL(path)
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method.rawValue

        // Default headers
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")

        // Auth header
        if requiresAuth, let token = accessToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Extra headers
        for (key, value) in headers {
            urlRequest.setValue(value, forHTTPHeaderField: key)
        }

        // Body
        if let body {
            do {
                urlRequest.httpBody = try encoder.encode(AnyEncodable(body))
                urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
            } catch {
                throw APIError.encodingFailed(error)
            }
        }

        return urlRequest
    }
}

// MARK: - AnyEncodable

/// Type-erased `Encodable` wrapper so that `Request.body` can hold any
/// concrete `Encodable` value and still be encoded uniformly.
struct AnyEncodable: Encodable, @unchecked Sendable {
    private let _encode: (Encoder) throws -> Void

    init(_ value: any Encodable) {
        _encode = { encoder in
            try value.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
