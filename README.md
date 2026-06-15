<div align="center">

# 🏔️ Trento Live Activity

**A real-time map of everything happening in Trento — events, activities, parking and crowding, all in one place.**

*perché i programmi pubblici non valgono nulla se non sai come accedervi*

<br/>

![University of Trento](https://img.shields.io/badge/University%20of%20Trento-a.a.%202025%2F26-AC1E2D?style=for-the-badge)
![Software Engineering](https://img.shields.io/badge/Software%20Engineering-Group%207-1E40AF?style=for-the-badge)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql&logoColor=white)
![MapLibre](https://img.shields.io/badge/MapLibre-GL-396CB2?logo=maplibre&logoColor=white)

**Anas Soussane · Filippo Marcatili · Saif Safi**

</div>

---

## What It Is

A web platform where citizens explore Trento live on an interactive map and join its social life: real-time parking and crowding, certified events, and spontaneous activities created by other people — all filtered to your interests. The Comune di Trento gets an analytics dashboard on top.

> 💡 **The idea.** In 2025 NYC launched *"Summer in NYC"* (Mayor Mamdani) — a portal to find free public programs by age, area and interest. The point: *a public service nobody can find doesn't really exist.* We bring that to Trento, a student city packed with things to do that people just never hear about.

**Who uses it**

- 🎓 **Student** — finds events & activities by interest and distance
- 🅿️ **Citizen** — checks live parking and crowding before heading out
- ⚽ **Organiser** — creates a pickup match; nearby people get notified and join
- 🏛️ **Certified entity** — publishes verified events and sees their stats
- 📊 **Comune** — monitors trends on a dashboard, exports PDF/CSV

`GDPR` · `DSA` · `WCAG 2.1 AA` · `SPID / 2FA` · 🇮🇹 / 🇬🇧

---

## Key Features

| Feature | Who |
|---------|-----|
| Interactive map with real-time IoT data (parking, crowding) | All users |
| Filter and search activities, events, and POIs | All users |
| Create and join spontaneous activities | Registered users |
| Push/email notifications for nearby activities | Registered users |
| Publish certified events with verification badge | Certified entities |
| Report inappropriate content (DSA-compliant) | Registered users |
| Analytics dashboard with PDF/CSV export | Municipal administrator |
| Manage users, POIs, and content moderation | System administrator |

---

## Architecture

Microservices behind a central REST API Gateway. The frontend talks only to the gateway; internal services aren't exposed directly.

```
Frontend WebApp
      │ REST
      ▼
 API Gateway
      ├── Auth Service          (OAuth, SPID, 2FA, JWT/RBAC)
      ├── Activity & Event Svc  (CRUD, participation, notifications)
      ├── Map & POI Svc         (real-time IoT, geocoding)
      ├── Notification Svc      (FCM push, SMTP email)
      ├── Moderation Svc        (DSA-compliant report flow)
      ├── Analytics Dashboard   (stats, PDF/CSV export)
      └── Data Layer            ──► PostgreSQL
```

More in [`docs/architecture.md`](docs/architecture.md) and [`docs/frontend-backend-db-connection.md`](docs/frontend-backend-db-connection.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| i18n | i18next (Italian / English) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Auth | JWT · OAuth 2.0 (Google, Apple) · SPID · 2FA/OTP |
| Notifications | Firebase Cloud Messaging · SMTP |
| Maps | MapLibre GL / OpenStreetMap |
| Real-time | Server-Sent Events (SSE) · IoT sensors |
| API docs | OpenAPI 3 (Swagger) |

---

## Repository Structure

```
trento-live-activity/
├── backend/      # Express.js API services (auth, activities, map, notifications, moderation, dashboard)
├── frontend/     # React + TypeScript web client (Vite)
├── docs/         # architecture.md · requirements.md · openapi.yaml
└── README.md
```

---

## Getting Started

```bash
# Backend
cd trento-live-activity/backend
npm run setup     # creates PostgreSQL user/db + .env, installs deps
npm run dev       # starts the API (creates tables automatically)
npm run seed      # optional: sample data

# Frontend
cd ../frontend
npm install
npm run dev
```

`npm run setup` needs `sudo` (for PostgreSQL user/db creation) and assumes PostgreSQL is installed and running.

**Main environment variables:** `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `FIREBASE_SERVER_KEY`, `SMTP_HOST` / `SMTP_PORT`, `MAPS_API_KEY`.

---

## API Documentation

The full OpenAPI 3 spec is in [`docs/openapi.yaml`](docs/openapi.yaml) — every endpoint, schema, security scheme and RF/RNF/OCL reference. Drag it into the [Swagger Editor](https://editor.swagger.io/) to explore.

---

## Project Deliverables

| Deliverable | Deadline | Status |
|-------------|----------|--------|
| D1 — Requirements, Use Cases, BPMN | 27/03/2026 | ✅ Submitted |
| Pitch — Comune di Trento | 01/04/2026 | ✅ Submitted |
| D2 — Component Diagram, Class Diagram, OCL | 24/04/2026 | ✅ Submitted |
| D3 — Sprint 1 | 15/05/2026 | ✅ Submitted |
| D4 — Sprint 2 | 07/06/2026 | ✅ Submitted |
| 🌟 Making Trento Live Activity the everyday companion every Trentino deserves | ∞ | 🚀 Ongoing |

---

## Team

| Name | Student ID | GitHub |
|------|-----------|--------|
| Anas Soussane | 243731 | [@anass03](https://github.com/anass03) |
| Filippo Marcatili | 243199 | [@flippomar](https://github.com/flippomar) |
| Saif Safi | 245473 | [@elliott-dp](https://github.com/elliott-dp) |

---

## License

Academic project — University of Trento · a.a. 2025-2026. All rights reserved.

<div align="center">
<br/>

*perché i programmi pubblici non valgono nulla se non sai come accedervi*

🏔️

</div>
