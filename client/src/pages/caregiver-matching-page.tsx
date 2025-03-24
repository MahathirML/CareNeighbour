import React from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaregiverCard } from "@/components/CaregiverCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CaregiverMatchingPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const params = new URLSearchParams(location.split("?")[1] || "");
  const requestId = params.get("requestId");

  // Fetch 5 random caregivers
  const {
    data: caregivers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/providers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/providers");
      return res.json();
    },
  });

  // Match caregiver mutation
  const matchCaregiverMutation = useMutation({
    mutationFn: async (caregiverId: number) => {
      if (!requestId) throw new Error("Request ID is missing");

      const response = await apiRequest(
        "POST",
        `/api/care-requests/${requestId}/match`,
        {
          providerId: caregiverId,
        },
      );

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/care-requests", Number(requestId)], data);
      toast({
        title: "Caregiver requested",
        description: "Your request has been sent to the caregiver",
      });
      navigate(`/waiting-confirmation/${requestId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error requesting caregiver",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectCaregiver = (caregiverId: number) => {
    matchCaregiverMutation.mutate(caregiverId);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-12 pb-6 px-6 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-4"
          onClick={() => navigate(`/ai-summary?requestId=${requestId}`)}
        >
          <ChevronLeft className="h-6 w-6 text-neutral-800" />
        </Button>
        <h1 className="text-2xl font-bold text-neutral-800">
          Available Caregivers
        </h1>
      </header>

      <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
        <div className="mb-4 text-neutral-600 text-sm">
          Showing caregivers near you
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F6BFF]" />
            <span className="ml-2 text-neutral-600">
              Finding caregivers near you...
            </span>
          </div>
        ) : error ? (
          <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600">
            <p>There was an error loading caregivers. Please try again.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {caregivers.map((caregiver: any) => (
              <CaregiverCard
                key={caregiver.id}
                id={caregiver.id}
                name={caregiver.fullName || caregiver.username}
                profileImageUrl={caregiver.profileImageUrl}
                rating={caregiver.rating || 4.0}
                distance={caregiver.distance || 1.5}
                isAvailableNow={caregiver.isOnline}
                availabilityText={
                  caregiver.isOnline ? "Available Now" : "Available Later"
                }
                bio={
                  caregiver.bio ||
                  "Experienced caregiver with expertise in senior care."
                }
                hourlyRate={caregiver.hourlyRate || 25}
                isVerified={caregiver.isVerified}
                onSelect={handleSelectCaregiver}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
