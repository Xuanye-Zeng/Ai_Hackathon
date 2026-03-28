# MedTriage Agent

AI-powered medical triage assistant. AI doesn't make diagnoses — it helps doctors save time and reduce oversights.

**Built at Insforge x Qoder AI Agent Hackathon @ Seattle | 2026.03.29**

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Xuanye-Zeng/Ai_Hackathon.git
cd Ai_Hackathon/frontend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `frontend/.env` and fill in:

```
VITE_INSFORGE_URL=https://87zbhywa.us-west.insforge.app
VITE_INSFORGE_ANON_KEY=<ask Xuanye for this>
```

### 3. Run Frontend

```bash
cd frontend
npm run dev
```

Opens at http://localhost:5173

### 4. InsForge CLI (P1 only)

```bash
npx @insforge/cli link --project-id 10184899-c9a1-4dca-8c70-cd4e555e9b9b
```

This gives you access to DB, Auth, and Serverless functions from CLI.

---

## Project Structure

```
Ai_Hackathon/
├── db/schema.sql                 # Database schema (run on InsForge)
├── mock-data/cases.json          # 5 test cases (scores 1-5)
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── insforge.js       # InsForge SDK client
│   │   │   └── auth.jsx          # Auth context (login/signup/roles)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx     # Login (shared)
│   │   │   ├── patient/          # Patient-side pages (P2)
│   │   │   └── doctor/           # Doctor-side pages (P1 + P3)
│   │   ├── App.jsx               # Routing + nav bar
│   │   └── main.jsx              # Entry point
│   └── .env.example
└── HACKATHON_PLAYBOOK.md         # Full team playbook
```

---

## Team Assignments

### P1 — Xuanye (Backend Core + Integration)

**Files you own:**
- `db/schema.sql` — DB schema design
- `frontend/src/pages/doctor/DashboardPage.jsx` — Triage queue dashboard
- InsForge Serverless: `analyzeSymptomsV1` function
- Final integration of all three parts

**What to do:**
1. Create DB tables on InsForge (`npx @insforge/cli db query "$(cat db/schema.sql)"`)
2. Write `analyzeSymptomsV1` serverless function (symptom -> structured extraction -> severity scoring via chained AI calls)
3. Build doctor dashboard: pull pending cases from DB, sort by triage score, color-coded cards, click to expand, mark as reviewed

**Don't touch:** Patient-side pages (`patient/*`), schedule page

---

### P2 — Patient Q&A (Frontend + AI)

**Files you own:**
- `frontend/src/pages/patient/SubmitPage.jsx` — Symptom submission form (skeleton ready, wire it up)
- `frontend/src/pages/patient/ChatPage.jsx` — Q&A chat interface (placeholder, build from scratch)
- `frontend/src/pages/patient/HistoryPage.jsx` — Past records
- InsForge Serverless: `patientQA` function

**What to do:**
1. Wire `SubmitPage.jsx` to call `analyzeSymptomsV1` serverless function on submit
2. Build `ChatPage.jsx` — chat bubble UI with confidence badges:
   - `high` = green badge
   - `medium` = yellow badge
   - `low` = red badge + "Please consult your doctor"
3. Create `patientQA` serverless function — AI answers medical questions with confidence scoring
4. Build `HistoryPage.jsx` — query cases from DB by patient

**Don't touch:** Doctor-side pages (`doctor/*`), DB schema, auth logic

**Key rule:** Every AI response must include `"This is AI-assisted analysis, not medical advice."`

---

### P3 — Schedule Management + Demo Prep

**Files you own:**
- `frontend/src/pages/doctor/SchedulePage.jsx` — Schedule timeline view (placeholder, build from scratch)
- `mock-data/cases.json` — Mock test data (ready, import into DB)
- InsForge Serverless: `generateSchedule` function
- Demo script + pitch

**What to do:**
1. Import mock data into InsForge DB for testing
2. Create `generateSchedule` serverless function — deterministic algorithm (NOT AI), sort by triage score, assign 30-min time slots
3. Build `SchedulePage.jsx` — timeline view, color-coded by triage score, "Confirm All" button
4. Write 3-minute demo script (see playbook for structure)

**Don't touch:** Patient-side pages (`patient/*`), triage pipeline, auth logic

**Key rule:** Scheduling is deterministic — do NOT use AI for sorting. Simple and reliable.

---

## Routes

| Route | Role | Description |
|-------|------|-------------|
| `/login` | All | Login / signup with role selection |
| `/patient/submit` | Patient | Submit symptoms for triage |
| `/patient/chat` | Patient | Q&A with AI assistant |
| `/patient/history` | Patient | View past submissions |
| `/doctor/dashboard` | Doctor | Triage queue sorted by urgency |
| `/doctor/schedule` | Doctor | Day's appointment schedule |

## InsForge Services

| Service | What For |
|---------|----------|
| **Auth** | Two roles: `doctor` and `patient` |
| **DB** | `patients`, `cases`, `schedules` tables |
| **Serverless** | `analyzeSymptomsV1`, `patientQA`, `generateSchedule` |

## DB Schema

```sql
patients:  id, name, age, gender, contact, created_at
cases:     id, patient_id, symptoms_raw, summary_json, triage_score (1-5),
           triage_reason, status (pending/reviewed/scheduled), created_at, reviewed_at
schedules: id, doctor_id, case_id, time_slot, priority, confirmed, created_at
```

Full schema in `db/schema.sql`.

## Git Workflow

1. Each person works on their own files — **do not modify files you don't own**
2. Pull before you push: `git pull origin main`
3. Commit often with clear messages
4. If there's a merge conflict, ping in group chat before resolving

## Sync Checkpoints

| Time | What |
|------|------|
| 10:30 | DB tables created, Auth working, frontend routes accessible |
| 12:00 | Lunch — P1 pipeline runs, P2 form submits, P3 has mock data in DB |
| 14:00 | Full integration — submit symptoms -> triage -> schedule (end to end) |
| 15:00 | Code freeze. Bug fixes only, no new features |
| 15:45 | Submit |
