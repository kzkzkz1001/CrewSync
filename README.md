# CrewSync

> Intelligent staff pickup coordination platform for mobile catering operations.

CrewSync connects catering managers, food truck drivers, and part-time staff into a single real-time dispatch loop — automatically computing optimal pickup routes, broadcasting live vehicle positions, and alerting staff the moment their truck is approaching.

---

## Problem Statement

Mobile catering businesses face a recurring logistics problem: **getting part-time staff to the event venue efficiently**. Staff are geographically scattered, public transport is unreliable, and coordinating pickups manually via WhatsApp creates constant friction — late arrivals, missed pickups, and wasted driver time.

CrewSync solves this with automated route optimization and real-time geofence alerts, turning a chaotic group chat into a structured, trackable pickup workflow.

---

## System Architecture

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|   +-----------------------+  +------------------------+  +-------------------+  |
|   |  Manager Web Portal   |  |   Driver Mobile App    |  |  Staff Mobile App |  |
|   |  Next.js 14 + Mapbox  |  |  Expo / React Native   |  | Expo / React Native| |
|   +-----------+-----------+  +-----------+------------+  +---------+---------+  |
+---------------|--------------------------|-------------------------|------------+
                | REST API                 | WebSocket (GPS)         | REST / WS
+---------------v--------------------------v-------------------------v------------+
|                           API GATEWAY & AUTH  :3000                             |
|              NestJS · JWT · Socket.IO · Redis live position cache               |
+---------------------------------------------------------------------------------+
                                          |
          ┌───────────────────────────────┼───────────────────────────┐
          ▼                               ▼                           ▼
+──────────────────+          +───────────────────+        +──────────────────────+
│  Shift Service   │          │  Route Engine     │        │ Notification Service │
│  :3001  NestJS   │          │  :3002  NestJS    │        │  :3003  NestJS       │
│  Prisma + PostGIS│          │  k-medoids VRP    │        │  PostGIS ST_Distance │
│  CRUD + Prisma   │─────────▶│  Mapbox Matrix API│        │  Redis dedup         │
│  migrate on boot │          │  Nearest-neighbour│        │  Firebase FCM push   │
+──────────────────+          │  TSP + geocoding  │        +──────────────────────+
          │                   +───────────────────+                   │
          └───────────────────────────────┬───────────────────────────┘
                                          ▼
+---------------------------------------------------------------------------------+
|                                 DATA LAYER                                      |
|          +--------------------------------------+  +-------------------------+  |
|          | PostgreSQL 16 + PostGIS 3.4           |  |   Redis 7 (Live Cache)  |  |
|          | Prisma ORM · UUID PKs · geography     |  |   vehicle:position:*    |  |
|          | User · Vehicle · Shift · ShiftStaff   |  |   geofence:alerted:*    |  |
|          | PickupNode · Role · ShiftStatus enums |  |                         |  |
|          +--------------------------------------+  +-------------------------+  |
+---------------------------------------------------------------------------------+
                                          |
+---------------------------------------------------------------------------------+
|                              INGRESS (Nginx)                                    |
|   /api/*  →  gateway:3000    /socket.io/*  →  gateway:3000 (WS upgrade)        |
|   /*      →  web:4000        TLS-ready (Let's Encrypt mount point included)     |
+---------------------------------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Manager Portal | Next.js 14 (App Router), Tailwind CSS, Mapbox GL / react-map-gl, SWR |
| Driver App | Expo (React Native), expo-location, expo-secure-store, react-native-maps |
| Staff App | Expo (React Native), expo-notifications (FCM), react-native-maps |
| API Gateway | NestJS, Socket.IO, JWT (passport-jwt), ioredis |
| Shift Service | NestJS, Prisma ORM, class-validator, @nestjs/axios |
| Route Engine | NestJS, Mapbox Directions Matrix API, k-medoids VRP, reverse geocoding |
| Notification Service | NestJS, PostGIS ST\_Distance, Firebase Admin SDK, ioredis |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7 |
| Monorepo | pnpm workspaces + Turborepo |
| Containerisation | Docker (multi-stage builds, pnpm deploy) |
| CI/CD | GitHub Actions → GHCR → SSH deploy |
| Reverse Proxy | Nginx (REST + WebSocket upgrade) |

---

## Repository Structure

```
CrewSync/
├── apps/
│   ├── web/                        # Manager Web Portal (Next.js 14)
│   │   ├── src/app/
│   │   │   ├── login/              # JWT login screen
│   │   │   ├── dashboard/          # Shift list with status + action buttons
│   │   │   └── dashboard/shifts/
│   │   │       ├── new/            # Create shift form
│   │   │       └── [id]/           # Shift detail + live Mapbox map
│   │   ├── src/components/
│   │   │   ├── LiveMap.tsx         # Mapbox GL map (vehicle + nodes + popups)
│   │   │   └── StatusBadge.tsx
│   │   ├── src/lib/
│   │   │   ├── api.ts              # Typed fetch wrapper
│   │   │   └── socket.ts           # socket.io-client singleton
│   │   └── Dockerfile
│   │
│   ├── driver-app/                 # Driver Mobile App (Expo)
│   │   ├── app/
│   │   │   ├── login.tsx           # Login + JWT secure storage
│   │   │   ├── index.tsx           # Shift list, Start/End Trip
│   │   │   └── trip/[id].tsx       # MapView + node list during trip
│   │   └── context/auth.tsx
│   │
│   └── staff-app/                  # Staff Mobile App (Expo)
│       ├── app/
│       │   ├── login.tsx           # Login + FCM token registration
│       │   ├── index.tsx           # Pickup card + live distance + alert banner
│       │   └── map.tsx             # Vehicle tracking map + 1 km geofence circle
│       └── context/auth.tsx
│
├── services/
│   ├── gateway/                    # API Gateway (NestJS :3000)
│   │   ├── src/auth/               # JWT strategy + login endpoint
│   │   ├── src/gps/gps.gateway.ts  # WebSocket: GPS → Redis + notification-service
│   │   └── Dockerfile
│   │
│   ├── shift-service/              # Shift & User CRUD (NestJS :3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Full DB schema (source of truth)
│   │   │   └── seed.ts             # Dublin test data (5 staff, 1 vehicle, 1 shift)
│   │   ├── src/shift/              # CRUD + requestOptimization (calls route-engine)
│   │   ├── src/user/               # User CRUD + coordinate update
│   │   └── Dockerfile              # Runs prisma migrate deploy on startup
│   │
│   ├── route-engine/               # VRP Optimization (NestJS :3002)
│   │   ├── src/route/
│   │   │   ├── vrp.algorithm.ts    # k-medoids clustering + nearest-neighbour TSP
│   │   │   ├── vrp.algorithm.spec.ts # 6 unit tests
│   │   │   ├── mapbox.service.ts   # Matrix API + reverse geocoding
│   │   │   └── route.service.ts    # Orchestrates full optimize pipeline
│   │   └── Dockerfile
│   │
│   └── notification-service/       # Geofence + FCM (NestJS :3003)
│       ├── prisma/schema.prisma    # Read-only subset schema
│       ├── src/geofence/           # PostGIS ST_Distance query + FCM trigger
│       ├── src/fcm/                # Firebase Admin SDK wrapper
│       ├── src/redis/              # ioredis: SET NX EX deduplication
│       ├── src/device/             # POST /devices/register (FCM token storage)
│       └── Dockerfile
│
├── packages/
│   └── types/                      # Shared TypeScript interfaces
│       └── src/index.ts            # User, Shift, PickupNode, GpsPayload, etc.
│
├── infra/
│   ├── docker-compose.yml          # Local development
│   ├── docker-compose.prod.yml     # Production (GHCR images, restart policies)
│   ├── nginx/nginx.conf            # Reverse proxy (REST + WebSocket + TLS-ready)
│   └── setup-server.sh             # One-time VPS bootstrap script
│
├── .github/workflows/
│   ├── ci.yml                      # Type-check all packages + VRP unit tests
│   └── deploy.yml                  # Build 5 images → GHCR → SSH deploy
│
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Core Workflows

### Workflow 1 — Shift Creation & Route Optimization

```
Manager Portal
  POST /api/shifts  { eventName, destLat, destLng, startTime, vehicleId, staffIds[] }
        │
        ▼
  Shift Service — validates staffIds exist, creates Shift + ShiftStaff records
        │
  PATCH /api/shifts/:id/optimize
        │
        ▼
  Shift Service — resolves staff home coordinates from DB
        │  POST /api/optimize
        ▼
  Route Engine
    1. Fetch NxN duration + distance matrix  →  Mapbox Directions Matrix API
    2. k-medoids clustering (PAM, up to 50 iterations)
       groups staff by travel-time proximity into ≤ 3 clusters
    3. Nearest-neighbour TSP orders clusters: driver → node1 → node2 → destination
    4. Reverse-geocode each pickup node location  →  Mapbox Geocoding API
    5. Compute per-node ETAs from shift.startTime + cumulative travel seconds
        │
        ▼
  Shift Service — persists PickupNodes in a DB transaction
               — assigns staff to nodes, marks shift OPTIMIZED
               — notifies staff via shift:updated WebSocket event
```

### Workflow 2 — Live Trip & Geofence Alerts

```
Driver App (every 10 s)
  socket.emit('gps:update', { vehicleId, lat, lng, timestamp })
        │
        ▼
  Gateway (gps.gateway.ts)
    ├── server.emit('gps:update')  →  Manager Portal live map animation
    ├── Redis SET vehicle:position:{id}  (5 min TTL)
    └── POST /api/geofence/check  (fire-and-forget)
              │
              ▼
  Notification Service
    PostGIS query:
      SELECT pn.*, u.fcmToken, ST_Distance(node::geography, vehicle::geography)
      FROM PickupNode pn
      JOIN ShiftStaff ss ON ss.pickupNodeId = pn.id
      JOIN User u        ON u.id = ss.userId
      JOIN Shift s       ON s.id = pn.shiftId
      WHERE s.status = 'ACTIVE'
        AND s.vehicleId = :vehicleId
        AND ST_Distance(...) <= 1000
              │
        match found + Redis SETNX (30 min TTL dedup)?
              │ yes (first alert only)
              ▼
  Firebase FCM  →  Staff phone push notification
    "Your truck is 0.8 km away (~3 min).
     Please make your way to: O'Connell St, Dublin"
```

---

## API Reference

### Gateway — Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Email + password → `{ accessToken }` |

### Shift Service

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/shifts` | Create shift (validates staffIds, creates join records) |
| `GET` | `/api/shifts` | List all shifts with vehicle, staff, pickup nodes |
| `GET` | `/api/shifts/:id` | Single shift |
| `PATCH` | `/api/shifts/:id/optimize` | Run VRP → persist nodes → mark OPTIMIZED |
| `PATCH` | `/api/shifts/:id/status` | Update status (ACTIVE / COMPLETED / CANCELLED) |
| `DELETE` | `/api/shifts/:id` | Delete shift + all related records |
| `POST` | `/api/users` | Register user (manager / driver / staff) |
| `GET` | `/api/users` | List all users |
| `PATCH` | `/api/users/:id/coordinates` | Update staff home lat/lng |

### Notification Service

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/geofence/check` | Receive GPS tick, run PostGIS check, fire FCM |
| `POST` | `/api/devices/register` | Store FCM token for a user |

### WebSocket (Socket.IO namespace `/gps`)

| Event | Direction | Payload |
|---|---|---|
| `gps:update` | Client → Server | `{ vehicleId, lat, lng, timestamp }` |
| `gps:update` | Server → Clients | same (broadcast to Manager Portal) |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- pnpm 11+
- Docker & Docker Compose
- Mapbox API key
- Firebase project with a service account JSON

### Setup

```bash
git clone https://github.com/kzkzkz1001/CrewSync.git
cd CrewSync

# Install all workspace dependencies
pnpm install

# Configure environment
cp .env.example .env
# Fill in: DATABASE_URL, REDIS_URL, JWT_SECRET, MAPBOX_API_KEY,
#          GOOGLE_APPLICATION_CREDENTIALS, NEXT_PUBLIC_MAPBOX_TOKEN

# Start PostgreSQL/PostGIS + Redis
docker compose -f infra/docker-compose.yml up postgres redis -d

# Run DB migrations + seed Dublin test data
pnpm --filter @crewsync/shift-service exec prisma migrate dev
pnpm --filter @crewsync/shift-service exec prisma db seed

# Start all backend services (separate terminals or use turbo)
pnpm dev
```

### Running individual services

```bash
# API Gateway       → http://localhost:3000
pnpm --filter @crewsync/gateway dev

# Shift Service     → http://localhost:3001
pnpm --filter @crewsync/shift-service dev

# Route Engine      → http://localhost:3002
pnpm --filter @crewsync/route-engine dev

# Notification Svc  → http://localhost:3003
pnpm --filter @crewsync/notification-service dev

# Manager Portal    → http://localhost:4000
pnpm --filter @crewsync/web dev
```

### Running tests

```bash
# VRP unit tests (no external dependencies required)
pnpm --filter @crewsync/route-engine test
```

---

## Deployment

### CI/CD Pipeline (GitHub Actions)

Every push to `main` runs two workflows:

**`ci.yml`** — type-checks all 5 packages and runs VRP unit tests.

**`deploy.yml`** — builds 5 Docker images in parallel, pushes to GitHub Container Registry (GHCR), then SSH-deploys to the production server.

### First-time Server Setup

```bash
# 1. Bootstrap a fresh Ubuntu 22.04 VPS
ssh root@<your-server> \
  "curl -fsSL https://raw.githubusercontent.com/kzkzkz1001/CrewSync/main/infra/setup-server.sh | sh"

# 2. Copy config to the server
scp .env crewsync@<your-server>:/opt/crewsync/.env
scp infra/nginx/nginx.conf crewsync@<your-server>:/opt/crewsync/infra/nginx/nginx.conf
scp infra/docker-compose.prod.yml crewsync@<your-server>:/opt/crewsync/infra/docker-compose.prod.yml
```

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | Production server IP or hostname |
| `DEPLOY_USER` | SSH user (e.g. `crewsync`) |
| `DEPLOY_SSH_KEY` | Private SSH key (PEM format) |
| `DEPLOY_PATH` | Deployment directory (e.g. `/opt/crewsync`) |
| `NEXT_PUBLIC_GATEWAY_URL` | Public URL of the gateway (e.g. `https://api.crewsync.app`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token for the web portal map |

### Production Traffic Flow

```
Internet  :80/:443
     │
   Nginx
     ├── /api/*        → gateway:3000   (REST)
     ├── /socket.io/*  → gateway:3000   (WebSocket, 24 h keepalive)
     └── /*            → web:4000       (Next.js Manager Portal)
```

---

## Roadmap

### MVP (v1) — Complete
- [x] pnpm + Turborepo monorepo
- [x] Shared TypeScript types package
- [x] JWT authentication (API Gateway)
- [x] Shift & User CRUD with Prisma + PostgreSQL/PostGIS
- [x] k-medoids VRP route optimization via Mapbox Matrix API
- [x] Nearest-neighbour TSP ordering with per-node ETAs + reverse geocoding
- [x] Driver GPS streaming via WebSocket (every 10 s)
- [x] Redis live vehicle position cache
- [x] PostGIS geofence check + Redis deduplication
- [x] Firebase FCM high-priority push alerts
- [x] Manager Web Portal (Next.js 14 + Mapbox GL live map)
- [x] Driver mobile app (Expo — GPS streaming, trip map)
- [x] Staff mobile app (Expo — pickup card, vehicle tracking, alert banner)
- [x] Multi-stage Docker builds (pnpm deploy, Next.js standalone)
- [x] GitHub Actions CI/CD → GHCR → SSH deploy
- [x] Nginx reverse proxy with WebSocket upgrade

### v2 — Multi-Vehicle Fleet
- [ ] Multi-vehicle, multi-origin MDVRP algorithm
- [ ] Automatic staff splitting and vehicle assignment across a fleet
- [ ] Fleet-wide manager dashboard with all vehicles on one map

### v3 — ML Traffic Prediction
- [ ] Historical drive-time model training per city/time-of-day
- [ ] Integration with Dublin Luas / Bus Éireann real-time APIs
- [ ] Dynamic pickup window adjustment based on live traffic

---

## License

MIT
