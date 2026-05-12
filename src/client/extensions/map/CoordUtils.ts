export const METERS_PER_DEGREE = 111319.9;

/**
 * Standard Equirectangular projection centered at origin.
 * We use a FIXED cosine factor based on the origin to ensure that:
 * 1. Longitude lines are parallel (tiling works).
 * 2. Tiles have consistent world-space dimensions.
 */
export function latLonToWorld(lat: number, lon: number, origin: { lat: number, lon: number }) {
    const cosLat = Math.cos(origin.lat * (Math.PI / 180));
    const y = (lat - origin.lat) * METERS_PER_DEGREE;
    const x = (lon - origin.lon) * METERS_PER_DEGREE * cosLat;
    return { x, y: -y }; // Invert Y for screen coordinates
}

export function worldToLatLon(x: number, y: number, origin: { lat: number, lon: number }) {
    const cosLat = Math.cos(origin.lat * (Math.PI / 180));
    const lat = origin.lat + (-y / METERS_PER_DEGREE);
    // Avoid division by zero at poles, though origin.lat is usually tactical
    const safeCos = Math.max(0.001, cosLat);
    let lon = origin.lon + (x / (METERS_PER_DEGREE * safeCos));

    // Normalize Longitude to [-180, 180]
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;

    return { lat, lon };
}
