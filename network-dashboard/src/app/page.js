import Dropit from "@/app/components/usermenu";
import DockerStatus from "./components/dockerstatus";
import { Button } from "flowbite-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


export default function Home() {
  return (
    <>
      <div className="p-5 flex">
        <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <Card className={"w-64 justify-items-center place-content-center"}>
              <CardTitle className={"pl-4 text-xl font-bold"}>
                Elastic logo here
              </CardTitle>

              <CardContent>
                <h1 className="font-bold">Container Status</h1>
                <DockerStatus containerId="es02" />
              </CardContent>
              <div className="p-5">
                <Button
                  href="https://localhost:9200"
                  className="flex text-black"
                >
                  Launch Elastic
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
                <DockerStatus containerId="kib02" />
              </CardContent>
              <div className="p-5">
                <Button
                  href="https://localhost:5601"
                  className="flex text-black"
                >
                  Launch Kibana
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
