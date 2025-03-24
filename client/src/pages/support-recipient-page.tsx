
import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SupportRecipientPage() {
  const [, navigate] = useLocation();

  const handleChoice = (choice: "self" | "other") => {
    navigate("/age-verification");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-center mb-6">Who needs support?</h1>
          <div className="space-y-4">
            <Button 
              className="w-full py-6 text-lg" 
              onClick={() => handleChoice("self")}
            >
              I need support
            </Button>
            <Button 
              className="w-full py-6 text-lg"
              onClick={() => handleChoice("other")}
            >
              Someone else needs support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
