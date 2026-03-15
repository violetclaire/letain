import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs tracking-[0.16em] uppercase text-[#888]">{children}</p>;
}

function H2({ children }: { children: string }) {
  return <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>{children}</h2>;
}

function H3({ children }: { children: string }) {
  return <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>{children}</h3>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-[#555] leading-relaxed">{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-[#e8e2d9] rounded-lg p-5 ${className}`}>{children}</div>;
}

function CardLabel({ children }: { children: string }) {
  return <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-[#333] leading-relaxed flex gap-2">
          <span className="text-[#ccc] mt-0.5">-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: string }) {
  return <span className="text-xs text-[#333] bg-[#f5f3ef] rounded px-2.5 py-1.5 inline-block">{children}</span>;
}

function Divider() {
  return <div className="border-t border-[#e8e2d9]" />;
}

function ThickDivider() {
  return <div className="border-t-2 border-[#3d1a22]" />;
}

function NavItem({ num, label, active, onClick }: { num: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left py-1.5 text-xs transition-colors ${active ? "text-[#1a1a1a] font-medium" : "text-[#888] hover:text-[#555]"}`}
    >
      <span className="text-[#ccc] mr-1.5">{num}</span>{label}
    </button>
  );
}

export default function BriarwoodSpec() {
  const [, setLocation] = useLocation();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[780px] mx-auto px-6 py-12 md:py-20">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-[#888] hover:text-[#1a1a1a] mb-10 transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-14"
        >
          {/* Header */}
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-4">Briarwood AI — Internal Product & System Behavior Spec</p>
            <h1 className="text-3xl sm:text-4xl tracking-tight leading-[1.1]" style={{ fontFamily: "'Fraunces', serif" }}>
              Internal Product & System Behavior Spec
            </h1>
            <p className="mt-6 text-[#555] leading-relaxed">
              This document defines the intended product behavior, system components, operating rules, and phased architecture for Briarwood AI. It is an internal build document for engineering alignment. It is not a pitch deck. It is not brand copy. Its purpose is to make the product legible enough to scope, challenge, and implement.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="bg-white border border-[#e8e2d9] rounded-lg p-5">
            <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-3">Contents</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {[
                ["1", "Product Objective"],
                ["2", "Initial User"],
                ["3", "Product Thesis"],
                ["4", "Product Principles"],
                ["5", "System Overview"],
                ["6", "Integrations & Core Functions"],
                ["7", "Core System Objects"],
                ["8", "Inputs the System Must Read"],
                ["9", "Core Workflows"],
                ["10", "Prompt Engine"],
                ["11", "Approval & Policy Framework"],
                ["12", "Behavioral Judgment Capture"],
                ["13", "Outcome Capture"],
                ["14", "Network Intelligence"],
                ["15", "CDI Framework"],
                ["16", "Outcome-Oriented Routing"],
                ["17", "Channel Architecture"],
                ["18", "Security & Sovereignty"],
                ["19", "Durable System Advantage"],
                ["20", "Phased Build"],
                ["21", "Open Technical Questions"],
              ].map(([num, label]) => (
                <NavItem key={num} num={num} label={label} active={false} onClick={() => scrollToSection(`s${num}`)} />
              ))}
            </div>
          </div>

          {/* ===== SECTION 1 ===== */}
          <div id="s1" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 1</SectionLabel>
            <H2>Product Objective</H2>
            <Body>
              Briarwood is a coordination intelligence system for high-trust physical service professionals.
            </Body>
            <Body>
              Its initial job is to sit on top of the provider's existing workflow, reduce administrative overhead, and execute the core booking and coordination loop -- including proposal creation, schedule creation, contracts, invoicing, payments, follow-up, and referrals -- without requiring the provider to migrate onto a new platform or perform structured data entry.
            </Body>
            <Body>
              At the same time, the system must capture three categories of durable intelligence from workflow behavior:
            </Body>
            <div className="space-y-3">
              <Card>
                <CardLabel>1.1 Behavioral Judgment</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">How the provider actually makes coordination decisions under real conditions.</p>
              </Card>
              <Card>
                <CardLabel>1.2 Outcome Signals</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">Whether coordination reached a successful operational outcome, failed, stalled, or required recovery.</p>
              </Card>
              <Card>
                <CardLabel>1.3 Network Intelligence</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">Who refers whom, who fills in for whom, which providers function as trusted alternates, and how those trust edges evolve over time.</p>
              </Card>
            </div>
            <Body>The product must satisfy three conditions at once:</Body>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5 space-y-2">
              <p className="text-sm leading-relaxed">1. It must be immediately useful as an operational assistant.</p>
              <p className="text-sm leading-relaxed">2. It must generate structured coordination data from previously unstructured workflow behavior.</p>
              <p className="text-sm leading-relaxed">3. It must accumulate proprietary trust and routing intelligence that improves with usage across providers and events.</p>
            </div>
          </div>

          {/* ===== SECTION 2 ===== */}
          <div id="s2" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 2</SectionLabel>
            <H2>Initial User</H2>
            <Card className="space-y-4">
              <div>
                <CardLabel>2.1 Primary User</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">Independent or small-team professionals whose work is relationship-driven, judgment-heavy, schedule-sensitive, and managed through inbox + calendar.</p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>2.2 Examples</CardLabel>
                <div className="grid grid-cols-2 gap-2">
                  {["Bridal hair and makeup artists", "Planners / coordinators", "Luxury personal service providers", "Specialized consultants", "Event-adjacent professionals", "Estate / household service operators"].map((item, i) => (
                    <Chip key={i}>{item}</Chip>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>2.3 Shared Characteristics</CardLabel>
                <BulletList items={[
                  "Already run most operations through Gmail and Google Calendar",
                  "Rely on private referrals and repeat networks",
                  "Do not want to adopt heavyweight SaaS workflows",
                  "Need help with coordination, follow-up, proposals, schedules, calendar logic, contracts, invoicing, payments, and referrals",
                  "Are sensitive to trust, brand control, and client ownership",
                ]} />
              </div>
            </Card>
            <Body>Initial build should assume one-provider accounts first, with optional team support later.</Body>
          </div>

          {/* ===== SECTION 3 ===== */}
          <div id="s3" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 3</SectionLabel>
            <H2>Product Thesis</H2>
            <Body>
              Traditional workflow software depends on explicit data entry. The highest-trust service operators often do not work this way. Their business logic exists inside email threads, calendar blocks, informal referrals, ad hoc operational decisions, and private client relationships.
            </Body>
            <Body>Briarwood should not attempt to replace that behavior. It should interpret it.</Body>
            <Card className="space-y-3">
              <CardLabel>The system is designed as a layer that:</CardLabel>
              <BulletList items={[
                "Ingests unstructured coordination activity",
                "Extracts actionable state from it",
                "Prompts the provider when judgment is needed",
                "Drafts or executes tasks with approval",
                "Records behavioral signals that later support trust and routing models",
              ]} />
            </Card>

            <H3>3.1 Why the system compounds</H3>
            <Body>Briarwood is not only a workflow assistant. It is also a system for learning from observed coordination behavior. Each completed workflow should improve the system in three ways:</Body>
            <div className="space-y-3">
              <Card>
                <CardLabel>A. It Improves Execution</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">The assistant becomes better at drafting, prompting, sequencing, and identifying likely next actions for that provider.</p>
              </Card>
              <Card>
                <CardLabel>B. It Improves Scoring</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">The system collects more evidence about provider behavior, reliability, responsiveness, recovery patterns, and operational consistency.</p>
              </Card>
              <Card>
                <CardLabel>C. It Improves Routing</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">The system learns more about which providers trust each other, which referrals succeed, which alternate nodes preserve outcome quality, and which handoffs work in specific contexts.</p>
              </Card>
            </div>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333] font-medium">This compounding data layer is a primary design goal, not a byproduct.</p>
            </div>
          </div>

          {/* ===== SECTION 4 ===== */}
          <div id="s4" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 4</SectionLabel>
            <H2>Product Principles</H2>
            <div className="space-y-3">
              {[
                { num: "4.1", title: "No forced workflow migration", detail: "The user should not be required to leave their existing operating environment to get value. The operational product lives in the inbox, calendar, and prompt layer. The internal dashboard exists for management, history, configuration, and review -- it is not the primary surface." },
                { num: "4.2", title: "No structured data entry as prerequisite", detail: "The system must infer from existing behavior wherever possible." },
                { num: "4.3", title: "Human judgment remains primary", detail: "Briarwood may prepare, suggest, and draft. It should not make consequential judgment calls without approval." },
                { num: "4.4", title: "Approval boundaries are a core feature", detail: "The product should feel trustworthy because the user remains in control of sensitive actions." },
                { num: "4.5", title: "Operational, not conversational", detail: "Natural language is the interface, but the product is a coordination engine, not a general chatbot." },
                { num: "4.6", title: "Data reusability", detail: "Operational events should also create structured signals for scoring and routing systems." },
                { num: "4.7", title: "Optimize for outcomes, not activity", detail: "Sending a proposal is not the same as booking the work. Making a referral is not the same as preserving the event outcome." },
                { num: "4.8", title: "Private network effects", detail: "The system should gain value from observed referral patterns and trust relationships without requiring a public marketplace." },
              ].map((p, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                  <p className="text-xs text-[#888] mb-0.5">{p.num}</p>
                  <p className="text-sm font-medium text-[#1a1a1a] mb-1">{p.title}</p>
                  <p className="text-xs text-[#666] leading-relaxed">{p.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION 5 ===== */}
          <div id="s5" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 5</SectionLabel>
            <H2>System Overview</H2>
            <Body>At a high level, Briarwood consists of the following layers:</Body>
            <div className="space-y-2">
              {[
                { num: "5.1", name: "Integration layer", detail: "Gmail, Google Calendar, contracts/e-sign, invoicing/payment, SMS, dashboard" },
                { num: "5.2", name: "Ingestion layer", detail: "Pulls messages, calendar events, contract status, invoice/payment status, contacts, system events" },
                { num: "5.3", name: "Parsing / interpretation layer", detail: "Converts unstructured text and event activity into structured entities and state changes" },
                { num: "5.4", name: "State engine", detail: "Maintains current and historical state of all objects: inquiries, proposals, schedules, contracts, invoices, payments, clients, dates, referrals, prompts, approvals, behavioral events, outcomes, network edges, CDI signals" },
                { num: "5.5", name: "Prompt engine", detail: "Determines when the provider needs to be asked something" },
                { num: "5.6", name: "Approval / policy layer", detail: "Determines what requires approval, what can be pre-approved, what cannot be auto-executed" },
                { num: "5.7", name: "Execution layer", detail: "Drafts and executes proposals, schedules, contracts, invoices, reminders, referrals, holds, follow-ups" },
                { num: "5.8", name: "Behavioral signal layer", detail: "Logs coordination behavior and computes reusable trust-related features" },
                { num: "5.9", name: "Scoring / routing layer", detail: "Uses behavioral signals, outcomes, and network data to generate CDI outputs and routing recommendations" },
                { num: "5.10", name: "External API layer", detail: "Long-term layer exposing routing / trust queries to external systems or agents" },
              ].map((layer, i) => (
                <div key={i} className="flex gap-3 bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
                  <span className="text-xs text-[#888] mt-0.5 flex-shrink-0 w-6">{layer.num}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{layer.name}</p>
                    <p className="text-xs text-[#666] leading-relaxed">{layer.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION 6 ===== */}
          <div id="s6" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 6</SectionLabel>
            <H2>Initial Integrations and Core Product Functions</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="space-y-3">
                <CardLabel>6.1 V1 Integrations</CardLabel>
                <BulletList items={["Gmail OAuth", "Google Calendar OAuth", "Contracts / e-sign integration", "Invoicing / payment integration", "Internal web dashboard", "SMS channel for prompts and replies"]} />
              </Card>
              <Card className="space-y-3">
                <CardLabel>6.2 V1 Core Functions</CardLabel>
                <BulletList items={["Inquiry parsing", "Proposal generation", "Schedule generation", "Calendar conflict detection", "Tentative hold placement", "Contract generation / sending", "Invoice generation / sending", "Payment status tracking", "Follow-up prompting", "Referral drafting / sending", "Action log / approval tracking"]} />
              </Card>
              <Card className="space-y-3">
                <CardLabel>6.3 V1 / V1.5 Intelligence Functions</CardLabel>
                <BulletList items={["Behavioral decision logging", "Referral edge creation and updating", "Outcome state tracking", "Recovery / reroute event tracking", "Provider trust graph storage", "CDI component signal generation"]} />
              </Card>
              <Card className="space-y-3">
                <CardLabel>6.4 Optional / Later</CardLabel>
                <BulletList items={["CRM sync", "Team member accounts", "Contacts graph import", "Provider referral graph management UI", "Dedicated mobile app if SMS becomes limiting"]} />
              </Card>
            </div>

            <H3>6.5 Why these are core</H3>
            <Body>Briarwood is not useful enough if it only detects requests and asks the provider what to do. It must complete the main coordination loop:</Body>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5">
              <div className="space-y-1">
                {["Inquiry arrives", "Briarwood parses it", "Briarwood generates proposal", "Briarwood generates schedule when needed", "Briarwood generates and sends contract", "Briarwood generates and sends invoice", "Briarwood tracks signature and payment state", "Briarwood prompts for follow-up, referral, or next action", "Booking is confirmed and operational details are prepared"].map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm text-[#333]">
                    <span className="text-[#888] flex-shrink-0 w-4 text-right">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333] font-medium">If proposal maker and schedule maker are missing, the assistant breaks at the exact point where the user expects the most leverage.</p>
            </div>
          </div>

          {/* ===== SECTION 7 ===== */}
          <div id="s7" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 7</SectionLabel>
            <H2>Core System Objects</H2>
            <Body>The following are the minimum entities the system should represent.</Body>
            <div className="space-y-3">
              {[
                { name: "Provider", fields: "provider_id, name, business_name, service categories, pricing defaults, travel rules, schedule templates, approval settings, response preferences, network relationships, templates, connected accounts, brand settings" },
                { name: "Client", fields: "client_id, contact info, source, linked conversations, linked events, booking history, notes, relationship type" },
                { name: "Inquiry", fields: "inquiry_id, source message/thread, event date(s), service type(s), venue, requester, status, confidence score, extracted participants, linked availability" },
                { name: "Proposal", fields: "proposal_id, linked inquiry_id, service line items, pricing, fees, draft status, sent timestamp, approval history" },
                { name: "Schedule", fields: "schedule_id, linked event_id, service blocks, start/end times, participants, assigned provider(s), venue, version, delivery status, approval history" },
                { name: "Contract", fields: "contract_id, linked proposal_id, status, issue date, signed date, payment dependency, service dates, terms version" },
                { name: "Invoice / Payment", fields: "invoice_id, linked contract_id, linked client_id, amount, due date, payment status, retainer/final type, paid timestamp, outstanding balance" },
                { name: "Event", fields: "event_id, date/time, venue, service scope, participants, assigned provider(s), prep tasks, execution status, linked communications" },
                { name: "Referral Edge", fields: "from_provider, to_provider, service relevance, geography, prior referral count, acceptance history, inferred trust strength, explicit/inferred origin" },
                { name: "Prompt", fields: "prompt_id, trigger source, prompt type, urgency, linked object, suggested actions, expiration, channel delivered, response" },
                { name: "Action Log", fields: "action_id, type, trigger, approval state, execution state, timestamp, affected object(s), user response, success/failure" },
                { name: "Behavioral Judgment Event", fields: "judgment_event_id, provider_id, trigger context, available options, selected action, user-initiated vs system-suggested, downstream outcome, complexity/criticality tag, timestamp, confidence" },
                { name: "Outcome Record", fields: "outcome_id, linked object(s), outcome type, direct/inferred/unknown classification, confidence, evidence source, timestamp" },
                { name: "Behavioral Signal", fields: "signal_id, provider_id, signal_type, value, source evidence, timestamp, confidence, context tags" },
              ].map((obj, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                  <p className="text-sm font-medium text-[#1a1a1a] mb-1">{obj.name}</p>
                  <p className="text-xs text-[#888] leading-relaxed">{obj.fields}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION 8 ===== */}
          <div id="s8" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 8</SectionLabel>
            <H2>Inputs the System Must Read</H2>
            <Body>Briarwood should rely on observable workflow inputs rather than user-entered forms whenever possible.</Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { source: "Gmail", items: "Inbound inquiries, reply timing, forwarding behavior, follow-up chains, venue references, client names, pricing/proposal language, contract requests, referral patterns" },
                { source: "Google Calendar", items: "Booked dates, tentative holds, time blocks, locations, event titles, prep spacing, travel conflicts, availability gaps" },
                { source: "Contracts / e-sign", items: "Generate drafts, send contracts, check signature status, identify unsigned/completed, map completion to booking state" },
                { source: "Invoicing / payments", items: "Generate invoices, send invoices, check retainer/payment status, identify overdue, map payment to booking state" },
                { source: "Internal config", items: "Pricing defaults, service packages, travel fees, scheduling templates, assistant rules, auto-approved actions, tone/template preferences, referral network" },
                { source: "Execution results", items: "Email sent, contract sent, contract signed, invoice sent, retainer paid, schedule delivered, referral accepted, user approved/rejected, action ignored/delayed" },
              ].map((input, i) => (
                <Card key={i}>
                  <p className="text-xs font-medium text-[#1a1a1a] mb-1">{input.source}</p>
                  <p className="text-xs text-[#888] leading-relaxed">{input.items}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* ===== SECTION 9 ===== */}
          <div id="s9" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 9</SectionLabel>
            <H2>Core Workflows</H2>
            <div className="space-y-4">
              {[
                { num: "9.1", name: "New inquiry", steps: ["New inbound email arrives", "Parsing layer determines if it is likely an inquiry", "System extracts date, venue, service scope, requester, linked references", "State engine creates or updates Inquiry object", "Availability checked against calendar", "Prompt engine decides whether to surface prompt", "Provider receives prompt: send pricing, generate proposal, decline, refer, or ask for clarification", "If approved, execution layer drafts or sends response", "Action is logged"] },
                { num: "9.2", name: "Proposal generation", steps: ["Inquiry exists or is created from email", "Briarwood identifies line items, dates, venue, service type, party size, staffing assumptions", "System applies pricing defaults, package rules, travel fees, provider preferences", "Draft proposal is generated", "Prompt: send as-is, combine items, split items, adjust fees, modify assumptions", "On approval, proposal is sent", "Calendar may place tentative holds", "Proposal and action state recorded"] },
                { num: "9.3", name: "Schedule generation", steps: ["Booked event or approved proposal requiring a schedule identified", "System pulls event date, service count, types, timing constraints, venue, team members", "Draft schedule generated based on provider rules and templates", "Provider reviews: approve, adjust order, adjust times, add buffer, assign roles", "On approval, schedule saved and optionally sent to client or team", "Final schedule state logged"] },
                { num: "9.4", name: "Contract", steps: ["Proposal approved or booking state requires formalization", "Briarwood generates contract using template and populated details", "Provider reviews or uses default approval path", "Contract sent", "Signature state monitored", "Booking status updates based on contract state"] },
                { num: "9.5", name: "Invoice / payment", steps: ["Contract sent or signed, depending on provider rules", "Briarwood generates invoice or retainer request", "Provider reviews or uses default approval path", "Invoice sent", "Payment state monitored", "Booking status updates based on payment state"] },
                { num: "9.6", name: "Unsigned contract follow-up", steps: ["Contract sent", "Signature incomplete after threshold", "Prompt engine creates follow-up reminder", "User approves message or uses template", "System sends follow-up, logs response timing"] },
                { num: "9.7", name: "Unpaid retainer", steps: ["Contract signed but payment incomplete after threshold", "Prompt engine creates payment reminder", "On approval, reminder sent", "System tracks until paid, cancelled, or abandoned"] },
                { num: "9.8", name: "Calendar conflict / overflow", steps: ["Inquiry arrives for date already booked or capacity-constrained", "System identifies conflict", "Provider prompted: decline, refer, override, or waitlist", "If referral selected, suggestion generated using network context", "Referral sent only with approval", "Referral edge and outcome state recorded"] },
                { num: "9.9", name: "Referral", steps: ["Opportunity detected from conflict, decline, overload, or provider instruction", "System identifies trusted candidates based on network and context", "Provider selects recipient or approves suggestion", "Briarwood drafts or sends introduction", "Downstream engagement and outcome tracked where observable"] },
                { num: "9.10", name: "Upcoming event prep", steps: ["Event approaching within threshold window", "System checks if schedule, logistics, or prep materials missing", "Provider prompted to generate/send needed materials", "On approval, Briarwood executes"] },
                { num: "9.11", name: "Gap in schedule", steps: ["Calendar shows underutilized future window", "System prompts with context-aware suggestions: open trial availability, reach out to pending inquiries, re-engage warm leads", "Suggestions are optional and non-destructive"] },
                { num: "9.12", name: "Cancellation / recovery", steps: ["Cancellation or disruption detected", "System identifies if replacement / reroute is possible", "Briarwood queries trust graph: Referral Edge data, context fit, availability, geography, prior outcomes", "System ranks candidates by trust strength, context, probability of preserving outcome", "Best reroute options surfaced to provider", "Provider approves replacement action", "Recovery path and downstream outcome logged"] },
              ].map((wf, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                  <p className="text-xs text-[#888] mb-0.5">{wf.num}</p>
                  <p className="text-sm font-medium text-[#1a1a1a] mb-2">{wf.name}</p>
                  <div className="space-y-0.5">
                    {wf.steps.map((step, j) => (
                      <div key={j} className="flex gap-2 text-xs text-[#555]">
                        <span className="text-[#ccc] flex-shrink-0">{j + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION 10 ===== */}
          <div id="s10" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 10</SectionLabel>
            <H2>Prompt Engine</H2>
            <Body>The prompt engine decides when the provider should be interrupted.</Body>
            <Card className="space-y-4">
              <div>
                <CardLabel>10.1 Prompt Categories</CardLabel>
                <div className="flex flex-wrap gap-1.5">
                  {["New inquiry", "Proposal ready", "Schedule ready", "Unsigned contract", "Unpaid retainer", "Availability conflict", "Referral opportunity", "Upcoming event prep", "Schedule gap", "Cancellation / recovery", "Stalled workflow"].map((cat, i) => (
                    <Chip key={i}>{cat}</Chip>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>10.2 Prompt Requirements</CardLabel>
                <BulletList items={["What happened", "Why it matters", "What object it relates to", "What actions are available", "Whether urgency exists", "Whether Briarwood has already prepared a draft"]} />
              </div>
            </Card>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333] font-medium">Prompts should reduce thinking, not create work. Present the decision in the smallest possible unit without hiding relevant context.</p>
            </div>
          </div>

          {/* ===== SECTION 11 ===== */}
          <div id="s11" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 11</SectionLabel>
            <H2>Approval and Policy Framework</H2>
            <Body>Approval boundaries are a product requirement, not a safeguard bolted on later.</Body>
            <div className="space-y-3">
              <Card className="space-y-3">
                <CardLabel>11.1 Requires Explicit Approval</CardLabel>
                <BulletList items={["Sending proposals", "Sending schedules", "Sending contracts", "Sending invoices", "Sending payment reminders", "Making referrals / introductions", "Declining inquiries", "Placing meaningful calendar holds", "Reassigning work", "Rerouting after disruption"]} />
              </Card>
              <Card className="space-y-3">
                <CardLabel>11.2 Potentially Pre-Authorizable</CardLabel>
                <BulletList items={["Sending info sheet", "Sending standard pricing packet", "Tentative calendar hold", "Light reminder on unsigned contract", "Light reminder on unpaid retainer"]} />
              </Card>
              <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5">
                <p className="text-xs tracking-[0.1em] uppercase text-[#f5f3ef]/50 mb-2">11.3 Never Autonomous in V1</p>
                <BulletList items={["Commit provider to booking without approval", "Send personal referral without approval", "Sign on behalf of provider", "Charge a payment method directly", "Cancel or materially alter a booking without approval", "Expose provider network data externally"]} />
              </div>
            </div>
          </div>

          {/* ===== SECTION 12 ===== */}
          <div id="s12" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 12</SectionLabel>
            <H2>Behavioral Judgment Capture</H2>
            <Body>One of Briarwood's core jobs is to capture how skilled providers make decisions that are normally invisible to software.</Body>
            <Card className="space-y-3">
              <CardLabel>Decisions to Capture</CardLabel>
              <BulletList items={[
                "Whether to accept or decline a job",
                "Whether to refer overflow work",
                "Who to refer to",
                "When to combine or split proposals",
                "When to add travel fees or exceptions",
                "When to escalate follow-up",
                "How to recover from disruption",
                "How to prioritize one inquiry over another",
                "How to route work across dates, venues, and staffing constraints",
              ]} />
            </Card>
            <Card className="space-y-3">
              <CardLabel>12.1 Engineering Requirement</CardLabel>
              <p className="text-sm text-[#333] leading-relaxed">A behavioral judgment event should include:</p>
              <BulletList items={[
                "Triggering context",
                "Available options at the time",
                "Provider's selected action",
                "Whether action was suggested by Briarwood or initiated by user",
                "Downstream outcome, if observable",
                "Confidence / ambiguity level of the original interpretation",
              ]} />
            </Card>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333] leading-relaxed"><span className="font-medium">12.2 Important rule:</span> The system should not treat all user actions as equivalent. A decision made under scarcity, time pressure, or conflict may contain more valuable signal than a routine approval. Approving a standard info sheet send = low-complexity judgment. Choosing which trusted alternate to use for a high-stakes overflow client under pressure = high-value judgment. The system should preserve this distinction.</p>
            </div>
          </div>

          {/* ===== SECTION 13 ===== */}
          <div id="s13" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 13</SectionLabel>
            <H2>Outcome Capture</H2>
            <Body>Briarwood should not only log activity. It should attempt to log operational outcomes. The purpose is to distinguish activity from execution, execution from success, and success from high-confidence reliability.</Body>
            <Card className="space-y-4">
              <div>
                <CardLabel>13.1 Outcome Categories</CardLabel>
                <div className="flex flex-wrap gap-1.5">
                  {["Inquiry received", "Proposal sent", "Contract signed", "Invoice/retainer paid", "Booking confirmed", "Schedule delivered", "Referral accepted", "Referral completed", "Cancellation occurred", "Replacement/reroute occurred", "Workflow stalled", "Workflow abandoned", "Event completed", "Event completed after recovery"].map((cat, i) => (
                    <Chip key={i}>{cat}</Chip>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>13.2 Outcome Model</CardLabel>
                <BulletList items={[
                  "Direct outcomes: confirmed by contract, payment, or explicit system state",
                  "Inferred outcomes: strongly implied by downstream workflow signals",
                  "Unknown outcomes: insufficient evidence",
                ]} />
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>13.3 Engineering Requirement</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">Outcome status should never be silently assumed. It should be classified with: status, confidence, evidence source, timestamp, linked entities.</p>
              </div>
            </Card>
          </div>

          {/* ===== SECTION 14 ===== */}
          <div id="s14" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 14</SectionLabel>
            <H2>Network Intelligence and Network Effects</H2>
            <Body>Briarwood should treat provider relationships as a dynamic trust graph, not a static contact list. The network layer is one of the main long-term assets of the system.</Body>
            <Card className="space-y-4">
              <div>
                <CardLabel>14.1 What the Network Should Model</CardLabel>
                <BulletList items={["Who refers whom", "In what contexts", "How often", "With what acceptance rate", "With what eventual outcomes", "Under what service categories", "Within what geographies", "With what speed", "With what repeat frequency"]} />
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>14.2 Types of Network Edges</CardLabel>
                <BulletList items={[
                  "Explicit: provider manually identifies another as trusted",
                  "Observed: referrals repeatedly made in workflow",
                  "Inferred: repeated fallback or overflow patterns suggest trust relationship",
                ]} />
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>14.3 Edge Attributes</CardLabel>
                <div className="flex flex-wrap gap-1.5">
                  {["Referral count", "Referral recency", "Acceptance rate", "Completion rate", "Context tags", "Directional strength", "Mutual vs one-way", "Crisis-use frequency", "Substitution similarity"].map((attr, i) => (
                    <Chip key={i}>{attr}</Chip>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="space-y-3">
              <CardLabel>14.5 Network Effects Definition</CardLabel>
              <p className="text-sm text-[#333] leading-relaxed">The system gets stronger as more providers use it because:</p>
              <BulletList items={[
                "More referral edges become visible",
                "More outcomes become attached to those edges",
                "More context-specific routing patterns become learnable",
                "More replacement and overflow scenarios become solvable",
                "More behavioral comparisons become possible within domain clusters",
              ]} />
            </Card>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333] font-medium">14.6 Important constraint: Network effects should not require public marketplace exposure. The system compounds through private workflow observation, permissioned referrals, and trust graph accumulation.</p>
            </div>
          </div>

          {/* ===== SECTION 15 ===== */}
          <div id="s15" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 15</SectionLabel>
            <H2>Behavioral Signal and CDI Framework</H2>
            <Body>CDI should not be treated as a single opaque score. It should be designed as a structured trust model composed of multiple signal families.</Body>
            <div className="space-y-3">
              {[
                { family: "A. Responsiveness", signals: ["Time to first response", "Time to follow-up", "Consistency of communication timing", "Responsiveness under high-load periods"] },
                { family: "B. Coordination Reliability", signals: ["Proposal turnaround speed", "Contract completion rate", "Payment conversion rate", "Schedule delivery timeliness", "Drop-off rates across booking stages"] },
                { family: "C. Referral Behavior", signals: ["Frequency of trusted referral usage", "Quality of counterparties selected", "Referral acceptance rate", "Referral completion rate", "Repeat trusted handoffs"] },
                { family: "D. Recovery Behavior", signals: ["Cancellation handling", "Replacement speed", "Successful reroute rate", "Conflict resolution patterns", "Performance under compressed timelines"] },
                { family: "E. Network Validation", signals: ["Repeated trust from other providers", "Inbound referral frequency", "Reciprocal trust signals", "Strength within service-specific clusters"] },
                { family: "F. Outcome Quality Proxies", signals: ["Confirmed completion rate", "Rebooking / repeat relationship patterns", "Recovery-adjusted success rate", "Incomplete / failed workflow frequency"] },
              ].map((fam, i) => (
                <Card key={i} className="space-y-2">
                  <p className="text-sm font-medium text-[#1a1a1a]">{fam.family}</p>
                  <BulletList items={fam.signals} />
                </Card>
              ))}
            </div>
            <Card className="space-y-3">
              <CardLabel>15.2 Design Requirement</CardLabel>
              <p className="text-sm text-[#333] leading-relaxed">Different product surfaces may use raw component signals, context-specific sub-scores, or composite indices. The system should not assume one universal score is always appropriate.</p>
              <div className="bg-[#f5f3ef] rounded p-3 mt-2">
                <p className="text-xs text-[#333]"><span className="font-medium">Example:</span> "best provider for routine overflow" and "best alternate node for emergency same-day replacement" should not necessarily use identical weights.</p>
              </div>
            </Card>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333]"><span className="font-medium">15.3 Early implementation note:</span> In early versions, CDI may exist primarily as structured component signals and internal ranking logic before being exposed as a user-facing score.</p>
            </div>
          </div>

          {/* ===== SECTION 16 ===== */}
          <div id="s16" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 16</SectionLabel>
            <H2>Outcome-Oriented Routing</H2>
            <Body>Briarwood's routing layer should optimize for successful completion, not just matching.</Body>
            <Card className="space-y-3">
              <CardLabel>Ranking Criteria</CardLabel>
              <BulletList items={["Availability", "Context fit", "Trust relationship strength", "Prior outcome success in similar situations", "Responsiveness likelihood", "Recovery likelihood if disruption occurs"]} />
            </Card>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5 space-y-2">
              <p className="text-sm leading-relaxed">The system's long-term objective is not: "who exists?"</p>
              <p className="text-sm leading-relaxed font-medium">It is: "who is most likely to preserve the outcome under current conditions?"</p>
            </div>
          </div>

          {/* ===== SECTION 17 ===== */}
          <div id="s17" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 17</SectionLabel>
            <H2>Channel Architecture</H2>
            <Body>The system should present as one coordination engine across multiple interfaces.</Body>
            <div className="space-y-3">
              {[
                { channel: "Gmail / desktop", items: "Assistant side panel, email-aware context, prompt queue, draft generation and review, object-linked actions" },
                { channel: "SMS / mobile", items: "Lightweight prompt delivery, short approvals and adjustments, urgent workflow handling, synced with same state engine" },
                { channel: "Internal dashboard", items: "Persistent object history, action log, prompt management, schedule/proposal/contract/invoice views, future analytics and trust graph views" },
              ].map((ch, i) => (
                <Card key={i}>
                  <p className="text-sm font-medium text-[#1a1a1a] mb-1">{ch.channel}</p>
                  <p className="text-xs text-[#888] leading-relaxed">{ch.items}</p>
                </Card>
              ))}
            </div>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333] font-medium">Channel sync requirement: What is approved via text must appear in the dashboard and Gmail panel. What is generated in Gmail must be visible on mobile. All channels write to the same state engine and action log.</p>
            </div>
          </div>

          {/* ===== SECTION 18 ===== */}
          <div id="s18" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 18</SectionLabel>
            <H2>Security, Privacy, and Sovereignty Constraints</H2>
            <Body>These are product rules that should shape implementation decisions.</Body>
            <div className="space-y-3">
              {[
                { rule: "Client ownership", detail: "Provider client relationships should not be repurposed for marketplace extraction." },
                { rule: "Workflow data use", detail: "Operational data should be used to serve the provider and improve Briarwood's internal trust/routing system, not to expose private business intelligence to third parties." },
                { rule: "No unauthorized external contact", detail: "Briarwood should not contact clients, referral partners, or counterparties without approval unless narrow pre-authorization exists." },
                { rule: "Approval-first architecture", detail: "Any action with brand, relational, contractual, or financial consequence should remain approval-gated by default." },
                { rule: "Network privacy", detail: "Observed trust graph data should not be public by default and should not be externally queryable in raw form." },
              ].map((item, i) => (
                <div key={i} className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-4">
                  <p className="text-xs tracking-[0.1em] uppercase text-[#f5f3ef]/50 mb-1">{item.rule}</p>
                  <p className="text-sm leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION 19 ===== */}
          <div id="s19" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 19</SectionLabel>
            <H2>Durable System Advantage</H2>
            <Body>The long-term defensibility of Briarwood does not come from basic email parsing, generic AI summarization, proposal drafting alone, or SMS prompts alone. Those are product entry points, not the moat.</Body>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5 space-y-3">
              <p className="text-sm leading-relaxed font-medium">The durable advantage comes from accumulation of proprietary coordination data across:</p>
              <BulletList items={["Behavioral decisions", "Observed outcomes", "Private referral patterns", "Rerouting events", "Cross-provider trust edges", "Context-specific success histories"]} />
            </div>
            <Card className="space-y-3">
              <CardLabel>Engineering Priority When Tradeoffs Arise</CardLabel>
              <div className="space-y-1">
                {["1. Actionability for the user", "2. Fidelity of behavioral capture", "3. Fidelity of outcome capture", "4. Integrity of the trust graph"].map((p, i) => (
                  <p key={i} className="text-sm text-[#333]">{p}</p>
                ))}
              </div>
              <p className="text-sm text-[#333] font-medium mt-2">Those four together are the core asset.</p>
            </Card>
          </div>

          {/* ===== SECTION 20 ===== */}
          <div id="s20" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 20</SectionLabel>
            <H2>Phased Build</H2>
            <div className="space-y-4">
              {[
                { phase: "Phase 1: Operational Assistant", color: "#28692e", goal: "Make the system useful immediately", items: ["Gmail + Calendar integration", "Inquiry parsing", "Proposal generation", "Schedule generation", "Contract generation / sending", "Invoice generation / sending", "Follow-up prompts", "Payment tracking", "Referral drafting", "Action log", "Approval controls", "SMS support"] },
                { phase: "Phase 1.5: Structured Intelligence Layer", color: "#8b6914", goal: "Begin converting workflow into durable internal signals", items: ["Behavioral judgment event logging", "Outcome record model", "Referral edge creation", "Recovery event tracking", "Basic trust graph storage", "CDI component signal generation"] },
                { phase: "Phase 2: Internal Scoring and Routing", color: "#5a3e7a", goal: "Improve decision support and suggestions", items: ["Provider-specific prompt optimization", "Referral recommendation ranking", "Conflict / overflow routing logic", "Context-aware trust scoring", "Internal CDI views"] },
                { phase: "Phase 3: External Routing / API Layer", color: "#3d1a22", goal: "Expose Briarwood as infrastructure", items: ["External trust / routing queries", "Agent-facing query layer", "Context-aware provider matching", "Permissioned routing outputs", "Usage-based query economics"] },
              ].map((ph, i) => (
                <div key={i} className="border-l-4 rounded-lg bg-white border border-[#e8e2d9] p-5" style={{ borderLeftColor: ph.color }}>
                  <p className="text-sm font-medium text-[#1a1a1a] mb-0.5">{ph.phase}</p>
                  <p className="text-xs text-[#888] mb-3">Goal: {ph.goal}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ph.items.map((item, j) => (
                      <Chip key={j}>{item}</Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION 21 ===== */}
          <div id="s21" className="space-y-6 pt-4">
            <Divider />
            <SectionLabel>Section 21</SectionLabel>
            <H2>Open Technical Questions</H2>
            <Body>These should be resolved with engineering, not hand-waved.</Body>
            <div className="space-y-3">
              {[
                { area: "Parsing / state", questions: ["What confidence threshold is required before creating an Inquiry object automatically?", "When should Briarwood create a new object versus update an existing one?", "How should ambiguous multi-date or multi-service emails be represented?"] },
                { area: "Approval", questions: ["Which actions can safely be pre-authorized in early versions?", "How should approval policies be customizable without making configuration too heavy?"] },
                { area: "Scheduling", questions: ["What is the data model for schedule templates?", "How should scheduling rules vary by service type, provider, venue, and team size?"] },
                { area: "Outcomes", questions: ["What counts as sufficient evidence that an event completed successfully?", "How should inferred outcomes be distinguished from confirmed outcomes in the model?", "How should the system handle events where outcome is unknown?"] },
                { area: "CDI / scoring", questions: ["What is the minimum data density before scoring becomes reliable?", "How should new or low-activity providers be handled?", "How should the system prevent gaming of behavioral signals?", "How should provider quality be separated from client behavior or external factors?"] },
                { area: "Network / routing", questions: ["How should referral edge trust degrade over time if not reinforced?", "How should the system handle one-way versus mutual trust relationships?", "How should the system handle cold-start routing when provider-specific data is sparse?"] },
                { area: "Channel / sync", questions: ["How should real-time state sync work across Gmail, SMS, and dashboard?", "What latency is acceptable between action approval and execution?"] },
              ].map((section, i) => (
                <Card key={i} className="space-y-2">
                  <p className="text-sm font-medium text-[#1a1a1a]">{section.area}</p>
                  <BulletList items={section.questions} />
                </Card>
              ))}
            </div>
          </div>

          {/* ===== INTERFACE MOCKUPS ===== */}
          <div className="space-y-6 pt-4">
            <ThickDivider />
            <SectionLabel>Appendix — Interface Mockups</SectionLabel>
            <H2>Where the product lives.</H2>
          </div>

          {/* Gmail Mockup */}
          <div className="space-y-5">
            <H3>Gmail: the Briarwood button.</H3>
            <div className="bg-white border border-[#d4d4d4] rounded-lg overflow-hidden shadow-sm">
              <div className="bg-[#f6f8fc] border-b border-[#e0e0e0] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-[#ddd] rounded-full px-4 py-1.5 text-xs text-[#888] w-64">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Search mail
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#e0e0e0]"></div>
              </div>
              <div className="flex min-h-[280px]">
                <div className="w-16 md:w-44 border-r border-[#e0e0e0] p-3 flex-shrink-0">
                  <div className="bg-[#c2e7ff] rounded-2xl px-3 py-2 text-xs font-medium text-[#001d35] mb-1 hidden md:block">Compose</div>
                  <div className="space-y-0.5 mt-2 hidden md:block">
                    <div className="text-xs py-1.5 px-3 bg-[#d3e3fd] rounded-r-full font-medium text-[#001d35]">Inbox</div>
                    <div className="text-xs py-1.5 px-3 text-[#444]">Starred</div>
                    <div className="text-xs py-1.5 px-3 text-[#444]">Sent</div>
                  </div>
                </div>
                <div className="flex-1 relative">
                  {[
                    { initials: "SB", color: "#e8d5c4", textColor: "#5a3e2b", name: "Solmaz Burke", subject: "Proposals for Stanly Ranch & Montage", preview: "Hi Violet, Could you please send over proposals...", time: "10:14 AM", bold: true },
                    { initials: "EM", color: "#d4e4d4", textColor: "#2e4a2e", name: "Erin McNulty", subject: "Re: Contract for October 18", preview: "Looking forward to it! I'll get the deposit sent...", time: "9:41 AM", bold: false },
                    { initials: "JR", color: "#e0d4e8", textColor: "#4a2e5a", name: "Jessica Reyes", subject: "Inquiry: June 12 Event", preview: "Hi! I found you through Kim and would love to chat...", time: "Yesterday", bold: false },
                  ].map((email, i) => (
                    <div key={i} className="border-b border-[#e8e8e8] px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ backgroundColor: email.color, color: email.textColor }}>{email.initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${email.bold ? "font-semibold" : ""} text-[#1a1a1a] truncate`}>{email.name}</p>
                          <p className="text-[10px] text-[#888]">{email.time}</p>
                        </div>
                        <p className={`text-xs text-[#333] truncate ${email.bold ? "font-medium" : ""}`}>{email.subject}</p>
                        <p className="text-[11px] text-[#888] truncate">{email.preview}</p>
                      </div>
                    </div>
                  ))}
                  <div className="absolute bottom-4 right-4">
                    <div className="relative cursor-pointer">
                      <div className="absolute -top-2 -right-1 w-5 h-5 bg-[#c44] rounded-full flex items-center justify-center z-10">
                        <span className="text-[10px] text-white font-bold">2</span>
                      </div>
                      <div className="rounded-lg shadow-lg overflow-hidden border border-[#555] flex items-center px-4 py-2.5" style={{ backgroundImage: "url(/pinstripe.jpeg)", backgroundSize: "cover", backgroundPosition: "center" }}>
                        <span className="text-[#e8e2d9] text-sm tracking-[0.08em]" style={{ fontFamily: "'Fraunces', serif", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>Briarwood</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Open */}
          <div className="space-y-5">
            <H3>Panel open. Briarwood already parsed the email.</H3>
            <div className="bg-white border border-[#d4d4d4] rounded-lg overflow-hidden shadow-sm">
              <div className="flex min-h-[340px]">
                <div className="flex-1 border-r border-[#e0e0e0] p-4 bg-[#fafafa]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8d5c4] flex items-center justify-center text-xs font-medium text-[#5a3e2b]">SB</div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1a]">Solmaz Burke</p>
                      <p className="text-[10px] text-[#888]">to me, 10:14 AM</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#555] leading-relaxed">Hi Violet, Could you please send over proposals...</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#555]">
                    <li>April 24 -- Stanly Ranch</li>
                    <li>April 25 -- Stanly Ranch</li>
                    <li>Oct 4 -- Bride + 3 (Vanessa), Montage</li>
                    <li>Oct 4 -- 3 guests, Montage</li>
                  </ul>
                </div>
                <div className="w-[260px] flex-shrink-0 flex flex-col" style={{ backgroundImage: "url(/pinstripe.jpeg)", backgroundSize: "cover", backgroundPosition: "center" }}>
                  <div className="px-4 py-3 border-b border-[#555]">
                    <p className="text-[#e8e2d9] text-sm tracking-[0.06em]" style={{ fontFamily: "'Fraunces', serif", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>Briarwood</p>
                  </div>
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    <div className="bg-[#f5f3ef]/95 rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-[#333] leading-relaxed">I see Solmaz's email. 4 proposals needed:</p>
                      <ul className="mt-1.5 space-y-1 text-[11px] text-[#555]">
                        <li>Apr 24 -- Rehearsal, Stanly Ranch</li>
                        <li>Apr 25 -- Wedding, Stanly Ranch</li>
                        <li>Oct 4 -- Bride + 3 (Vanessa), Montage</li>
                        <li>Oct 4 -- 3 guests, Montage</li>
                      </ul>
                      <p className="mt-2 text-xs text-[#333]">Standard pricing?</p>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="bg-white/90 rounded-md px-2.5 py-1.5 text-[11px] text-[#1a1a1a] font-medium shadow-sm">Send all 4</div>
                      <div className="bg-white/70 rounded-md px-2.5 py-1.5 text-[11px] text-[#555] shadow-sm">Adjust</div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-[#555]">
                    <div className="bg-white/90 rounded-md px-3 py-2 text-[11px] text-[#aaa] flex items-center justify-between">
                      Tell Briarwood what to do...
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SMS Mockup */}
          <div className="space-y-5">
            <H3>On mobile: text message.</H3>
            <div className="max-w-[280px] mx-auto">
              <div className="bg-[#000] rounded-[2rem] p-3 shadow-xl">
                <div className="bg-[#f2f2f7] rounded-[1.5rem] overflow-hidden">
                  <div className="px-6 pt-3 pb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#1a1a1a]">9:41</p>
                    <div className="w-4 h-2.5 border border-[#1a1a1a] rounded-sm relative">
                      <div className="absolute inset-0.5 bg-[#1a1a1a] rounded-[1px]" style={{ width: "70%" }}></div>
                    </div>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-center border-b border-[#d1d1d6]">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full mx-auto mb-1 border border-[#555] overflow-hidden" style={{ backgroundImage: "url(/pinstripe.jpeg)", backgroundSize: "cover" }}></div>
                      <p className="text-xs font-semibold text-[#1a1a1a]">Briarwood</p>
                    </div>
                  </div>
                  <div className="px-3 py-4 space-y-2 min-h-[240px] bg-white">
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3 py-2 max-w-[200px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">New inquiry from Jessica for June 12. You're available. Send info sheet?</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#007aff] rounded-2xl rounded-br-md px-3 py-2 max-w-[200px]">
                        <p className="text-[13px] text-white">Yes send it</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3 py-2 max-w-[200px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">Done. Info sheet sent. June 12 blocked as tentative.</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 border-t border-[#d1d1d6] bg-[#f2f2f7] flex items-center gap-2">
                    <div className="flex-1 bg-white border border-[#d1d1d6] rounded-full px-3 py-1.5 text-xs text-[#aaa]">iMessage</div>
                    <div className="w-6 h-6 rounded-full bg-[#007aff] flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#888] leading-relaxed text-center">Same state engine. Same approval logic. Channel adapts.</p>
          </div>

          {/* ===== ENGINEERING NOTE: CDI as Learned Model ===== */}
          <div className="space-y-6 pt-4">
            <ThickDivider />
            <SectionLabel>Engineering Note -- March 15, 2026</SectionLabel>
            <H2>CDI should be designed to become a learned model, not stay as hand-weighted scores.</H2>
            <Body>
              Reference: Cheng Lou's work on replacing if-else heuristics with tiny neural nets trained on example traces, verified offline by traditional solvers.
            </Body>
            <Card className="space-y-4">
              <div>
                <CardLabel>The current spec (Section 15)</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">CDI is defined as 6 structured signal families with explicit dimensions. Responsiveness = time_to_first_response * weight + consistency * weight. This is the correct starting architecture. But it should not stay as hand-weighted scores forever.</p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>Where it should go</CardLabel>
                <p className="text-sm text-[#333] leading-relaxed">The behavioral judgment events (Section 12) and outcome records (Section 13) are training data for a learned trust model. When Violet chooses Kim over Sarah for a 5 AM recovery, that is a labeled example of trust-under-pressure. When a referral leads to a completed event, that is a positive outcome trace.</p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <CardLabel>The Cheng Lou insight</CardLabel>
                <BulletList items={[
                  "Traces from the learned model can be verified offline against actual outcomes (did the event succeed? did the referral complete?). This is Section 13's outcome capture doing double duty as a verification layer.",
                  "The patterns the model finds may reveal trust signals you would never think to hard-code. Example: providers who reschedule within 20 minutes of a conflict may have 3x better recovery outcomes than those who wait an hour. That is not in any hand-coded heuristic.",
                  "You do not need strict correctness for routing. You need a good enough solution. An optimization problem is at least as hard as a SAT problem. CDI is routing optimization, not theorem proving.",
                  "Fallback strategy: do a fast pass with the learned model, then fall back to the structured signal families if data is sparse. Quicksort + heapsort pattern.",
                ]} />
              </div>
            </Card>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5 space-y-3">
              <p className="text-sm leading-relaxed font-medium">Architecture implication for Phase 1.5:</p>
              <p className="text-sm leading-relaxed">The judgment events, outcome records, and behavioral signals in Sections 12-15 should be stored in a format that is directly usable as training data. Not just logged for dashboards. The schema should support: triggering context vector, selected action label, outcome label, confidence, timestamp, provider cluster tag. This is the dataset that eventually replaces the hand-coded weights.</p>
            </div>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
              <p className="text-sm text-[#333]"><span className="font-medium">Source:</span> Cheng Lou (@_chenglou), March 13 2026. "I believe in a future where we gradually replace much of our traditional app code with tiny neural nets that search through our ideas space, guided by our examples, and trained simply as a part of our compilation pipeline."</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#e8e2d9] pt-8 mt-8">
            <p className="text-xs text-[#888]">Briarwood AI — Internal Product & System Behavior Spec (Draft)</p>
            <p className="text-xs text-[#888] mt-1">&copy; 2026 Briarwood AI</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
