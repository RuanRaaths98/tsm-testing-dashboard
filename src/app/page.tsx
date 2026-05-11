"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Stage = {
  id: string;
  index: number;
  title: string;
  short: string;
  purpose: string;
  note: string;
  checksTitle?: string;
  checks?: string[];
  questionsTitle?: string;
  questions?: string[];
  decisions?: [string, string, string][];
  checklist?: string[];
  sections?: {
    id: string;
    title: string;
    purpose: string;
    checks: string[];
    decisions: [string, string, string][];
    checklist: string[];
  }[];
};

type LogEntry = {
  type: string;
  note: string;
};

type ReviewState = {
  activeStage: string;
  activeLandingSection: string;
  activeWeek: number;
  weeklyAnswers: Record<string, Record<string, Record<string, string>>>;
  contentAngles: LogEntry[];
  contentOffers: LogEntry[];
  notes: Record<string, string>;
  checklist: Record<string, boolean>;
};

type ClientRecord = {
  id: string;
  name: string;
  data: ReviewState;
};

const STORAGE_KEY = "buyerBehaviourReview.next.v1";
const DEFAULT_CLIENT_ID = "00000000-0000-4000-8000-000000000001";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const stages: Stage[] = [
  {
    id: "content",
    index: 1,
    title: "Content / Ads",
    short: "Content",
    purpose: "Find out what gets attention and what type of attention it gets.",
    note: "Check whether the right people stopped, clicked, and understood the promise.",
    checksTitle: "Hook Performance",
    checks: [
      "Did the ad get a strong CTR?",
      "Did the first 3 seconds hold attention?",
      "Did people stop scrolling?",
      "Which hook got the cheapest clicks?",
      "Which hook got the highest-quality leads?",
      "Did the hook match the landing page?",
    ],
    questionsTitle: "Content Questions",
    questions: [
      "What pain point did we lead with?",
      "What promise did we make?",
      "What belief did we challenge?",
      "What objection did we handle?",
      "What emotion did this trigger?",
      "Did this attract buyers or just browsers?",
    ],
    decisions: [
      ["Low CTR", "Hook or creative is weak", "Test a new angle"],
      ["High CTR, low leads", "Curiosity exists, but intent is wrong", "Make the hook more qualified"],
      ["High CTR, high leads", "Strong message-market fit", "Scale or make variations"],
      ["High engagement, low clicks", "Content is interesting but CTA is weak", "Improve the CTA"],
      ["Low engagement, low clicks", "Content angle is wrong", "Kill or rebuild"],
    ],
  },
  {
    id: "traffic",
    index: 2,
    title: "Traffic Quality",
    short: "Traffic",
    purpose: "Check if the traffic coming in is actually useful.",
    note: "This is the bridge between ads and the landing page.",
    checksTitle: "Traffic Checks",
    checks: [
      "Are people clicking but bouncing?",
      "Are they spending time on the page?",
      "Are they scrolling?",
      "Are they clicking buttons?",
      "Are they starting forms?",
      "Are they booking?",
      "Are they from the right location, device, and audience?",
    ],
    decisions: [
      ["High clicks, low page engagement", "Bad traffic or message mismatch", "Tighten targeting or ad promise"],
      ["High clicks, high scroll, low form starts", "Page has interest but offer is weak", "Fix the offer section"],
      ["High clicks, high form starts, low submits", "Form friction", "Shorten the form"],
      ["Low clicks, high conversion rate", "Good offer, not enough traffic", "Improve ad volume"],
    ],
    checklist: [
      "Traffic source checked",
      "Device checked",
      "Location checked",
      "Bounce / engagement checked",
      "Scroll depth checked",
      "CTA clicks checked",
      "Form starts checked",
      "Lead quality checked",
      "Traffic quality scored",
    ],
  },
  {
    id: "landing",
    index: 3,
    title: "Landing Page",
    short: "Landing",
    purpose: "Find out where people lose interest or trust.",
    note: "Read behaviour section by section instead of guessing.",
    sections: [
      {
        id: "hero",
        title: "Hero Section",
        purpose: "The first five seconds must match the ad and make the outcome obvious.",
        checks: [
          "Did people stay after landing?",
          "Did they scroll past the hero?",
          "Did they click the first CTA?",
          "Did the headline match the ad?",
          "Is the outcome clear within 5 seconds?",
          "Is the page visually clear on mobile?",
        ],
        decisions: [
          ["Low scroll past hero", "Hero is weak or confusing", "Rewrite the headline"],
          ["High scroll, low CTA click", "Interest exists, but CTA or offer is unclear", "Improve the CTA"],
          ["High CTA click", "Hero is working", "Keep and test small improvements"],
          ["High bounce", "Wrong traffic or weak message match", "Compare ad promise vs page promise"],
        ],
        checklist: [
          "Headline is clear",
          "Outcome is obvious",
          "Ad message matches page",
          "CTA is visible",
          "Mobile view checked",
          "Page speed checked",
          "Scroll past hero checked",
          "Hero CTA clicks checked",
          "Clarity recordings reviewed",
        ],
      },
      {
        id: "problem",
        title: "Problem Section",
        purpose: "Check if people feel understood.",
        checks: [
          "Do people scroll through this section?",
          "Do they pause here?",
          "Do they click anything?",
          "Do recordings show hesitation?",
          "Does the copy describe the actual pain?",
          "Is the pain specific enough?",
        ],
        decisions: [
          ["People skip it fast", "Problem feels generic", "Make pain more specific"],
          ["People pause but do not continue", "Pain connects, but next step is weak", "Improve the transition"],
          ["People continue after it", "Problem is doing its job", "Keep"],
        ],
        checklist: [
          "Pain point is specific",
          "Problem matches ad angle",
          "Problem is emotionally clear",
          "Section is not too long",
          "Scroll behaviour checked",
          "Recording behaviour checked",
          "Next section transition checked",
        ],
      },
      {
        id: "solution",
        title: "Solution Section",
        purpose: "Check if people understand what you actually do.",
        checks: [
          "Do people understand the mechanism?",
          "Is the solution simple?",
          "Is the process clear?",
          "Is it believable?",
          "Does it feel different from competitors?",
        ],
        decisions: [
          ["People drop here", "Solution is confusing", "Simplify the explanation"],
          ["People scroll but do not click", "They understand, but do not want it yet", "Add proof or a stronger benefit"],
          ["People click after this section", "Solution is clear", "Keep"],
        ],
        checklist: [
          "Solution is simple",
          "Unique mechanism is clear",
          "Process is explained",
          "Benefits are obvious",
          "Jargon removed",
          "Section engagement checked",
          "CTA after solution checked",
        ],
      },
      {
        id: "proof",
        title: "Proof Section",
        purpose: "Check if people trust you.",
        checks: [
          "Are case studies visible?",
          "Are testimonials strong enough?",
          "Are results specific?",
          "Is there proof near the CTA?",
          "Do people scroll through proof?",
          "Do recordings show people pausing on proof?",
        ],
        decisions: [
          ["People ignore proof", "Proof is weak or badly placed", "Make it more visual and specific"],
          ["People pause on proof but do not convert", "Trust improves, but offer is still weak", "Fix the offer or CTA"],
          ["People convert after proof", "Proof is doing its job", "Add more proof nearby"],
        ],
        checklist: [
          "Specific numbers included",
          "Testimonials included",
          "Case studies included",
          "Before/after shown",
          "Proof placed near CTA",
          "Proof section engagement checked",
          "Proof improved based on objections",
        ],
      },
      {
        id: "offer",
        title: "Offer Section",
        purpose: "Check if the offer creates enough desire to act now.",
        checks: [
          "Is the offer clear?",
          "Is the outcome clear?",
          "Are deliverables clear?",
          "Is the risk reduced?",
          "Is there urgency or a reason to act?",
          "Is it obvious what they get?",
          "Is the CTA strong?",
        ],
        decisions: [
          ["High scroll, low clicks", "Offer is not compelling", "Rebuild the offer stack"],
          ["High CTA clicks, low form starts", "CTA creates interest but next step scares them", "Reduce friction"],
          ["High form starts", "Offer is strong enough to create intent", "Improve form completion"],
          ["Low offer section reach", "Earlier page sections are too weak", "Fix hero, problem, or solution first"],
        ],
        checklist: [
          "Promise is clear",
          "Deliverables are clear",
          "Value is obvious",
          "Risk reversal included",
          "Urgency / reason to act included",
          "CTA is benefit-driven",
          "Offer section reach checked",
          "Offer CTA clicks checked",
        ],
      },
    ],
  },
  {
    id: "form",
    index: 4,
    title: "Form / Booking",
    short: "Form",
    purpose: "Check if people who are interested actually complete the action.",
    note: "Separate intent from friction by measuring click, start, submit, booking, and completion.",
    checksTitle: "Conversion Checks",
    checks: [
      "How many clicked CTA?",
      "How many started the form?",
      "How many submitted?",
      "Which field caused drop-off?",
      "Is mobile form easy?",
      "Is the form too long?",
      "Is the calendar too far away?",
      "Is there a trust line near the form?",
    ],
    decisions: [
      ["CTA clicks but no form starts", "Form or page transition issue", "Make next step clearer"],
      ["Form starts but no submits", "Form friction", "Remove fields"],
      ["Submits but no bookings", "Thank-you page or follow-up is weak", "Improve booking flow"],
      ["Bookings but low show-up", "Reminder or nurture issue", "Add WhatsApp and email reminders"],
    ],
    checklist: [
      "CTA click tracked",
      "Form start tracked",
      "Form submit tracked",
      "Booking click tracked",
      "Booking complete tracked",
      "Field drop-off checked",
      "Mobile form checked",
      "Confirmation page checked",
      "Follow-up trigger checked",
    ],
  },
  {
    id: "lead",
    index: 5,
    title: "Lead Quality",
    short: "Lead Quality",
    purpose: "Check if the campaign is attracting real buyers, not just cheap leads.",
    note: "Cheap leads can look good in the dashboard while quietly hurting sales.",
    checksTitle: "Lead Quality Checks",
    checks: [
      "How many leads were qualified?",
      "How many answered the phone?",
      "How many booked?",
      "How many showed up?",
      "How many became opportunities?",
      "How many closed?",
      "Which campaign produced the best lead quality?",
      "Which ad produced buyers, not just clicks?",
    ],
    decisions: [
      ["Many leads, poor quality", "Offer is too broad", "Add qualification"],
      ["Few leads, high quality", "Good positioning, needs more volume", "Scale carefully"],
      ["Many calls, low close rate", "Sales or offer issue", "Review the sales process"],
      ["Many no-shows", "Nurture or reminders are weak", "Add WhatsApp and email sequence"],
    ],
    checklist: [
      "Lead source captured",
      "Campaign captured",
      "Ad creative captured",
      "Lead quality scored",
      "Call booking tracked",
      "Show-up rate tracked",
      "Close rate tracked",
      "Revenue tracked",
      "Best source identified",
    ],
  },
];

const angleTypes = [
  "Fear-Based (urgency, loss aversion)",
  "Aspirational (opportunity, status reversal)",
  "Contrarian (pattern interrupt, identity reframe)",
  "Diagnostic (problem-aware)",
  "Educational / Authority",
  "Story / Transformation",
  "Proof / Demonstration",
  "Objection-Preempting",
  "Identity / Tribal",
];

const offerTypes = [
  "Free Discovery Offers",
  "Lead Magnets",
  "Paid Entry Offers",
  "Direct / High-Ticket Offers",
  "Community / Recurring Offers",
  "Webinar / Training Offers",
  "Conversation / Relationship Offers",
  "Price-Based Offers",
  "Bundle Offers",
  "Bonus / Gift Offers",
  "Risk Reversal Offers",
  "Urgency / Scarcity Offers",
  "Payment / Cash Flow Offers",
  "Social / Referral Offers",
  "Free + Shipping Offers",
  "Volume / Wholesale Offers",
  "Charitable / Cause-Based Offers",
];

function defaultState(): ReviewState {
  return {
    activeStage: "content",
    activeLandingSection: "hero",
    activeWeek: 1,
    weeklyAnswers: {},
    contentAngles: [{ type: "", note: "" }],
    contentOffers: [{ type: "", note: "" }],
    notes: {},
    checklist: {},
  };
}

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function defaultClient(): ClientRecord {
  return { id: DEFAULT_CLIENT_ID, name: "Default Client", data: defaultState() };
}

function normalizeClients(clients: ClientRecord[]) {
  if (!clients.length) return [defaultClient()];
  return clients.map((client, index) => ({
    ...client,
    id: UUID_PATTERN.test(client.id)
      ? client.id
      : index === 0
        ? DEFAULT_CLIENT_ID
        : crypto.randomUUID(),
    data: { ...defaultState(), ...client.data },
  }));
}

function readLocalClients(): ClientRecord[] {
  if (typeof window === "undefined") return [defaultClient()];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return [defaultClient()];
  try {
    return normalizeClients(JSON.parse(saved) as ClientRecord[]);
  } catch {
    return [defaultClient()];
  }
}

function writeLocalClients(clients: ClientRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function weekId(week: number) {
  return `week-${week}`;
}

function score(values: string[]) {
  if (!values.length) return 0;
  const done = values.filter((value) => String(value || "").trim()).length;
  return Math.round((done / values.length) * 100);
}

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientRecord[]>([defaultClient()]);
  const [activeClientId, setActiveClientId] = useState(DEFAULT_CLIENT_ID);
  const [saving, setSaving] = useState("Local draft");

  const activeClient = clients.find((client) => client.id === activeClientId) ?? clients[0];
  const data = activeClient.data;
  const activeStage = stages.find((stage) => stage.id === data.activeStage) ?? stages[0];
  const activeSection = activeStage.sections?.find((section) => section.id === data.activeLandingSection) ?? activeStage.sections?.[0];
  const activeWeek = data.activeWeek;

  useEffect(() => {
    async function load() {
      const supabase = createSupabase();
      if (!supabase) {
        const localClients = readLocalClients();
        setClients(localClients);
        setActiveClientId(localClients[0].id);
        return;
      }

      const { data: rows, error } = await supabase.from("dashboard_clients").select("id,name,data").order("created_at");
      if (error || !rows?.length) {
        const localClients = readLocalClients();
        setClients(localClients);
        setActiveClientId(localClients[0].id);
        setSaving("Local draft");
        return;
      }
      const remoteClients = normalizeClients(rows as ClientRecord[]);
      setClients(remoteClients);
      setActiveClientId(remoteClients[0].id);
      setSaving("Synced");
    }
    load();
  }, []);

  useEffect(() => {
    if (!clients.length) return;
    writeLocalClients(clients);
  }, [clients]);

  async function persist(nextClients: ClientRecord[]) {
    const normalizedClients = normalizeClients(nextClients);
    setClients(normalizedClients);
    writeLocalClients(normalizedClients);

    const supabase = createSupabase();
    if (!supabase) {
      setSaving("Local draft");
      return;
    }

    setSaving("Saving...");
    const payload = normalizedClients.map((client) => ({
      id: client.id,
      name: client.name,
      data: client.data,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("dashboard_clients").upsert(payload);
    setSaving(error ? "Local draft" : "Synced");
  }

  function updateActive(updater: (state: ReviewState) => ReviewState) {
    const nextClients = clients.map((client) =>
      client.id === activeClientId ? { ...client, data: updater(client.data) } : client
    );
    persist(nextClients);
  }

  function answer(scope: string, index: number) {
    return data.weeklyAnswers[weekId(activeWeek)]?.[scope]?.[String(index)] ?? "";
  }

  function setAnswer(scope: string, index: number, value: string) {
    updateActive((state) => {
      const answers = { ...state.weeklyAnswers };
      const week = { ...(answers[weekId(state.activeWeek)] ?? {}) };
      week[scope] = { ...(week[scope] ?? {}), [String(index)]: value };
      answers[weekId(state.activeWeek)] = week;
      return { ...state, weeklyAnswers: answers };
    });
  }

  function weekHasAnswers(week: number) {
    const answers = data.weeklyAnswers[weekId(week)] ?? {};
    return Object.values(answers).some((group) => Object.values(group).some((value) => value.trim()));
  }

  const storedWeeks = Object.keys(data.weeklyAnswers).map((item) => Number(item.replace("week-", ""))).filter(Boolean);
  const maxWeek = Math.max(1, data.activeWeek, ...storedWeeks);
  const weekCount = weekHasAnswers(maxWeek) ? maxWeek + 1 : maxWeek;

  const stageValues = collectStageValues(activeStage, data, activeWeek);
  const stageScore = score(stageValues);
  const overallScore = score(stages.flatMap((stage) => collectStageValues(stage, data, activeWeek)));

  function addClient() {
    const name = window.prompt("Client name");
    if (!name?.trim()) return;
    const client = { id: crypto.randomUUID(), name: name.trim(), data: defaultState() };
    setActiveClientId(client.id);
    persist([...clients, client]);
  }

  function renameClient() {
    const name = window.prompt("Rename client", activeClient.name);
    if (!name?.trim()) return;
    persist(clients.map((client) => client.id === activeClientId ? { ...client, name: name.trim() } : client));
  }

  function deleteClient() {
    if (clients.length <= 1) return;
    if (!window.confirm(`Delete ${activeClient.name}?`)) return;
    const next = clients.filter((client) => client.id !== activeClientId);
    setActiveClientId(next[0].id);
    persist(next);
  }

  function setLog(kind: "contentAngles" | "contentOffers", index: number, field: keyof LogEntry, value: string) {
    updateActive((state) => {
      const entries = [...state[kind]];
      entries[index] = { ...(entries[index] ?? { type: "", note: "" }), [field]: value };
      const last = entries[entries.length - 1];
      if ((last.type || last.note) && entries.length < 25) entries.push({ type: "", note: "" });
      return { ...state, [kind]: entries };
    });
  }

  return (
    <main className="min-h-dvh bg-[#ebeae8] p-4 text-[#20201d] md:p-8">
      <div className="mx-auto grid max-w-[1480px] overflow-hidden rounded-[30px] border border-white/80 bg-[#f7f6f4]/75 shadow-[0_36px_100px_rgba(36,35,31,0.11)] lg:grid-cols-[294px_minmax(0,1fr)]">
        <aside className="border-r border-black/[0.07] bg-[#f7f6f4]/80 p-5">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/90 bg-white/80 p-2 pr-4 shadow-[0_12px_28px_rgba(35,34,30,0.06)]">
            <div className="grid size-8 place-items-center rounded-full bg-[#f35a34] text-sm font-bold text-white">BB</div>
            <div>
              <strong className="block text-sm tracking-tight">Buyer Behaviour</strong>
              <span className="text-xs text-[#77736c]">Internal review system</span>
            </div>
          </div>

          <SidebarPanel title="Client">
            <select value={activeClientId} onChange={(event) => setActiveClientId(event.target.value)} className="input">
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <button className="soft-button" onClick={addClient}>Add</button>
              <button className="soft-button" onClick={renameClient}>Rename</button>
              <button className="soft-button" onClick={deleteClient}>Delete</button>
            </div>
          </SidebarPanel>

          <SidebarPanel title="Review week">
            <select
              value={activeWeek}
              onChange={(event) => updateActive((state) => ({ ...state, activeWeek: Number(event.target.value) }))}
              className="input"
            >
              {Array.from({ length: weekCount }, (_, index) => index + 1).map((week) => (
                <option key={week} value={week}>Week {week}{weekHasAnswers(week) ? "" : " (blank)"}</option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-[#77736c]">A new week appears after the current week has answers.</p>
          </SidebarPanel>

          <nav className="grid gap-2">
            {stages.map((stage) => (
              <button
                key={stage.id}
                className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] p-3 text-left transition ${stage.id === activeStage.id ? "bg-white shadow-[0_18px_44px_rgba(35,34,30,0.08)]" : "hover:bg-white/75"}`}
                onClick={() => updateActive((state) => ({ ...state, activeStage: stage.id }))}
              >
                <span className={`grid size-7 place-items-center rounded-xl text-xs ${stage.id === activeStage.id ? "bg-[#f35a34] text-white" : "bg-[#efeeeb] text-[#807a72]"}`}>{stage.index}</span>
                <span>
                  <strong className="block text-sm">{stage.title}</strong>
                  <span className="block text-xs leading-tight text-[#77736c]">{stage.purpose}</span>
                </span>
                <span className="text-xs text-[#77736c]">{score(collectStageValues(stage, data, activeWeek))}%</span>
              </button>
            ))}
          </nav>

          <div className="mt-7 border-t border-black/[0.07] pt-5">
            <div className="flex items-center gap-3 text-xs text-[#77736c]">
              <div className="grid size-12 place-items-center rounded-full border-[6px] border-[#e5e3df] bg-white font-bold text-[#20201d]">{overallScore}%</div>
              <div><strong className="block text-[#20201d]">Review completion</strong>Week {activeWeek} progress</div>
            </div>
            <p className="mt-4 text-xs text-[#77736c]">{saving}</p>
          </div>
        </aside>

        <section className="p-6 md:p-8">
          <header className="mb-5 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#77736c]">Agency Operating Dashboard</p>
              <h1 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">See where attention turns into revenue.</h1>
              <p className="mt-5 max-w-xl leading-relaxed text-[#726e67]">Review content, traffic, landing pages, offers, forms, follow-up, and lead quality by client and by week.</p>
            </div>
            <div className="flex w-fit flex-wrap gap-2 rounded-full border border-white/90 bg-white/75 p-2 shadow-[0_16px_40px_rgba(35,34,30,0.06)]">
              <button className="pill-button" onClick={() => window.print()}>Print</button>
              <button className="pill-button" onClick={() => exportReview(activeClient)}>Export notes</button>
              <button className="pill-button" onClick={() => updateActive(() => defaultState())}>Reset</button>
              <button className="pill-button bg-[#23231f] text-white">Save review</button>
            </div>
          </header>

          <div className="mb-5 grid max-w-3xl gap-4 md:grid-cols-[1.1fr_.85fr]">
            <Metric accent label="Active Stage" value={activeStage.short} note={activeStage.note} />
            <Metric label="Stage Score" value={`${stageScore}%`} note={`Week ${activeWeek} answers and checks.`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_372px]">
            <section className="overflow-hidden rounded-[24px] border border-white/90 bg-white/85 shadow-[0_26px_70px_rgba(35,34,30,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#77736c]">Stage {activeStage.index}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{activeStage.title}</h2>
                  <p className="mt-3 text-sm text-[#726e67]">{activeStage.purpose}</p>
                </div>
                <span className="rounded-full border border-black/[0.08] bg-white px-3 py-2 text-xs text-[#77736c]">{stageScore}% complete</span>
              </div>

              {activeStage.sections && (
                <div className="flex flex-wrap gap-2 border-b border-black/[0.08] px-6 py-4">
                  {activeStage.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => updateActive((state) => ({ ...state, activeLandingSection: section.id }))}
                      className={`rounded-full px-4 py-2 text-xs ${activeSection?.id === section.id ? "bg-[#23231f] text-white" : "bg-[#f4f3f0] text-[#77736c]"}`}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-5 p-6">
                {activeStage.sections && activeSection ? (
                  <>
                    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
                      <QuestionAnswers
                        title={`${activeSection.title} checks`}
                        items={activeSection.checks}
                        scope={`${activeStage.id}.${activeSection.id}.checks`}
                        week={activeWeek}
                        answer={answer}
                        setAnswer={setAnswer}
                      />
                      <DecisionTable rows={activeSection.decisions} />
                    </div>
                    <Checklist items={activeSection.checklist} prefix={`${activeStage.id}.${activeSection.id}`} data={data} update={updateActive} />
                    <Notes id={`${activeStage.id}.${activeSection.id}`} data={data} update={updateActive} />
                  </>
                ) : (
                  <>
                    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
                      <QuestionAnswers
                        title={activeStage.checksTitle ?? "Checks"}
                        items={activeStage.checks ?? []}
                        scope={`${activeStage.id}.checks`}
                        week={activeWeek}
                        answer={answer}
                        setAnswer={setAnswer}
                      />
                      <DecisionTable rows={activeStage.decisions ?? []} />
                    </div>
                    {activeStage.id === "content" && (
                      <ContentLogs
                        data={data}
                        setLog={setLog}
                        answer={answer}
                        setAnswer={setAnswer}
                        week={activeWeek}
                      />
                    )}
                    {activeStage.id !== "content" && <Checklist items={activeStage.checklist ?? []} prefix={activeStage.id} data={data} update={updateActive} />}
                    <Notes id={activeStage.id} data={data} update={updateActive} />
                  </>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-[24px] border border-white/90 bg-white/85 p-6 shadow-[0_26px_70px_rgba(35,34,30,0.08)]">
              <h3 className="text-xl font-black tracking-tight">Master Diagnostic Sequence</h3>
              {[
                ["Content Review", "Did the content get attention?"],
                ["Traffic Review", "Was it the right traffic?"],
                ["Landing Page Review", "Did the page hold attention?"],
                ["Offer Review", "Did the offer create intent?"],
                ["Form Review", "Did interested people convert?"],
                ["Lead Quality Review", "Were the leads actually good?"],
                ["Sales Review", "Did the leads turn into money?"],
              ].map((item, index) => (
                <div key={item[0]} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 border-t border-black/[0.08] py-4 first:border-t-0">
                  <span className="grid size-7 place-items-center rounded-xl bg-[#efeeeb] text-xs text-[#807a72]">{index + 1}</span>
                  <div><strong className="block text-sm">{item[0]}</strong><span className="text-xs text-[#77736c]">{item[1]}</span></div>
                  <span className="text-xs text-[#77736c]">{index < 5 ? score(collectStageValues(stages[index], data, activeWeek)) + "%" : "Track"}</span>
                </div>
              ))}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-5 grid gap-3 rounded-[19px] border border-white/80 bg-white/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_14px_34px_rgba(35,34,30,.045)]"><label className="text-xs font-bold uppercase tracking-[0.12em] text-[#77736c]">{title}</label>{children}</div>;
}

function Metric({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <article className={`grid min-h-32 content-between rounded-[24px] border border-white/90 p-5 shadow-[0_26px_70px_rgba(35,34,30,0.08)] ${accent ? "bg-[#f35a34] text-white" : "bg-white/85"}`}><div><p className={`text-xs font-bold uppercase tracking-[0.12em] ${accent ? "text-white/80" : "text-[#77736c]"}`}>{label}</p><div className="mt-4 text-3xl font-black tracking-tight">{value}</div></div><p className={`mt-2 text-xs leading-relaxed ${accent ? "text-white/80" : "text-[#77736c]"}`}>{note}</p></article>;
}

function QuestionAnswers({ title, items, scope, week, answer, setAnswer }: { title: string; items: string[]; scope: string; week: number; answer: (scope: string, index: number) => string; setAnswer: (scope: string, index: number, value: string) => void }) {
  return <div className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_30px_rgba(35,34,30,0.035)]"><h3 className="text-xl font-black tracking-tight">{title}</h3><p className="mt-1 text-xs text-[#77736c]">Week {week} answers</p><div className="mt-4 grid gap-3">{items.map((item, index) => <div key={item} className="grid gap-2 rounded-[18px] border border-black/[0.08] bg-[#fbfaf8] p-4"><label className="text-sm font-bold leading-snug">{item}</label><textarea className="input min-h-20 resize-y" value={answer(scope, index)} onChange={(event) => setAnswer(scope, index, event.target.value)} placeholder="Write this week's answer." /></div>)}</div></div>;
}

function DecisionTable({ rows }: { rows: [string, string, string][] }) {
  return <div className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_30px_rgba(35,34,30,0.035)]"><h3 className="text-xl font-black tracking-tight">Decision Logic</h3><table className="mt-4 w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-[0.12em] text-[#77736c]"><th className="py-3">Data says</th><th>Meaning</th><th>Next action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.join("-")} className="border-t border-black/[0.08]"><td className="py-4 pr-4">{row[0]}</td><td className="py-4 pr-4">{row[1]}</td><td className="py-4">{row[2]}</td></tr>)}</tbody></table></div>;
}

function ContentLogs({ data, setLog, answer, setAnswer, week }: { data: ReviewState; setLog: (kind: "contentAngles" | "contentOffers", index: number, field: keyof LogEntry, value: string) => void; answer: (scope: string, index: number) => string; setAnswer: (scope: string, index: number, value: string) => void; week: number }) {
  return <div className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_30px_rgba(35,34,30,0.035)]"><h3 className="text-xl font-black tracking-tight">Content Questions</h3><div className="mt-4 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><QuestionAnswers title="Content question answers" items={stages[0].questions ?? []} scope="content.questions" week={week} answer={answer} setAnswer={setAnswer} /><div className="grid gap-3"><LogList title="Angle" entries={data.contentAngles} options={angleTypes} kind="contentAngles" label="Angle family" noteLabel="Actual angle tested" setLog={setLog} /><LogList title="Offer" entries={data.contentOffers} options={offerTypes} kind="contentOffers" label="Offer type" noteLabel="Actual offer tested" setLog={setLog} /></div></div></div>;
}

function LogList({ title, entries, options, kind, label, noteLabel, setLog }: { title: string; entries: LogEntry[]; options: string[]; kind: "contentAngles" | "contentOffers"; label: string; noteLabel: string; setLog: (kind: "contentAngles" | "contentOffers", index: number, field: keyof LogEntry, value: string) => void }) {
  return <div className="grid gap-3">{entries.map((entry, index) => <div key={`${title}-${index}`} className="grid gap-3 rounded-[18px] border border-black/[0.08] bg-[#fbfaf8] p-4"><div className="flex items-baseline justify-between"><strong>{title} {index + 1}</strong><span className="text-xs text-[#77736c]">{entry.type || entry.note ? "in use" : "next"}</span></div><label className="grid gap-2 text-xs font-bold text-[#77736c]">{label}<select className="input" value={entry.type} onChange={(event) => setLog(kind, index, "type", event.target.value)}><option value="">Select</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>{(entry.type || entry.note) && <label className="grid gap-2 text-xs font-bold text-[#77736c]">{noteLabel}<textarea className="input min-h-28 resize-y" value={entry.note} onChange={(event) => setLog(kind, index, "note", event.target.value)} /></label>}</div>)}</div>;
}

function Checklist({ items, prefix, data, update }: { items: string[]; prefix: string; data: ReviewState; update: (updater: (state: ReviewState) => ReviewState) => void }) {
  return <div className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_30px_rgba(35,34,30,0.035)]"><h3 className="text-xl font-black tracking-tight">Checklist</h3><div className="mt-4 grid gap-3">{items.map((item, index) => { const id = `${prefix}.${index}`; return <label key={item} className="grid grid-cols-[22px_1fr] gap-3 text-sm"><input type="checkbox" checked={Boolean(data.checklist[id])} onChange={(event) => update((state) => ({ ...state, checklist: { ...state.checklist, [id]: event.target.checked } }))} />{item}</label>; })}</div></div>;
}

function Notes({ id, data, update }: { id: string; data: ReviewState; update: (updater: (state: ReviewState) => ReviewState) => void }) {
  return <div className="rounded-[20px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_30px_rgba(35,34,30,0.035)]"><h3 className="text-xl font-black tracking-tight">Notes</h3><textarea className="input mt-4 min-h-28 resize-y" value={data.notes[id] ?? ""} onChange={(event) => update((state) => ({ ...state, notes: { ...state.notes, [id]: event.target.value } }))} placeholder="Document the behaviour, diagnosis, and action." /></div>;
}

function collectStageValues(stage: Stage, data: ReviewState, week: number) {
  const answers = data.weeklyAnswers[weekId(week)] ?? {};
  const values: string[] = [];
  if (stage.id === "content") {
    values.push(...Object.values(answers["content.checks"] ?? {}));
    values.push(...Object.values(answers["content.questions"] ?? {}));
    values.push(...data.contentAngles.filter((entry) => entry.type || entry.note).flatMap((entry) => [entry.type, entry.note]));
    values.push(...data.contentOffers.filter((entry) => entry.type || entry.note).flatMap((entry) => [entry.type, entry.note]));
    return values;
  }
  if (stage.sections) {
    stage.sections.forEach((section) => {
      values.push(...Object.values(answers[`${stage.id}.${section.id}.checks`] ?? {}));
      section.checklist.forEach((_, index) => values.push(data.checklist[`${stage.id}.${section.id}.${index}`] ? "done" : ""));
    });
    return values;
  }
  values.push(...Object.values(answers[`${stage.id}.checks`] ?? {}));
  (stage.checklist ?? []).forEach((_, index) => values.push(data.checklist[`${stage.id}.${index}`] ? "done" : ""));
  return values;
}

function exportReview(client: ClientRecord) {
  const blob = new Blob([JSON.stringify(client, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${client.name.toLowerCase().replaceAll(" ", "-")}-review.json`;
  link.click();
  URL.revokeObjectURL(url);
}
