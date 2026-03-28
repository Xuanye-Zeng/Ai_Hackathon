import { createClient } from "npm:@insforge/sdk";

/**
 * analyzeSymptomsV1 — AI-powered medical triage pipeline
 *
 * Two-step chained analysis:
 *   Step 1: Extract structured symptoms from free-text description
 *   Step 2: Score severity 1-5 based on extracted data
 *
 * Then saves the case to the DB and returns the result in the exact
 * shape the frontend (SubmitPage.jsx) expects.
 *
 * Expected input body:
 *   { symptoms_text, duration?, accompanying?, history?, patient_age?, patient_gender? }
 *
 * Returns:
 *   { case_id, summary: { chief_complaint, symptoms, duration, accompanying, history },
 *     triage: { score, reason, recommended_timeframe }, status }
 */

const CORS_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: Request): Promise<Response> {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Parse input ──
    const body = await req.json();
    const {
      symptoms_text,
      duration = "Not specified",
      accompanying = "",
      history = "",
      patient_age,
      patient_gender,
      patient_name,
    } = body;

    if (!symptoms_text || !symptoms_text.trim()) {
      return json({ error: "symptoms_text is required" }, 400);
    }

    // ── Insforge client ──
    // Use anonKey for AI + DB calls; fall back to caller's token if present
    const authHeader = req.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : undefined;
    const client = createClient({
      baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
      anonKey: Deno.env.get("ANON_KEY"),
      edgeFunctionToken: token,
    });

    // ════════════════════════════════════════
    //  STEP 1 — Structured Symptom Extraction
    // ════════════════════════════════════════
    const patientContext = [
      `Age: ${patient_age || "unknown"}`,
      `Gender: ${patient_gender || "not specified"}`,
      `Duration: ${duration}`,
      accompanying ? `Accompanying symptoms: ${accompanying}` : "",
      history ? `Medical history: ${history}` : "",
      `Description: ${symptoms_text}`,
    ]
      .filter(Boolean)
      .join("\n");

    let extraction = {
      chief_complaint: symptoms_text.slice(0, 120),
      symptoms: [symptoms_text],
      duration: duration,
      accompanying_symptoms: accompanying ? [accompanying] : [],
      risk_factors: [],
    };

    try {
      const step1 = await client.ai.chat.completions.create({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          {
            role: "system",
            content: `You are a medical triage assistant. Your job is to extract structured information from the patient's description.

Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
  "chief_complaint": "one-sentence summary of the main issue",
  "symptoms": ["symptom1", "symptom2", ...],
  "duration": "how long symptoms have lasted",
  "accompanying_symptoms": ["additional symptom1", ...],
  "risk_factors": ["relevant risk factor1", ...]
}

Rules:
- Be precise and clinical in your extraction
- chief_complaint should be a clear, concise summary
- List each distinct symptom separately in the symptoms array
- Include age, pre-existing conditions, medications as risk_factors
- Do NOT diagnose. Only extract and organize information.`,
          },
          {
            role: "user",
            content: patientContext,
          },
        ],
        temperature: 0.1,
      });

      const content1 = step1.choices[0].message.content;
      const match1 = content1.match(/\{[\s\S]*\}/);
      if (match1) {
        extraction = JSON.parse(match1[0]);
      }
    } catch (e: any) {
      console.error("Step 1 failed:", e?.message || e);
    }

    // ════════════════════════════════════════
    //  STEP 2 — Severity Scoring
    // ════════════════════════════════════════
    let scoring = {
      score: 3,
      reason: "Unable to fully assess — defaulting to moderate urgency for safety.",
      recommended_timeframe: "Within 24 hours",
    };

    try {
      const step2 = await client.ai.chat.completions.create({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          {
            role: "system",
            content: `You are a medical triage severity scorer. Based on the structured symptom data, assign an urgency score from 1 to 5.

Scoring guide:
  1 = Routine follow-up (e.g., mild cold, runny nose)
  2 = Non-urgent, but needs attention within a few days (e.g., sore throat without fever)
  3 = Should be seen within 24 hours (e.g., persistent headaches, moderate pain)
  4 = Urgent, needs attention within 2 hours (e.g., high fever + vomiting, acute abdominal pain)
  5 = Emergency, immediate attention (e.g., chest pain, difficulty breathing, loss of consciousness)

Return ONLY valid JSON (no markdown, no explanation):
{
  "score": <number 1-5>,
  "reason": "brief clinical justification for the score",
  "recommended_timeframe": "when the patient should be seen"
}

Rules:
- Be conservative: when in doubt, score HIGHER (safer to over-triage)
- Consider patient age as a risk factor (very young and elderly are higher risk)
- Multiple symptoms together may increase severity
- Red flag symptoms (chest pain, breathing difficulty, altered consciousness) = score 5
- The reason should be 1-2 sentences explaining the key factors`,
          },
          {
            role: "user",
            content: JSON.stringify({
              patient_age: patient_age,
              patient_gender: patient_gender,
              chief_complaint: extraction.chief_complaint,
              symptoms: extraction.symptoms,
              duration: extraction.duration,
              accompanying_symptoms: extraction.accompanying_symptoms,
              risk_factors: extraction.risk_factors,
            }),
          },
        ],
        temperature: 0.1,
      });

      const content2 = step2.choices[0].message.content;
      const match2 = content2.match(/\{[\s\S]*\}/);
      if (match2) {
        scoring = JSON.parse(match2[0]);
      }

      // Clamp score to valid range
      scoring.score = Math.max(1, Math.min(5, Number(scoring.score) || 3));
    } catch (e: any) {
      console.error("Step 2 failed:", e?.message || e);
    }

    // ════════════════════════════════════════
    //  STEP 3 — Save to Database
    // ════════════════════════════════════════

    // Build the summary object in the shape the frontend expects
    const summary = {
      chief_complaint: extraction.chief_complaint,
      symptoms:
        Array.isArray(extraction.symptoms)
          ? extraction.symptoms.join(", ")
          : extraction.symptoms,
      duration: extraction.duration || duration,
      accompanying:
        Array.isArray(extraction.accompanying_symptoms)
          ? extraction.accompanying_symptoms.join(", ")
          : accompanying,
      history: history || "None provided",
    };

    // Create or find patient record
    let patientId: string | null = null;
    if (patient_name) {
      try {
        const patientResult = await client.database
          .from("patients")
          .insert({
            name: patient_name,
            age: patient_age || null,
            gender: patient_gender || null,
          })
          .select("id");
        if (patientResult.data && patientResult.data.length > 0) {
          patientId = patientResult.data[0].id;
        }
      } catch (e: any) {
        console.error("Patient insert failed:", e?.message || e);
      }
    }

    // Insert case linked to patient
    let caseId: string | null = null;
    try {
      const caseResult = await client.database
        .from("cases")
        .insert({
          patient_id: patientId,
          symptoms_raw: symptoms_text,
          summary_json: summary,
          triage_score: scoring.score,
          triage_reason: scoring.reason,
          status: "pending",
        })
        .select("id");

      if (caseResult.data && caseResult.data.length > 0) {
        caseId = caseResult.data[0].id;
      }
    } catch (e: any) {
      console.error("Case insert failed:", e?.message || e);
    }

    // ════════════════════════════════════════
    //  Return — matches frontend expectations
    // ════════════════════════════════════════
    return json({
      case_id: caseId,
      summary: summary,
      triage: {
        score: scoring.score,
        reason: scoring.reason,
        recommended_timeframe: scoring.recommended_timeframe,
      },
      status: "pending",
    });
  } catch (e) {
    console.error("analyzeSymptomsV1 unhandled error:", e);
    return json({ error: "Internal server error" }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}
