import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayer, FillLayer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchNearbyPlaces, type NearbyPlace, type PlaceType } from '../services/overpassService';
import { getRoute, formatDistance, formatDuration, createRadiusCircle, type RouteStep } from '../services/routeService';
import { getDoctorsForHospital, type Doctor } from '../mock/mockDoctors';


// --- Suggestions derived from user health data --------------------------------
export default function Test() { return ( <div>const USER_SUGGESTIONS = [
  { specialty: 'Endocrinology', reason: 'HbA1c 7.9% -- diabetes management', icon: '🔬', urgency: 'high' as const },
  { specialty: 'Nephrology',    reason: 'Microalbuminuria + rising creatinine', icon: '💧', urgency: 'high' as const },
  { specialty: 'Cardiology',   reason: 'Hypertension history + high LDL', icon: '&hearts;', urgency: 'medium' as const },
  { specialty: 'Ophthalmology', reason: 'Annual diabetic retinopathy screening due', icon: '👁', urgency: 'low' as const },
];

// --- Recently visited helpers -------------------------------------------------
const VISITED_KEY = 'medvault_visited_hospitals';
function loadVisited(): Set<string> {
</div>);
}