
import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AgeVerificationPage() {
  const [, navigate] = useLocation();

  const handleChoice = (isOver18: boolean) => {
    navigate("/suburb-selection");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-center mb-6">Are you over 18?</h1>
          <div className="space-y-4">
            <Button 
              className="w-full py-6 text-lg"
              onClick={() => handleChoice(true)}
            >
              Yes, I am over 18
            </Button>
            <Button 
              className="w-full py-6 text-lg"
              variant="outline"
              onClick={() => handleChoice(false)}
            >
              No, I am under 18
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
