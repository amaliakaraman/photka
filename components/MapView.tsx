"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { NASHVILLE } from "@/constants/locations"

declare global {
  interface Window {
    google: any
  }
}

interface MapViewProps {
  isSearching: boolean
  photographerFound: boolean
  onLocationFound?: (coords: { lat: number; lng: number }) => void
  userCoords?: { lat: number; lng: number } | null
  photographerCoords?: { lat: number; lng: number } | null
  photographerMatched?: boolean // New prop to reduce blur when matched
}

export function MapView({ 
  isSearching, 
  photographerFound, 
  onLocationFound,
  userCoords: externalUserCoords,
  photographerCoords,
  photographerMatched = false
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const photographerMarkerRef = useRef<any>(null)
  const routePolylineRef = useRef<any>(null)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === "undefined" || mapsLoaded) return

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      if (window.google && window.google.maps) {
        setMapsLoaded(true)
      } else {
        existingScript.addEventListener('load', () => setMapsLoaded(true))
      }
      return
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapsLoaded(true)
      return
    }

    const script = document.createElement("script")
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google && window.google.maps) {
        setMapsLoaded(true)
      }
    }
    script.onerror = () => {
      console.error('Failed to load Google Maps API. Check your API key and ensure Maps JavaScript API is enabled.')
    }
    script.id = 'google-maps-script'
    document.head.appendChild(script)
  }, [mapsLoaded])

  // Initialize map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current || typeof window === "undefined" || !window.google) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: NASHVILLE,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: false, // No +/- buttons
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy", // Allow pinch-to-zoom (trackpad on macOS) and scroll
      styles: [
        // Base styling - dark neutral
        {
          featureType: "all",
          elementType: "geometry",
          stylers: [{ color: "#1a1a1a" }],
        },
        {
          featureType: "all",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca3af" }, { lightness: 20 }],
        },
        {
          featureType: "all",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#000000" }, { lightness: 13 }],
        },
        // Water - subtle blue
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#1e3a5f" }, { lightness: -10 }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#60a5fa" }, { lightness: 10 }],
        },
        // Roads - light gray with blue accents
        {
          featureType: "road.highway",
          elementType: "geometry.fill",
          stylers: [{ color: "#2a2a2a" }, { lightness: 15 }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#3b82f6" }, { lightness: 25 }, { weight: 0.5 }],
        },
        {
          featureType: "road.arterial",
          elementType: "geometry",
          stylers: [{ color: "#252525" }, { lightness: 10 }],
        },
        {
          featureType: "road.local",
          elementType: "geometry",
          stylers: [{ color: "#1f1f1f" }],
        },
        {
          featureType: "road.local",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "road.arterial",
          elementType: "labels",
          stylers: [{ visibility: "simplified" }],
        },
        // Parks/Green spaces - subtle dark green
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#1a2e1a" }, { lightness: 5 }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b7280" }],
        },
        // Buildings - dark gray
        {
          featureType: "poi",
          elementType: "geometry",
          stylers: [{ color: "#2a2a2a" }, { lightness: 5 }],
        },
        {
          featureType: "poi",
          stylers: [{ visibility: "off" }],
        },
        // Transit - hide
        {
          featureType: "transit",
          stylers: [{ visibility: "off" }],
        },
        // Labels - subtle
        {
          featureType: "administrative",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b7280" }],
        },
        {
          featureType: "administrative",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#000000" }, { lightness: 13 }],
        },
        // Hide district/neighborhood names
        {
          featureType: "administrative.locality",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "administrative.neighborhood",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "administrative.land_parcel",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    })

    mapInstanceRef.current = map
  }, [mapsLoaded])

  // Use external coords if provided, otherwise get from geolocation
  useEffect(() => {
    if (externalUserCoords) {
      setUserLocation(externalUserCoords)
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(coords)
          onLocationFound?.(coords)
        },
        () => {
          setUserLocation(NASHVILLE)
          onLocationFound?.(NASHVILLE)
        }
      )
    }
  }, [externalUserCoords, onLocationFound])

  // Show photographer marker when searching OR after found
  const showPhotographer = isSearching || photographerFound

  // Update user marker with pulsing animation
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current || !userLocation || typeof window === "undefined" || !window.google) return

    // Create slow, relaxed pulsing circle overlay for user location only
    const pulseCircle = new window.google.maps.Circle({
      strokeColor: "#3b82f6",
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.1,
      map: mapInstanceRef.current,
      center: userLocation,
      radius: 60, // meters
    })

    // Slow, relaxed pulse animation
    let radius = 60
    let growing = true
    const animatePulse = () => {
      if (growing) {
        radius += 1 // Slower growth
        if (radius > 120) growing = false
      } else {
        radius -= 1 // Slower shrink
        if (radius < 60) growing = true
      }
      pulseCircle.setRadius(radius)
      // Use setTimeout for slower animation instead of requestAnimationFrame
      setTimeout(() => animatePulse(), 50) // ~20fps instead of 60fps
    }
    animatePulse()

    if (!userMarkerRef.current) {
      userMarkerRef.current = new window.google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 1000,
        animation: window.google.maps.Animation.DROP,
      })
    } else {
      userMarkerRef.current.setPosition(userLocation)
      pulseCircle.setCenter(userLocation)
    }

    return () => {
      pulseCircle.setMap(null)
    }
  }, [mapsLoaded, userLocation])

  // Update photographer marker with camera icon
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current || typeof window === "undefined" || !window.google) {
      if (photographerMarkerRef.current) {
        photographerMarkerRef.current.setMap(null)
        photographerMarkerRef.current = null
      }
      return
    }

    if (!photographerCoords || !showPhotographer) {
      if (photographerMarkerRef.current) {
        photographerMarkerRef.current.setMap(null)
        photographerMarkerRef.current = null
      }
      return
    }

    // Create photographer marker - same size as user marker core (scale 10)
    const cameraIcon = {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10, // Match user marker size
      fillColor: "#eab308", // Yellow-500
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3, // Same as user marker
    }

    if (!photographerMarkerRef.current) {
      photographerMarkerRef.current = new window.google.maps.Marker({
        position: photographerCoords,
        map: mapInstanceRef.current,
        icon: cameraIcon,
        zIndex: 1001, // Above user marker
        animation: window.google.maps.Animation.DROP,
        title: "Photographer",
      })
    } else {
      photographerMarkerRef.current.setPosition(photographerCoords)
      photographerMarkerRef.current.setMap(mapInstanceRef.current)
    }
  }, [mapsLoaded, photographerCoords, showPhotographer])

  // Fit bounds to show both markers (Uber-style)
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current || !userLocation || typeof window === "undefined" || !window.google) return

    const bounds = new window.google.maps.LatLngBounds()

    if (userLocation) {
      bounds.extend(userLocation)
    }

    if (photographerCoords && showPhotographer) {
      bounds.extend(photographerCoords)
    }

    if (bounds.isEmpty()) {
      // If only one marker, center on it with default zoom
      mapInstanceRef.current.setCenter(userLocation)
      mapInstanceRef.current.setZoom(15)
      return
    }

    // Initial fit with maximum safe padding
    const padding = {
      top: 220,
      right: 50,
      bottom: 250,
      left: 50,
    }
    
    mapInstanceRef.current.fitBounds(bounds, padding)

    // After initial fit, zoom in slightly once match is established
    const listener = window.google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
      const currentZoom = mapInstanceRef.current.getZoom()
      
      // Initial zoom out to ensure visibility
      if (currentZoom > 11.5) {
        mapInstanceRef.current.setZoom(11.5)
      }
      
      // Once photographer is found, keep zoomed out (no additional zoom in)
      if (showPhotographer && photographerCoords) {
        setTimeout(() => {
          const finalZoom = Math.min(11.5, mapInstanceRef.current.getZoom()) // Keep at 11.5 or less
          mapInstanceRef.current.setZoom(finalZoom)
          
          // Re-fit with slightly less padding for better view
          const finalBounds = new window.google.maps.LatLngBounds()
          if (userLocation) finalBounds.extend(userLocation)
          if (photographerCoords) finalBounds.extend(photographerCoords)
          
          mapInstanceRef.current.fitBounds(finalBounds, {
            top: 200,
            right: 45,
            bottom: 230,
            left: 45,
          })
        }, 500) // Wait 500ms after match
      }
      
      // Safety check - ensure both markers are still visible
      setTimeout(() => {
        const viewportBounds = mapInstanceRef.current.getBounds()
        const userInView = viewportBounds?.contains(userLocation)
        const photographerInView = photographerCoords && showPhotographer 
          ? viewportBounds?.contains(photographerCoords)
          : true
        
        if (!userInView || !photographerInView) {
          // If markers out of view, zoom out and re-fit
          mapInstanceRef.current.setZoom(12)
          const safetyBounds = new window.google.maps.LatLngBounds()
          if (userLocation) safetyBounds.extend(userLocation)
          if (photographerCoords && showPhotographer) safetyBounds.extend(photographerCoords)
          mapInstanceRef.current.fitBounds(safetyBounds, padding)
        }
      }, 300)
      
      window.google.maps.event.removeListener(listener)
    })
  }, [mapsLoaded, userLocation, photographerCoords, showPhotographer])

  // Draw route from photographer to client (violet color - matching RAW DSLR)
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current || !userLocation || !photographerCoords || !showPhotographer || typeof window === "undefined" || !window.google) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null)
        routePolylineRef.current = null
      }
      return
    }

    // Remove existing route
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null)
    }

    // Create a smooth curved path between photographer and client
    const createCurvedPath = (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
      const midLat = (start.lat + end.lat) / 2
      const midLng = (start.lng + end.lng) / 2
      const curveOffset = 0.002
      const controlPoint = {
        lat: midLat + curveOffset,
        lng: midLng + curveOffset,
      }
      
      const path: { lat: number; lng: number }[] = []
      const steps = 50
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlPoint.lat + t * t * end.lat
        const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlPoint.lng + t * t * end.lng
        path.push({ lat, lng })
      }
      return path
    }

    const path = createCurvedPath(photographerCoords, userLocation)

    // Create polyline with violet color (matching RAW DSLR accent: violet-400)
    routePolylineRef.current = new window.google.maps.Polyline({
      path: [],
      geodesic: true,
      strokeColor: "#a78bfa", // violet-400
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstanceRef.current,
      zIndex: 500,
    })

    // Animate the route drawing smoothly from photographer to client
    let currentIndex = 0
    const animateRoute = () => {
      if (currentIndex < path.length && routePolylineRef.current) {
        const partialPath = path.slice(0, currentIndex + 1)
        routePolylineRef.current.setPath(partialPath)
        currentIndex += 1
        setTimeout(animateRoute, 15)
      }
    }
    
    setTimeout(animateRoute, 300)
  }, [mapsLoaded, userLocation, photographerCoords, showPhotographer])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Google Maps container */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* Soft blur overlay - reduce when photographer matched */}
      <div className={`absolute inset-0 pointer-events-none z-10 transition-all duration-500 ${photographerMatched ? 'backdrop-blur-[0.5px]' : 'backdrop-blur-[1px]'}`} />
      
      {/* Bottom gradient for UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-10" />
    </div>
  )
}
