import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { insforge } from "../../lib/insforge";

const CONFIDENCE_STYLES = {
  high:   { label: "High confidence",  dot: "bg-emerald-500", bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  medium: { label: "Medium confidence", dot: "bg-amber-500",   bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200" },
  low:    { label: "Low confidence",    dot: "bg-rose-500",    bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200" },
};

const SUGGESTED = [
  "Should I drink more water?",
  "When should I go to the ER?",
  "Can I take over-the-counter medication?",
  "What symptoms should I watch for?",
];

export default function ChatPage() {
  const location = useLocation();
  const caseId = location.state?.caseId || "demo-case";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm your medical Q&A assistant. I can answer basic health questions related to your symptoms.\n\nWhat would you like to know?",
      confidence: "high",
      needs_doctor_review: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const question = (text || input).trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

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
        // ── Fallback mock Q&A ──
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
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-49px)] max-w-2xl flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Medical Q&A</p>
        <p className="text-xs text-slate-400">
          Confidence badges show how reliable each answer is
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="grid gap-4">
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">
                🤖
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Suggested questions */}
          {messages.length === 1 && !loading && (
            <div className="ml-9 flex flex-wrap gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-600 hover:text-white"
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
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={loading}
            placeholder="Type your question…"
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
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
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">
          {msg.text}
        </div>
      </div>
    );
  }

  const conf = CONFIDENCE_STYLES[msg.confidence] || CONFIDENCE_STYLES.medium;

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">
        🤖
      </div>
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800">
          {msg.text.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < msg.text.split("\n").length - 1 && <br />}
            </span>
          ))}
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
    answer =
      "I cannot prescribe or recommend specific medications. Please consult your doctor for prescription guidance.";
    confidence = "low";
    needs_doctor_review = true;
  } else if (q.includes("emergency") || q.includes("911") || q.includes("er ") || q.includes("dying")) {
    answer =
      "If you believe you are experiencing a medical emergency, please call 911 or go to the nearest emergency room immediately. Do not wait.";
    confidence = "high";
    needs_doctor_review = false;
  } else if (q.includes("water") || q.includes("hydrat") || q.includes("drink")) {
    answer =
      "Staying well hydrated supports recovery for many conditions. Aim for 8 glasses of water per day, and more if you have a fever.";
    confidence = "high";
    needs_doctor_review = false;
  } else if (q.includes("rest") || q.includes("sleep")) {
    answer =
      "Rest is one of the most effective ways to support your recovery. Aim for 7-9 hours of sleep and avoid strenuous activity until you feel better.";
    confidence = "high";
    needs_doctor_review = false;
  } else if (q.includes("surgery") || q.includes("diagnos") || q.includes("test")) {
    answer =
      "Diagnosis and decisions about testing or surgery must be made by a qualified physician after proper examination.";
    confidence = "low";
    needs_doctor_review = true;
  } else if (q.includes("over-the-counter") || q.includes("otc") || q.includes("tylenol") || q.includes("ibuprofen")) {
    answer =
      "Over-the-counter pain relievers may help with mild symptoms, but you should consult with your doctor or pharmacist before taking any medication to ensure it is safe for your situation.";
    confidence = "medium";
    needs_doctor_review = true;
  } else if (q.includes("watch") || q.includes("symptom") || q.includes("worse")) {
    answer =
      "Seek immediate medical attention if you experience: difficulty breathing, chest pain, high fever (>103°F/39.4°C), confusion, persistent vomiting, or symptoms that suddenly worsen.";
    confidence = "high";
    needs_doctor_review = false;
  }

  answer += "\n\nThis is AI-assisted analysis, not medical advice.";
  return { answer, confidence, needs_doctor_review };
}