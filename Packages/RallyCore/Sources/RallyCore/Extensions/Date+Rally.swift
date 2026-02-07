import Foundation

public extension Date {
    /// Relative time description (e.g., "2h ago", "in 3d").
    var relativeDescription: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: .now)
    }

    /// Countdown components from now until this date.
    var countdownComponents: (days: Int, hours: Int, minutes: Int, seconds: Int)? {
        guard self > .now else { return nil }
        let interval = self.timeIntervalSince(.now)
        let days = Int(interval) / 86400
        let hours = (Int(interval) % 86400) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60
        return (days, hours, minutes, seconds)
    }

    /// Formatted gameday display (e.g., "Sat, Oct 12 • 3:30 PM").
    var gamedayFormatted: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        let datePart = formatter.string(from: self)
        formatter.dateFormat = "h:mm a"
        let timePart = formatter.string(from: self)
        return "\(datePart) \u{2022} \(timePart)"
    }

    /// Short time display (e.g., "3:30 PM").
    var shortTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: self)
    }
}
