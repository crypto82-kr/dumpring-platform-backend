import Flutter
import UIKit
#if canImport(ActivityKit)
import ActivityKit
#endif

public class LiveActivityManager: NSObject {
    private static var currentActivity: Any? = nil

    public static func register(with appDelegate: FlutterAppDelegate) {
        guard let controller = appDelegate.window?.rootViewController as? FlutterViewController else {
            return
        }
        let channel = FlutterMethodChannel(name: "com.example.dumpring/live_activity", binaryMessenger: controller.binaryMessenger)
        let instance = LiveActivityManager()
        channel.setMethodCallHandler(instance.handle)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "isLiveActivitySupported":
            #if canImport(ActivityKit)
            if #available(iOS 16.2, *) {
                let areEnabled = ActivityAuthorizationInfo().areActivitiesEnabled
                result(areEnabled)
            } else {
                result(false)
            }
            #else
            result(false)
            #endif

        case "startLiveActivity":
            guard let args = call.arguments as? [String: Any] else {
                result(FlutterError(code: "INVALID_ARGS", message: "Arguments must be a dictionary", details: nil))
                return
            }
            startActivity(args: args, result: result)

        case "updateLiveActivity":
            guard let args = call.arguments as? [String: Any] else {
                result(FlutterError(code: "INVALID_ARGS", message: "Arguments must be a dictionary", details: nil))
                return
            }
            updateActivity(args: args, result: result)

        case "endLiveActivity":
            guard let args = call.arguments as? [String: Any] else {
                endActivity(result: result)
                return
            }
            endActivity(args: args, result: result)

        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func startActivity(args: [String: Any], result: @escaping FlutterResult) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else {
            result(FlutterError(code: "UNSUPPORTED_VERSION", message: "Live Activities require iOS 16.2+", details: nil))
            return
        }

        let originName = args["originName"] as? String ?? "상차지"
        let destinationName = args["destinationName"] as? String ?? "하차지"
        let vehicleNumber = args["vehicleNumber"] as? String ?? "덤프트럭"
        let currentFare = args["currentFare"] as? Int ?? 0
        let distanceKm = (args["distanceKm"] as? NSNumber)?.doubleValue ?? 0.0
        let elapsedSeconds = args["elapsedSeconds"] as? Int ?? 0
        let statusText = args["statusText"] as? String ?? "운행 중"

        let attributes = DumpringMeterAttributes(
            originName: originName,
            destinationName: destinationName,
            vehicleNumber: vehicleNumber
        )

        let initialContentState = DumpringMeterAttributes.ContentState(
            currentFare: currentFare,
            distanceKm: distanceKm,
            elapsedSeconds: elapsedSeconds,
            statusText: statusText
        )

        do {
            if let existingActivity = LiveActivityManager.currentActivity as? Activity<DumpringMeterAttributes> {
                Task {
                    await existingActivity.end(nil, dismissalPolicy: .immediate)
                }
            }

            let activity = try Activity<DumpringMeterAttributes>.request(
                attributes: attributes,
                content: .init(state: initialContentState, staleDate: nil),
                pushType: nil
            )
            LiveActivityManager.currentActivity = activity
            result(["success": true, "activityId": activity.id])
        } catch {
            result(FlutterError(code: "START_FAILED", message: error.localizedDescription, details: nil))
        }
        #else
        result(false)
        #endif
    }

    private func updateActivity(args: [String: Any], result: @escaping FlutterResult) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else {
            result(false)
            return
        }

        guard let activity = LiveActivityManager.currentActivity as? Activity<DumpringMeterAttributes> else {
            result(false)
            return
        }

        let currentFare = args["currentFare"] as? Int ?? 0
        let distanceKm = (args["distanceKm"] as? NSNumber)?.doubleValue ?? 0.0
        let elapsedSeconds = args["elapsedSeconds"] as? Int ?? 0
        let statusText = args["statusText"] as? String ?? "운행 중"

        let updatedState = DumpringMeterAttributes.ContentState(
            currentFare: currentFare,
            distanceKm: distanceKm,
            elapsedSeconds: elapsedSeconds,
            statusText: statusText
        )

        Task {
            await activity.update(.init(state: updatedState, staleDate: nil))
            result(true)
        }
        #else
        result(false)
        #endif
    }

    private func endActivity(args: [String: Any]? = nil, result: @escaping FlutterResult) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else {
            result(false)
            return
        }

        guard let activity = LiveActivityManager.currentActivity as? Activity<DumpringMeterAttributes> else {
            result(false)
            return
        }

        let currentFare = args?["currentFare"] as? Int ?? 0
        let distanceKm = (args?["distanceKm"] as? NSNumber)?.doubleValue ?? 0.0
        let elapsedSeconds = args?["elapsedSeconds"] as? Int ?? 0
        let statusText = args?["statusText"] as? String ?? "운행 완료"

        let finalState = DumpringMeterAttributes.ContentState(
            currentFare: currentFare,
            distanceKm: distanceKm,
            elapsedSeconds: elapsedSeconds,
            statusText: statusText
        )

        Task {
            await activity.end(.init(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
            LiveActivityManager.currentActivity = nil
            result(true)
        }
        #else
        result(false)
        #endif
    }
}
