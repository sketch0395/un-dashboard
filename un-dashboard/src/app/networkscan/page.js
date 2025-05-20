import NetworkDashboard from "./networkviews/networkdashboard";
import NetworkScanControls from "./networkviews/NetworkScanControls";

export default function NetworkScan() {
    return (
        <>
            <h1 className="text-3xl font-bold mb-6">Network Scan</h1>
            <NetworkScanControls />
            <NetworkDashboard />
        </>
    );
}
