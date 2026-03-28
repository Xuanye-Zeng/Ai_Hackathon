# MedTriage Agent

AI-powered medical triage assistant that helps doctors prioritize patients by urgency. Patients submit symptoms, AI analyzes and scores severity (1-5), doctors review the triage queue and schedule appointments — all in real time.

**Built at Insforge x Qoder AI Agent Hackathon @ Seattle | 2026.03.29**

**Live Demo:** [https://87zbhywa.insforge.site](https://87zbhywa.insforge.site)

## Features

- **AI Symptom Analysis** — Two-step Claude pipeline: structured extraction → severity scoring (1-5)
- **Patient Q&A** — AI-powered medical Q&A with confidence badges (high/medium/low)
- **Doctor Triage Queue** — Cases sorted by urgency, expandable AI analysis, one-click review
- **Appointment Scheduling** — Doctors schedule from triage queue, patients see appointments in real time
- **Role-based Auth** — Separate patient and doctor experiences with DB-backed role management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | InsForge (Auth, Database, Serverless Functions) |
| AI | Claude Sonnet 4.5 via InsForge AI Gateway |
| Deployment | InsForge Hosting |

## Project Structure

```
Ai_Hackathon/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── insforge.js           # InsForge SDK client
│   │   │   └── auth.jsx              # Auth context + DB-backed roles
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Login / signup with role selection
│   │   │   ├── patient/
│   │   │   │   ├── SubmitPage.jsx    # Symptom submission → AI analysis
│   │   │   │   ├── ChatPage.jsx      # Q&A chat with confidence badges
│   │   │   │   ├── HistoryPage.jsx   # Past case records
│   │   │   │   └── SchedulePage.jsx  # Patient appointment view
│   │   │   └── doctor/
│   │   │       ├── DashboardPage.jsx # Triage queue + scheduling
│   │   │       └── SchedulePage.jsx  # Doctor schedule management
│   │   ├── App.jsx                   # Routing + navigation
│   │   └── index.css                 # Animated wave gradient background
│   └── .env.example
├── insforge/functions/
│   ├── analyzeSymptomsV1/index.ts    # AI symptom analysis pipeline
│   └── patientQA/index.ts           # AI Q&A with confidence scoring
├── db/schema.sql                     # Database schema (4 tables)
└── mock-data/cases.json              # Test cases (scores 1-5)
```

## Routes

| Route | Role | Description |
|-------|------|-------------|
| `/login` | All | Login / signup with role selection |
| `/patient/submit` | Patient | Submit symptoms for AI triage |
| `/patient/chat` | Patient | Q&A with AI assistant |
| `/patient/history` | Patient | View past submissions |
| `/patient/schedule` | Patient | View appointments |
| `/doctor/dashboard` | Doctor | Triage queue sorted by urgency |
| `/doctor/schedule` | Doctor | Manage appointments |

## Database Schema

```sql
patients:   id, name, age, gender, contact, created_at
cases:      id, patient_id, symptoms_raw, summary_json, triage_score (1-5),
            triage_reason, status (pending/reviewed/scheduled), created_at, reviewed_at
schedules:  id, doctor_id, case_id, time_slot, priority, confirmed, created_at
user_roles: email (PK), role (patient/doctor), created_at
```

## Serverless Functions

| Function | Input | Output |
|----------|-------|--------|
| `analyzeSymptomsV1` | symptoms_text, duration, patient_name, etc. | case_id, summary, triage (score, reason, timeframe) |
| `patientQA` | question, case_id | answer, confidence (high/medium/low), needs_doctor_review |

Both functions use **Claude Sonnet 4.5** via InsForge AI Gateway with structured JSON output.

## Quick Start

```bash
git clone https://github.com/Xuanye-Zeng/Ai_Hackathon.git
cd Ai_Hackathon/frontend
npm install
cp .env.example .env   # Fill in InsForge credentials
npm run dev
```

## Team

- **Xuanye Zeng** — Backend core, AI pipeline, doctor dashboard, integration
- **Jason** — Patient Q&A, chat UI, symptom submission
- **Jay** — Schedule management, demo prep, mock data
