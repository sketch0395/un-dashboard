import SpeedTest from "../components/speedtestcomp";

export default function testPage() {
  return (
    <div className="flex justify-center items-center h-screen border-2 border-gradient-to-b from-blue-400 to-fuchsia-500 rounded-2xl">
      <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-400 to-fuchsia-500">
        <h1 className="text-center text-xl font-bold mb-4">Network Speed Test</h1>    
      <SpeedTest />
    </div>
    </div>
  );
}
