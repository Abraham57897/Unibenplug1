'use client';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Campus, Post } from '@/lib/types';

export default function MapView({ campus, posts, height = 240 }: { campus: Campus; posts: Post[]; height?: number }) {
  return (
    <MapContainer center={[campus.lat, campus.lng]} zoom={15} style={{ height, borderRadius: 16 }} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {posts.filter((p) => p.lat && p.lng).map((p) => (
        <CircleMarker key={p.id} center={[p.lat!, p.lng!]} radius={9}
          pathOptions={{ color: p.post_type === 'NEED' ? '#9333EA' : '#4B0E4B', fillOpacity: 0.85 }}>
          <Popup><b>{p.title}</b><br />{p.price}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
