# MedTriage Agent — 3-Minute Demo Script

**Time:** 3 minutes  
**Presenters:** [Your names]  
**Event:** Insforge x Qoder AI Agent Hackathon, Seattle

---

## 1. Opening (30 seconds)

A doctor sees 50 patients a day. But here's the thing — they spend 40% of their time just reading records and scheduling appointments. That's almost half their day on paperwork, not patients.

What if we could give them that time back?

[pause]

This is MedTriage Agent.

It's an AI-powered triage assistant. And let me be clear about what it does NOT do — it doesn't diagnose. That's the doctor's job. What it DOES do is auto-triage, summarize, and schedule. So doctors can focus on what they actually went to med school for.

Let me show you how it works.

---

## 2. Demo Flow (2 minutes)

### Patient POV (1 minute)

[open the app — patient login screen]

I'm a patient. I'm not feeling well, so I log in.

[click to submit symptoms page]

Here's our symptom submission form. I'll type: "I've had a persistent headache for three days, some dizziness when I stand up, and I feel nauseous in the mornings."

[click submit]

Watch this — "AI is analyzing..."

[wait for animation to complete]

And here's my triage result. See this? A structured summary of my symptoms. And right here — an urgency score of 3 out of 5. That means moderate priority.

Now, I have a question. Let me use the Q&A feature.

[navigate to Q&A / chat]

I'll ask: "Should I be worried about this headache?"

[submit question]

Here's the AI's response. Notice these confidence badges — this one says "High Confidence" in green. The AI is pretty sure about this answer.

But let's say I asked something more complex. If the confidence is low, you'd see a red badge with a warning: "Please consult your doctor." The AI knows when to step back.

---

### Doctor POV (1 minute)

[switch to doctor login]

Now I'm the doctor.

[log in — dashboard appears]

This is my triage dashboard. Cases are already sorted by urgency — red cases at the top, green ones at the bottom. I don't have to read through everything to figure out who needs me first.

[click on a high-priority case]

I click to expand. Here's the full AI analysis — symptoms, urgency reasoning, everything I need at a glance.

[navigate to Schedule tab]

Now let's schedule these patients.

[click "Generate Schedule"]

One click — and the AI auto-generates my appointment order. See how it works? Emergencies are first thing in the morning. Routine cases get afternoon slots. It just makes sense.

[click "Confirm All"]

Confirm all. Done. My entire day is scheduled in seconds.

---

## 3. Technical Highlight (20 seconds)

Quick tech note for the judges:

This isn't just one API call. It's chained AI analysis — first call extracts structured symptoms, second call scores urgency. Two-step reasoning.

The confidence scoring on Q&A is intentional. It prevents AI overreach.

And we built this on the full Insforge stack — Auth for role-based access, Database for cases and schedules, and Serverless functions running the entire AI pipeline.

---

## 4. Closing (10 seconds)

Here's the bottom line:

We don't replace doctors. We make their time more valuable.

[pause — look at audience]

Thank you.

---

**[End of Demo]**
