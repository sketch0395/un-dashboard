import CustomLinks from "./components/CustomLinks";
import DockerStatus from "./components/dockerstatus";

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-950 text-white">
            
            <main className="flex-grow p-4">
                
                <DockerStatus />
                
        
            <CustomLinks />
            
        
            </main>

</div>
    );
}
