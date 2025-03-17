import Dropit from "@/app/components/usermenu";
import DockerStatus from "./components/dockerstatus";
import { Button } from "flowbite-react";

export default function Home() {
  return (
    <>

      <div className="p-5 flex">
        <Button href="https://localhost:9200" className="rounded-2xl text-black border-green-400 border-4 border-double h-16 w-56 items-center justify-items-center place-content-center flex">
          <h1>Elastic</h1>
        </Button>
        <div className="p-5 flex">
          <h1 className="text-xl font-bold pr-5">Elastic Container Status</h1>
          <DockerStatus containerId="es02" />
        </div>
      </div>
      <div className="p-5 flex">
        <Button href="http://localhost:5601" className="rounded-2xl text-black border-blue-500 border-4 border-double h-16 w-56 items-center justify-items-center place-content-center">
          <h1>Kibana</h1>
        </Button>
        <div className="p-5 flex">
          <h1 className="text-xl font-bold pr-5">Kibana Container Status</h1>
          <DockerStatus containerId="kib02" />
        </div>
      </div>


    </>
  );
}
