// generateSchedule - Auto-generates doctor schedule based on triage scores
// Uses REST API directly instead of SDK to avoid deployment issues

const INTERNAL_URL = Deno.env.get("INSFORGE_INTERNAL_URL");
const ANON_KEY = Deno.env.get("ANON_KEY");

async function dbQuery(table, method, options = {}) {
  const { select, eq, order, insert, gte, lte } = options;

  let url = `${INTERNAL_URL}/api/database/records/${table}`;
  const headers = {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
  };

  if (method === "GET") {
    const params = new URLSearchParams();
    if (select) params.append("select", select);
    if (eq) params.append(eq.column, `eq.${eq.value}`);
    if (gte) params.append(gte.column, `gte.${gte.value}`);
    if (lte) params.append(lte.column, `lte.${lte.value}`);
    if (order) params.append("order", `${order.column}.${order.ascending ? "asc" : "desc"}`);
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`DB query failed: ${res.statusText}`);
    return await res.json();
  }

  if (method === "POST") {
    headers["Prefer"] = "return=representation";
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(insert),
    });
    if (!res.ok) throw new Error(`DB insert failed: ${res.statusText}`);
    return await res.json();
  }
}

export default async function (req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { doctor_id, date } = body;

    if (!doctor_id || !date) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: doctor_id, date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse date and set tier start times
    const tierStartTimes = {
      emergency: new Date(date),  // Score 4-5: 9:00 AM
      moderate: new Date(date),   // Score 3: 10:30 AM
      routine: new Date(date),    // Score 1-2: 2:00 PM (14:00)
    };
    tierStartTimes.emergency.setHours(9, 0, 0, 0);
    tierStartTimes.moderate.setHours(10, 30, 0, 0);
    tierStartTimes.routine.setHours(14, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(17, 0, 0, 0);

    // Get all reviewed cases sorted by triage score
    const reviewedCases = await dbQuery("cases", "GET", {
      select: "id,triage_score",
      eq: { column: "status", value: "reviewed" },
      order: { column: "triage_score", ascending: false },
    });

    // Get existing schedules for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0);
    
    const existingSchedules = await dbQuery("schedules", "GET", {
      select: "time_slot,case_id",
      eq: { column: "doctor_id", value: doctor_id },
      gte: { column: "time_slot", value: startOfDay.toISOString() },
      lte: { column: "time_slot", value: endOfDay.toISOString() },
    });

    // Build set of occupied time slots
    const occupiedSlots = new Set(
      (existingSchedules || []).map((s) => new Date(s.time_slot).getTime())
    );

    // Build set of already-scheduled case IDs to prevent duplicates
    const scheduledCaseIds = new Set(
      (existingSchedules || []).map((s) => s.case_id)
    );

    // Group cases by urgency tier
    const tiers = {
      emergency: [], // Score 4-5
      moderate: [],  // Score 3
      routine: [],   // Score 1-2
    };

    for (const caseItem of reviewedCases || []) {
      // Skip cases that are already scheduled
      if (scheduledCaseIds.has(caseItem.id)) continue;

      const score = caseItem.triage_score;
      if (score >= 4) {
        tiers.emergency.push(caseItem);
      } else if (score === 3) {
        tiers.moderate.push(caseItem);
      } else {
        tiers.routine.push(caseItem);
      }
    }

    // Generate schedule entries by tier
    const scheduleEntries = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in ms

    // Helper function to assign slots for a tier
    function assignSlotsForTier(cases, startTime) {
      let currentSlot = new Date(startTime);

      for (const caseItem of cases) {
        // Skip occupied slots within this tier
        while (occupiedSlots.has(currentSlot.getTime())) {
          currentSlot = new Date(currentSlot.getTime() + slotDuration);
        }

        // Don't exceed end of day
        if (currentSlot >= endOfDay) {
          break;
        }

        scheduleEntries.push({
          doctor_id,
          case_id: caseItem.id,
          time_slot: currentSlot.toISOString(),
          priority: caseItem.triage_score,
          confirmed: false,
        });

        occupiedSlots.add(currentSlot.getTime());
        currentSlot = new Date(currentSlot.getTime() + slotDuration);
      }
    }

    // Assign slots for each tier starting at their designated times
    assignSlotsForTier(tiers.emergency, tierStartTimes.emergency);
    assignSlotsForTier(tiers.moderate, tierStartTimes.moderate);
    assignSlotsForTier(tiers.routine, tierStartTimes.routine);

    if (scheduleEntries.length > 0) {
      const inserted = await dbQuery("schedules", "POST", {
        insert: scheduleEntries,
      });

      return new Response(
        JSON.stringify({
          success: true,
          schedules_created: inserted.length,
          schedules: inserted,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        schedules_created: 0,
        message: "No reviewed cases to schedule",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
