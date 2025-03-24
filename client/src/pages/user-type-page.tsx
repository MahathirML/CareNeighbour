import React from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Users, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

export default function UserTypePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Handle user type selection
  const updateUserTypeMutation = useMutation({
    mutationFn: async (userType: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await apiRequest("PATCH", `/api/user/${user.id}`, {
        userType
      });
      
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      if (updatedUser.userType === "CARE_SEEKER") {
        toast({
          title: "You're now a care seeker",
          description: "You can now request care for your loved ones"
        });
        navigate("/care-request");
      } else {
        toast({
          title: "You're now a care provider",
          description: "You can now offer care to those in need"
        });
        navigate("/caregiver-dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error setting user type",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleSelectCareSeeker = () => {
    updateUserTypeMutation.mutate("CARE_SEEKER");
  };
  
  const handleSelectCareProvider = () => {
    updateUserTypeMutation.mutate("CARE_PROVIDER");
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-12 pb-6 px-6 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-4"
          onClick={() => navigate('/')}
        >
          <ChevronLeft className="h-6 w-6 text-neutral-800" />
        </Button>
        <h1 className="text-2xl font-bold text-neutral-800">I am a...</h1>
      </header>
      
      <main className="flex-grow flex flex-col justify-start px-6 pt-8 pb-16">
        <div className="mb-8">
          <p className="text-neutral-500">Please select your role to continue</p>
        </div>
        
        <div className="space-y-6 mb-8">
          <Button
            variant="outline"
            className="w-full flex items-start bg-white border-2 border-[#4F6BFF] p-6 rounded-xl hover:bg-[#4F6BFF] hover:bg-opacity-5 transition justify-start h-auto"
            onClick={handleSelectCareSeeker}
            disabled={updateUserTypeMutation.isPending}
          >
            <div className="bg-[#4F6BFF] bg-opacity-10 rounded-full p-3 mr-4">
              <Users className="h-8 w-8 text-[#4F6BFF]" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-neutral-800 mb-1">Care Seeker</h3>
              <p className="text-neutral-500 text-sm">I'm looking for assistance for my loved one</p>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full flex items-start bg-white border border-neutral-300 p-6 rounded-xl hover:bg-neutral-100 transition justify-start h-auto"
            onClick={handleSelectCareProvider}
            disabled={updateUserTypeMutation.isPending}
          >
            <div className="bg-[#6FCF97] bg-opacity-10 rounded-full p-3 mr-4">
              <User className="h-8 w-8 text-[#6FCF97]" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-neutral-800 mb-1">Care Provider</h3>
              <p className="text-neutral-500 text-sm">I'm a qualified caregiver looking to help</p>
            </div>
          </Button>
        </div>
        
        {updateUserTypeMutation.isPending && (
          <p className="text-center text-neutral-500">Setting your role...</p>
        )}
      </main>
    </div>
  );
}
