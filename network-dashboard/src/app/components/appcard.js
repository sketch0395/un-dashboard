import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Appcard(title,containerId,link) {

return( 
    <>
<div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <Card className={"w-64 justify-items-center place-content-center"}>
              <CardTitle className={"pl-4 text-xl font-bold"}>
                {title}
              </CardTitle>

              <CardContent>
                <h1 className="font-bold">Container Status</h1>
                <DockerStatus containerId = {containerId} />
              </CardContent>
              <div className="pl-5">
              <DockerControlButton containerId="es02" />
              </div>
              <div className="px-5">
              
                <Button
                  href = {link}
                  className="flex text-black w-52 rounded"
                >
                  Launch 
                </Button>
              </div>
            </Card>
          </div>
          </>
        );
        }