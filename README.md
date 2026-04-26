# 🏥 MedVault

> **Your Personal Health Intelligence Platform** — a full-stack medical records management system powered by AI, built for patients and clinicians alike.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [AI Bridge (Python)](#ai-bridge-python)
- [WhatsApp Integration](#whatsapp-integration)
- [Export System](#export-system)
- [Screenshots](#screenshots)

---

## Overview

MedVault is a **three-tier health data platform** consisting of:

1. **React Frontend** (`/client`) — a rich, dark-themed UI with role-based views for patients and doctors.
2. **Node.js/Express Backend** (`/server`) — a REST + WebSocket API that manages records, prescriptions, reminders, and AI pipelines.
3. **Python AI Bridge** (`/ai`) — a Flask server that drives a Playwright-automated Gemini browser session for document analysis, chat, and diet analysis.

Users can upload medical documents (PDFs, images), get AI-extracted structured health data, chat with an AI health assistant, manage medications, set WhatsApp reminders, and export their complete health history.

---

## Features

### 👤 Patient Features
| Feature | Description |
|---|---|
| 📄 **Smart Document Upload** | Upload PDFs & images; AI extracts document type, conditions, medications, lab values, summaries, and criticality score automatically. |
| 📚 **Medical Records Library** | Browse all records grouped by condition/disease with full-text search and filters. |
| 💊 **Prescription Manager** | Auto-populated from uploaded prescriptions; tracks drug interactions with severity flags. |
| 🤖 **AI Health Chat** | SSE-streamed chat with an AI assistant powered by the Gemini browser bridge. |
| 📊 **Health Dashboard** | Overview cards with key stats, recent activity, and critical findings. |
| 🗺️ **Hospital Locator** | Interactive MapLibre map to find nearby hospitals and clinics. |
| 📅 **Calendar & Reminders** | Schedule appointments and medication reminders. |
| 🔔 **WhatsApp Reminders** | Automated WhatsApp messages via Twilio for medication and appointment alerts. |
| 🥗 **Diet Analysis** | Upload meal photos for AI nutritional analysis via the Gemini bridge. |
| 🧬 **Symptom Graph** | Force-directed graph visualization of conditions, symptoms, and their relationships. |
| 📤 **Data Export** | Export full health records as **JSON**, **CSV**, or an organized **ZIP** archive. |
| 🚨 **Emergency Profile** | QR-code-accessible emergency profile with contacts, blood type, allergies, and active medications. |
| 💬 **WhatsApp Connect** | Link your WhatsApp number to receive health updates and alerts. |

### 🩺 Doctor Features
| Feature | Description |
|---|---|
| 🏥 **Doctor Dashboard** | Manage and review all connected patients. |
| 👁️ **Patient Detail View** | Deep-dive into a patient's full medical history. |
| 🧠 **Patient Graph Visualization** | AI-powered knowledge graph showing conditions, medications, and temporal relationships for a patient. |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT  (React + Vite)                    │
│   Pages: Dashboard · Records · Chat · Upload · Locator · ...     │
│   Auth: Firebase Authentication                                  │
│   Real-time: Socket.IO client                                    │
└─────────────────────┬────────────────────────────────────────────┘
                      │  HTTP REST + SSE + WebSocket (port 5173 → 3001)
┌─────────────────────▼────────────────────────────────────────────┐
│               SERVER  (Node.js / Express / TypeScript)           │
│   Auth middleware: Firebase Admin SDK token verification         │
│   File storage: Cloudinary (documents & diet images)            │
│   Database: MongoDB Atlas (Mongoose ODM)                         │
│   Real-time: Socket.IO server (document:status events)          │
│   Scheduler: node-cron (WhatsApp reminder cron jobs)            │
│   Messaging: Twilio WhatsApp API                                 │
└─────────────────────┬────────────────────────────────────────────┘
                      │  HTTP REST (port 3001 → 5000)
┌─────────────────────▼────────────────────────────────────────────┐
│            AI BRIDGE  (Python / Flask / Playwright)              │
│   Drives a persistent Chromium browser session logged into       │
│   the Gemini web interface.                                      │
│   Endpoints: /health · /receive (text) · /img (images/PDF)      │
│              /audio (voice)                                      │
│   Image uploads via: Windows clipboard paste or DataTransfer JS  │
│   Audio/PDF uploads via: Cloudinary → DataTransfer JS injection  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (`/client`)
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 3 |
| Routing | React Router DOM v7 |
| Auth | Firebase Authentication |
| HTTP | Axios |
| Real-time | Socket.IO Client |
| Charts | Recharts |
| Maps | MapLibre GL + react-map-gl |
| Graphs | D3.js + react-force-graph-2d |
| Animations | Framer Motion |
| Icons | Lucide React |
| Notifications | react-hot-toast |

### Backend (`/server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Language | TypeScript 6 (tsx watch) |
| Database | MongoDB Atlas + Mongoose 9 |
| Auth | Firebase Admin SDK |
| File Upload | Multer + Cloudinary |
| Real-time | Socket.IO |
| Scheduling | node-cron |
| Messaging | Twilio WhatsApp |
| AI SDK | @google/generative-ai (embedding generation) |
| PDF Export | PDFKit |
| ZIP Export | JSZip |
| QR Codes | qrcode |

### AI Bridge (`/ai`)
| Layer | Technology |
|---|---|
| Runtime | Python 3.x |
| Web Framework | Flask |
| Browser Automation | Playwright (sync API, Chromium) |
| Image Processing | Pillow (PIL) |
| Cloud Storage | Cloudinary (for audio/image relay) |

---

## Project Structure

```
med-vault/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── Dashboard.tsx        # Health overview dashboard
│   │   │   ├── Records.tsx          # Disease-grouped document library
│   │   │   ├── Upload.tsx           # File upload with live AI processing status
│   │   │   ├── Prescriptions.tsx    # Medication management & interaction warnings
│   │   │   ├── Chat.tsx             # AI health chat (SSE streaming)
│   │   │   ├── DietAnalysis.tsx     # Meal image analysis
│   │   │   ├── Locator.tsx          # Hospital map finder
│   │   │   ├── Alerts.tsx           # Health alerts & notifications
│   │   │   ├── Emergency.tsx        # Emergency profile with QR code
│   │   │   ├── Calendar.tsx         # Appointment calendar
│   │   │   ├── WhatsAppConnect.tsx  # WhatsApp number linking
│   │   │   ├── Timeline.tsx         # Chronological health timeline
│   │   │   ├── PatientGraphVisualization.tsx  # Condition knowledge graph
│   │   │   ├── reminders/           # WhatsApp reminder sub-module
│   │   │   │   ├── WALanding.tsx
│   │   │   │   ├── WADashboard.tsx
│   │   │   │   ├── WASchedule.tsx
│   │   │   │   ├── WAActivity.tsx
│   │   │   │   └── WASettings.tsx
│   │   │   └── doctor/
│   │   │       ├── DoctorDashboard.tsx
│   │   │       └── PatientDetail.tsx
│   │   ├── components/
│   │   │   ├── shared/              # SideNav, TopNav, FloatingChatbot, Skeleton
│   │   │   ├── upload/              # Upload-specific components
│   │   │   ├── viz/                 # Visualization components
│   │   │   └── reminders/           # Reminder UI components
│   │   ├── api/                     # Axios API call helpers
│   │   ├── context/                 # AuthContext (Firebase auth state)
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── services/                # Frontend service layer
│   │   ├── types/                   # TypeScript type definitions
│   │   └── styles/                  # Global CSS / design tokens
│   ├── .env                         # Client environment variables
│   └── package.json
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── index.ts                 # App entry point, routes, Socket.IO setup
│   │   ├── controllers/
│   │   │   ├── uploadController.ts       # File upload + async AI processing
│   │   │   ├── recordsController.ts      # CRUD for medical documents
│   │   │   ├── prescriptionsController.ts# Medication management
│   │   │   ├── chatController.ts         # AI chat with SSE streaming
│   │   │   ├── dietController.ts         # Diet image analysis
│   │   │   ├── exportController.ts       # JSON / CSV / ZIP health data export
│   │   │   ├── emergencyController.ts    # Emergency profile & token generation
│   │   │   ├── usersController.ts        # User profile management
│   │   │   ├── whatsappController.ts     # WhatsApp webhook & message handler
│   │   │   ├── doctorController.ts       # Doctor–patient management
│   │   │   ├── calendarController.ts     # Appointment calendar
│   │   │   └── supportController.ts      # Support chat sessions
│   │   ├── models/                  # Mongoose schemas
│   │   │   ├── User.ts              # User profile + preferences
│   │   │   ├── Document.ts          # Medical document with AI-extracted fields
│   │   │   ├── Prescription.ts      # Medication records
│   │   │   ├── Reminder.ts          # Scheduled reminders
│   │   │   ├── CalendarTask.ts      # Calendar events
│   │   │   ├── ChatSession.ts       # Chat history
│   │   │   ├── WhatsAppMessage.ts   # WhatsApp message log
│   │   │   └── SupportSession.ts    # Support session log
│   │   ├── routes/                  # Express route definitions (14 route files)
│   │   ├── middleware/
│   │   │   └── errorHandler.ts      # Global error handler
│   │   ├── services/
│   │   │   ├── geminiService.ts     # Gemini API: document extraction & embeddings
│   │   │   ├── aiClient.ts          # HTTP client for the Python AI bridge
│   │   │   ├── cloudinaryService.ts # Cloudinary upload helpers
│   │   │   └── reminderCronService.ts # Cron scheduler for WhatsApp reminders
│   │   ├── config/
│   │   │   └── db.ts                # MongoDB connection
│   │   └── knowledge/               # Static clinical knowledge base JSON
│   ├── .env                         # Server environment variables
│   └── package.json
│
└── ai/                              # Python AI Bridge
    ├── server.py                    # Flask + Playwright Gemini automation server
    ├── requirements.txt             # Python dependencies
    ├── .env                         # AI bridge environment variables
    └── uploaded_images/             # Temporary file staging directory
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB Atlas** account (or local MongoDB)
- **Firebase** project with Authentication enabled
- **Cloudinary** account
- **Twilio** account with WhatsApp sandbox (for reminders)
- A **Google account** logged into [gemini.google.com](https://gemini.google.com) in the Playwright Chromium profile

---

### Environment Variables

#### `client/.env`

```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### `server/.env`

```env
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?appName=Cluster0

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com

# Gemini API (for embedding generation)
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_MENU_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_EMERGENCY_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URLs
SERVER_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
APP_URL=http://localhost:5173/

# AI Bridge
AI_SERVER_URL=http://localhost:5000
```

#### `ai/.env`

```env
SITE=https://gemini.google.com/app
USER_DATA_DIR=C:/path/to/your/chrome/profile

# Cloudinary (same as server, used for audio relay)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **⚠️ Important:** The `USER_DATA_DIR` must point to a Chromium user-data directory that is **already logged in** to the Gemini web interface. The AI bridge launches a persistent browser context from this profile.

---

### Installation

#### 1. Install server dependencies
```bash
cd server
npm install
```

#### 2. Install client dependencies
```bash
cd client
npm install
```

#### 3. Install Python dependencies
```bash
cd ai
pip install -r requirements.txt
playwright install chromium
```

---

### Running the App

You need **three terminals** running simultaneously.

#### Terminal 1 — AI Bridge (start first)
```bash
cd ai
python server.py
```
> Launches Chromium, navigates to Gemini, and starts Flask on `http://localhost:5000`.

#### Terminal 2 — Backend Server
```bash
cd server
npm run dev
```
> Starts Express with `tsx watch` on `http://localhost:3001`.

#### Terminal 3 — Frontend Client
```bash
cd client
npm run dev
```
> Starts Vite dev server on `http://localhost:5173`.

**Health check:** Visit `http://localhost:3001/api/health` — it will report DB connection status and AI bridge connectivity.

---

## API Reference

All server endpoints are prefixed with `/api` and require a valid **Firebase ID Token** in the `Authorization: Bearer <token>` header (except public emergency routes).

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload one or more medical documents |
| `GET` | `/api/upload/status/:docId` | Poll document processing status |
| `GET` | `/api/records` | Fetch all records for authenticated user |
| `GET` | `/api/records/:id` | Fetch a single record |
| `DELETE` | `/api/records/:id` | Delete a record |
| `GET` | `/api/prescriptions` | List all prescriptions |
| `POST` | `/api/prescriptions` | Add a prescription manually |
| `PATCH` | `/api/prescriptions/:id` | Update a prescription |
| `DELETE` | `/api/prescriptions/:id` | Delete a prescription |
| `POST` | `/api/chat` | Send a chat message (SSE streaming) |
| `POST` | `/api/diet` | Analyze a meal image |
| `GET` | `/api/emergency` | Get emergency profile |
| `GET` | `/api/emergency/public/:token` | Public emergency QR endpoint |
| `GET/POST` | `/api/users/profile` | Get or update user profile |
| `POST` | `/api/whatsapp/webhook` | Twilio WhatsApp webhook receiver |
| `POST` | `/api/reminders` | Create a reminder |
| `GET` | `/api/reminders` | List reminders |
| `GET` | `/api/calendar` | Get calendar events |
| `POST` | `/api/calendar` | Create calendar event |
| `GET` | `/api/export` | Export health data (`?format=json\|csv\|zip`) |
| `GET` | `/api/ai/graph` | Get AI knowledge graph data |
| `GET` | `/api/doctor/patients` | List doctor's patients |
| `GET` | `/api/health` | Server health check |

---

## Data Models

### User
```typescript
{
  _id: string;           // Firebase UID
  email: string;
  name: string;
  photoUrl?: string;
  bloodType: string;
  dateOfBirth?: Date;
  allergies: string[];
  emergencyContacts: { name, phone, relationship }[];
  emergencyToken: string; // unique token for QR emergency page
  modePreference: 'patient' | 'doctor';
  whatsappPhone?: string;
  notificationPrefs: { delivered, failed, upcoming, marketing };
  uiPrefs: { themeId, mode };
}
```

### Document (Medical Record)
```typescript
{
  userId: string;
  filename: string;
  filePath: string;         // Cloudinary URL
  mimeType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  documentType: string;     // 'lab_report' | 'prescription' | 'discharge_summary' | ...
  documentDate?: Date;
  sourceHospital?: string;
  doctorName?: string;
  conditionsMentioned: string[];
  medications: { name, dosage, frequency, duration }[];
  labValues: { test_name, value, unit, reference_range, is_abnormal }[];
  summaryPlain: string;
  summaryClinical: string;
  criticalityScore: number; // 1–10
  keyFindings: string[];
  tags: string[];
  embedding: number[];      // vector for semantic search
}
```

---

## AI Bridge (Python)

The `ai/server.py` file is a **Flask REST server** that wraps a Playwright-automated Chromium browser session pointed at the Gemini web interface.

### How It Works

1. On startup, `init_page()` launches a persistent Chromium context using your saved browser profile (already logged in to Gemini).
2. The Flask server exposes three endpoints:
   - **`POST /receive`** — Sends a text prompt to Gemini and waits for the response.
   - **`POST /img`** — Handles image/PDF uploads:
     - **Images:** Converts to PNG, copies to Windows clipboard via PowerShell, then pastes into Gemini.
     - **PDFs:** Injects via JavaScript `DataTransfer` into Gemini's hidden file input.
   - **`POST /audio`** — Uploads audio to Cloudinary, then injects via `DataTransfer` into Gemini.
3. The `_playwright_lock` mutex serializes all browser interactions to prevent threading issues (Flask runs single-threaded: `threaded=False`).
4. Auto-reconnect logic detects a dead browser and re-launches it transparently.

> **⚠️ Disclaimer:** This automation is intended for personal educational use only. Automating web interfaces may violate the Terms of Service of the target website.

---

## WhatsApp Integration

MedVault uses **Twilio** to send automated WhatsApp messages for:

- **Medication reminders** — Scheduled via node-cron, sent at configured times.
- **Appointment reminders** — Triggered by calendar events.
- **Emergency alerts** — Template-based messages to emergency contacts.
- **Interactive menu** — Users can text in to get their health summary, active medications, or upcoming appointments.

### Setup
1. Get a Twilio account and activate the WhatsApp Sandbox.
2. Configure `TWILIO_*` variables in `server/.env`.
3. Point your Twilio webhook to `https://your-domain/api/whatsapp/webhook`.
4. Users link their WhatsApp number in the **WhatsApp Connect** page.

---

## Export System

MedVault provides three export formats accessible from the UI or via `GET /api/export?format=`:

| Format | Content |
|---|---|
| `json` | Single structured JSON file with all documents, prescriptions, conditions, doctors, and hospitals |
| `csv` | Flat CSV spreadsheet of all medical documents |
| `zip` | Organized folder structure: `Records/` (by type) + `Prescriptions/` (active/discontinued) + `summary.json` |

---

## Screenshots

> Screenshots coming soon. Run the app locally to see the full UI.

---

## License

This project is for educational and personal use. See individual third-party service terms for API usage restrictions.

---

## Acknowledgements

- [Google Gemini](https://gemini.google.com) — AI document analysis
- [Firebase](https://firebase.google.com) — Authentication
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Database
- [Cloudinary](https://cloudinary.com) — File storage
- [Twilio](https://www.twilio.com) — WhatsApp messaging
- [MapLibre GL](https://maplibre.org) — Open-source mapping
- [Playwright](https://playwright.dev) — Browser automation
