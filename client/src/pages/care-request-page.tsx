import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { CareRequestOptions } from "@/components/CareRequestOptions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";

export default function CareRequestPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [requestText, setRequestText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const { latitude, longitude } = useGeolocation();

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    error: speechError,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setRequestText(transcript);
  }, [transcript]);

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!requestText.trim()) {
        throw new Error("Please describe the care needed");
      }

      const response = await apiRequest("POST", "/api/care-requests", {
        requestDescription: requestText,
        latitude,
        longitude,
        userSeekerId: user?.id,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/care-requests", data.id], data);
      toast({
        title: "Request Created",
        description: "Care request submitted successfully",
      });
      navigate(`/ai-summary?requestId=${data.id}`);
    },
    onError: (error) => {
      console.error("Care request error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickOptionSelect = (optionText) => setRequestText(optionText);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a request description",
        variant: "destructive",
      });
      return;
    }
    createRequestMutation.mutate();
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
      setIsRecording(false);
    } else {
      resetTranscript();
      startListening();
      setIsRecording(true);

      setTimeout(() => {
        stopListening();
        setIsRecording(false);
      }, 10000);
    }
  };

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Speech not supported",
        description: "Your browser doesn't support speech recognition",
        variant: "destructive",
        duration: 5000,
      });
    }
    if (speechError) {
      toast({
        title: "Speech Error",
        description: speechError,
        variant: "destructive",
      });
      setIsRecording(false);
    }
  }, [browserSupportsSpeechRecognition, speechError, toast]);

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 bg-white">
      <header className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-4"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <h1 className="text-2xl font-semibold text-gray-800">Request Care</h1>
      </header>

      <h2 className="text-xl font-medium text-gray-900 mb-2">
        How can we help your loved one?
      </h2>
      <p className="text-gray-500 mb-6">
        Describe the care needed or select a quick option below
      </p>

      <div className="mb-6">
        <CareRequestOptions onOptionSelected={handleQuickOptionSelect} />
      </div>

      <div className="relative flex justify-center mb-6">
        <Button
          variant="outline"
          className={`w-full h-14 rounded-lg flex items-center justify-center border-2 border-dashed ${
            isRecording ? "border-red-500" : "border-blue-500"
          } transition`}
          onClick={handleVoiceInput}
          disabled={
            !browserSupportsSpeechRecognition || createRequestMutation.isPending
          }
        >
          <Mic
            className={`h-6 w-6 mr-2 ${isRecording ? "text-red-500" : "text-blue-500"}`}
          />
          {isRecording ? "Listening..." : "Tap to Speak"}
        </Button>
      </div>

      <div className="mb-6">
        <Textarea
          id="care-request-text"
          rows={4}
          className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 p-3"
          placeholder="Type your request here..."
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          disabled={createRequestMutation.isPending}
        />
      </div>

      <Button
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg shadow-md hover:bg-blue-700 transition"
        onClick={handleSubmit}
        disabled={!requestText.trim() || createRequestMutation.isPending}
      >
        {createRequestMutation.isPending ? "Processing..." : "Continue"}
      </Button>
    </div>
  );
}
