# Studium-Front - Agent Guidelines & Documentation

## 1. Overview
`Studium-Front` is the React/TypeScript frontend microservice for the Studium Cloud Native room reservation platform. It acts as both a user/admin portal and a test suite interface during academic and technical evaluations.

## 2. Technology Stack
- **Framework:** React 18 + TypeScript + Vite 6
- **Runtime / Web Server:** NGINX Alpine (Multi-stage Docker build)
- **Authentication:** Amazon Cognito User Pool `us-east-2_ZyiCXOSCG`, App Client `27ut9a3j3bovljl13e4oobg2bc` (`USER_PASSWORD_AUTH`)
- **Hosting / Orchestration:** Amazon EKS (Kubernetes 1.31)
- **Ingress:** NGINX Ingress Controller (`k8s/ingress.yaml`)

## 3. Architecture & Reverse Proxy Routing
In Kubernetes, `Studium-Front` serves static SPA files and can proxy requests to internal backend microservices via CoreDNS (`10.100.0.10`):
- `/api/users/*` -> `http://studium-users-service.studium.svc.cluster.local:80/api/users/*`
- `/api/catalog/*` -> `http://studium-catalog-service.studium.svc.cluster.local:80/api/catalog/*`
- `/api/bookings/*` -> `http://studium-booking-service.studium.svc.cluster.local:80/api/bookings/*`
- `/api/notifications/*` -> `http://studium-notifications-service.studium.svc.cluster.local:80/api/notifications/*`
- `/health` -> returns `200 "healthy\n"`

## 4. Key Components
- `src/services/cognito.ts`: Handles Amazon Cognito authentication (`InitiateAuth` with `USER_PASSWORD_AUTH`), token storage in `localStorage`, and JWT payload claims extraction.
- `src/services/api.ts`: Centralized `fetch` wrapper that injects `Authorization: Bearer <token>` and notifies the live console listener.
- `src/components/AuthBar.tsx`: User switcher with 1-click buttons for Student, Professor, and Administrator test accounts.
- `src/components/CatalogSection.tsx`: Building and room explorer, room capacity, equipment details, operating hours, demo data seeder, and maintenance management.
- `src/components/BookingSection.tsx`: Timeline availability lookup, reservation creation, check-in, check-out, cancellation, waitlist queue, and utilization metrics report.
- `src/components/UsersSection.tsx`: Profile inspector, notification preference editor, and admin user moderation (block/unblock with SQS sync and audit logs).
- `src/components/NotificationsSection.tsx`: In-app notification viewer backed by DynamoDB, mark-as-read, and manual test notification generator.
- `src/components/ConsoleInspector.tsx`: Collapsible bottom drawer displaying real-time HTTP requests, response statuses, and payloads.
- `src/components/ErrorBoundary.tsx`: React error boundary preventing white-screen crashes from unexpected API response formats.

## 5. Build & Test Commands
```bash
# Install dependencies
npm install

# TypeScript check & production build
npm run build

# Start local development server
npm run dev
```

## 6. Changelog
- **2026-11-08:** Initialized React 18 + TypeScript + Vite project with NGINX reverse-proxy, Dockerfile, Kubernetes manifests, unified NGINX Ingress rules, and GitHub Actions CI/CD.
- **2026-11-08:** Fixed `rooms.map` crash by safely unwrapping `PagedResponse` (`data.items` vs direct array) across Catalog, Booking, Users, and Notifications sections; added React `ErrorBoundary` and demo catalog data seeder.

- **2026-11-08 (Direct Classroom Reservation & Date/Time Pickers):**
  - Added instant reservation form directly inside `CatalogSection` so clicking any room allows immediate reservation without switching tabs.
  - Added dynamic date, start-time, and duration pickers defaulting to valid campus operating hours (07:00 - 22:30), preventing `409 Outside operating hours` rejections.
  - Added catalog room dropdown selector in `BookingSection` and hooked up tab switching with pre-selected rooms.
