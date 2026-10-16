import Foundation

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
public struct DumpringMeterAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var currentFare: Int
        public var distanceKm: Double
        public var elapsedSeconds: Int
        public var statusText: String
        
        public init(currentFare: Int, distanceKm: Double, elapsedSeconds: Int, statusText: String = "운행 중") {
            self.currentFare = currentFare
            self.distanceKm = distanceKm
            self.elapsedSeconds = elapsedSeconds
            self.statusText = statusText
        }
    }

    // 운행 기본 정적 정보 (상차지, 하차지, 차량 번호)
    public var originName: String
    public var destinationName: String
    public var vehicleNumber: String

    public init(originName: String, destinationName: String, vehicleNumber: String) {
        self.originName = originName
        self.destinationName = destinationName
        self.vehicleNumber = vehicleNumber
    }
}
#endif
