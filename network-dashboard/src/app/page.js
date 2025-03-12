import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] grid-cols-8 items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
     <h1 className=" col-start-1 rounded-2xl border-white border-4 border-double h-16 w-56 items-center justify-items-center place-content-center">
      <div>Let me think about it</div>
     </h1>
    </div>
  );
}
