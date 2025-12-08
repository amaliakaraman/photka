import { DOWNTOWN_NASHVILLE, PHOTOGRAPHER_RADIUS_MILES } from "@/constants/locations"

export interface Photographer {
  id: string
  name: string
  photo: string
  rating: number
  totalShoots: number
  cameraBodies: string[]
  specialties: string[]
  eta: number // minutes
  distance: number // miles
  coords?: { lat: number; lng: number }
}

// mock photographers, in production this would come from supabase
export const PHOTOGRAPHERS: Photographer[] = [
  {
    id: "ph_1",
    name: "Amalia Karaman",
    photo: "/amalia_photka.jpg",
    rating: 5.0,
    totalShoots: 837,
    cameraBodies: ["Sony A7IV", "iPhone 15 Pro"],
    specialties: ["Lifestyle", "Portraits"],
    eta: 8,
    distance: 1.2,
  },
  {
    id: "ph_2",
    name: "Nic Noel",
    photo: "/nic_photka.jpg",
    rating: 4.8,
    totalShoots: 461,
    cameraBodies: ["Canon R6", "Sony A7III"],
    specialties: ["Events", "Weddings"],
    eta: 12,
    distance: 2.4,
  },
]

export function getNearestPhotographer(userCoords?: { lat: number; lng: number } | null): Photographer {
  const randomPhotographer = PHOTOGRAPHERS[Math.floor(Math.random() * PHOTOGRAPHERS.length)]
  const randomEta = Math.floor(Math.random() * 6) + 10 // 10-15 minutes
  
  // generate photographer coords within radius of downtown nashville
  // 1 mile ≈ 0.0145 degrees (1 degree ≈ 69 miles)
  const maxOffset = PHOTOGRAPHER_RADIUS_MILES * 0.0145
  const angle = Math.random() * 2 * Math.PI // random angle
  const distance = Math.random() * maxOffset // random distance up to 3 miles
  
  const photographerCoords = {
    lat: DOWNTOWN_NASHVILLE.lat + (distance * Math.cos(angle)),
    lng: DOWNTOWN_NASHVILLE.lng + (distance * Math.sin(angle)),
  }
  
  return {
    ...randomPhotographer,
    eta: randomEta,
    distance: +(randomEta * 0.4 + Math.random()).toFixed(1), // approximate distance based on eta
    coords: photographerCoords,
  }
}

export function getPhotographerById(id: string): Photographer | undefined {
  return PHOTOGRAPHERS.find((p) => p.id === id)
}

