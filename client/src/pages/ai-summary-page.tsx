import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function AISummaryPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Extract requestId from location state or URL params
  const params = new URLSearchParams(location.split('?')[1] || '');
  const requestId = params.get('requestId');

  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  // Fetch the care request
  const { data: careRequest, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/care-requests", Number(requestId)],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/care-requests/${requestId}`);
        if (!response.ok) {
          throw new Error(`Failed to load care request: ${response.statusText}`);
        }
        return response.json();
      } catch (err) {
        throw new Error("Failed to load care request. Please check your connection and try again.");
      }
    },
    enabled: !!requestId,
    refetchInterval: 5000, // Poll every 5 seconds to check status changes
    retry: 3 // Retry failed requests up to 3 times
  });

  useEffect(() => {
    if (careRequest) {
      setEditedDescription(careRequest.requestDescription);
    }
  }, [careRequest]);

  // Parse request details from JSON string
  const requestDetails = careRequest?.requestDetails 
    ? JSON.parse(careRequest.requestDetails) 
    : [];

  // Update care request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) throw new Error("Request ID is missing");

      const response = await apiRequest("PATCH", `/api/care-requests/${requestId}`, {
        requestDescription: editedDescription
      });

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/care-requests", Number(requestId)], data);
      setIsEditing(false);
      toast({
        title: "Request updated",
        description: "Your care request has been updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating request",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle edit request
  const handleEditRequest = () => {
    if (isEditing) {
      updateRequestMutation.mutate();
    } else {
      setIsEditing(true);
    }
  };

  // Handle confirm and find caregivers
  const handleConfirm = () => {
    navigate(`/caregiver-matching?requestId=${requestId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="pt-12 pb-6 px-6 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-4"
            onClick={() => navigate('/care-request')}
          >
            <ChevronLeft className="h-6 w-6 text-neutral-800" />
          </Button>
          <h1 className="text-2xl font-bold text-neutral-800">Confirm Request</h1>
        </header>

        <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-800 mb-3">
              Just to confirm, you need:
            </h2>
          </div>

          <div className="mb-8 border border-neutral-300 rounded-xl p-6 bg-neutral-100">
            <Skeleton className="w-full h-6 mb-2" />
            <Skeleton className="w-4/5 h-6 mb-8" />

            <div className="mt-6 pt-6 border-t border-neutral-300">
              <h3 className="text-sm font-medium text-neutral-500 uppercase mb-3">Details:</h3>
              <div className="space-y-4">
                <Skeleton className="w-full h-5" />
                <Skeleton className="w-full h-5" />
                <Skeleton className="w-3/4 h-5" />
              </div>
            </div>
          </div>

          <Skeleton className="w-full h-12 mb-6" />
          <Skeleton className="w-full h-14" />
        </main>
      </div>
    );
  }

  if (error || !careRequest) {
    const errorMessage = error instanceof Error ? error.message : "There was an error loading the care request. Please try again.";
    return (
      <div className="min-h-screen flex flex-col">
        <header className="pt-12 pb-6 px-6 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-4"
            onClick={() => navigate('/care-request')}
          >
            <ChevronLeft className="h-6 w-6 text-neutral-800" />
          </Button>
          <h1 className="text-2xl font-bold text-neutral-800">Error</h1>
        </header>

        <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
          <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600">
            <p>{errorMessage}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/care-request')}
            >
              Return to Care Request
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-12 pb-6 px-6 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-4"
          onClick={() => navigate('/care-request')}
        >
          <ChevronLeft className="h-6 w-6 text-neutral-800" />
        </Button>
        <h1 className="text-2xl font-bold text-neutral-800">Confirm Request</h1>
      </header>

      <main className="flex-grow flex flex-col justify-start px-6 pt-2 pb-16">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">
            Just to confirm, you need:
          </h2>
        </div>

        <div className="mb-8 border border-neutral-300 rounded-xl p-6 bg-neutral-100">
          {isEditing ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="mb-4"
              rows={4}
            />
          ) : (
            <p className="text-neutral-700 font-medium">
              {careRequest.requestSummary || careRequest.requestDescription}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-neutral-300">
            <h3 className="text-sm font-medium text-neutral-500 uppercase mb-3">Details:</h3>
            <ul className="space-y-2">
              {requestDetails.length > 0 ? (
                requestDetails.map((detail: string, index: number) => (
                  <li key={index} className="flex">
                    <ChevronRight className="h-5 w-5 text-[#4F6BFF] mr-2 flex-shrink-0" />
                    <span className="text-neutral-700">{detail}</span>
                  </li>
                ))
              ) : (
                <li className="text-neutral-500">No specific details extracted.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-8">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center text-[#4F6BFF] font-medium py-3"
            onClick={handleEditRequest}
            disabled={updateRequestMutation.isPending}
          >
            <Edit className="h-5 w-5 mr-2" />
            {isEditing ? "Save changes" : "Edit request details"}
          </Button>
        </div>

        <Button
          className="w-full bg-[#4F6BFF] text-white py-4 rounded-xl font-semibold text-lg shadow-md hover:bg-opacity-90 transition"
          onClick={handleConfirm}
          disabled={isEditing || updateRequestMutation.isPending}
        >
          Confirm & Find Caregivers
        </Button>
      </main>
    </div>
  );
}