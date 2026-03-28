import { createClient } from 'npm:@insforge/sdk';

export default async function(req: Request): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const body = await req.json();
  const symptomsText = body.symptoms_text;
  const patientAge = body.patient_age;
  const patientGender = body.patient_gender;
  const patientName = body.patient_name;
  const patientContact = body.patient_contact;

  if (!symptomsText) return new Response(JSON.stringify({ error: 'symptoms_text required' }), { status: 400, headers });

  const authHeader = req.headers.get('Authorization');
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  const client = createClient({ baseUrl: Deno.env.get('INSFORGE_BASE_URL'), edgeFunctionToken: token || undefined });

  // Step 1: Extract structured symptoms
  let extraction = { chief_complaint: symptomsText.slice(0, 100), symptoms: [symptomsText], duration: 'unknown', accompanying_symptoms: [], risk_factors: [] };
  try {
    const r1 = await client.ai.chat.completions.create({
      model: 'anthropic/claude-sonnet-4.5',
      messages: [
        { role: 'system', content: 'You are a medical triage assistant. Extract: chief_complaint, symptoms array, duration, accompanying_symptoms array, risk_factors array. JSON only. Do not diagnose.' },
        { role: 'user', content: 'Patient: ' + (patientAge || 'unknown') + 'yo ' + (patientGender || '') + '. Description: ' + symptomsText },
      ],
      temperature: 0.1,
    });
    const content = r1.choices[0].message.content;
    const match = content.match(/\{[\s\S]*\}/);
    if (match) extraction = JSON.parse(match[0]);
  } catch (e) { /* use fallback */ }

  // Step 2: Score severity
  let scoring = { score: 3, reason: 'Default moderate urgency', recommended_timeframe: 'Within 24 hours', red_flags: [] };
  try {
    const r2 = await client.ai.chat.completions.create({
      model: 'anthropic/claude-sonnet-4.5',
      messages: [
        { role: 'system', content: 'Score urgency 1-5. 1=routine followup, 2=non-urgent few days, 3=within 24h, 4=urgent 2h, 5=emergency immediate. Return JSON: {score, reason, recommended_timeframe, red_flags}. Be conservative - when in doubt score higher.' },
        { role: 'user', content: JSON.stringify({ patient_age: patientAge, patient_gender: patientGender, chief_complaint: extraction.chief_complaint, symptoms: extraction.symptoms, duration: extraction.duration, risk_factors: extraction.risk_factors }) },
      ],
      temperature: 0.1,
    });
    const content = r2.choices[0].message.content;
    const match = content.match(/\{[\s\S]*\}/);
    if (match) scoring = JSON.parse(match[0]);
  } catch (e) { /* use fallback */ }

  // Step 3: Save to DB
  let patientId = null;
  if (patientName) {
    const result = await client.database.from('patients').insert({ name: patientName, age: patientAge || null, gender: patientGender || null, contact: patientContact || null }).select();
    if (result.data && result.data.length > 0) patientId = result.data[0].id;
  }

  const summary = { chief_complaint: extraction.chief_complaint, symptoms: extraction.symptoms, duration: extraction.duration, accompanying_symptoms: extraction.accompanying_symptoms, risk_factors: extraction.risk_factors, score: scoring.score, reason: scoring.reason, recommended_timeframe: scoring.recommended_timeframe, red_flags: scoring.red_flags };

  const caseResult = await client.database.from('cases').insert({ patient_id: patientId, symptoms_raw: symptomsText, summary_json: summary, triage_score: scoring.score, triage_reason: scoring.reason, status: 'pending' }).select();

  const caseId = (caseResult.data && caseResult.data.length > 0) ? caseResult.data[0].id : null;

  return new Response(JSON.stringify({ case_id: caseId, patient_id: patientId, extraction: extraction, scoring: scoring, status: 'pending', disclaimer: 'This is AI-assisted triage, not a medical diagnosis.' }), { status: 200, headers });
}
