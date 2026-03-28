import { createClient } from "npm:@insforge/sdk";

/**
 * patientQA — AI-powered patient Q&A with confidence scoring
 *
 * Takes a patient's question (and optional case_id for context),
 * generates a helpful answer with a confidence level.
 *
 * Expected input body:
 *   { question: string, case_id?: string }
 *
 * Returns:
 *   { answer: string, confidence: "high" | "medium" | "low", needs_doctor_review: boolean }
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
    const { question, case_id } = body;

    if (!question || !question.trim()) {
      return json({ error: "question is required" }, 400);
    }

    // ── Insforge client ──
    const authHeader = req.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : undefined;
    const client = createClient({
      baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
      anonKey: Deno.env.get("ANON_KEY"),
      edgeFunctionToken: token,
    });

    // ── Fetch case context (if case_id provided) ──
    let caseContext = "";
    if (case_id && case_id !== "demo-case") {
      try {
        const { data } = await client.database
          .from("cases")
          .select("symptoms_raw, summary_json, triage_score, triage_reason")
          .eq("id", case_id)
          .single();

        if (data) {
          caseContext = `
Patient's case context:
- Symptoms: ${data.symptoms_raw}
- Triage score: ${data.triage_score}/5
- Triage reason: ${data.triage_reason}
- Summary: ${JSON.stringify(data.summary_json)}`;
        }
      } catch (e) {
        console.error("Failed to fetch case context:", e);
        // Continue without context — still answer the question
      }
    }

    // ── AI Q&A call ──
    const completion = await client.ai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        {
          role: "system",
          content: `You are a helpful medical Q&A assistant for patients. You provide general health guidance — NOT diagnosis or prescriptions.

${caseContext}

Rules:
1. Answer the patient's question clearly and helpfully.
2. NEVER diagnose conditions or prescribe medications.
3. For medication questions, always advise consulting their doctor.
4. For emergency symptoms (chest pain, difficulty breathing, severe bleeding, loss of consciousness), tell them to call 911 / go to ER immediately.
5. Keep answers concise (2-4 sentences for simple questions, up to a short paragraph for complex ones).
6. Always end with the disclaimer: "This is AI-assisted analysis, not medical advice."

After your answer, you MUST output a confidence assessment on a new line in this exact format:
CONFIDENCE: high|medium|low
NEEDS_DOCTOR: true|false

Confidence guide:
- high: General health advice, hydration, rest, emergency instructions, well-established medical facts
- medium: Symptom-specific guidance that may vary by individual, OTC medication questions
- low: Anything requiring diagnosis, prescription, test interpretation, or surgical decisions

NEEDS_DOCTOR guide:
- true: If the question involves medication, diagnosis, tests, surgery, or worsening symptoms
- false: For general wellness advice, emergency instructions, or well-known health guidance`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.3,
    });

    const rawResponse = completion.choices[0].message.content;

    // ── Parse the response ──
    const { answer, confidence, needs_doctor_review } = parseQAResponse(rawResponse);

    return json({ answer, confidence, needs_doctor_review });
  } catch (e) {
    console.error("patientQA error:", e);
    return json(
      {
        answer:
          "I'm sorry, I encountered an error processing your question. Please try again.\n\nThis is AI-assisted analysis, not medical advice.",
        confidence: "low",
        needs_doctor_review: true,
      },
      200 // Return 200 so frontend doesn't fall to catch block — graceful degradation
    );
  }
}

/**
 * Parse the AI response to extract the answer text, confidence level,
 * and whether doctor review is needed.
 */
function parseQAResponse(raw: string): {
  answer: string;
  confidence: "high" | "medium" | "low";
  needs_doctor_review: boolean;
} {
  let confidence: "high" | "medium" | "low" = "medium";
  let needs_doctor_review = false;

  // Extract CONFIDENCE line
  const confMatch = raw.match(/CONFIDENCE:\s*(high|medium|low)/i);
  if (confMatch) {
    confidence = confMatch[1].toLowerCase() as "high" | "medium" | "low";
  }

  // Extract NEEDS_DOCTOR line
  const doctorMatch = raw.match(/NEEDS_DOCTOR:\s*(true|false)/i);
  if (doctorMatch) {
    needs_doctor_review = doctorMatch[1].toLowerCase() === "true";
  }

  // Remove the metadata lines from the answer
  let answer = raw
    .replace(/CONFIDENCE:\s*(high|medium|low)/i, "")
    .replace(/NEEDS_DOCTOR:\s*(true|false)/i, "")
    .trim();

  // Ensure disclaimer is present
  if (!answer.includes("not medical advice")) {
    answer += "\n\nThis is AI-assisted analysis, not medical advice.";
  }

  return { answer, confidence, needs_doctor_review };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}
