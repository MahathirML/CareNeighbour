import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Home, Calendar, DollarSign, User, Clock, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function CaregiverDashboardPage() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { latitude, longitude } = useGeolocation();
  const [isOnline, setIsOnline] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  
  // Ensure user is a care provider
  useEffect(() => {
    if (user && user.userType !== "CARE_PROVIDER") {
      toast({
        title: "Access denied",
        description: "This area is only for care providers",
        variant: "destructive"
      });
      navigate("/user-type");
    }
  }, [user, navigate, toast]);

  // Get provider status
  const { 
    data: statusData, 
    isLoading: statusLoading 
  } = useQuery({
    queryKey: ["/api/provider-status"],
    enabled: !!user && user.userType === "CARE_PROVIDER",
  });

  // Set initial online status from query data
  useEffect(() => {
    if (statusData && !statusLoading) {
      setIsOnline(statusData.isOnline || false);
    }
  }, [statusData, statusLoading]);

  // Fetch care requests for this provider
  const { 
    data: careRequests, 
    isLoading: requestsLoading,
    error: requestsError 
  } = useQuery({
    queryKey: ["/api/care-requests"],
    enabled: !!user && user.userType === "CARE_PROVIDER",
  });

  // Update provider status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const response = await apiRequest("POST", "/api/provider-status", {
        isOnline,
        latitude,
        longitude
      });
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/provider-status"]
      });
      
      toast({
        title: isOnline ? "You're now online" : "You're now offline",
        description: isOnline ? "You can now receive care requests" : "You won't receive new care requests",
      });
    },
    onError: (error: Error) => {
      setIsOnline(!isOnline); // Revert switch state
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Respond to care request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: number, response: string }) => {
      const apiResponse = await apiRequest("POST", `/api/care-requests/${requestId}/respond`, {
        response
      });
      
      return await apiResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/care-requests"]
      });
      
      toast({
        title: "Response sent",
        description: "Your response has been sent to the care seeker",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error responding to request",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!user?.id) return;

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
          userId: user.id
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new-request') {
          // Sound notification
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.error("Couldn't play notification sound:", e));
          
          // Refresh care requests
          queryClient.invalidateQueries({
            queryKey: ["/api/care-requests"]
          });
          
          toast({
            title: "New care request",
            description: "You've received a new care request",
          });
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
  }, [user?.id, toast]);

  // Update location when online
  useEffect(() => {
    if (!isOnline || !latitude || !longitude || !websocket || websocket.readyState !== WebSocket.OPEN) return;
    
    // Send location updates periodically
    const interval = setInterval(() => {
      websocket.send(JSON.stringify({
        type: 'provider-location-update',
        userId: user?.id,
        latitude,
        longitude
      }));
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [isOnline, latitude, longitude, user?.id, websocket]);

  // Handle online status change
  const handleStatusChange = async (checked: boolean) => {
    setIsOnline(checked);
    updateStatusMutation.mutate(checked);
    
    // Also send update via WebSocket
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'provider-status-update',
        userId: user?.id,
        isOnline: checked,
        latitude,
        longitude
      }));
    }
  };

  // Handle request response
  const handleRequestResponse = (requestId: number, response: string) => {
    respondToRequestMutation.mutate({ requestId, response });
  };

  // Calculate earnings (for display purposes)
  const getTodaysEarnings = () => {
    if (!careRequests) return "$0.00";
    
    const completedRequests = careRequests.filter(
      (req: any) => req.status === "COMPLETED" && 
      new Date(req.createdAt).toDateString() === new Date().toDateString()
    );
    
    const totalEarnings = completedRequests.reduce(
      (sum: number, req: any) => sum + (req.estimatedCost || 0), 
      0
    );
    
    return `$${totalEarnings.toFixed(2)}`;
  };

  // Calculate hours worked
  const getHoursWorked = () => {
    if (!careRequests) return "0 hrs";
    
    const completedRequests = careRequests.filter(
      (req: any) => req.status === "COMPLETED" && 
      new Date(req.createdAt).toDateString() === new Date().toDateString()
    );
    
    const totalMinutes = completedRequests.reduce(
      (sum: number, req: any) => sum + (req.duration || 0), 
      0
    );
    
    return `${(totalMinutes / 60).toFixed(1)} hrs`;
  };

  // Filter new and pending requests
  const newRequests = careRequests 
    ? careRequests.filter((req: any) => req.status === "MATCHED" && req.userProviderId === user?.id)
    : [];
  
  // Filter upcoming and completed sessions
  const todaySessions = careRequests 
    ? careRequests.filter((req: any) => 
        (req.status === "ACCEPTED" || req.status === "COMPLETED") && 
        req.userProviderId === user?.id &&
        new Date(req.createdAt).toDateString() === new Date().toDateString()
      )
    : [];

  // Check if we're still loading data
  const isLoading = !user || statusLoading || requestsLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-12 pb-6 px-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Caregiver Dashboard</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-neutral-500"
          onClick={() => navigate('/profile')}
        >
          <User className="h-6 w-6" />
        </Button>
      </header>
      
      <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
        {isLoading ? (
          <>
            <Skeleton className="w-full h-48 rounded-xl mb-8" />
            <Skeleton className="w-full h-64 rounded-xl mb-8" />
            <Skeleton className="w-48 h-6 mb-4" />
            <Skeleton className="w-full h-32 rounded-xl" />
          </>
        ) : (
          <>
            <Card className="bg-white border border-neutral-300 rounded-xl mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-neutral-800">Availability Status</h2>
                  <div className="flex items-center space-x-3">
                    <Switch 
                      checked={isOnline} 
                      onCheckedChange={handleStatusChange} 
                      disabled={updateStatusMutation.isPending}
                    />
                    <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-neutral-500'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-neutral-500 mr-2" />
                      <span className="text-neutral-700">Today's Earnings</span>
                    </div>
                    <span className="text-neutral-800 font-semibold">{getTodaysEarnings()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-neutral-500 mr-2" />
                      <span className="text-neutral-700">Hours Worked</span>
                    </div>
                    <span className="text-neutral-700">{getHoursWorked()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-neutral-500 mr-2" />
                      <span className="text-neutral-700">Care Sessions</span>
                    </div>
                    <span className="text-neutral-700">
                      {todaySessions.length} today
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {newRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold text-neutral-800 mb-4">New Care Request</h2>
                {newRequests.map((request: any) => (
                  <Card key={request.id} className="bg-white border border-neutral-300 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start mb-4">
                        <Avatar className="w-16 h-16 mr-4 flex-shrink-0">
                          <AvatarFallback>UC</AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="font-semibold text-neutral-800">Care Seeker</h3>
                          <div className="flex items-center mt-1 mb-2">
                            <span className="text-sm text-neutral-500">
                              {request.distance ? `${request.distance.toFixed(1)} miles away` : "Nearby"}
                            </span>
                          </div>
                          
                          <div className="bg-[#4F6BFF] bg-opacity-10 py-1 px-3 rounded text-[#4F6BFF] text-xs font-medium inline-block">
                            {request.urgency || "Needs help now"}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="mb-4" />
                      
                      <div>
                        <h4 className="text-sm font-medium text-neutral-500 uppercase mb-2">Request Details:</h4>
                        <p className="text-neutral-700 mb-3">
                          {request.requestDescription}
                        </p>
                        
                        <div className="space-y-2">
                          {request.requestDetails && JSON.parse(request.requestDetails).map((detail: string, index: number) => (
                            <div key={index} className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4F6BFF] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-sm text-neutral-700">{detail}</span>
                            </div>
                          ))}
                          
                          {request.duration && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4F6BFF] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-sm text-neutral-700">
                                {(request.duration / 60).toFixed(1)} hours 
                                {request.estimatedCost ? ` ($${request.estimatedCost.toFixed(2)} total)` : ''}
                              </span>
                            </div>
                          )}
                          
                          {request.location && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4F6BFF] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-sm text-neutral-700">Address: {request.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="flex border-t border-neutral-300">
                      <Button 
                        variant="ghost"
                        className="flex-1 py-4 text-red-500 font-semibold border-r border-neutral-300"
                        onClick={() => handleRequestResponse(request.id, "DECLINED")}
                        disabled={respondToRequestMutation.isPending}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                      
                      <Button 
                        variant="ghost"
                        className="flex-1 py-4 text-[#4F6BFF] font-semibold"
                        onClick={() => handleRequestResponse(request.id, "ACCEPTED")}
                        disabled={respondToRequestMutation.isPending}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            <h2 className="font-semibold text-neutral-800 mb-4">Today's Schedule</h2>
            <Card className="bg-white border border-neutral-300 rounded-xl">
              <CardContent className="p-4">
                {todaySessions.length > 0 ? (
                  todaySessions.map((session: any, index: number) => (
                    <div key={session.id} className={`flex items-center justify-between py-3 ${index < todaySessions.length - 1 ? 'border-b border-neutral-300' : ''}`}>
                      <div className="flex items-center">
                        <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
                          <AvatarFallback>CS</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-neutral-800">Care Seeker</h3>
                          <span className="text-sm text-neutral-500">
                            {session.scheduledFor 
                              ? new Date(session.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                              : 'Flexible time'}
                            {session.duration ? ` - ${(session.duration / 60).toFixed(1)} hrs` : ''}
                          </span>
                        </div>
                      </div>
                      <div className={`py-1 px-2 rounded text-xs font-medium ${
                        session.status === "COMPLETED" 
                          ? "bg-neutral-100 text-neutral-600" 
                          : "bg-[#4F6BFF] bg-opacity-10 text-[#4F6BFF]"
                      }`}>
                        {session.status === "COMPLETED" ? "Completed" : "Upcoming"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-neutral-500">
                    No scheduled sessions for today
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-6">
              <Button 
                variant="outline"
                className="w-full border border-red-300 text-red-500 rounded-xl py-2"
                onClick={() => logoutMutation.mutate()}
              >
                Log Out
              </Button>
            </div>
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-neutral-300 px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <Button variant="ghost" className="flex flex-col items-center h-auto py-2 px-1">
            <Home className="h-6 w-6 text-[#4F6BFF]" />
            <span className="text-xs text-[#4F6BFF] font-medium mt-1">Home</span>
          </Button>
          
          <Button variant="ghost" className="flex flex-col items-center h-auto py-2 px-1">
            <Calendar className="h-6 w-6 text-neutral-500" />
            <span className="text-xs text-neutral-500 mt-1">Schedule</span>
          </Button>
          
          <Button variant="ghost" className="flex flex-col items-center h-auto py-2 px-1">
            <DollarSign className="h-6 w-6 text-neutral-500" />
            <span className="text-xs text-neutral-500 mt-1">Earnings</span>
          </Button>
          
          <Button variant="ghost" className="flex flex-col items-center h-auto py-2 px-1">
            <User className="h-6 w-6 text-neutral-500" />
            <span className="text-xs text-neutral-500 mt-1">Profile</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
