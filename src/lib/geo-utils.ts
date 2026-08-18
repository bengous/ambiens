// GeoJSON : [longitude, latitude], l'ordre inverse de l'usage courant.
export type Coordonnees = readonly [number, number];

export type Bbox = readonly [number, number, number, number];

const RAYON_TERRE_KM = 6371;

const radians = (degres: number): number => (degres * Math.PI) / 180;

// Approximation locale suffisante pour un rayon de quelques dizaines de km :
// 1° de latitude ≈ 111,32 km, et les méridiens se resserrent en cos(latitude).
export function bboxAutour(centre: Coordonnees, rayonKm: number): Bbox {
  const [lon, lat] = centre;
  const dLat = rayonKm / 111.32;
  const dLon = dLat / Math.cos(radians(lat));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

export function distanceKm(a: Coordonnees, b: Coordonnees): number {
  const [lonA, latA] = a;
  const [lonB, latB] = b;
  const dLat = radians(latB - latA);
  const dLon = radians(lonB - lonA);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}
