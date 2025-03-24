"use client";


import { Button } from "flowbite-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {SpeedTest,UserControls,Gauges} from "../components/speedtestcomp";



export default function Speedtest() {
  return (
    <>
    <div className="px-5 flex flex-wrap">
        <div className="p-4">
    <div className="p-1 rounded-2xl w-66 bg-gradient-to-b from-blue-400 to-fuchsia-500">
      <Card className={"w-w-64 justify-items-center place-content-center"}><UserControls></UserControls></Card>
      </div>
      
      <div className="w-64 ">
      <Card><Gauges></Gauges></Card>
      </div>
      </div>
      </div>
    </>
  );
}
