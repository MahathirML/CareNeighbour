import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import UserTypePage from "@/pages/user-type-page";
import CareRequestPage from "@/pages/care-request-page";
import AISummaryPage from "@/pages/ai-summary-page";
import CaregiverMatchingPage from "@/pages/caregiver-matching-page";
import WaitingConfirmationPage from "@/pages/waiting-confirmation-page";
import CaregiverTrackingPage from "@/pages/caregiver-tracking-page";
import CaregiverDashboardPage from "@/pages/caregiver-dashboard-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/guest" component={CareRequestPage} />
      <ProtectedRoute path="/user-type" component={UserTypePage} />
      <ProtectedRoute path="/care-request" component={CareRequestPage} />
      <ProtectedRoute path="/ai-summary" component={AISummaryPage} />
      <ProtectedRoute path="/caregiver-matching" component={CaregiverMatchingPage} />
      <ProtectedRoute path="/waiting-confirmation/:id" component={WaitingConfirmationPage} />
      <ProtectedRoute path="/caregiver-tracking/:id" component={CaregiverTrackingPage} />
      <ProtectedRoute path="/caregiver-dashboard" component={CaregiverDashboardPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial app loading
  useEffect(() => {
    console.log("App component mounted");
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log("App loaded");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">ElderCare</h1>
          <p className="mt-2 text-sm text-neutral-500">Loading your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-lg">
          <Router />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;