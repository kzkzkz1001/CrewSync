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
|   +-----------+-----------+  +-----------+------------+  +---------+---------+  |
+---------------|--------------------------|-------------------------|------------+
                | REST API                 | WebSocket (GPS)         | REST / WS
+---------------v--------------------------v-------------------------v------------+
|                               API GATEWAY & AUTH                                |
|                        (Reverse Proxy, JWT, Rate Limiting)                      |
+---------------------------------------------------------------------------------+
                                          |
+------------------------------------------v--------------------------------------+
|                            CORE MICROSERVICES LAYER                             |
|  +------------------------+  +------------------------+  +-------------------+  |
|  |  Shift & Event Service |  | Route Optimize Engine  |  | Notification Serv |  |
|  +-----------+------------+  +-----------+------------+  +---------+---------+  |
+--------------|---------------------------|-------------------------|------------+
               |                           | Mapbox Matrix API       | FCM Push
+--------------v---------------------------v-------------------------v------------+
|                                 DATA LAYER                                      |
|          +--------------------------------------+  +-------------------------+  |
|          | PostgreSQL + PostGIS (Persistent DB) |  |   Redis (Live Cache)    |  |
|          +--------------------------------------+  +-------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Manager Portal | React / Next.js |
| Mobile Apps (Driver & Staff) | React Native |
| Backend Services | Node.js / NestJS |
| Real-time Transport | WebSocket (Socket.IO) |
| Database | PostgreSQL + PostGIS |
| Live Cache | Redis |
| Route Optimization | Mapbox Matrix API (Modified VRP) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Auth | JWT (via API Gateway) |
| Containerization | Docker / Kubernetes |

---

## Core Workflows

### Workflow 1 — Route Optimization

1. Manager selects an event destination, one vehicle, and N registered staff in the **Manager Web Portal**, then triggers "Optimize Route".
2. **Shift Service** resolves each staff member's registered or today's departure coordinates.
3. **Route Optimization Engine** submits the driver origin, event destination, and all staff coordinates to the **Mapbox Matrix API**, running a Modified VRP (Vehicle Routing Problem) algorithm.
4. The algorithm computes the optimal trunk route and selects up to 3 physical **Pickup Nodes** along that route — chosen for proximity to staff and public transport accessibility — generating a full time-matrix schedule.
5. The complete trip plan (driver trajectory, per-node ETA, per-staff pickup assignment) is persisted to **PostgreSQL/PostGIS** and distributed to all assigned staff.

### Workflow 2 — Live Tracking & Geofence Alerts

1. Driver taps "Start Trip" in the **Driver App**; GPS activates.
2. Every 10 seconds, the app streams `[Vehicle_ID, Lat, Lng, Timestamp]` to the backend via **WebSocket**.
3. The gateway writes each position update to **Redis** (overwrite cache) — powering the smooth, low-latency vehicle animation on the Manager dashboard.
4. Simultaneously, **Notification Service** computes the geometric distance between the vehicle and the next Pickup Node using **PostGIS `ST_Distance`** (geofence radius: 1 km).
5. When the vehicle crosses the geofence boundary, **FCM** fires a high-priority push to the waiting staff member:
   > *"Your pickup truck is 1.5 km away — estimated arrival in 4 minutes. Please make your way to the pickup point."*

---

## Project Structure

```
crewsync/
├── apps/
│   ├── web/                  # Manager Web Portal (Next.js)
│   ├── driver-app/           # Driver Mobile App (React Native)
│   └── staff-app/            # Staff Mobile App (React Native)
├── services/
│   ├── gateway/              # API Gateway & Auth (JWT, rate limiting)
│   ├── shift-service/        # Shift & Event management
│   ├── route-engine/         # VRP route optimization
│   └── notification-service/ # Geofence detection & FCM push
├── infra/
│   ├── docker-compose.yml
│   └── k8s/
├── db/
│   ├── migrations/
│   └── seed/
└── README.md
```

---

## Getting Started

> Prerequisites: Docker, Node.js 20+, a Mapbox API key, and a Firebase project.

```bash
# Clone the repository
git clone https://github.com/kzkzkz1001/CrewSync.git
cd CrewSync

# Copy and configure environment variables
cp .env.example .env

# Start all services
docker-compose up --build
```

Required environment variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/crewsync
REDIS_URL=redis://localhost:6379
MAPBOX_API_KEY=your_mapbox_key
FCM_SERVER_KEY=your_firebase_server_key
JWT_SECRET=your_jwt_secret
```

---

## Roadmap

### MVP (v1)
- [x] System architecture design
- [ ] Shift creation & staff assignment (Manager Portal)
- [ ] Single-vehicle VRP route optimization via Mapbox
- [ ] Driver GPS streaming via WebSocket
- [ ] Geofence detection & FCM push alerts
- [ ] Staff pickup node display (Staff App)

### v2 — Multi-Vehicle Fleet
- [ ] Multi-vehicle, multi-origin MDVRP algorithm
- [ ] Automatic staff splitting and vehicle assignment
- [ ] Fleet-wide dashboard with real-time map view

### v3 — ML Traffic Prediction
- [ ] Historical drive-time model training
- [ ] Integration with Dublin Luas / Bus Eireann real-time APIs
- [ ] Dynamic pickup window adjustment based on live traffic conditions

---

## License

MIT
