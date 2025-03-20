import Dropit from "@/app/components/usermenu";
import DockerStatus from "../api/docker/dockerstatus";
import { Button } from "flowbite-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DockerControlButton from "../components/dockercontrolbutton";
import Appcard from "../components/appcard";

export default function Tools() {
  return (
    <>
      <div className="p-5 flex flex-wrap">
      <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <Card className={"w-64 justify-items-center place-content-center"}>
              <CardTitle className={"pl-4 text-xl font-bold"}>
                Cyber Chef Logo
              </CardTitle>

              <CardContent>
                <h1 className="font-bold">Container Status</h1>
                <DockerStatus containerId="CyberChef" />
              </CardContent>
              <div className="pl-5">
              <DockerControlButton containerId="CyberChef" />
              </div>
              <div className="px-5">
              
                <Button
                  href="http://localhost:32768"
                  className="flex text-black w-52 rounded"
                >
                  Launch 
                </Button>
              </div>
            </Card>
          </div>
        </div>
        <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <Card className={"w-64 justify-items-center place-content-center"}>
              <CardTitle className={"pl-4 text-xl font-bold"}>
                Kibana logo here
              </CardTitle>

              <CardContent>
                <h1 className="font-bold">Container Status</h1>
                <DockerStatus containerId="es02" />
              </CardContent>
              <div className="pl-5">
              <DockerControlButton containerId="kib02" />
              </div>
              <div className="px-5">
              
                <Button
                  href="http://localhost:5601"
                  className="flex text-black w-52 rounded"
                >
                  Launch Kibana
                </Button>
              </div>
            </Card>
          </div>
        </div>
        <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <Card className={"w-64 justify-items-center place-content-center"}>
              <CardTitle className={"pl-4 text-xl font-bold"}>
                Dashy logo here
              </CardTitle>

              <CardContent>
                <h1 className="font-bold">Container Status</h1>
                <DockerStatus containerId="mystifying_euler" />
              </CardContent>
              <div className="pl-5">
              <DockerControlButton containerId="kib02" />
              </div>
              <div className="px-5">
              
                <Button
                  href="http://localhost:8080"
                  className="flex text-black w-52 rounded"
                >
                  fml
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      {/* <Appcard title='fuck'containerId='es02'></Appcard> */}
    </>
  );
}
