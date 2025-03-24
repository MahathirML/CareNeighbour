import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Clock, Users, AlertTriangle, Bell } from "lucide-react";

interface CareRequestOptionProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: (value: string) => void;
}

function CareRequestOption({ icon, label, value, onClick }: CareRequestOptionProps) {
  return (
    <Button
      variant="outline"
      className="h-auto border border-neutral-300 rounded-xl py-4 px-3 text-center hover:bg-neutral-100 transition flex flex-col items-center justify-center"
      onClick={() => onClick(value)}
    >
      <div className="text-[#FF9F5A] mb-2">{icon}</div>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
    </Button>
  );
}

interface CareRequestOptionsProps {
  onOptionSelected: (option: string) => void;
}

export function CareRequestOptions({ onOptionSelected }: CareRequestOptionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <CareRequestOption
        icon={<Check className="h-6 w-6" />}
        label="Check-in call"
        value="I need someone to check in on my loved one with a phone call."
        onClick={onOptionSelected}
      />
      
      <CareRequestOption
        icon={<Users className="h-6 w-6" />}
        label="Companionship"
        value="I need someone to provide companionship for my loved one."
        onClick={onOptionSelected}
      />
      
      <CareRequestOption
        icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
        label="Urgent assistance"
        value="I need urgent physical assistance for my loved one right now."
        onClick={onOptionSelected}
      />
      
      <CareRequestOption
        icon={<Bell className="h-6 w-6" />}
        label="Medical reminder"
        value="I need someone to help my loved one with medication reminders."
        onClick={onOptionSelected}
      />
    </div>
  );
}
