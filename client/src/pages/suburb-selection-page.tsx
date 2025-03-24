
import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SuburbSelectionPage() {
  const [suburb, setSuburb] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/care-request");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-center mb-6">Which suburb do you need help in?</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter suburb"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              required
              className="py-6 text-lg"
            />
            <Button 
              type="submit" 
              className="w-full py-6 text-lg"
              disabled={!suburb.trim()}
            >
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
