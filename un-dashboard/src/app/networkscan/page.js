import NetworkMap from "../components/networkmap";
import NetworkScanner from "../components/networkscan";


export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            {/* <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-900 to-purple-900 opacity-50"></div> */}
            <NetworkScanner />
        </div>
    );
}
