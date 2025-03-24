
import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function WorkInProgressPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="pt-6 px-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ChevronLeft className="h-6 w-6 text-neutral-800" />
        </Button>
      </header>

      <main className="flex-grow flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-neutral-800">
            Work in Progress
          </h1>
          <p className="text-neutral-600">
            This feature is currently under development.
            Please check back later.
          </p>
        </div>
      </main>
    </div>
  );
}
