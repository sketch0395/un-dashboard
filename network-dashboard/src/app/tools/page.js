"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dockerstatus_1 = __importDefault(require("../api/docker/dockerstatus"));
const flowbite_react_1 = require("flowbite-react");
const card_1 = require("@/components/ui/card");
const dockercontrolbutton_1 = __importDefault(require("../components/dockercontrolbutton"));
const terminal_1 = __importDefault(require("../api/terminal/terminal"));
const xterm_1 = require("@xterm/xterm");
const Tools = () => {
    return (<>
      <div className="p-5 flex flex-wrap">
        <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <card_1.Card className="w-64 justify-items-center place-content-center">
              <card_1.CardTitle className="pl-4 text-xl font-bold">
                Cyber Chef Logo
              </card_1.CardTitle>

              <card_1.CardContent>
                <h1 className="font-bold">Container Status</h1>
                <dockerstatus_1.default containerId="CyberChef"/>
              </card_1.CardContent>
              <div className="pl-5">
                <dockercontrolbutton_1.default containerId="CyberChef"/>
              </div>
              <div className="px-5">
                <flowbite_react_1.Button href="http://localhost:32768" className="flex text-black w-52 rounded">
                  Launch
                </flowbite_react_1.Button>
              </div>
            </card_1.Card>
          </div>
        </div>

        <div className="p-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
            <card_1.Card className="w-64 justify-items-center place-content-center">
              <card_1.CardTitle className="pl-4 text-xl font-bold">
                Kibana logo here
              </card_1.CardTitle>

              <card_1.CardContent>
                <h1 className="font-bold">Container Status</h1>
                <dockerstatus_1.default containerId="es02"/>
              </card_1.CardContent>
              <div className="pl-5">
                <dockercontrolbutton_1.default containerId="kib02"/>
              </div>
              <div className="px-5">
                <flowbite_react_1.Button href="http://localhost:5601" className="flex text-black w-52 rounded">
                  Launch Kibana
                </flowbite_react_1.Button>
              </div>
            </card_1.Card>
          </div>
        </div>

        <div>
          <terminal_1.default />
          <xterm_1.Terminal />
        </div>
      </div>
    </>);
};
exports.default = Tools;
