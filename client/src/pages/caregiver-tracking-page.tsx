import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Phone, MessageSquare, Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LocationMap } from "@/components/LocationMap";
import { Skeleton } from "@/components/ui/skeleton";

export default function CaregiverTrackingPage() {
  const [location, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { latitude, longitude } = useGeolocation();
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [providerLocation, setProviderLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<string>("Calculating...");
  const requestId = params.id;

  // Fetch care request details
  const { 
    data: careRequest, 
    isLoading: requestLoading, 
    error: requestError 
  } = useQuery({
    queryKey: ["/api/care-requests", Number(requestId)],
    enabled: !!requestId,
  });

  // Fetch provider details
  const { 
    data: provider, 
    isLoading: providerLoading, 
    error: providerError 
  } = useQuery({
    queryKey: ["/api/providers", careRequest?.userProviderId],
    enabled: !!careRequest?.userProviderId,
  });

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!requestId || !careRequest?.userSeekerId) return;

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
          userId: careRequest.userSeekerId
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'caregiver-location' && data.providerId === careRequest.userProviderId) {
          setProviderLocation({
            latitude: data.latitude,
            longitude: data.longitude
          });
          
          // Calculate estimated arrival time (very simple calculation)
          if (latitude && longitude) {
            const distance = calculateDistance(
              latitude, 
              longitude, 
              data.latitude, 
              data.longitude
            );
            
            // Assuming average speed of 30mph in a city
            const timeInMinutes = Math.round((distance / 30) * 60);
            setEstimatedArrival(timeInMinutes <= 1 ? "1 minute" : `${timeInMinutes} minutes`);
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
  }, [requestId, careRequest?.userSeekerId, careRequest?.userProviderId, latitude, longitude]);

  // Calculate distance between two coordinates (Haversine formula)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance * 0.621371; // Convert to miles
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Handle cancel care
  const handleCancelCare = async () => {
    try {
      await apiRequest("PATCH", `/api/care-requests/${requestId}`, {
        status: "CANCELLED"
      });
      
      toast({
        title: "Care cancelled",
        description: "The care request has been cancelled"
      });
      
      navigate('/care-request');
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not cancel care request",
        variant: "destructive"
      });
    }
  };

  // Mock call and message functionality
  const handleCallCaregiver = () => {
    toast({
      title: "Calling caregiver",
      description: `Initiating call to ${provider?.fullName || provider?.username || "caregiver"}...`
    });
  };

  const handleMessageCaregiver = () => {
    toast({
      title: "Messaging caregiver",
      description: `Opening chat with ${provider?.fullName || provider?.username || "caregiver"}...`
    });
  };

  // For demo purposes, simulate provider movement when location is missing
  useEffect(() => {
    if (!providerLocation && latitude && longitude && !requestLoading && !providerLoading) {
      // Create a simulated position slightly away from user
      const simulatedLat = latitude + (Math.random() * 0.01 - 0.005);
      const simulatedLng = longitude + (Math.random() * 0.01 - 0.005);
      
      setProviderLocation({
        latitude: simulatedLat,
        longitude: simulatedLng
      });
      
      // Simulate getting closer every few seconds
      const interval = setInterval(() => {
        setProviderLocation(prev => {
          if (!prev || !latitude || !longitude) return prev;
          
          // Move slightly closer to user's location
          const newLat = prev.latitude + (latitude - prev.latitude) * 0.1;
          const newLng = prev.longitude + (longitude - prev.longitude) * 0.1;
          
          // Calculate new estimated arrival
          const distance = calculateDistance(latitude, longitude, newLat, newLng);
          const timeInMinutes = Math.round((distance / 30) * 60);
          setEstimatedArrival(timeInMinutes <= 1 ? "1 minute" : `${timeInMinutes} minutes`);
          
          return {
            latitude: newLat,
            longitude: newLng
          };
        });
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [latitude, longitude, providerLocation, requestLoading, providerLoading]);
  
  const isLoading = requestLoading || providerLoading;
  const error = requestError || providerError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="pt-12 pb-6 px-6 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>
        
        <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
          <Skeleton className="w-full h-64 rounded-xl mb-6" />
          
          <Skeleton className="w-full h-32 rounded-xl mb-8" />
          
          <div className="flex space-x-4 mb-8">
            <Skeleton className="flex-1 h-24 rounded-xl" />
            <Skeleton className="flex-1 h-24 rounded-xl" />
          </div>
          
          <Skeleton className="w-full h-14 rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !careRequest) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="pt-12 pb-6 px-6">
          <h1 className="text-2xl font-bold text-neutral-800">Error</h1>
        </header>
        
        <main className="flex-grow flex flex-col justify-center items-center px-6">
          <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600 w-full max-w-md">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <h2 className="font-semibold">Could not load tracking information</h2>
            </div>
            <p>There was an error loading the caregiver tracking information.</p>
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
              >
                Return Home
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Get provider name and initials
  const providerName = provider?.fullName || provider?.username || "Caregiver";
  const providerInitials = providerName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  // Distance calculation
  const distance = providerLocation && latitude && longitude ? 
    calculateDistance(latitude, longitude, providerLocation.latitude, providerLocation.longitude).toFixed(1) : 
    "Calculating...";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-12 pb-6 px-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">{providerName} is on the way</h1>
        <Button variant="ghost" size="icon" className="text-neutral-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </Button>
      </header>
      
      <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
        <LocationMap 
          providerLocation={providerLocation}
          userLocation={latitude && longitude ? {latitude, longitude} : null}
          providerName={providerName}
          isLoading={!providerLocation || !latitude || !longitude}
        />
        
        <div className="bg-white border border-neutral-300 rounded-xl p-6 mb-8">
          <div className="flex mb-4">
            <Avatar className="w-16 h-16 mr-4">
              <AvatarImage src={provider?.profileImageUrl || ""} alt={providerName} />
              <AvatarFallback>{providerInitials}</AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-neutral-800">{providerName}</h2>
              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  <span className="text-sm text-neutral-700 ml-1">{provider?.rating?.toFixed(1) || "4.8"}</span>
                </div>
                <span className="mx-2 text-neutral-300">|</span>
                <span className="text-sm text-neutral-500">
                  {provider?.totalReviews ? `${provider.totalReviews} care sessions` : "Experienced caregiver"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-neutral-500 mr-2" />
                <span className="text-neutral-700">Estimated arrival</span>
              </div>
              <span className="text-[#4F6BFF] font-medium">{estimatedArrival}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-neutral-500 mr-2" />
                <span className="text-neutral-700">Distance</span>
              </div>
              <span className="text-neutral-700">{distance} miles away</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4 mb-8">
          <Button 
            variant="outline"
            className="flex-1 bg-white border border-neutral-300 flex flex-col items-center justify-center py-4 rounded-xl hover:bg-neutral-100"
            onClick={handleCallCaregiver}
          >
            <div className="w-12 h-12 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
              <Phone className="h-6 w-6 text-[#4F6BFF]" />
            </div>
            <span className="text-neutral-700 font-medium">Call</span>
          </Button>
          
          <Button 
            variant="outline"
            className="flex-1 bg-white border border-neutral-300 flex flex-col items-center justify-center py-4 rounded-xl hover:bg-neutral-100"
            onClick={handleMessageCaregiver}
          >
            <div className="w-12 h-12 bg-[#4F6BFF] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
              <MessageSquare className="h-6 w-6 text-[#4F6BFF]" />
            </div>
            <span className="text-neutral-700 font-medium">Message</span>
          </Button>
        </div>
        
        <Button
          variant="outline" 
          className="w-full border border-red-500 text-red-500 py-4 rounded-xl font-semibold text-lg hover:bg-red-50 transition"
          onClick={handleCancelCare}
        >
          Cancel Care
        </Button>
      </main>
    </div>
  );
}
