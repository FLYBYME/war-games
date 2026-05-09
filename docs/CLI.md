# War Games V2 CLI Documentation

The War Games V2 CLI is a powerful, schema-driven interface for controlling the simulation, managing matches, and inspecting the global tactical registry. It is automatically synchronized with the server's Unified Tool Contracts.

## Basic Usage

The CLI is invoked via `npm run cli`. **Crucially, you must use the `--` separator** to ensure flags are passed correctly to the script and not intercepted by npm.

```bash
# General Syntax
npm run cli -- <domain> <action> [options]

# View Help
npm run cli -- --help
npm run cli -- <domain> --help
```

---

## 🚀 Getting Started (Seeding)

Before running simulation commands, you should populate the global registry with baseline data (Unit Profiles, Weapons, Scenarios).

```bash
# Seed the SQLite database with baseline data
# (Ensure server is IMPLEMENTED or use the seeding utility)
npm run cli -- db seed 
```

---

## 1. Match Management (`match`)

Manage the lifecycle of simulation sessions.

### List Matches
```bash
npm run cli -- match list --page 1 --pageSize 10
```

### Create a Match
```bash
# Using a valid baseline scenario ID
npm run cli -- match create --name "Operation Trident" --scenarioId "multi-domain-tactical" --maxTurns 10000
```

### Get Match Status
```bash
npm run cli -- match get --matchId <match-id>
```

### Update Match
```bash
npm run cli -- match update --matchId <match-id> --name "New Operation Name"
```

---

## 2. Simulation Control (`sim`)

Control the progression of time within a match.

### Get Simulation State
```bash
npm run cli -- sim get --matchId <match-id>
```

### Step Simulation
```bash
# Advance by 10 ticks
npm run cli -- sim step --matchId <match-id> --ticks 10
```

### Update Speed / Pause
```bash
# Pause simulation
npm run cli -- sim update --matchId <match-id> --isPaused

# Set 10x compression
npm run cli -- sim update --matchId <match-id> --timeCompression 10
```

---

## 3. Entity Management (`entity`)

Spawn and inspect tactical units.

### List Entities
```bash
# List all units in a match
npm run cli -- entity list --matchId <match-id>

# Filter by side
npm run cli -- entity list --matchId <match-id> --side Blue
```

### Spawn a Unit
```bash
# Spawn an F-16 at coordinates
npm run cli -- entity create \
  --matchId <match-id> \
  --profileId "f16-block-50" \
  --side Blue \
  --position "1000,500,5000" \
  --heading 90
```

### Get Entity Details
```bash
npm run cli -- entity get --matchId <match-id> --entityId <entity-id>
```

---

## 4. Bug Reporting (`bug`)

Report and track issues found in the simulation.

### Report a Bug
```bash
npm run cli -- bug create \
  --title "F-35 Crashed on Launch" \
  --description "Entity plummeted immediately after spawn" \
  --severity Critical \
  --matchId <match-id>
```

### List Reported Issues
```bash
npm run cli -- bug list --severity Critical
```

### Add a Comment
```bash
npm run cli -- bug add_comment \
  --bugId <bug-id> \
  --author "DevTeam" \
  --text "Investigating propulsion logic"
```

---

## 5. Worker Management (`worker`)

Monitor background processing threads (Terrain, Analytics).

### List Worker Pools
```bash
npm run cli -- worker list
```

### Get Pool Performance
```bash
# View memory usage and CPU load for the terrain pool
npm run cli -- worker get_stats --poolName terrain
```

---

## 5. Advanced Geospatial & Env (`env`, `map`)

High-performance terrain and environment queries.

### Prefetch Terrain
```bash
# Cache tiles for a specific region to ensure zero-latency simulation
npm run cli -- env prefetch_terrain \
  --matchId <match-id> \
  --latMin 39 --latMax 41 \
  --lonMin 108 --lonMax 110
```

### Get Elevation Profile
```bash
# Get elevation data points along a flight path
npm run cli -- map get_elevation_profile \
  --matchId <match-id> \
  --from "0,0,0" --to "5000,5000,0" \
  --samples 50
```

### Sample Terrain
```bash
# Get elevation and atmospheric data at a point
npm run cli -- env sample_terrain --matchId <match-id> --position "1000,1000,0"
```

---

## 6. Developer Tools (`generate`)

Synchronize the CLI and SDK with contract changes.

```bash
# Regenerate Tool Stubs, SDK, and CLI Command Tree
npm run cli -- generate
```

---

## Tips & Tricks

- **The -- Separator**: Always use `npm run cli -- ...`. Without the `--`, npm may try to parse your flags (like `--page`) as its own configuration.
- **Coordinates**: Fields like `position` and `center` accept CSV format: `x,y,z`.
- **Booleans**: For boolean flags like `--isPaused`, simply including the flag sets it to `true`. Use `--no-isPaused` to set to `false`.
- **JSON Output**: All commands output raw JSON, making them easy to pipe into `jq` for advanced processing.
