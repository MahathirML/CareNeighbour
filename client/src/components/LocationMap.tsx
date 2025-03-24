import React, { useEffect, useState, useRef } from 'react';
import { Loader2, MapPin, Home } from 'lucide-react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationMapProps {
  providerLocation?: Coordinates | null;
  userLocation?: Coordinates | null;
  providerName?: string;
  isLoading?: boolean;
}

// Fallback to showing this generic map component when Google Maps API is not available
export function LocationMap({ 
  providerLocation, 
  userLocation,
  providerName = "Caregiver",
  isLoading = false 
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  useEffect(() => {
    // Function to initialize and load the map
    const initMap = () => {
      if (!window.google || !window.google.maps) {
        setMapError("Google Maps failed to load");
        return;
      }
      
      if (!mapRef.current) return;
      if (!userLocation && !providerLocation) return;
      
      // Use user location as center if provider location is not available
      const center = providerLocation || userLocation;
      if (!center) return;
      
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: center.latitude, lng: center.longitude },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      
      // Add user location marker
      if (userLocation) {
        new google.maps.Marker({
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          map,
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          },
          title: "Your location"
        });
      }
      
      // Add provider location marker
      if (providerLocation) {
        new google.maps.Marker({
          position: { lat: providerLocation.latitude, lng: providerLocation.longitude },
          map,
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
          },
          title: providerName
        });
        
        // Draw a line between the two points if both exist
        if (userLocation) {
          const path = new google.maps.Polyline({
            path: [
              { lat: userLocation.latitude, lng: userLocation.longitude },
              { lat: providerLocation.latitude, lng: providerLocation.longitude }
            ],
            geodesic: true,
            strokeColor: "#4F6BFF",
            strokeOpacity: 0.8,
            strokeWeight: 3
          });
          
          path.setMap(map);
        }
      }
    };
    
    // Load Google Maps API if not already loaded
    if (!window.google || !window.google.maps) {
      setMapError("Unable to load maps at this time");
    } else {
      initMap();
    }
  }, [providerLocation, userLocation, providerName]);
  
  if (isLoading) {
    return (
      <div className="relative w-full h-64 bg-neutral-200 rounded-xl mb-6 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-neutral-400 animate-spin" />
      </div>
    );
  }
  
  if (mapError) {
    return (
      <div className="relative w-full h-64 bg-neutral-200 rounded-xl mb-6 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <MapPin className="h-10 w-10 text-neutral-400 mb-2" />
          <p className="text-center text-neutral-600">{mapError}</p>
        </div>
        
        {/* Fallback static representation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {userLocation && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Home className="h-6 w-6 text-green-500" />
                </div>
              </div>
            )}
            
            {providerLocation && (
              <div className="absolute top-20 left-1/3 transform -translate-x-1/2">
                <div className="relative">
                  <div className="w-10 h-10 bg-[#4F6BFF] rounded-full flex items-center justify-center shadow-lg">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white text-xs font-medium px-2 py-1 rounded shadow-sm whitespace-nowrap">
                    {providerName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-64 bg-neutral-200 rounded-xl mb-6 overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map controls */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-md">
        <MapPin className="h-6 w-6 text-neutral-500" />
      </div>
    </div>
  );
}
