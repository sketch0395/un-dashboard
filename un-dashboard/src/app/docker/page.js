import CustomLinks from "../components/CustomLinks";
import DockerStatus from "../components/dockerstatus";

export default function DockerManager() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-950 text-white">
            <main className="flex-grow p-4">
                <h1 className="text-3xl font-bold mb-6">Docker Container Management</h1>
                <DockerStatus />
                <CustomLinks />
            </main>
        </div>
    );
}
