import NetworkDashboard from "./components/networkdashboard";
import NetworkScanControls from "./components/NetworkScanControls";

export default function NetworkScan() {
    return (
        <>
            <h1 className="text-3xl font-bold mb-6">Network Scan</h1>
            <NetworkScanControls />
            <NetworkDashboard />
        </>
    );
}
