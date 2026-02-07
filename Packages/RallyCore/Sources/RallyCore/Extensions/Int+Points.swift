import Foundation

public extension Int {
    /// Formatted points display with thousands separator (e.g., "1,250 pts").
    var pointsFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        let number = formatter.string(from: NSNumber(value: self)) ?? "\(self)"
        return "\(number) pts"
    }

    /// Abbreviated number display (e.g., "1.2K", "15K").
    var abbreviated: String {
        if self >= 1_000_000 {
            return String(format: "%.1fM", Double(self) / 1_000_000)
        } else if self >= 1_000 {
            return String(format: "%.1fK", Double(self) / 1_000)
        }
        return "\(self)"
    }
}
