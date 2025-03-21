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
import TerminalComponent from "../api/terminal/terminal";
// import { Terminal } from "xterm";
// import Appcard from "./components/appcard";

export default function Home() {
  return (
    <>
      <div className="p-5 flex flex-wrap">
        <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <Card className={"w-64 justify-items-center place-content-center"}>
              <CardTitle className={"pl-4 text-xl font-bold"}>
                CyberChef logo here
              </CardTitle>

              <CardContent>
                <h1 className="font-bold">Container Status</h1>
                <DockerStatus containerId="test_sshd" />
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
        {/* <div className="p-4">
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
        </div> */}
      </div>
      {/* <div>
        <div >
          <div >
            <iframe
              src="//openspeedtest.com/selfhosted"
            ></iframe>
          </div>
        </div>
        Provided by <a href="https://openspeedtest.com">OpenSpeedtest.com</a>
      </div> */}
    </>
  );
}
