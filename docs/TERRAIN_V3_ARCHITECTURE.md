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


You are completely right, and I hear you loud and clear. Hacking the frontend LOD math to protect a fragile backend is bad engineering. It’s putting a band-aid on a broken bone.

If you are building a professional-grade tactical engine, your `worker_node.ts` cannot just be a dumb proxy that passes API requests directly to AWS and hopes the RAM holds up.

You want a **Dedicated Smart Map Server**. That means the server acts as an intelligent, independent database. The Simulation Engine (API Sim) and the UI should **never** touch the raw 200GB dataset. They should only ask the Map Server for exactly what they need at that exact millisecond.

Here is the architectural blueprint for transforming your Node.js worker into a true, standalone GIS (Geographic Information System) server.

---

### The 3 Pillars of a Smart Map Server

#### 1. The Strict Data Contract (No Raw Ingestion)

You stated: *"the api sim is not going to ingest 200gb of map data and nor will the ui"*. This is the perfect mindset. The Map Server must enforce a strict data contract based on the consumer:

* **The UI (Tactical Map):** Only receives highly compressed, baked visual data. It asks for a bounding box, the Map Server stitches the QuadTree, and returns a few kilobytes of WebGL-ready bytes (`/api/v2/terrain/theater/bundle`).
* **The Sim Engine (The Backend Logic):** Never asks for tiles. It only asks for **Answers**.
* *Sim Engine:* "Can Unit A see Unit B?"
* *Map Server:* Performs the raycast across its internal 200GB dataset and returns `true` or `false` (`/api/v2/env/math/los`).
* *Sim Engine:* "What is the elevation at 45.123, -112.456?"
* *Map Server:* Looks up the exact byte on disk and returns `1452.4` (meters).



#### 2. Decouple Serving from Harvesting (The Asynchronous Rule)

Right now, your server does this: `Request comes in -> Fetch from AWS -> Unzip -> Process -> Return Request`. This is why it hangs.

A Smart Map Server does this:

1. **API Request:** "Give me the Quad Tile for z10/x820/y465."
2. **Storage Check:** The server looks at its local NVMe drive.
3. **Cache Hit:** It reads the bytes directly from the SSD and returns them in `2ms`.
4. **Cache Miss (Crucial Change):** The server **DOES NOT** fetch from AWS. It instantly returns a pre-generated "Low-Res Fallback Tile" (or a `202 Accepted` status). Simultaneously, it drops a message into the `HarvesterService` queue.
5. **The Harvester:** A completely separate background loop slowly downloads the missing AWS `.hgt.gz` file, unzips it, and saves the raw binary to the local SSD.

By decoupling the read from the fetch, your API will **always** respond in under 10ms, regardless of whether you have the high-res data yet.

#### 3. Zero-Copy Byte Range Reads (Solving the RAM Problem)

Even if the data is on your local disk, you cannot load a 25MB unzipped `.hgt` file into RAM every time the Sim Engine asks for a single elevation point.

Because your data is a strict grid, you can calculate exactly which byte in the file corresponds to a specific latitude/longitude. You then use Node's `fs.readSync` to pluck **only those 2 bytes** directly off the hard drive without loading the rest of the file into memory.

---

### How to Refactor `worker_node.ts` and Services

To achieve this, your architecture needs to pivot. Here is the conceptual redesign:

#### Step 1: The API never waits for AWS

In `worker_node.ts` or your `TerrainService`, you must remove `await fetchFromAws(...)` from the synchronous request path.

```typescript
// Inside TerrainService.ts (Conceptual)

public async getElevation(lat: number, lon: number): Promise<number> {
    const tileKey = this.getTileKey(lat, lon);
    const diskPath = `./terrain_data/${tileKey}.raw`;

    // 1. FAST PATH: The data is on disk. Read only the 2 bytes we need.
    if (fs.existsSync(diskPath)) {
        return this.readSpecificBytesFromDisk(diskPath, lat, lon);
    }

    // 2. MISSING DATA: Queue the Harvester, return a fallback.
    this.harvesterService.queueTileForDownload(tileKey);
    
    // Return a safe fallback (e.g., sea level, or a hyper-low-res global base map)
    // The API never hangs. The Sim engine keeps running.
    return 0; 
}

```

#### Step 2: The Math Oracle is King

Your `worker_node.ts` already has the `/api/v2/env/math/los` endpoint. This is excellent. You need to expand this so the Sim Engine relies entirely on the Map Server for physics queries.

* `POST /api/v2/env/math/los` (Line of sight)
* `POST /api/v2/env/math/ground_clamp` (Snaps a unit's Z-axis to the terrain)
* `POST /api/v2/env/math/pathfind` (A* routing using the terrain gradient)

#### Step 3: Use an optimized spatial format (e.g., MBTiles)

If you want the Worker Node to be a true map server handling 200GB of data, managing millions of tiny `.hgt` files on a standard file system will eventually corrupt or hit inode limits.

The industry standard is to put the binary tile data inside an SQLite database (known as MBTiles). SQLite is optimized to search through hundreds of gigabytes of data on disk while using almost zero RAM.

Instead of:

```typescript
fs.readFileSync(`./data/res_1201/${lat}/${lon}.wgt`)

```

A smart server does:

```typescript
// Using better-sqlite3
const stmt = db.prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?');
const row = stmt.get(z, x, y);
return row.tile_data;

```

### Summary of the Smart Server Spec

1. **API Layer:** Fastify router. strictly returns `200 OK` (with data from disk) or `202 Accepted` (fallback data, queued for download). Never waits on external network calls.
2. **Oracle Layer:** Executes raycasts and spatial queries directly against the local disk data.
3. **Storage Layer:** SQLite (MBTiles) or raw binary files accessed via byte-range reads (`fs.openSync` + `fs.readSync`). No full file buffering.
4. **Harvester Layer:** A background `setInterval` or Worker Thread that slowly consumes a queue, downloads from AWS, unzips, and inserts into the Storage Layer.



----
provide me a full list of endpoints the server should have

and i want the worker node to use the tool system and not just be some random code
----


Integrating the Map Server directly into your existing Tool System (`server_v2/tools/...`) is the exact right move. It centralizes your business logic, allows your autonomous agents (from `tools/agent`) to interact with the terrain, and completely decouples the heavy simulation math from the HTTP web server.

To build a professional, high-performance architecture on your hardware, we must split the server's responsibilities into two distinct interfaces: **The Binary Streamer (HTTP)** and **The Math Oracle (Tool System)**.

Here is the complete specification for your Smart Map Data Server.

---

### Part 1: The UI Binary Streamer (Fastify HTTP)

The frontend WebGL UI (`client/extensions/map`) cannot use the Tool System to download 256x256 image arrays—it would cause massive serialization overhead. The HTTP server should be stripped down to do exactly **one thing**: stream binary chunks from your local SQLite/MBTiles database to the browser as fast as possible.

**No math or physics happens here.**

* **`GET /api/v2/terrain/tile/quad/:z/:x/:y`**
* **Purpose:** Streams a single, pre-baked tile to the frontend's QuadTree renderer.
* **Action:** Executes a direct SQLite query (`SELECT tile_data FROM tiles WHERE z=? AND x=? AND y=?`).
* **Fallback:** If the tile isn't in the DB, it returns a 202 status (queues the Harvester) and sends back a blank/ocean fallback array.


* **`POST /api/v2/terrain/theater/bundle`**
* **Purpose:** Receives an array of `{z, x, y}` requests from `MapDataPipeline.fetchViewport()` and returns a compiled `Uint8Array`.
* **Action:** Does a batch SQLite lookup (`SELECT ... WHERE z IN (...)`) and packs the results into `TheaterBundleFormat`.



---

### Part 2: The Math Oracle (The Tool System)

Your simulation engine, pathfinding logic, and autonomous agents do not need graphics—they need geospatial answers. Instead of making HTTP `fetch` calls to a worker node, the engine will natively invoke these tools (which you have already stubbed in `server_v2/tools/`).

#### Category A: The `env_*` Tools (Environment & Terrain State)

These tools interact with the physical ground and weather.

1. **`env_sample_terrain`**
* **Input:** `{ lat: number, lon: number }`
* **Output:** `{ elevation: number, biome: string }`
* **Behavior:** Uses a zero-copy byte-range read to pluck the exact elevation integer from the disk. Used to "ground clamp" units.


2. **`env_prefetch_terrain`**
* **Input:** `{ latMin, latMax, lonMin, lonMax }`
* **Output:** `{ queued: boolean, estimated_bytes: number }`
* **Behavior:** Tells the background Harvester to start downloading AWS `.hgt` files for this bounding box because a battle is about to start there.


3. **`env_get_cache_stats`**
* **Output:** Disk usage, SQLite DB size, Harvester queue length.



#### Category B: The `map_*` Tools (Spatial Math & Physics)

These tools perform complex geodetic calculations without blocking the main event loop.

1. **`map_get_los`**
* **Input:** `{ p1: {lat, lon, alt}, p2: {lat, lon, alt} }`
* **Output:** `{ isClear: boolean, intersectionPoint?: {lat, lon, alt} }`
* **Behavior:** The most crucial tool for combat. It performs a 3D raycast against the local SQLite database. If it hits a mountain, it returns the exact coordinate of the block.


2. **`map_get_elevation_profile`**
* **Input:** `{ start: {lat, lon}, end: {lat, lon}, points: number }`
* **Output:** `{ profile: number[] }`
* **Behavior:** Used by cruise missile flight planning and radar terrain masking.


3. **`map_calculate_distance`**
* **Input:** `{ p1: {lat, lon}, p2: {lat, lon} }`
* **Output:** `{ distanceMeters: number, bearing: number }`
* **Behavior:** Pure math (Vincenty or Haversine formula). No disk access required.

