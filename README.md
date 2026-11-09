# Studium-Front

Frontend microservice and testing interface for the Studium Cloud Native platform. Built with **React 18**, **TypeScript**, **Vite**, and containerized using **NGINX Alpine** as both a static SPA server and an internal reverse-proxy.

---

## 🏛️ Architecture & Role in Cloud Native Rubric

Studium-Front fulfills key requirements of the **Avaliação Somativa N2**:
1. **Multi-Technology & Multi-Language:** Implements a modern TypeScript/React web application, complementing the C# (.NET 10) and Python 3.12 backends.
2. **Kubernetes Ingress & Service Discovery:**
   - Exposes the user interface and APIs externally through the AWS EKS **NGINX Ingress Controller** (`k8s/ingress.yaml`).
   - Demonstrates internal service discovery via Kubernetes ClusterIP DNS (`studium-users-service`, `studium-catalog-service`, `studium-booking-service`, `studium-notifications-service`).
3. **Interactive Demonstration Tool:**
   - Features an embedded, real-time **REST Network Inspector** drawer at the bottom of the screen showing every outgoing HTTP request, method, status code, payload, and response body in real time during live presentations.

---

## 🔑 Authentication (Amazon Cognito)

Studium-Front integrates directly with Amazon Cognito User Pool `us-east-2_ZyiCXOSCG` via REST API authentication (`USER_PASSWORD_AUTH`).

Pre-configured 1-click test accounts:
| Role | Email | Password | Group / Permissions |
|---|---|---|---|
| **Student** | `estudante@pucpr.edu.br` | `StudiumPassword2026!` | `Student` (Max 2h reservation, max 2 active) |
| **Professor** | `professor@pucpr.edu.br` | `StudiumPassword2026!` | `Professor` (Priority, max 4h reservation) |
| **Administrator** | `admin@pucpr.edu.br` | `StudiumPassword2026!` | `Administrator` (Full access, maintenance, user blocks) |

---

## 🧩 Functional Sections

1. **🏢 Salas & Catálogo (`Studium-Catalog`):**
   - Browse campus buildings and rooms.
   - View room capacity, floor, equipment, and map coordinates.
   - Admin controls: create buildings, add rooms, and schedule maintenance blocks.
2. **📅 Reservas & Agendamentos (`Studium-Booking`):**
   - Check room availability timeline (green/busy/maintenance).
   - Create reservations with automatic duration enforcement and PostgreSQL `tstzrange` GiST conflict prevention.
   - Perform Check-in and Check-out.
   - Cancel active reservations.
   - Join room Waitlist (FIFO queue).
   - View Campus Utilization Metrics report.
3. **👤 Meu Perfil & Gestão de Usuários (`Studium-Users`):**
   - View profile attributes, RA/ID, and 30-day reservation & no-show counters.
   - Update phone number and notification preferences (`PUT /api/users/{id}`).
   - Admin User Management: search users, filter by role/status, toggle user blocks (which publishes `UserStatusChangedEvent` via SQS), and inspect security audit logs.
4. **🔔 Notificações (`Studium-Notifications`):**
   - Real-time in-app notification feed persisted in **Amazon DynamoDB**.
   - Mark notifications as read.
   - Manual notification simulator to test DynamoDB writes directly (`POST /api/notifications/test`).

---

## 🛠️ Local Development

### Prerequisites
- Node.js 22+
- npm

### Run Locally
```bash
# Install dependencies
npm install

# Start Vite dev server on http://localhost:5173
npm run dev

# Build production bundle
npm run build
```

---

## 🐳 Docker & Kubernetes Deployment

### Build and Run Docker Container Locally
```bash
docker build -t studium-front:latest .
docker run -p 8080:80 studium-front:latest
```

### Kubernetes Manifests
- `k8s/deployment.yaml`: Deployment (1 replica) + ClusterIP Service on port 80.
- `k8s/ingress.yaml`: Ingress resource routing `/` to `studium-front-service` and `/api/*` to the respective microservices.
