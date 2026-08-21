# CrisisHub

CrisisHub is an **enterprise-grade crisis and incident management platform** designed to help organizations monitor incidents, manage available resources, and allocate them efficiently during operational emergencies.

The system combines a **modern React + TypeScript command dashboard** with a **high-performance C++17 backend** that handles crisis management, resource tracking, data persistence, and intelligent priority-based resource allocation.

CrisisHub is designed around one core objective:

> **Identify critical incidents, prioritize them, and allocate the right resources at the right time.**

---

## 🧩 Problem Statement

During operational crises such as **cybersecurity incidents, IT outages, infrastructure failures, or staff shortages**, organizations often need to make fast decisions with limited resources.

Managing these situations manually can result in:

* Delayed responses
* Poor resource utilization
* Conflicting priorities
* Lack of centralized incident information
* Difficulty tracking available resources
* Increased operational costs

Organizations need a centralized system that can **prioritize incidents and intelligently match available resources to urgent requirements**.

---

## 💡 Our Solution

**CrisisHub** provides a centralized command platform for managing organizational crises and resources.

The system allows authorized users to:

* 🚨 Create and manage crisis incidents
* 📋 Track active and resolved incidents
* 💼 Register and manage organizational resources
* ⚡ Automatically prioritize critical incidents
* 🧠 Allocate resources using a priority-based greedy algorithm
* 💰 Prefer lower-cost available resources
* 📊 Monitor operational statistics and performance
* 📝 Generate tactical reports and allocation audit trails

The frontend acts as a command center, while the C++ backend performs the core processing and resource allocation logic.

---

## 🎯 Core Workflow

### 1️⃣ Report

A user logs a new crisis with information such as:

* Crisis type
* Department
* Severity
* Description
* Required resources

### 2️⃣ Prioritize

CrisisHub places pending incidents into a **priority queue** based primarily on severity.

Critical incidents receive higher priority, while older incidents of the same severity are handled first.

### 3️⃣ Allocate

The allocation engine identifies available resources required by the highest-priority crisis and selects the **lowest-cost suitable resource**.

### 4️⃣ Monitor

The dashboard provides an overview of:

* Active crises
* Available resources
* Resource shortages
* Allocation activity
* Operational performance

### 5️⃣ Resolve

Once an incident is resolved, the system releases its assigned resources so they can become available for future incidents.

---

## ✨ Key Features

### 🚨 Crisis Management

* Create new crisis incidents
* Assign severity levels
* Track crisis status
* View active and resolved incidents
* Resolve incidents and release assigned resources

### 💼 Resource Management

* Register organizational assets
* Update resource information
* Search resources
* Track resource availability
* Monitor resource costs

### 🧠 Intelligent Resource Allocation

CrisisHub uses a **priority-based greedy allocation engine**.

The system:

1. Identifies pending crises
2. Prioritizes them using severity
3. Checks required resource types
4. Finds available resources
5. Selects the lowest-cost suitable resource
6. Updates the resource and crisis state
7. Reports shortages when resources are unavailable

### 📊 Dashboard & Analytics

The command dashboard provides operational information including:

* Crisis counts
* Resource counts
* Allocation statistics
* Cost information
* Active shortages
* Department performance

### 📝 Tactical Reports

The reporting module provides operational scorecards and allocation audit information for analyzing crisis response performance.

---

## 🏗️ System Architecture

CrisisHub follows a **decoupled frontend-backend architecture**.

```text
                ┌─────────────────────────┐
                │       CrisisHub UI      │
                │   React + TypeScript    │
                └────────────┬────────────┘
                             │
                         REST API
                             │
                ┌────────────▼────────────┐
                │     C++17 Backend       │
                │     HTTP Server         │
                └────────────┬────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   Crisis Manager     Resource Manager   Allocation Engine
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                   JSON Persistence Layer
```

This separation allows the frontend to focus on user experience while the C++ backend handles business logic and computational operations.

---

## 🛠️ Technology Stack

### Frontend

* **React 18**
* **TypeScript 5**
* **Vite**
* **Vanilla CSS**
* **CSS Custom Variables**
* **Lucide React**

### Backend

* **C++17**
* **cpp-httplib** – REST API and HTTP server
* **nlohmann/json** – JSON processing
* **Windows Sockets (`ws2_32`)** – Networking

### Data Persistence

* Structured **JSON file databases**
* Offline-first persistence
* Separate data files for users, crises, and resources

The technology stack and persistence approach are based on the current project implementation.

---

## 📁 Project Structure

```text
CrisisHub/
├── backend/
│   ├── include/
│   │   ├── httplib.h
│   │   └── json.hpp
│   │
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.h
│   │   │   ├── Crisis.h
│   │   │   ├── Resource.h
│   │   │   └── Allocation.h
│   │   │
│   │   ├── managers/
│   │   │   ├── AuthenticationManager.h / .cpp
│   │   │   ├── CrisisManager.h / .cpp
│   │   │   ├── ResourceManager.h / .cpp
│   │   │   ├── AllocationManager.h / .cpp
│   │   │   └── ReportManager.h / .cpp
│   │   │
│   │   ├── server/
│   │   │   ├── HttpServer.h / .cpp
│   │   │   └── main.cpp
│   │   │
│   │   └── data/
│   │       ├── users.json
│   │       ├── crises.json
│   │       └── resources.json
│   │
│   └── build.bat
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CrisisManagement.tsx
│   │   │   ├── ResourceManagement.tsx
│   │   │   └── Reports.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🧠 DSA & Algorithm

One of the main technical components of CrisisHub is its **priority-based resource allocation engine**.

### Priority Queue

The system uses `std::priority_queue` to prioritize crises based on severity.

```text
Severity 4 → Critical
Severity 3 → High
Severity 2 → Medium
Severity 1 → Low
```

When two crises have the same severity, the older incident is prioritized first.

This provides a fair ordering and helps reduce starvation among incidents with equal priority.

### Greedy Resource Allocation

For each required resource type, the allocation engine searches available resources and selects the **lowest-cost suitable resource**.

This follows the greedy principle:

> **Make the best locally available choice at each allocation step.**

### Complexity

For `C` pending crises and `R` registered resources, the allocation process operates approximately at:

```text
O(C log C + C × R)
```

This provides an efficient approach for the project's resource allocation requirements.

---

## 🔌 REST API

### 🔐 Authentication

```text
POST /api/login
```

Authenticates a user and returns a session token.

### 🚨 Crisis Management

```text
GET  /api/crises
POST /api/crises
PUT  /api/crises/resolve/:id
```

Used to create, retrieve, and resolve crisis incidents.

### 💼 Resource Management

```text
GET    /api/resources?q=query
POST   /api/resources
PUT    /api/resources/:id
DELETE /api/resources/:id
```

Used to manage organizational resources.

### ⚡ Allocation Engine

```text
POST /api/allocate
```

Triggers the priority-based greedy resource allocation engine.

### 📊 Dashboard Statistics

```text
GET /api/dashboard/stats
```

Returns operational statistics, cost information, and active shortage alerts.

### 📈 Performance Reports

```text
GET /api/reports/performance
```

Returns department performance information and allocation audit records.

The API structure follows the endpoints documented in the current project.

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure the following are installed:

* **GCC/G++ supporting C++17**
* **MSYS2 or MinGW**
* **Node.js 18+**
* **npm**

---

### 1️⃣ Start the C++ Backend

Open PowerShell and navigate to the backend:

```bash
cd backend
```

Compile the backend:

```bash
.\build.bat
```

Start the server:

```bash
.\crisis_server.exe
```

The backend will run on:

```text
http://127.0.0.1:8080
```

---

### 2️⃣ Start the React Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

These execution steps match the current backend and frontend setup.

---

## 🔐 Production Security Improvements

For production deployment, CrisisHub can be strengthened with:

* 🔒 HTTPS/TLS encryption
* 🔑 JWT-based authentication
* 🛡️ Strong input validation and sanitization
* 🗄️ Migration from JSON files to a relational database
* 🔐 Role-based access control
* 🔄 Thread-safe database writes
* 📡 WebSocket-based real-time crisis notifications

---

## 🚀 Future Enhancements

CrisisHub can be extended into a more advanced enterprise crisis coordination platform.

### 🤖 AI-Assisted Decision Making

* Predict crisis severity
* Recommend resources
* Detect potential escalation
* Suggest response strategies

### 📡 Real-Time Monitoring

* Live incident updates
* Real-time resource availability
* Instant shortage notifications
* WebSocket-based command updates

### 🗄️ Scalable Database

Move from local JSON persistence to a production database such as PostgreSQL or SQLite.

### 🌐 Distributed Architecture

The backend can be horizontally scaled behind a load balancer to support larger organizations and higher request volumes.

### 📊 Advanced Analytics

* Crisis response trends
* Department performance
* Resource utilization
* Cost optimization
* Historical incident analysis

---

## 🎓 Viva / Technical Highlights

CrisisHub demonstrates several important computer science concepts:

### C++

* Modern C++17
* Smart pointers
* STL containers
* File handling
* Multi-threaded HTTP server
* Windows socket programming

### OOP

* Encapsulation
* Abstraction
* Composition
* Modular architecture
* Separation of concerns

### DSA

* Priority Queue
* Greedy Algorithm
* Maps
* Vectors
* Sorting and searching

### Networking

* HTTP/REST APIs
* TCP communication
* CORS
* Socket programming

### Software Engineering

* Frontend/backend separation
* Modular design
* API-based communication
* Persistent data management

---

## 🌟 Why CrisisHub?

CrisisHub is more than a basic incident tracker.

It combines:

**Crisis Management + Resource Management + DSA + C++ + React + REST APIs + Analytics**

into one practical system.

The project demonstrates how fundamental computer science concepts such as **priority queues and greedy algorithms** can be applied to a real-world operational problem.

---

## 👤 Author

**Manoj Kumar**

GitHub:
https://github.com/kumarmanu17

---

## ⭐ Support

If you find **CrisisHub** useful or interesting, consider giving the repository a ⭐ on GitHub.

### 🚨 CrisisHub

**Detect. Prioritize. Allocate. Resolve.**
