import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, MapPin, User, Bell, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function WaitingConfirmationPage() {
  const [location, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { latitude, longitude } = useGeolocation();
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const requestId = params.id;

  // Fetch care request details
  const { 
    data: careRequest, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/care-requests", Number(requestId)],
    enabled: !!requestId,
    refetchInterval: 5000, // Poll every 5 seconds to check status changes
  });

  // Fetch provider details if assigned
  const { 
    data: provider, 
    isLoading: providerLoading 
  } = useQuery({
    queryKey: ["/api/providers", careRequest?.userProviderId],
    enabled: !!careRequest?.userProviderId,
  });

  // Mutation to cancel request
  const cancelRequestMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) throw new Error("Request ID is missing");
      
      const response = await apiRequest("PATCH", `/api/care-requests/${requestId}`, {
        status: "CANCELLED"
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request cancelled",
        description: "Your care request has been cancelled"
      });
      navigate('/care-request');
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling request",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!requestId) return;

    // Connect to WebSocket using the same host:port as the current page
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log("Connecting to WebSocket at:", wsUrl);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      // Register client for updates
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'register-client',
          userId: careRequest?.userSeekerId
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'request-response' && data.requestId === Number(requestId)) {
          if (data.status === 'ACCEPTED') {
            queryClient.invalidateQueries({
              queryKey: ["/api/care-requests", Number(requestId)]
            });
            navigate(`/caregiver-tracking/${requestId}`);
          } else if (data.status === 'DECLINED') {
            toast({
              title: "Request declined",
              description: "The caregiver has declined your request. Please try another caregiver.",
              variant: "destructive"
            });
            navigate(`/caregiver-matching?requestId=${requestId}`);
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWebsocket(socket);

    return () => {
      socket.close();
    };
  }, [requestId, careRequest?.userSeekerId, navigate, toast]);

  // Handle cancel request
  const handleCancelRequest = () => {
    cancelRequestMutation.mutate();
  };

  // Simulate caregiver acceptance (for demo purposes)
  const simulateAcceptance = async () => {
    try {
      // Update request status to ACCEPTED
      await apiRequest("PATCH", `/api/care-requests/${requestId}`, {
        status: "ACCEPTED"
      });
      
      toast({
        title: "Request accepted",
        description: "The caregiver has accepted your request"
      });
      
      navigate(`/caregiver-tracking/${requestId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not simulate acceptance",
        variant: "destructive"
      });
    }
  };

  // Format estimated cost
  const formatCost = (duration?: number, rate?: number) => {
    if (!duration || !rate) return "Unknown";
    const hours = duration / 60; // Convert minutes to hours
    return `$${(hours * rate).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="pt-12 pb-6 px-6">
          <h1 className="text-2xl font-bold text-neutral-800 text-center">Request Sent</h1>
        </header>
        
        <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
          <div className="flex flex-col items-center mb-8">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="w-48 h-6 mb-2" />
            <Skeleton className="w-64 h-4" />
          </div>
          
          <div className="border-t border-b border-neutral-300 py-6 mb-8">
            <Skeleton className="w-40 h-4 mb-4" />
            <div className="space-y-4">
              <div className="flex">
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <div>
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-32 h-3" />
                </div>
              </div>
              <div className="flex">
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <div>
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-32 h-3" />
                </div>
              </div>
              <div className="flex">
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <div>
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-32 h-3" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !careRequest) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="pt-12 pb-6 px-6">
          <h1 className="text-2xl font-bold text-neutral-800 text-center">Error</h1>
        </header>
        
        <main className="flex-grow flex flex-col justify-center items-center px-6">
          <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600 w-full max-w-md">
            <p className="text-center">There was an error loading the request information.</p>
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/caregiver-matching')}
              >
                Back to Caregivers
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Get provider name
  const providerName = provider?.fullName || provider?.username || "Caregiver";
  const providerInitials = providerName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  // Parse request details from JSON string
  const requestDetails = careRequest.requestDetails 
    ? JSON.parse(careRequest.requestDetails) 
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-12 pb-6 px-6">
        <h1 className="text-2xl font-bold text-neutral-800 text-center">Request Sent</h1>
      </header>
      
      <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Clock className="h-12 w-12 text-[#4F6BFF]" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">
            Waiting for {providerName}'s response
          </h2>
          <p className="text-neutral-500 text-center">
            Your request has been sent to {providerName}. We'll notify you once they respond.
          </p>
        </div>
        
        <div className="border-t border-b border-neutral-300 py-6 mb-8">
          <h3 className="text-sm font-medium text-neutral-500 uppercase mb-4">Request Details</h3>
          <div className="space-y-4">
            <div className="flex">
              <div className="w-12 h-12 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <User className="h-6 w-6 text-[#4F6BFF]" />
              </div>
              <div>
                <h4 className="font-medium text-neutral-800">Caregiver</h4>
                <div className="flex items-center mt-1">
                  <Avatar className="w-6 h-6 mr-2">
                    <AvatarImage src={provider?.profileImageUrl || ""} alt={providerName} />
                    <AvatarFallback>{providerInitials}</AvatarFallback>
                  </Avatar>
                  <p className="text-neutral-500">{providerName}</p>
                </div>
              </div>
            </div>
            
            <div className="flex">
              <div className="w-12 h-12 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Clock className="h-6 w-6 text-[#4F6BFF]" />
              </div>
              <div>
                <h4 className="font-medium text-neutral-800">Duration</h4>
                <p className="text-neutral-500">
                  {careRequest.duration ? `${careRequest.duration / 60} hours` : 'Not specified'} 
                  {careRequest.duration && provider?.hourlyRate && ` (Estimated: ${formatCost(careRequest.duration, provider.hourlyRate)})`}
                </p>
              </div>
            </div>
            
            <div className="flex">
              <div className="w-12 h-12 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Bell className="h-6 w-6 text-[#4F6BFF]" />
              </div>
              <div>
                <h4 className="font-medium text-neutral-800">Services</h4>
                <p className="text-neutral-500">
                  {requestDetails.length > 0 
                    ? requestDetails.join(', ') 
                    : careRequest.requestSummary || 'Care services'}
                </p>
              </div>
            </div>
            
            {careRequest.location && (
              <div className="flex">
                <div className="w-12 h-12 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Home className="h-6 w-6 text-[#4F6BFF]" />
                </div>
                <div>
                  <h4 className="font-medium text-neutral-800">Location</h4>
                  <p className="text-neutral-500">{careRequest.location}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <Button
            className="w-full bg-[#4F6BFF] text-white py-4 rounded-xl font-semibold text-lg shadow-md hover:bg-opacity-90 transition"
            onClick={simulateAcceptance}
          >
            Simulate Acceptance
          </Button>
          
          <Button
            variant="outline"
            className="w-full bg-white border border-neutral-300 text-neutral-700 py-4 rounded-xl font-semibold text-lg hover:bg-neutral-100 transition"
            onClick={handleCancelRequest}
            disabled={cancelRequestMutation.isPending}
          >
            {cancelRequestMutation.isPending ? "Cancelling..." : "Cancel Request"}
          </Button>
        </div>
      </main>
    </div>
  );
}
