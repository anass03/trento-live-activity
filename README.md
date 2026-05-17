# Trento Live Activity

> Interactive platform for social life and urban infrastructure in the city of Trento.

**Group 7** — University of Trento · Software Engineering a.a. 2025-2026  
Anas Soussane · Filippo Marcatili · Saif Safi

---

## What It Is

Trento Live Activity is a civic-tech web platform that lets citizens explore the city in real time and take part in its social life. On the map they can see parking availability, crowding levels at public spaces, upcoming events, and spontaneous activities created by other citizens. They can join activities, propose new ones, and get personalised notifications based on their interests.

The Comune di Trento gets a dedicated analytics dashboard for monitoring urban activity trends and exporting statistical reports.

---

## Key Features

| Feature | Who |
|---------|-----|
| Interactive map with real-time IoT data (parking, crowding) | All users |
| Filter and search activities, events, and POIs | All users |
| Create and join spontaneous activities | Registered users |
| Receive push/email notifications for nearby activities | Registered users |
| Publish certified events with verification badge | Certified entities |
| Report inappropriate content (DSA-compliant) | Registered users |
| Analytics dashboard with PDF/CSV export | Municipal administrator |
| Manage users, POIs, and content moderation | System administrator |

---

## Architecture

The backend follows a **microservices pattern** with a central REST API Gateway. The frontend communicates exclusively with the gateway; internal services are not directly exposed.

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

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full component breakdown.
See [`docs/frontend-backend-db-connection.md`](docs/frontend-backend-db-connection.md) for the current frontend → backend API → PostgreSQL development flow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML / CSS / JavaScript (or React) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Authentication | JWT · OAuth 2.0 (Google, Apple) · SPID · 2FA/OTP |
| Push notifications | Firebase Cloud Messaging |
| Email | SMTP (transactional) |
| Maps | Google Maps API / OpenStreetMap |
| Real-time data | REST / MQTT (IoT sensors) |
| API documentation | Apiary / OpenAPI 3 |
| Version control | Git + GitHub |

---

## Repository Structure

```
trento-live-activity/
├── backend/              # Express.js API services
│   ├── src/
│   │   ├── auth/         # Authentication & JWT
│   │   ├── activities/   # Activity & event management
│   │   ├── map/          # Map & POI service
│   │   ├── notifications/# Push & email notifications
│   │   ├── moderation/   # Report management
│   │   └── dashboard/    # Analytics dashboard
│   └── package.json
├── frontend/             # Web client
├── docs/
│   ├── ARCHITECTURE.md   # Component diagram & descriptions
│   ├── REQUIREMENTS.md   # Functional & non-functional requirements
│   └── api/              # OpenAPI 3 spec (Apiary link below)
└── README.md
```

---

## API Documentation

The complete OpenAPI 3 specification lives in [`docs/openapi.yaml`](docs/openapi.yaml) — every endpoint, request/response schema, security scheme and references to RF/RNF/OCL requirements are documented there.

To explore it interactively:

- Open `docs/openapi.yaml` in [Swagger Editor](https://editor.swagger.io/) (drag and drop the file)

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/<org>/trento-live-activity.git
cd trento-live-activity/backend

# One-shot setup: creates PostgreSQL user/db, .env, runs npm install
npm run setup

# Start the development server (creates tables automatically)
npm run dev

# (Optional) populate the database with sample data
npm run seed
```

The setup script needs `sudo` access (for PostgreSQL user/db creation) and assumes PostgreSQL is installed and running.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `APPLE_CLIENT_ID` | Apple OAuth client ID |
| `FIREBASE_SERVER_KEY` | Firebase Cloud Messaging key |
| `SMTP_HOST` / `SMTP_PORT` | SMTP server configuration |
| `MAPS_API_KEY` | Google Maps API key (optional if using OSM) |

---

## Project Deliverables

| Deliverable | Deadline | Status |
|-------------|----------|--------|
| D1 — Requirements, Use Cases, BPMN | 27/03/2026 | ✅ Submitted |
| Pitch — Comune di Trento | 01/04/2026 | ✅ Presented |
| D2 — Component Diagram, Class Diagram, OCL | 24/04/2026 | ✅ Submitted |
| D3 — Sprint 1 | 15/05/2026 | 🔄 In progress |
| D4 — Sprint 2 | 07/06/2026 | ⏳ Upcoming |

---

## Team

| Name | Student ID | GitHub |
|------|-----------|--------|
| Anas Soussane | 243731 | @[TBD] |
| Filippo Marcatili | 243199 | @[TBD] |
| Saif Safi | 245473 | @[TBD] |

---

## License

Academic project — University of Trento · a.a. 2025-2026. All rights reserved.
