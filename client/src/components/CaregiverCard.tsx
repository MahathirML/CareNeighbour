import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarIcon, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

interface CaregiverCardProps {
  id: number;
  name: string;
  profileImageUrl?: string | null;
  rating: number;
  distance: number;
  isAvailableNow: boolean;
  availabilityText?: string;
  bio: string;
  hourlyRate: number;
  isVerified: boolean;
  onSelect: (caregiverId: number) => void;
}

export function CaregiverCard({
  id,
  name,
  profileImageUrl,
  rating,
  distance,
  isAvailableNow,
  availabilityText = "Available Now",
  bio,
  hourlyRate,
  isVerified,
  onSelect
}: CaregiverCardProps) {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
    
  return (
    <Card className="border border-neutral-300 rounded-xl overflow-hidden mb-6">
      <div className="p-4 flex">
        <div className="mr-4 relative">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profileImageUrl || ""} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-status-success text-white rounded-full p-1">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>
        
        <div className="flex-grow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-neutral-800">{name}</h3>
              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-neutral-700 ml-1">{rating.toFixed(1)}</span>
                </div>
                <span className="mx-2 text-neutral-300">|</span>
                <span className="text-sm text-neutral-500">{distance.toFixed(1)} miles away</span>
              </div>
            </div>
            
            <div 
              className={`${
                isAvailableNow 
                  ? "bg-green-100 text-green-600" 
                  : "bg-neutral-100 text-neutral-600"
              } py-1 px-2 rounded text-xs font-medium`}
            >
              {availabilityText}
            </div>
          </div>
          
          <p className="text-sm text-neutral-500 mt-2 line-clamp-2">
            {bio}
          </p>
        </div>
      </div>
      
      <div className="border-t border-neutral-300 px-4 py-3 flex justify-between items-center bg-neutral-100">
        <div>
          <span className="text-neutral-500 text-sm">Rate:</span>
          <span className="text-neutral-800 font-semibold ml-1">${hourlyRate}/hr</span>
        </div>
        
        <Button 
          className="bg-[#4F6BFF] hover:bg-[#3D5CFF] text-white py-2 px-4 rounded-lg font-medium text-sm"
          onClick={() => onSelect(id)}
        >
          Request Care
        </Button>
      </div>
    </Card>
  );
}
