# MapManager

The `MapManager` handles the environmental and spatial constraints of the simulation. It provides a heightmap-based terrain system for grounding, line-of-sight (LOS) analysis, and acoustic propagation.

## Core Architecture

The manager uses a `Float32Array` heightmap where:
- **Negative Values**: Represent water depth (bathymetry).
- **Positive Values**: Represent land elevation.
- **Sea Level**: Defined as `0`.

---

## 1. Terrain Queries

### Elevation (`getElevation`)
Uses **Bilinear Interpolation** to provide smooth elevation values at any world coordinate, even between heightmap pixels.

### Navigability (`isNavigable`)
Checks if a world position is suitable for a specific vessel.
- **Criteria**: `Elevation < SeaLevel` AND `|Elevation| >= VesselDraft`. This ensures ships cannot enter shallow water or cross land.

### Line-of-Sight (`isLineOfSightBlocked`)
Performs a ray-cast between two 3D points.
- **Logic**: Samples the elevation at regular intervals (500m) along the path. If the terrain elevation at any point is higher than the ray's altitude at that point, the LOS is blocked. This affects both visual detection and radar.

---

## 2. Acoustic Environment

The manager stores `ThermalLayers`, which define the depth and propagation characteristics of the water column.
- **Surface Duct**: The first layer's depth boundary is used by the `KinematicsSystem` to trigger events when a submarine crosses the layer.
- **Sensor Impact**: Sensors use these layers to determine if a sonar signal can penetrate the thermal boundary to reach a target.

---

## 3. Data Access

The `MapManager` is a read-only service for most systems, though the `Engine` can update its thermal layers via environmental profiles.

| Method | Purpose |
| :--- | :--- |
| `getElevation(x, y)` | Get height/depth at coordinate. |
| `isLineOfSightBlocked(p1, p2)` | Check if terrain obstructs a path. |
| `isInBounds(x, y)` | Check if a unit is within map boundaries. |
| `getThermalLayerDepth()` | Get the critical depth for ASW logic. |
