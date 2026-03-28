# 🏥 MedTriage Agent — Hackathon Team Playbook

**Insforge x Qoder AI Agent Hackathon @ Seattle | 2026.03.29**

> AI doesn't make diagnoses. AI does triage and summarization, so every minute of a doctor's time goes to the patients who need it most.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Timeline & Task Matrix](#timeline--task-matrix)
- [P1 — Case Summary + Smart Triage (Backend Core)](#p1--case-summary--smart-triage-backend-core)
- [P2 — Patient Q&A (Frontend + AI Interaction)](#p2--patient-qa-frontend--ai-interaction)
- [P3 — Schedule Management + Demo Prep](#p3--schedule-management--demo-prep)
- [Universal Vibe Coding Rules](#universal-vibe-coding-rules)
- [Sync Checkpoints](#sync-checkpoints)
- [Emergency Playbook](#emergency-playbook)
- [Pre-Submission Checklist](#pre-submission-checklist)

---

## Project Overview

MedTriage Agent is an AI-powered medical triage assistant. It does **not** make diagnoses — it helps doctors save time and reduce oversights.

**Core Value Proposition:** AI doesn't replace the doctor's judgment. It ensures every minute of the doctor's day is spent on the patients who need it most.

### Three Core Features

1. **Case Summary + Smart Triage** — Patient submits symptoms, Agent auto-generates a structured summary and assigns an urgency score (1–5)
2. **Patient Q&A** — Answers basic medical questions with confidence scoring; low-confidence answers are auto-flagged as "needs doctor review"
3. **Smart Scheduling** — Auto-generates appointment order based on triage results; doctor confirms or adjusts with one click

### Insforge Usage

| Service | Purpose |
|---------|---------|
| **Auth** | Two roles: `doctor` and `patient` with different permissions |
| **DB** | Stores patient records, case summaries, triage scores, schedules |
| **Serverless** | Runs AI analysis pipeline, Q&A, and scheduling logic |

---

## Architecture

```
Patient App (React)              Doctor App (React)
    │                                │
    ├─ Symptom Submission Form       ├─ Triage Dashboard
    ├─ Q&A Chat Interface            ├─ Case Summary Cards
    └─ My Records                    └─ Schedule View
         │                                │
         └────────── Insforge ────────────┘
                       │
           ┌───────────┼───────────┐
         Auth         DB       Serverless
       (2 roles)  (cases/     (AI analysis)
                  schedules)       │
                              Claude API
                         (chained calls x4)
```

---

## Timeline & Task Matrix

**Actual coding time: 6 hours (10:00–16:00). Three people working in parallel, syncing at key checkpoints.**

| Time | P1 — Case Triage | P2 — Patient Q&A | P3 — Scheduling |
|------|-------------------|-------------------|-----------------|
| 10:00–10:30 | Insforge init: Auth + DB schema | Frontend project scaffolding | Mock case data prep (3–5 cases) |
| 10:30–12:00 | Serverless: symptom → summary → triage pipeline | Patient submission form + Q&A chat UI | Scheduling algorithm + schedule view UI |
| 12:00–12:30 | — Lunch + sync progress — | | |
| 12:30–14:00 | Triage dashboard + case card UI | Q&A Agent logic + confidence tagging | Auto-schedule generation + doctor confirm flow |
| 14:00–15:00 | Integration testing (all three) | Integration testing (all three) | Integration testing (all three) |
| 15:00–15:45 | Polish demo flow + fix bugs | Polish demo flow + fix bugs | Pitch rehearsal + prep demo script |
| 15:45–16:00 | Submit | Submit | Submit |

---

## P1 — Case Summary + Smart Triage (Backend Core)

💉 **Owner:** Backend-focused team member

**Scope:** Insforge initialization, DB schema design, triage pipeline, doctor-side dashboard

### Phase 1: Project Initialization (10:00–10:30)

#### Prompt 1.1 — Insforge Setup

```
Initialize the project backend with Insforge. Configure the following:

1. Auth: Two roles - "doctor" and "patient"
2. Database: Create these tables:

   patients table: id, name, age, gender, contact, created_at
   cases table: id, patient_id, symptoms_raw, summary_json,
     triage_score (integer 1-5), triage_reason, status (enum: pending/reviewed/scheduled),
     created_at, reviewed_at
   schedules table: id, doctor_id, case_id, time_slot,
     priority, confirmed (boolean), created_at

3. Do NOT create any frontend code. Do NOT create extra tables.
```

### Phase 2: Triage Pipeline (10:30–12:00)

#### Prompt 1.2 — Symptom Analysis Serverless Function

```
Create an Insforge Serverless function: analyzeSymptomsV1

Input: { symptoms_text: string, patient_age: number, patient_gender: string }

This function calls the Claude API in a chained analysis:

Step 1 - Structured Extraction:
  system prompt: "You are a medical triage assistant. Extract from the patient's
  description: chief complaint, symptom list, duration, accompanying symptoms.
  Output JSON only."

Step 2 - Severity Scoring:
  system prompt: "Based on the following structured symptoms, assess urgency
  on a scale of 1-5.
  1 = routine follow-up, 2 = non-urgent but needs attention,
  3 = should be seen soon, 4 = urgent, 5 = emergency.
  Return JSON: {score, reason, recommended_timeframe}."

Merge both results and save to the cases table.

Constraints:
- Each step is a separate API call. Do NOT merge into one prompt.
- If any step fails, return an error message instead of crashing.
- Do NOT touch any frontend code.
```

### Phase 3: Doctor Dashboard (12:30–14:00)

#### Prompt 1.3 — Doctor-Side Dashboard

```
Create the doctor-side page with:

1. Triage Queue Dashboard:
   - Pull all cases where status=pending from DB
   - Sort by triage_score descending (most urgent on top)
   - Display each case as a card: patient name, triage_score
     (color-coded: 1-2 green, 3 yellow, 4-5 red), chief complaint summary

2. Case Detail View:
   - Click a card to expand full summary
   - Show AI analysis confidence level
   - Doctor can mark as "reviewed"

UI requirements: Clean and minimal. White background + card-based layout.
Do NOT touch P2 or P3's code.
```

---

## P2 — Patient Q&A (Frontend + AI Interaction)

💬 **Owner:** Frontend-focused team member

**Scope:** Frontend project scaffolding, patient submission form, Q&A chat interface, all patient-side pages

### Phase 1: Project Scaffolding (10:00–10:30)

#### Prompt 2.1 — Frontend Initialization

```
Use Qoder to create a React frontend project. Requirements:

1. Route structure:
   /login - Login page (select doctor/patient role)
   /patient/submit - Symptom submission form
   /patient/chat - Q&A chat
   /patient/history - My records
   /doctor/dashboard - Doctor triage queue
   /doctor/schedule - Schedule view

2. Connect to Insforge Auth for login
3. Only build the structure — use placeholders for page content
4. Clean UI style: white background, blue primary color
5. Do NOT write any backend logic
```

### Phase 2: Patient Submission + Q&A (10:30–12:00)

#### Prompt 2.2 — Symptom Submission Form

```
Implement the /patient/submit page:

Form fields:
- Main symptoms (text area, required)
- Duration (dropdown: <1 day, 1-3 days, 3-7 days, >1 week)
- Accompanying symptoms (optional text area)
- Medical history (optional text area)

On submit, call P1's analyzeSymptomsV1 serverless function.
Show loading animation + "AI is analyzing your symptoms..."
After analysis, display result summary and "Submitted to doctor" status.

Do NOT touch doctor-side pages. Do NOT modify the DB schema.
```

#### Prompt 2.3 — Q&A Chat Interface

```
Implement the /patient/chat page:

Create an Insforge Serverless function: patientQA

Input: { question: string, case_id: string }

System prompt for the AI:
  "You are a medical consultation assistant. Answer questions based on
  the patient's symptom records.
  Rules:
  1. Only answer basic medical knowledge and health advice
  2. Rate each answer's confidence: high/medium/low
  3. If confidence is low, explicitly tell the patient they need doctor confirmation
  4. Never make diagnoses, never prescribe medication
  5. End every answer with: 'This is AI-assisted analysis, not medical advice'
  Output JSON: {answer, confidence, needs_doctor_review: boolean}"

Frontend: Chat bubble UI.
  - confidence=high shows green badge
  - confidence=medium shows yellow badge
  - confidence=low shows red badge + "Please consult your doctor"

Do NOT touch doctor-side pages.
```

---

## P3 — Schedule Management + Demo Prep

📅 **Owner:** Full-stack / generalist team member

**Scope:** Mock data preparation, scheduling logic, schedule UI, pitch script

### Phase 1: Mock Data (10:00–10:30)

#### Prompt 3.1 — Prepare Mock Cases

```
Generate 5 fictional but realistic patient cases. Requirements:

1. Cover different urgency levels (one each for triage_score 1-5)
2. Each case includes:
   - Patient info (name, age, gender)
   - Symptom description (in patient's casual language, not medical jargon)
   - Expected triage result

Examples:
  Score 5: "My dad is 65, he's had severe chest pain for two hours now,
    and he's having trouble breathing"
  Score 1: "My kid is 8, he's had a runny nose for three days,
    but he's still energetic and eating fine"

Output as a JSON array that can be directly imported into the DB.
Do NOT write any frontend or backend code.
```

### Phase 2: Scheduling (10:30–14:00)

#### Prompt 3.2 — Schedule Generation Serverless Function

```
Create an Insforge Serverless function: generateSchedule

Input: { doctor_id: string, date: string }

Logic:
1. Pull all cases where status=reviewed from DB
2. Sort by triage_score descending
3. Auto-assign time slots:
   - Score 4-5: earliest slots of the day
   - Score 3: morning slots
   - Score 1-2: afternoon or next day
4. Each slot is 30 minutes
5. Write to schedules table with confirmed=false

Do NOT use AI for this sorting — use a deterministic algorithm. Simple and reliable.
Do NOT touch frontend code. Do NOT modify other functions.
```

#### Prompt 3.3 — Schedule View UI

```
Implement the /doctor/schedule page:

1. Timeline view showing the day's appointments by time slot:
   - Each slot shows: time + patient name + chief complaint summary
   - Color-coded by triage_score (same scheme as dashboard)

2. Doctor actions:
   - "Confirm All" button (batch confirm)
   - Drag to reorder (if time permits)

3. On confirm, update DB: confirmed=true

UI style must match P1's dashboard.
Do NOT touch patient-side pages.
```

### Phase 3: Pitch Prep (15:00–15:45)

#### Prompt 3.4 — Demo Script

```
Write a 3-minute demo presentation script. Structure:

1. Opening (30s):
   Scene-setting — "A doctor sees 50 patients a day,
   but spends 40% of their time reading records and scheduling..."

2. Demo Flow (2min):
   Patient POV: submit symptoms → ask Q&A → see response
   Doctor POV: see dashboard → already priority-sorted → confirm schedule

3. Technical Highlight (20s):
   Chained AI analysis + confidence scoring + Insforge full stack

4. Closing (10s):
   "We don't replace doctors. We make their time more valuable."

Language: English. Conversational tone — don't sound like you're reading slides.
```

---

## Universal Vibe Coding Rules

**Every prompt to Qoder must follow this template:**

```
【WHAT】  Specific feature to implement
【WITH】  Which Insforge service to use
【I/O】   Clear input/output format
【DON'T】 Explicit boundaries — prevent Agent from overstepping
```

### Red Line Rules (Print These Out and Tape to Your Desk)

1. **One task per prompt.** Never ask Agent to do more than one feature at a time.
2. **Plan before code.** Have Agent output a plan first. Review it, then let it code.
3. **Don't let Agent decide architecture.** Architecture is already defined. Agent only implements.
4. **Every prompt includes "DON'T."** Prevent Agent from modifying code you've already written.
5. **All AI calls return JSON.** Never let the LLM return free-form text.
6. **Failures return mock data, not errors.** Demo must never crash.
7. **Test immediately after each feature.** Don't pile up everything for the end.

---

## Sync Checkpoints

| Time | What to Sync | Checkpoint |
|------|-------------|------------|
| 10:30 | P1's DB schema confirmed, Auth working | P2 can log in, P3 can write mock data |
| 12:00 | Lunch — everyone shows progress | P1's pipeline runs, P2's form submits |
| 14:00 | Full integration, end-to-end flow | Submit symptoms → get triage → get schedule (all working) |
| 15:00 | Code freeze, enter polish mode | Bug fixes only, no new features |

---

## Emergency Playbook

**API key missing / out of credits:**
Ask the organizers first. If unavailable, P1 hard-codes mock analysis results. Trigger one real API call during demo to show it works.

**Frontend not pretty enough:**
That's fine. Functionality > aesthetics. Judges are evaluating Agent capability, not UI polish.

**Integration fails:**
Each module can demo independently. Worst case: demo three features separately, narrate the connection verbally.

**Someone is stuck:**
If a single issue takes more than 20 minutes to debug, skip it immediately. Use mock data as a substitute and move to the next task.

---

## Pre-Submission Checklist (15:45)

- [ ] Login flow: patient can register/login, doctor can login
- [ ] Patient submits symptoms → sees AI analysis animation → gets summary result
- [ ] Patient asks Q&A → sees confidence badges → low confidence shows "Please consult your doctor"
- [ ] Doctor sees triage queue → sorted by urgency → color coding is correct
- [ ] Schedule auto-generates → doctor can confirm
- [ ] All AI responses include disclaimer
- [ ] Demo script is ready, rehearsed at least once

---

**Good luck! 🚀 Go win that trophy tomorrow!**
