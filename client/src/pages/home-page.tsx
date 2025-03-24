import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden"; // Prevent scrolling

    const timer = setTimeout(() => {
      setButtonsVisible(true);
    }, 2000);

    return () => {
      document.body.style.overflow = "auto"; // Restore scrolling when component unmounts
      clearTimeout(timer);
    };
  }, []);

  const handleFindCaregiver = () => {
    if (user) {
      navigate(
        user.userType === "CARE_SEEKER"
          ? "/care-request"
          : "/caregiver-dashboard",
      );
    } else {
      navigate("/auth");
    }
  };

  const handleOfferAssistance = () => {
    if (user) {
      navigate(
        user.userType === "CARE_PROVIDER"
          ? "/caregiver-dashboard"
          : "/user-type",
      );
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-80 overflow-hidden">
      <h1
        className="text-6xl font-extrabold bg-gradient-to-r from-primary via-purple-800 to-primary bg-clip-text text-transparent opacity-0 animate-[fadeIn_1.5s_ease-in_forwards] mb-6"
        style={{ transform: "translateZ(0)", lineHeight: "1.4" }}
      >
        CareNeighbor
      </h1>

      <p className="text-sm text-neutral-800 max-w-1xl text-center opacity-0 animate-[fadeIn_1.5s_ease-in_0.5s_forwards] mb-6">
        Your trusted partner for compassionate care, connecting you with
        qualified caregivers in minutes.
      </p>

      <div
        className={`flex gap-4 transition-opacity duration-500 ${buttonsVisible ? "opacity-100" : "opacity-0"}`}
      >
        <button
          className="px-6 py-3 text-lg font-semibold text-white rounded-full bg-gradient-to-r from-primary to-purple-600 shadow-lg transition-transform hover:scale-105"
          onClick={handleFindCaregiver}
        >
          Find a Caregiver
        </button>

        <button
          className="px-6 py-3 text-lg font-semibold text-primary rounded-full border-2 border-primary shadow-md bg-white transition-transform hover:scale-105"
          onClick={handleOfferAssistance}
        >
          Offer Assistance
        </button>
      </div>
    </div>
  );
}
