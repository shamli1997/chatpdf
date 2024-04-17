import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export default async function Home() {
  return (
    <div className="w-screen min-h-screen bg-gradient-to-r bg-gradient-to-r from-cyan-200 to-cyan-400">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center">
            <h1 className="mr-3 text-5xl font-semibold">Chat with your PDF</h1>
          </div>
          <div className="flex mt-2">
            <Button>
              Go to Chats <ArrowRight className="ml-2" />
            </Button>
          </div>
          <p className="max-w-xl mt-1 text-lg text-slate-600">
            Uplaod any pdf to get answers to your questions
          </p>
          <div className="w-full mt-4">
            <FileUpload />
          </div>
        </div>
      </div>
    </div>
  );
}
