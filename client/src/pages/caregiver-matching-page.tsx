import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaregiverCard } from "@/components/CaregiverCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CaregiverMatchingPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get location
  // const { latitude, longitude, loading: locationLoading } = useGeolocation();
  
  // Extract requestId from URL params
  const params = new URLSearchParams(location.split('?')[1] || '');
  const requestId = params.get('requestId');
  
  // Filter states
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Fetch caregivers
  const { data: caregivers, isLoading: caregiversLoading, error } = useQuery({
    queryKey: ["/api/providers", { latitude, longitude }],
    enabled: !!latitude && !!longitude && !locationLoading,
  });
  
  // Filtered caregivers
  const filteredCaregivers = React.useMemo(() => {
    if (!caregivers) return [];
    
    return caregivers.filter((caregiver: any) => {
      // Filter by availability
      if (activeFilters.includes("available-now") && !caregiver.isOnline) {
        return false;
      }
      
      // Filter by verification
      if (activeFilters.includes("verified") && !caregiver.isVerified) {
        return false;
      }
      
      // Filter by rating for top-rated
      if (activeFilters.includes("top-rated") && caregiver.rating < 4.5) {
        return false;
      }
      
      return true;
    });
  }, [caregivers, activeFilters]);
  
  // Toggle filter
  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };
  
  // Match caregiver mutation
  const matchCaregiverMutation = useMutation({
    mutationFn: async (caregiverId: number) => {
      if (!requestId) throw new Error("Request ID is missing");
      
      const response = await apiRequest("POST", `/api/care-requests/${requestId}/match`, {
        providerId: caregiverId
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/care-requests", Number(requestId)], data);
      toast({
        title: "Caregiver requested",
        description: "Your request has been sent to the caregiver"
      });
      navigate(`/waiting-confirmation/${requestId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error requesting caregiver",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle caregiver selection
  const handleSelectCaregiver = (caregiverId: number) => {
    matchCaregiverMutation.mutate(caregiverId);
  };
  
  const isLoading = locationLoading || caregiversLoading;
  
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
        <h1 className="text-2xl font-bold text-neutral-800">Available Caregivers</h1>
      </header>
      
      <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-800">Nearby Caregivers</h2>
            <Button variant="ghost" size="sm" className="text-[#4F6BFF] font-medium flex items-center">
              <Filter className="h-5 w-5 mr-1" />
              Filter
            </Button>
          </div>
          
          <ScrollArea className="w-full mt-4">
            <div className="flex space-x-3 pb-2">
              <Badge
                variant={activeFilters.includes("available-now") ? "default" : "outline"}
                className={`py-2 px-4 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeFilters.includes("available-now") 
                    ? "bg-[#4F6BFF]" 
                    : "bg-white text-neutral-700"
                }`}
                onClick={() => toggleFilter("available-now")}
              >
                Available Now
              </Badge>
              
              <Badge
                variant={activeFilters.includes("available-later") ? "default" : "outline"}
                className={`py-2 px-4 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeFilters.includes("available-later") 
                    ? "bg-[#4F6BFF]" 
                    : "bg-white text-neutral-700"
                }`}
                onClick={() => toggleFilter("available-later")}
              >
                Available Later
              </Badge>
              
              <Badge
                variant={activeFilters.includes("verified") ? "default" : "outline"}
                className={`py-2 px-4 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeFilters.includes("verified") 
                    ? "bg-[#4F6BFF]" 
                    : "bg-white text-neutral-700"
                }`}
                onClick={() => toggleFilter("verified")}
              >
                Verified Only
              </Badge>
              
              <Badge
                variant={activeFilters.includes("top-rated") ? "default" : "outline"}
                className={`py-2 px-4 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeFilters.includes("top-rated") 
                    ? "bg-[#4F6BFF]" 
                    : "bg-white text-neutral-700"
                }`}
                onClick={() => toggleFilter("top-rated")}
              >
                Top Rated
              </Badge>
            </div>
          </ScrollArea>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F6BFF]" />
            <span className="ml-2 text-neutral-600">Finding caregivers near you...</span>
          </div>
        ) : error ? (
          <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600">
            <p>There was an error loading caregivers. Please try again.</p>
          </div>
        ) : filteredCaregivers.length === 0 ? (
          <div className="p-6 border border-neutral-200 bg-neutral-50 rounded-xl text-neutral-600 text-center">
            <p>No caregivers found matching your filters.</p>
            <p className="mt-2 text-sm">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCaregivers.map((caregiver: any) => (
              <CaregiverCard
                key={caregiver.id}
                id={caregiver.id}
                name={caregiver.fullName || caregiver.username}
                profileImageUrl={caregiver.profileImageUrl}
                rating={caregiver.rating || 4.0}
                distance={caregiver.distance || 1.5}
                isAvailableNow={caregiver.isOnline}
                availabilityText={caregiver.isOnline ? "Available Now" : "Available Later"}
                bio={caregiver.bio || "Experienced caregiver with expertise in senior care."}
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
