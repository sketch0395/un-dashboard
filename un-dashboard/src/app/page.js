import DockerStatus from "./components/dockerstatus";

export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <DockerStatus />
        </div>
    );
}
