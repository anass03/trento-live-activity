# Requirements — Trento Live Activity

> Source: Deliverable D1 + D2 (Group 7 — Marcatili, Soussane, Safi)  
> University of Trento — Software Engineering a.a. 2025-2026

---

## Project Objective

Trento Live Activity is an interactive civic-tech web platform for the city of Trento. It allows citizens to view real-time urban activity on an interactive map (parking availability, crowding levels, events, points of interest) and to propose and join social activities. The Comune di Trento receives an admin dashboard for monitoring and managing urban activity.

---

## System Actors

| Actor | Description |
|-------|-------------|
| **Utente Non Autenticato** | Visitor with read-only access to public map data |
| **Utente Registrato** | Authenticated citizen; can create activities, join events, manage their profile |
| **Ente Certificato** | Verified organisation (sports clubs, cultural institutions, venues); can publish certified events |
| **Amministratore Comunale** | Municipal administrator; accesses analytics dashboard and usage statistics; authenticates via SPID |
| **Amministratore di Sistema** | Technical system administrator; manages POIs, user accounts, moderation; authenticates with 2FA |

---

## Functional Requirements

### Authentication & Profile (RF5–RF8, RF20, RF26, RF31)

| ID | Requirement |
|----|-------------|
| RF5 | The system must allow unregistered users to sign up via email and password |
| RF6 | The system must allow registered users to log in via email/password or OAuth (Google, Apple) |
| RF7 | The system must allow municipal administrators to authenticate via SPID |
| RF8 | The system must allow password recovery via a link sent to the registered email address |
| RF20 | The system must allow registered users to view and edit their profile (name, age, interests) |
| RF26 | The system must allow registered users to request account deletion (GDPR art. 17 — right to erasure) |
| RF31 | The system must allow certified entities to request registration, pending approval by the system administrator |

### Map & POI (RF2, RF3, RF9, RF36, RF38, RF39)

| ID | Requirement |
|----|-------------|
| RF2 | The system must display an interactive map of the city of Trento with points of interest |
| RF3 | The system must allow unregistered users to view public urban data on the map (parking, crowding, public events) |
| RF9 | The system must personalise the map layer based on the authenticated user's declared interests |
| RF36 | The system must allow the system administrator to add, modify, and remove points of interest on the map |
| RF38 | The system must display real-time data from IoT sensors on the map (parking availability, crowding) |
| RF39 | The system must display the crowding status of each POI with a colour code: green / yellow / red |

### Activities (RF10, RF11, RF12, RF13, RF14, RF15, RF17, RF19)

| ID | Requirement |
|----|-------------|
| RF10 | The system must allow registered users to create a spontaneous activity by selecting type, date, time, and maximum participants from predefined options |
| RF11 | The system must allow registered users to join an activity; the system must notify the creator and send a confirmation to the participant |
| RF12 | The system must allow users to add a joined activity to their personal calendar |
| RF13 | The system must allow registered users to update their interests |
| RF14 | The system must allow users to filter activities by category (sport, culture, music, study) |
| RF15 | The system must allow users to perform a textual search for activities, events, and POIs on the map |
| RF17 | The system must allow registered users to cancel their participation in an activity, with automatic notification to other participants |
| RF19 | The system must allow the activity creator to modify the activity before its start date, with automatic notification to registered participants |

### Certified Events (RF21, RF23, RF24, RF25)

| ID | Requirement |
|----|-------------|
| RF21 | The system must allow certified entities to publish events with free-text fields and a verification badge |
| RF23 | The system must display certified events on the map with a verification badge |
| RF24 | The system must allow certified entities to modify a published event |
| RF25 | The system must allow certified entities to view statistics for their events (views, registrations, interactions) |

### Content Moderation (RF16, RF33)

| ID | Requirement |
|----|-------------|
| RF16 | The system must allow registered users to report a certified event for inappropriate content (illegal content, spam, false information, offensive content) |
| RF33 | The system must allow the system administrator to manage reports, with outcomes of removal or archiving |

### Analytics Dashboard (RF27, RF28, RF29, RF30)

| ID | Requirement |
|----|-------------|
| RF27 | The system must provide the municipal administrator with aggregated statistics on infrastructure usage |
| RF28 | The system must provide the municipal administrator with statistics on event and activity participation |
| RF29 | The system must allow the municipal administrator to filter statistics by type, geographic area, and time period |
| RF30 | The system must allow the municipal administrator to export reports in PDF or CSV format |

### Notifications (RF40, RF45)

| ID | Requirement |
|----|-------------|
| RF40 | The system must send push notifications to users about new activities near their location and matching their interests |
| RF45 | The system must send transactional emails (registration confirmation, password recovery, moderation notices) |

### Calendar Integration (RF49)

| ID | Requirement |
|----|-------------|
| RF49 | The system must allow users to add events and activities to their personal calendar via .ics export or external calendar API |

---

## Non-Functional Requirements

### Security & Authentication

| ID | Requirement |
|----|-------------|
| RNF15 | System administrators must authenticate with mandatory two-factor authentication (2FA / OTP) |
| RNF22 | Spontaneous activities must use only predefined, structured field values (no free text) to limit DSA applicability |

### Privacy & Data Protection (GDPR)

| ID | Requirement |
|----|-------------|
| RNF18 | The system must comply with GDPR (EU Reg. 2016/679) for all personal data processing |
| RNF19 | The system must obtain explicit user consent before collecting personal data (GDPR art. 7) |
| RNF20 | The system must support the right to erasure (GDPR art. 17) upon user account deletion request |
| RNF21 | Users must be at least 13 years old to register (GDPR art. 8) |

### Content Moderation — DSA Compliance

| ID | Requirement |
|----|-------------|
| RNF23 | The content moderation flow must comply with the Digital Services Act (EU Reg. 2022/2065) |
| RNF24 | The system must notify the system administrator of new reports and notify certified entities of any content removal |

### Accessibility

| ID | Requirement |
|----|-------------|
| RNF25 | The frontend must comply with WCAG 2.1 Level AA accessibility guidelines |

### Performance & Scalability

| ID | Requirement |
|----|-------------|
| RNF30 | The system must handle a minimum of 500 concurrent users without performance degradation |
| RNF31 | API response time must not exceed 2 seconds under normal load |

### Data Persistence

| ID | Requirement |
|----|-------------|
| RNF35 | The system must use PostgreSQL as the primary relational database for structured data persistence |

---

## OCL Constraints Summary

| ID | Class | Type | Description |
|----|-------|------|-------------|
| C1 | GestioneAutenticazione | Post | Successful login sets `autenticato = true` |
| C2 | GestioneAutenticazione | Pre | Email and password must pass ValidatoreCredenziali before registration |
| C3 | GestioneAutenticazione | Post | Successful registration automatically authenticates the user |
| C4 | GestioneAutenticazione | Post | SPID login only succeeds for users with role `AmministratoreComunale` |
| C5 | Utente | Inv | User age must be ≥ 13 (GDPR art. 8) |
| C6 | Utente | Post | Logout sets `autenticato = false` |
| C7 | Utente | Inv | Email must be unique across all user instances |
| C8 | Attività | Inv | `maxPartecipanti` must be between 2 and 50 |
| C9 | Attività | Pre | Activity start date must not be in the past |
| C10 | Attività | Post | After creation: `stato = "attiva"` and creator is first participant |
| C11 | Attività | Inv | End time must be after start time |
| C12 | Attività | Pre | Modify/cancel only allowed by creator and only before start date |
| C13 | Attività | Pre | `aggiungiPartecipante` only allowed when spots are available |
| C14 | Attività | Post | After `aggiungiPartecipante`: user is in participants list |
| C15 | Evento | Pre | `pubblica()` only callable by approved certified entity |
| C16 | Evento | Post | After `pubblica()`: `badgeVerifica = true` |
| C17 | Evento | Inv | Title must be non-empty and ≤ 100 characters |
| C18 | Partecipazione | Inv | A user cannot be registered more than once for the same activity |
| C19 | Partecipazione | Post | Cancellation decrements the participant counter |
| C20 | PuntoInteresse | Inv | `capacitaMax > 0` |
| C21 | PuntoInteresse | Inv | `statoAffollamento ∈ {verde, giallo, rosso}` |
| C22 | Segnalazione | Inv | A user can submit only one report per event |
| C23 | Segnalazione | Post | After `registra()`: timestamp = current date, `stato = "aperta"` |
| C24 | EnteCertificato | Pre | `pubblicaEvento()` requires `approvato = true` |
| C25 | DashboardAnalitica | Pre | `caricaStatistiche()` requires `u.ruolo = AmministratoreComunale` |