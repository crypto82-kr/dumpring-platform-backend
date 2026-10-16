import SwiftUI

#if canImport(ActivityKit) && canImport(WidgetKit)
import ActivityKit
import WidgetKit

@available(iOS 16.2, *)
public struct DumpringMeterLiveActivityWidget: Widget {
    public init() {}

    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: DumpringMeterAttributes.self) { context in
            // 잠금화면 / 알림센터 배너 UI
            DumpringMeterLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // 다이내믹 아일랜드 길게 탭했을 때 확장 UI (Expanded)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "box.truck.badge.clock.fill")
                            .font(.system(size: 15))
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.originName)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                            Text("경과: \(formatTime(context.state.elapsedSeconds))")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.leading, 8)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.attributes.destinationName)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        Text("₩\(formatFare(context.state.currentFare))")
                            .font(.system(size: 14, weight: .heavy))
                            .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0)) // Golden Yellow
                    }
                    .padding(.trailing, 8)
                }

                DynamicIslandExpandedRegion(.center) {
                    HStack(spacing: 6) {
                        Text("🚚 덤프링 실시간 미터기")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.9))
                        Text(context.state.statusText)
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.85))
                            .foregroundColor(.white)
                            .cornerRadius(4)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .center) {
                        HStack(spacing: 4) {
                            Text("실시간 거리")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text(String(format: "%.1f km", context.state.distanceKm))
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.cyan)
                        }
                        Spacer()
                        HStack(spacing: 4) {
                            Text("차량")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text(context.attributes.vehicleNumber.isEmpty ? "덤프트럭" : context.attributes.vehicleNumber)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 4)
                }
            } compactLeading: {
                // 다이내믹 아일랜드 좌측 기본 콤팩트 뷰
                HStack(spacing: 3) {
                    Image(systemName: "truck.pickup.side.fill")
                        .foregroundColor(.orange)
                        .font(.system(size: 11))
                    Text(String(format: "%.1fK", context.state.distanceKm))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.cyan)
                }
                .padding(.leading, 4)
            } compactTrailing: {
                // 다이내믹 아일랜드 우측 기본 콤팩트 뷰 (실시간 요금)
                Text("₩\(formatFareCompact(context.state.currentFare))")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                    .padding(.trailing, 4)
            } minimal: {
                // 다이내믹 아일랜드를 다른 앱과 공유 시 최소 뷰
                Image(systemName: "truck.pickup.side.fill")
                    .foregroundColor(.orange)
                    .font(.system(size: 10))
            }
        }
    }
}

// 잠금 화면 및 알림 센터 전용 라이브 액티비티 뷰
@available(iOS 16.2, *)
struct DumpringMeterLockScreenView: View {
    let context: ActivityViewContext<DumpringMeterAttributes>

    var body: some View {
        VStack(spacing: 10) {
            // 헤더: 앱 타이틀 & 상태 뱃지
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "truck.pickup.side.fill")
                        .foregroundColor(.orange)
                        .font(.system(size: 14))
                    Text("덤프링 운행 미터기")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
                Text(context.state.statusText)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.orange)
                    .cornerRadius(6)
            }

            Divider()
                .background(Color.white.opacity(0.15))

            // 경로 및 시간 정보
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Circle().fill(Color.green).frame(width: 6, height: 6)
                        Text("상차: \(context.attributes.originName)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.9))
                    }
                    HStack(spacing: 4) {
                        Circle().fill(Color.red).frame(width: 6, height: 6)
                        Text("하차: \(context.attributes.destinationName)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.9))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text(String(format: "%.1f km", context.state.distanceKm))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.cyan)
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
            }

            // 실시간 운임 하이라이트
            HStack(alignment: .lastTextBaseline) {
                Text("실시간 산정 운임")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text("₩\(formatFare(context.state.currentFare))")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
            }
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [Color(red: 0.06, green: 0.09, blue: 0.16), Color(red: 0.09, green: 0.14, blue: 0.24)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// 포맷터 유틸
private func formatFare(_ fare: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    return formatter.string(from: NSNumber(value: fare)) ?? "\(fare)"
}

private func formatFareCompact(_ fare: Int) -> String {
    if fare >= 10000 {
        return String(format: "%.1f만", Double(fare) / 10000.0)
    }
    return formatFare(fare)
}

private func formatTime(_ seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    return String(format: "%02d:%02d", m, s)
}
#endif
