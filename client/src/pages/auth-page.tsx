import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { AuthForms } from "@/components/AuthForms";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(
        user.userType === "CARE_SEEKER"
          ? "/care-request"
          : "/caregiver-dashboard",
      );
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="pt-6 px-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ChevronLeft className="h-6 w-6 text-neutral-800" />
        </Button>
      </header>

      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-lg px-6">
          <AuthForms />
        </div>
      </main>
    </div>
  );
}
