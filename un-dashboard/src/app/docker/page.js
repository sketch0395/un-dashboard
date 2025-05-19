import CustomLinks from "../components/CustomLinks";
import DockerStatus from "../components/dockerstatus";
import DockerControls from "../components/DockerControls";

export default function DockerManager() {
    return (
        <>
            <h1 className="text-3xl font-bold mb-6">Docker Container Management</h1>
            <DockerControls />
            <DockerStatus />
            <CustomLinks />
        </>
    );
}
