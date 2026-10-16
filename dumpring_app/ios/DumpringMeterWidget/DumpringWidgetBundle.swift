import SwiftUI

#if canImport(ActivityKit) && canImport(WidgetKit)
import ActivityKit
import WidgetKit

@main
struct DumpringWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            DumpringMeterLiveActivityWidget()
        }
    }
}
#endif
