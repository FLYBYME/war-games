# Terrain V3 Architecture: High-Speed Theater & Global QuadTree

## 1. Objective
Establish a high-fidelity geodetic system that decouples 200GB of storage (NASA SRTM) from the simulation engine. The system optimizes for two fundamentally different use cases:
- **UI Visualization:** Instant global/regional zooming via a pre-baked QuadTree.
- **Simulation Physics:** Microsecond-latency math via an "Active Theater" RAM prefetch model.

---

## 2. Component: The Regional Node (Remote Hub)
Location: `192.168.1.9` (Dedicated machine with large storage).

### 2.1. The Harvester (Localization)
- **Crawl:** Systematically downloads 1x1 degree `.hgt.gz` tiles from NASA AWS.
- **Throttle:** 1 Mbps (125 KB/s) background limit to protect network health.
- **Priority:** Active play areas and perimeter buffers jump to the front of the queue and **bypass all throttling**.

### 2.2. The Baker (UI Optimization)
- **Job:** As raw degree files are localized, the Node automatically "bakes" them into a global QuadTree.
- **Hierarchy:** Zoom levels 0 to 10.
- **Logic:** Aggregates and downsamples a grid of 1x1 degree files into single 256x256 binary tiles.
- **Benefit:** The browser requests **one** file to see a region, not 144.

### 2.3. The Oracle (Compute Offloading)
- **Goal:** Offload math that is too heavy for the laptop or requires data outside the "Active Theater".
- **Tasks:** Long-range global pathfinding (e.g., across oceans), Over-The-Horizon (OTH) propagation, and theater-wide telemetry analytics.

---

## 3. Component: The Sim Engine (Laptop)
The laptop runs the ECS simulation loop and serves the UI.

### 3.1. The Theater Manager (Predictive RAM Prefetch)
- **Predictive Loading:** The Sim Engine tracks unit positions and headings. It predicts which 1x1 degree tiles will be needed for the next 10 minutes of simulation.
- **Transfer:** It fetches the **raw 1201x1201 binary tiles** (2.8MB each) from the Regional Node.
- **Storage:** Stores these tiles in a high-speed **LRU RAM Cache** on the laptop.
- **Latency:** Zero network calls during a simulation tick. All elevation/LOS checks happen against local memory at CPU speeds.

### 3.2. Performance Targets
- **Network Frequency:** ~1 request per 10 minutes per active theater zone.
- **Math Latency:** < 1 microsecond per elevation query (local RAM).
- **Scale:** Supports 200+ concurrent batch simulations without saturating the local network.

---

## 4. Component: The UI (The Tactical Map)
- **LOD Selection:** Switches between QuadTree zoom levels (z/x/y) based on camera height.
- **Global View (Zoom 0-2):** One request covers the entire earth/continent.
- **Tactical View (Zoom 8-10):** High-resolution detail for local operations.
- **Binary Transport:** All tiles are requested via a dedicated raw binary endpoint (`/terrain/tile/z/x/y`) to bypass JSON serialization overhead.

---

## 5. Transport Protocols
| Stream Type | Source | Protocol | Format |
| :--- | :--- | :--- | :--- |
| **UI Map** | Node -> Browser | HTTP GET | Binary WGTv2 (QuadTree) |
| **Sim Theater** | Node -> Laptop | HTTP GET | Binary WGTv2 (1x1 Degree) |
| **Oracle Math** | Laptop -> Node | HTTP POST | JSON (Coords) -> JSON (Answer) |

---

## 6. Implementation Roadmap
1. **The Bridge:** Update `worker_node.ts` to handle both 1x1 degree and z/x/y tile requests in raw binary.
2. **The Harvester:** Implement the throttled SQLite-backed crawler on the Node.
3. **The Theater Manager:** Update the Laptop's `TerrainService` to predictively fetch and cache raw tiles in RAM.
4. **The UI update:** Switch `TerrainLayer` from degree-based tiles to QuadTree z/x/y tiles.
