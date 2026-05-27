import { CITY_CENTERS } from "./city-centers";

export async function geocodeAddress(address: {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}): Promise<{ lat: number; lng: number } | null> {
  const query = `${address.line1}, ${address.city}, ${address.state}, ${address.pincode}, ${address.country ?? "India"}`;
  const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
    headers: { "User-Agent": "VendorHub/1.0 (contact@vendorhub.in)" },
  });

  if (!response.ok) return cityCenterFallback(address.city);
  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return cityCenterFallback(address.city);
  return { lat: Number.parseFloat(data[0].lat), lng: Number.parseFloat(data[0].lon) };
}

export function cityCenterFallback(city: string) {
  const match = Object.entries(CITY_CENTERS).find(([name]) => name.toLowerCase() === city.toLowerCase());
  return match?.[1] ?? null;
}
