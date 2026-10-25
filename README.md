# PulseOps — AI-Powered Server Monitoring and Self-Recovery System

**PulseOps** is an enterprise-grade autonomous server monitoring and self-recovery platform built for high-resilience DevOps operations. It continuously monitors real host telemetry via `psutil`, conducts HTTP health probes against microservice endpoints, detects operational anomalies using rule heuristics and modular `scikit-learn` Isolation Forest models, diagnoses root causes through telemetry-log correlation, executes strictly allowlisted self-recovery workflows, verifies recovery with post-action probes, and persists complete audit trails in SQLite.

---

## 1. System Architecture & Workflow

PulseOps operates on a closed-loop autonomous lifecycle:

```
+-----------+     +----------+     +------------+     +-----------+     +----------+     +---------+
|  MONITOR  | --> |  DETECT  | --> |  DIAGNOSE  | --> |  RECOVER  | --> |  VERIFY  | --> |  ALERT  |
+-----------+     +----------+     +------------+     +-----------+     +----------+     +---------+
 (psutil /         (Rules &         (Root Cause        (Allowlist        (2-Probe         (Audits &
  httpx)            ML Outliers)     Hypotheses)        Policies)         Checks)          Toasts)
```

### Component Architecture
```
                                +------------------------------------------+
                                |          PulseOps React Frontend         |
                                |     (React 19, TypeScript, Recharts,     |
                                |       Tailwind CSS, Lucide React)        |
                                +--------------------+---------------------+
                                                     | REST APIs / Polling
                                                     v
                                +------------------------------------------+
                                |          FastAPI Backend Engine          |
                                +--------------------+---------------------+
                                                     |
         +--------------------+----------------------+---------------------+---------------------+
         |                    |                                            |                     |
         v                    v                                            v                     v
 +---------------+    +---------------+                            +---------------+     +---------------+
 | Host Monitor  |    | HTTP Service  |                            | Anomaly & ML  |     | Safe Recovery |
 | (psutil)      |    | Health Checker|                            | Detector      |     | Engine        |
 | - CPU & RAM   |    | (httpx)       |                            | - Rule-based  |     | - Allowlist   |
 | - Disk/Uptime |    | - Microservice|                            | - ML Detector |     | - Cooldowns   |
 +---------------+    +---------------+                            +---------------+     | - Verification|
         |                    |                                            |             +---------------+
         +--------------------+--------------------------------------------+                     |
                                                     | Telemetry & Incidents                     |
                                                     v                                           v
                              +------------------------------------------------------------------+
                              |                    SQLite Persistence Layer                      |
                              |         (Services, Telemetry, Incidents, Recoveries, Audits)     |
                              +------------------------------------------------------------------+
                                                     ^
                                                     |
                                       +-------------+------------+
                                       |   Isolated Test Service  |
                                       |  - Local Process / Docker|
                                       |  - Synthetic Fault Inject|
                                       +--------------------------+
```

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom DevOps color tokens
- **Visualizations**: Recharts (Area charts, live gradients) & SVG sparklines
- **Icons**: Lucide React
- **Routing**: React Router v7
- **Feedback**: Custom non-blocking Toast provider and accessible modals

### Backend
- **Framework**: Python 3.10+ (tested on Python 3.14) & FastAPI
- **Validation**: Pydantic v2 (ConfigDict models)
- **Telemetry**: `psutil` (non-blocking host sampling) & `httpx` (async HTTP probes)
- **Database**: SQLite with SQLAlchemy ORM
- **Testing**: Pytest & Starlette TestClient
- **Machine Learning**: `scikit-learn` Isolation Forest for multivariate anomaly detection

---

## 3. Premium Blue UI/UX Design System

The frontend follows a modern DevOps observability design system:
- **Primary Blue**: `#2563EB`
- **Deep Navy (Sidebar)**: `#0F172A`
- **Secondary Blue**: `#1D4ED8`
- **Sky Blue**: `#38BDF8`
- **Page Background**: `#F0F7FF`
- **Card Background**: `#FFFFFF`
- **Border**: `#DBEAFE`
- **Healthy / Optimal**: `#16A34A`
- **Warning / Degraded**: `#D97706`
- **Critical / Outage**: `#DC2626`

---

## 4. Windows 10/11 Setup Guide

### Prerequisites
- **Python 3.10+**: Verify with `python --version`
- **Node.js v18+ & npm**: Verify with `node --version` and `npm --version`
- **PowerShell**: Windows Terminal or PowerShell 5.1 / 7+

---

### Step-by-Step Execution

Open **three separate PowerShell terminal windows** in the project directory (`SERVER MONITORING/`):

#### Terminal 1: Backend API Server
```powershell
# 1. Create and activate virtual environment (if not already created)
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Start the PulseOps FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend API will be available at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.*

---

#### Terminal 2: Isolated Test Service
```powershell
# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Launch the controlled mock microservice
python test-service/app.py
```
*The test service will be available at `http://127.0.0.1:8001`.*

---

#### Terminal 3: React Frontend Dashboard
```powershell
# Navigate into the frontend folder
cd frontend

# Install node dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev
```
*Open your browser and navigate to `http://localhost:5173/`.*

---

## 5. Optional Docker Setup

If Docker Desktop is installed and running on your Windows host:

```powershell
# Build and run the test service in an isolated Docker container
docker-compose up -d

# Verify container is running
docker ps
```
The backend automatically detects when Docker is accessible on the system PATH. When Docker is active, container restart actions will target `pulseops-test-service` via the Docker daemon. If Docker is not available, PulseOps transparently executes the controlled HTTP fault-recovery workflow and clearly labels it as **Simulated / Process Mode**.

---

## 6. Running the Automated Test Suite

PulseOps includes 15 automated unit and integration tests covering host metric collection, safe URL validation, anomaly thresholds, deduplication, root cause diagnosis, recovery allowlisting, dry-run mode, and API routes.

Run the test suite in PowerShell:
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

Run frontend TypeScript and production bundle verification:
```powershell
cd frontend
npm run build
```

---

## 7. Interactive Demonstration Lab (8 Guided Scenarios)

Navigate to the **Demo Lab** page (`/demo`) in the dashboard to evaluate all 8 scenarios:

| # | Scenario | Injected Condition | Expected System Behavior |
|---|---|---|---|
| **1** | **Baseline Normal** | All faults cleared | Host metrics return to real hardware values; services report Healthy. |
| **2** | **High CPU Anomaly** | 93.4% simulated host CPU | CPU KPI card highlights Critical; Anomaly Engine logs `cpu_percent` spike; Root-cause diagnoses CPU saturation. |
| **3** | **High Memory Anomaly** | 91.8% simulated RAM | Memory KPI card flags High; Diagnosis correlates memory pressure & potential leak. |
| **4** | **Slow API Response** | 2250ms latency on Order API | Service status transitions to `degraded`; Latency trend chart spikes; Diagnosis correlates downstream DB query latency. |
| **5** | **Repeated HTTP 500** | HTTP 500 Internal Server Error | Service status degrades; Incident dossier correlates unhandled runtime exception; Recommends container restart. |
| **6** | **Service Unavailable** | 3 consecutive health probe failures | Service marked `unavailable`; Incident Center lists critical outage; Root-cause diagnoses process termination. |
| **7** | **End-to-End Recovery** | Outage → Diagnose → Remediate → Verify | Recommends `restart_test_service`; Executes recovery; Settle delay passes; 2-probe health verification passes; Incident marked `recovered`! |
| **8** | **Escalation Policy** | Corrupt / Unrecoverable state | Policy prevents endless retry loops; Action triggers `escalate_incident`; Incident marked `unresolved` and assigned to human SRE. |

---

## 8. Safe Recovery Policy & Guardrails

The Recovery Engine enforces zero-trust autonomous execution:
1. **Predefined Allowlist**: Only `retry_health_check`, `restart_test_service`, `verify_service_health`, and `escalate_incident` are permitted. Arbitrary shell commands and user scripts are rejected at the API schema level.
2. **Target Isolation**: Real Docker restarts only operate on the designated container (`pulseops-test-service`). Host services are never restarted.
3. **Concurrency Locks**: Simultaneous recovery attempts on the same service or host partition are blocked.
4. **Cooldown Windows**: Enforces a configurable cooldown (default 60s) between remediation attempts.
5. **Retry Bounds**: Enforces maximum retries (default 3) before automatically escalating to human intervention.
6. **Mandatory Verification**: An incident is **never** reported as recovered until post-action health probes succeed. If verification fails, the incident transitions to `unresolved`.
7. **Dry-Run Mode**: Allows operators to test policy validation without modifying system state.

---

## 9. Troubleshooting Common Windows Issues

- **ExecutionPolicy Error on Virtual Environment Activation**:
  If PowerShell displays `running scripts is disabled on this system`, run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
- **Port Conflicts (8000, 8001, 5173)**:
  Check for conflicting processes with:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -ErrorAction SilentlyContinue
  ```
- **Windows Defender Application Control (WDAC) / Cython DLLs**:
  PulseOps uses standard Python wheels (`sqlalchemy<2.1` and `scikit-learn`) ensuring compatibility with Windows Application Control policies.

---

## 10. Known Limitations & Trust Boundary

- **Host Metrics**: Host CPU and RAM metrics reflect the Windows machine running the backend. When simulated telemetry is active in the Demo Lab, it is clearly labelled with a purple **Simulated** badge to prevent ambiguity.
- **Single Host Prototype**: This prototype monitors local host resources and local/containerized microservices. For multi-node distributed clusters, agents can stream metrics into the REST endpoint (`/api/metrics`).
- **No Sensitive Credential Exposure**: Logs and API endpoints do not expose environment secrets, passwords, or authentication tokens.
