'use client';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const icon = L.divIcon({ html: '📍', className: '', iconSize: [24, 24], iconAnchor: [12, 24] });

function Clicker({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

export default function PinPicker({ center, pin, onPick }: { center: [number, number]; pin: [number, number]; onPick: (p: [number, number]) => void }) {
  return (
    <MapContainer center={center} zoom={15} style={{ height: 200, borderRadius: 12 }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clicker onPick={onPick} />
      <Marker position={pin} icon={icon} />
    </MapContainer>
  );
}
