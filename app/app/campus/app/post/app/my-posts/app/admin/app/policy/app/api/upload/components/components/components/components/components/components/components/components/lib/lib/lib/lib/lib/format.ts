export function timeLeft(expires: string) {
  const ms = new Date(expires).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `${Math.round(h / 24)} days left`;
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.round(ms / 60000))}m left`;
}
export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371, r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b[0] - a[0]), dLng = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
