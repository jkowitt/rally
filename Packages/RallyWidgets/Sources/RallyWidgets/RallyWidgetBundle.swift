import WidgetKit
import SwiftUI

/// Bundle containing all Rally widgets.
@main
struct RallyWidgetBundle: WidgetBundle {
    var body: some Widget {
        CountdownWidget()
        PointsWidget()
        TierProgressWidget()
    }
}
