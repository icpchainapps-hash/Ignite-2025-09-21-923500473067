import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { Event } from '../backend';

interface MapComponentProps {
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  className?: string;
  height?: string;
  showControls?: boolean;
  onLocationFound?: (lat: number, lng: number) => void;
  event?: Event;
  readOnly?: boolean;
}

interface Coordinates {
  lat: number;
  lng: number;
}

// Leaflet types for TypeScript
declare global {
  interface Window {
    L: any;
  }
}

export default function MapComponent({
  address,
  suburb,
  state,
  postcode,
  className = '',
  height = '300px',
  showControls = true,
  onLocationFound,
  event,
  readOnly = false
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS and JS
  useEffect(() => {
    const loadLeaflet = async () => {
      // Check if Leaflet is already loaded
      if (window.L) {
        setLeafletLoaded(true);
        return;
      }

      try {
        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        
        script.onload = () => {
          setLeafletLoaded(true);
        };
        
        script.onerror = () => {
          console.error('Failed to load Leaflet');
          setError('Failed to load map library');
        };
        
        document.head.appendChild(script);
      } catch (err) {
        console.error('Error loading Leaflet:', err);
        setError('Failed to load map library');
      }
    };

    loadLeaflet();
  }, []);

  // Geocoding function using Nominatim (OpenStreetMap's geocoding service)
  const geocodeAddress = async (fullAddress: string): Promise<Coordinates | null> => {
    try {
      const encodedAddress = encodeURIComponent(fullAddress);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };

  // Create or update the Leaflet map
  const createOrUpdateMap = (container: HTMLDivElement, lat: number, lng: number) => {
    if (!window.L) {
      console.error('Leaflet not loaded');
      return;
    }

    try {
      // If map already exists, just update the view
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 15);
        
        // Update marker position
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          // Create new marker if it doesn't exist
          markerRef.current = window.L.marker([lat, lng])
            .addTo(mapInstanceRef.current)
            .bindPopup(getDisplayAddress())
            .openPopup();
        }
        
        setMapLoaded(true);
        return;
      }

      // Create new map instance
      const map = window.L.map(container, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true,
        attributionControl: true
      });

      // Add OpenStreetMap tile layer with proper attribution
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0,
      }).addTo(map);

      // Add marker for the location
      const marker = window.L.marker([lat, lng])
        .addTo(map)
        .bindPopup(getDisplayAddress())
        .openPopup();

      // Store references
      mapInstanceRef.current = map;
      markerRef.current = marker;
      
      setMapLoaded(true);

      // Handle map events
      map.on('load', () => {
        console.log('Map loaded successfully');
      });

      map.on('error', (e: any) => {
        console.error('Map error:', e);
        setError('Map failed to load properly');
      });

    } catch (err) {
      console.error('Error creating map:', err);
      setError('Failed to create map');
    }
  };

  // Update coordinates when address changes
  useEffect(() => {
    const updateLocation = async () => {
      // Only geocode if we have at least address and suburb
      if (!address?.trim() || !suburb?.trim()) {
        setCoordinates(null);
        setError(null);
        setMapLoaded(false);
        return;
      }

      const fullAddress = [address, suburb, state, postcode]
        .filter(Boolean)
        .join(', ');

      if (fullAddress.length < 10) return; // Minimum address length

      setIsLoading(true);
      setError(null);
      setMapLoaded(false);

      try {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          setCoordinates(coords);
          if (onLocationFound) {
            onLocationFound(coords.lat, coords.lng);
          }
        } else {
          setError('Location not found');
        }
      } catch (err) {
        setError('Failed to find location');
        console.error('Geocoding failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the geocoding request
    const timeoutId = setTimeout(updateLocation, 500);
    return () => clearTimeout(timeoutId);
  }, [address, suburb, state, postcode, onLocationFound]);

  // Create or update map when coordinates change
  useEffect(() => {
    if (coordinates && mapRef.current && leafletLoaded) {
      createOrUpdateMap(mapRef.current, coordinates.lat, coordinates.lng);
    }
  }, [coordinates, leafletLoaded]);

  // Cleanup map when component unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handleRetryGeocode = () => {
    if (address?.trim() && suburb?.trim()) {
      setError(null);
      const fullAddress = [address, suburb, state, postcode]
        .filter(Boolean)
        .join(', ');
      
      setIsLoading(true);
      setMapLoaded(false);
      geocodeAddress(fullAddress)
        .then(coords => {
          if (coords) {
            setCoordinates(coords);
            if (onLocationFound) {
              onLocationFound(coords.lat, coords.lng);
            }
          } else {
            setError('Location not found');
          }
        })
        .catch(() => {
          setError('Failed to find location');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  const fullAddress = [address, suburb, state, postcode]
    .filter(Boolean)
    .join(', ');

  const getDisplayAddress = () => {
    return fullAddress;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">Event Location</span>
          </div>
          <div className="flex items-center space-x-2">
            {error && (
              <button
                onClick={handleRetryGeocode}
                className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center space-x-1"
                disabled={isLoading}
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map Container - Always visible */}
      <div 
        ref={mapRef}
        className="w-full border border-slate-700 rounded-xl overflow-hidden bg-slate-800"
        style={{ height }}
      >
        {!leafletLoaded ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Loading map library...</p>
              <p className="text-slate-300 text-sm font-medium">Preparing interactive map</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Finding location...</p>
              <p className="text-slate-300 text-sm font-medium">Geocoding address</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center p-4">
              <AlertCircle className="w-8 h-8 text-orange-400 mx-auto mb-3" />
              <p className="text-orange-400 text-sm font-medium mb-2">{error}</p>
              <button
                onClick={handleRetryGeocode}
                className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center space-x-1 mx-auto"
                disabled={isLoading}
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : !coordinates ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center p-4">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Enter address to show location</p>
              <p className="text-slate-500 text-xs mt-1">
                Fill in the address fields to see the location on the map
              </p>
            </div>
          </div>
        ) : mapLoaded ? null : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Loading map tiles...</p>
              <p className="text-slate-300 text-sm font-medium">Rendering geographic details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
