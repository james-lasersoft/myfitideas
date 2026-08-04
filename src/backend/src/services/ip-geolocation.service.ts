import net from "node:net";

export interface IpGeolocationResult {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  provider: "ipinfo";
  lookedUpAt: Date;
}

interface IpinfoResponse {
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  loc?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export function normalizeClientIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  if (!first) return null;
  const normalized = first.startsWith("::ffff:") ? first.slice(7) : first;
  return net.isIP(normalized) ? normalized : null;
}

export function isPublicIp(value: string): boolean {
  if (net.isIPv4(value)) {
    const parts = value.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }

  if (net.isIPv6(value)) {
    const lower = value.toLowerCase();
    return lower !== "::1" && !lower.startsWith("fc") && !lower.startsWith("fd") && !lower.startsWith("fe80:");
  }

  return false;
}

function parseCoordinates(payload: IpinfoResponse): { latitude: number | null; longitude: number | null } {
  if (typeof payload.latitude === "number" && typeof payload.longitude === "number") {
    return { latitude: payload.latitude, longitude: payload.longitude };
  }
  if (!payload.loc) return { latitude: null, longitude: null };
  const [latitudeText, longitudeText] = payload.loc.split(",");
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

export async function lookupIpGeolocation(ipAddress: string | null | undefined): Promise<IpGeolocationResult | null> {
  const token = process.env.IPINFO_TOKEN?.trim();
  const ip = normalizeClientIp(ipAddress);
  if (!token || !ip || !isPublicIp(ip)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json() as IpinfoResponse;
    const coordinates = parseCoordinates(payload);
    return {
      city: payload.city?.trim() || null,
      region: payload.region?.trim() || null,
      country: payload.country?.trim() || null,
      countryCode: payload.country_code?.trim() || payload.country?.trim() || null,
      timezone: payload.timezone?.trim() || null,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      provider: "ipinfo",
      lookedUpAt: new Date(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
