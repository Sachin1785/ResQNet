/**
 * OSRM Road Routing Client with in-memory caching.
 * Fetches exact turn-by-turn road geometry following physical highways and streets.
 */

const routeCache = new Map<string, [number, number][]>();

export async function fetchRoadGeometry(
  start: [number, number], // [lng, lat]
  end: [number, number]    // [lng, lat]
): Promise<[number, number][]> {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  // Key for caching
  const cacheKey = `${startLng.toFixed(5)},${startLat.toFixed(5)}->${endLng.toFixed(5)},${endLat.toFixed(5)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // If start and end are virtually identical, return direct line
  if (Math.abs(startLng - endLng) < 0.0001 && Math.abs(startLat - endLat) < 0.0001) {
    const direct: [number, number][] = [start, end];
    routeCache.set(cacheKey, direct);
    return direct;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);

    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const coordinates: [number, number][] = data.routes[0].geometry.coordinates;
      routeCache.set(cacheKey, coordinates);
      return coordinates;
    }
  } catch (err) {
    // Fallback gracefully to straight path if OSRM is unreachable
    console.warn("Road routing fallback to direct line:", err);
  }

  const direct: [number, number][] = [start, end];
  routeCache.set(cacheKey, direct);
  return direct;
}
