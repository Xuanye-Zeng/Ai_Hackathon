import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { insforge } from "../../lib/insforge";

const CONFIDENCE_STYLES = {
  high:   { label: "High confidence",  dot: "bg-emerald-500", bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  medium: { label: "Medium confidence", dot: "bg-amber-500",   bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200" },
  low:    { label: "Low confidence",    dot: "bg-rose-500",    bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200" },
};

const INITIAL_SUGGESTIONS = [
  "Should I drink more water?",
  "When should I go to the ER?",
  "Can I take over-the-counter medication?",
  "What symptoms should I watch for?",
];

// Generate contextual follow-up suggestions based on the last Q&A
function getFollowUpSuggestions(question, answer, confidence) {
  const q = (question || "").toLowerCase();
  const a = (answer || "").toLowerCase();

  // Build context-aware suggestions
  const suggestions = [];

  if (a.includes("hydrat") || a.includes("water")) {
    suggestions.push("How much water should I drink daily?", "Are sports drinks better than water?");
  }
  if (a.includes("rest") || a.includes("sleep")) {
    suggestions.push("How long should I rest before resuming activity?", "What sleeping position is best?");
  }
  if (a.includes("fever") || q.includes("fever")) {
    suggestions.push("At what temperature should I go to the ER?", "Can I use a cold compress for fever?");
  }
  if (a.includes("medication") || a.includes("ibuprofen") || a.includes("pain reliever")) {
    suggestions.push("What are common side effects?", "How often can I take it?");
  }
  if (a.includes("doctor") || a.includes("consult") || confidence === "low") {
    suggestions.push("How do I prepare for a doctor visit?", "What questions should I ask my doctor?");
  }
  if (a.includes("emergency") || a.includes("911")) {
    suggestions.push("What should I bring to the ER?", "How do I describe my symptoms to paramedics?");
  }
  if (q.includes("headache") || a.includes("headache")) {
    suggestions.push("Could this headache be a migraine?", "Are there any home remedies for headaches?");
  }
  if (q.includes("chest") || a.includes("chest")) {
    suggestions.push("What are signs of a heart attack?", "Could this be anxiety-related?");
  }

  // Always add some generic useful follow-ups
  const generic = [
    "What warning signs should I watch for?",
    "When should I follow up with a doctor?",
    "Are there lifestyle changes that could help?",
    "Is this condition contagious?",
  ];

  // Deduplicate and pick up to 4
  const all = [...new Set([...suggestions, ...generic])];
  return all.slice(0, 4);
}

const STORAGE_KEY = "medtriage_chat";

function loadCachedMessages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveCachedMessages(msgs) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch { /* ignore */ }
}

const WELCOME_MSG = {
  role: "assistant",
  text: "Hello! I'm your medical Q&A assistant. I can answer basic health questions related to your symptoms.\n\nWhat would you like to know?",
  confidence: "high",
  needs_doctor_review: false,
};

export default function ChatPage() {
  const location = useLocation();
  const caseId = location.state?.caseId || "demo-case";

  const [messages, setMessages] = useState(() => loadCachedMessages() || [WELCOME_MSG]);
  const [suggestions, setSuggestions] = useState(() => {
    const cached = loadCachedMessages();
    return (!cached || cached.length <= 1) ? INITIAL_SUGGESTIONS : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Cache messages whenever they change
  useEffect(() => {
    saveCachedMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, suggestions]);

  const send = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    setSuggestions([]); // Hide suggestions while loading

    try {
      let res;
      try {
        const { data, error: fnErr } = await insforge.functions.invoke(
          "patientQA",
          { body: { question, case_id: caseId } }
        );
        if (fnErr) throw fnErr;
        res = data;
      } catch {
        res = generateMockQA(question);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.answer,
          confidence: res.confidence,
          needs_doctor_review: res.needs_doctor_review,
        },
      ]);

      // Generate follow-up suggestions based on the conversation
      const followUps = getFollowUpSuggestions(question, res.answer, res.confidence);
      setSuggestions(followUps);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.\n\nThis is AI-assisted analysis, not medical advice.",
          confidence: "low",
          needs_doctor_review: true,
        },
      ]);
      setSuggestions(["Can you try answering again?", "What symptoms should I watch for?"]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, caseId]);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([WELCOME_MSG]);
    setSuggestions(INITIAL_SUGGESTIONS);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-57px)] max-w-2xl flex-col">
      {/* Header */}
      <div className="glass border-b border-slate-200/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm text-white">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Medical Q&A</p>
              <p className="text-[11px] text-slate-400">
                Confidence badges show how reliable each answer is
              </p>
            </div>
          </div>
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="grid gap-4">
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs">
                AI
              </div>
              <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Follow-up suggestions — show after every response */}
          {!loading && suggestions.length > 0 && (
            <div className="ml-10 flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white hover:shadow-md"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="glass border-t border-slate-200/60 px-4 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={loading}
            placeholder="Type your question..."
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────
//  Chat Bubble
// ──────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2.5 text-sm text-white shadow-md">
          {msg.text}
        </div>
      </div>
    );
  }

  const conf = CONFIDENCE_STYLES[msg.confidence] || CONFIDENCE_STYLES.medium;

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-500">
        AI
      </div>
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
          {msg.text.split("\n").map((line, i) => {
            const isDisclaimer = line.toLowerCase().includes("not medical advice");
            return (
              <span key={i}>
                {isDisclaimer ? (
                  <span className="mt-1 inline-block text-[13px] font-semibold italic text-amber-600">{line}</span>
                ) : line}
                {i < msg.text.split("\n").length - 1 && <br />}
              </span>
            );
          })}
        </div>

        {/* Badges */}
        {msg.confidence && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${conf.bg} ${conf.text} ${conf.border}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${conf.dot}`} />
              {conf.label}
            </span>

            {msg.needs_doctor_review && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                🩺 Please consult your doctor
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────
//  Mock Q&A (until serverless is live)
// ──────────────────────────────
function generateMockQA(question) {
  const q = question.toLowerCase();
  let answer =
    "Based on your symptoms, it is recommended to rest, stay hydrated, and monitor any changes. If symptoms worsen, seek medical attention.";
  let confidence = "medium";
  let needs_doctor_review = false;

  if (q.includes("medication") || q.includes("prescri") || q.includes("drug")) {
    answer = "I cannot prescribe or recommend specific medications. Please consult your doctor for prescription guidance.";
    confidence = "low";
    needs_doctor_review = true;
  } else if (q.includes("emergency") || q.includes("911") || q.includes("er ") || q.includes("dying")) {
    answer = "If you believe you are experiencing a medical emergency, please call 911 or go to the nearest emergency room immediately. Do not wait.";
    confidence = "high";
  } else if (q.includes("water") || q.includes("hydrat") || q.includes("drink")) {
    answer = "Staying well hydrated supports recovery for many conditions. Aim for 8 glasses of water per day, and more if you have a fever.";
    confidence = "high";
  } else if (q.includes("rest") || q.includes("sleep")) {
    answer = "Rest is one of the most effective ways to support your recovery. Aim for 7-9 hours of sleep and avoid strenuous activity until you feel better.";
    confidence = "high";
  } else if (q.includes("surgery") || q.includes("diagnos") || q.includes("test")) {
    answer = "Diagnosis and decisions about testing or surgery must be made by a qualified physician after proper examination.";
    confidence = "low";
    needs_doctor_review = true;
  } else if (q.includes("over-the-counter") || q.includes("otc") || q.includes("tylenol") || q.includes("ibuprofen")) {
    answer = "Over-the-counter pain relievers may help with mild symptoms, but you should consult with your doctor or pharmacist before taking any medication.";
    confidence = "medium";
    needs_doctor_review = true;
  } else if (q.includes("watch") || q.includes("symptom") || q.includes("worse")) {
    answer = "Seek immediate medical attention if you experience: difficulty breathing, chest pain, high fever (>103°F/39.4°C), confusion, persistent vomiting, or symptoms that suddenly worsen.";
    confidence = "high";
  }

  answer += "\n\nThis is AI-assisted analysis, not medical advice.";
  return { answer, confidence, needs_doctor_review };
}
