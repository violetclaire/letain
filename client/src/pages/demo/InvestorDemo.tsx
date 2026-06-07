import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, DollarSign, Mail, Calendar, FileText, 
  Share2, CreditCard, ArrowRight, Info, 
  CheckCircle, Clock, Send, Sparkles, Link2, Eye, AlertTriangle,
  Zap, Image, MessageCircle, CalendarX, CalendarCheck, TrendingUp
} from "lucide-react";

interface ExplainerProps {
  children: React.ReactNode;
  tip: string;
  position?: "top" | "bottom" | "left" | "right";
}

function Explainer({ children, tip, position = "top" }: ExplainerProps) {
  const [show, setShow] = useState(false);
  
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div 
      className="relative inline-block w-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 4 : position === "bottom" ? -4 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute ${positionClasses[position]} z-50 w-72 p-4 bg-black/95 text-white text-sm rounded-xl shadow-2xl pointer-events-none backdrop-blur-sm border border-white/10`}
          >
            <div className="flex gap-2">
              <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{tip}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const sampleInquiries = [
  { 
    id: 1, 
    name: "Sarah Chen", 
    date: "May 15, 2026", 
    status: "deposit_paid",
    venue: "Fairmont Olympic",
    revenue: 6500,
    hasConflict: false,
    velocity: "Fast",
    velocityColor: "text-green-500"
  },
  { 
    id: 2, 
    name: "Jessica Martinez", 
    date: "June 22, 2026", 
    status: "contract_sent",
    venue: "The Foundry",
    revenue: 4200,
    hasConflict: false,
    velocity: "Active",
    velocityColor: "text-blue-500"
  },
  { 
    id: 3, 
    name: "Emily Thompson", 
    date: "May 15, 2026", 
    status: "pending",
    venue: "Chateau Ste Michelle",
    revenue: null,
    hasConflict: true,
    conflictWith: "Sarah Chen",
    velocity: "New",
    velocityColor: "text-amber-500"
  },
];

export default function InvestorDemo() {
  const [, setLocation] = useLocation();
  const [responseMode, setResponseMode] = useState<"manual" | "calendar_smart" | "vacation">("calendar_smart");

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    contract_sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    deposit_paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-600 font-medium mb-0.5">
                Investor Preview · Bessemer
              </p>
              <h1 className="font-serif text-xl text-stone-900 tracking-tight">
                Briarwood
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">Maya Glam Studio</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-medium">
                M
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Explainer tip="These metrics update in real-time as artists use the platform. Revenue = payments processed through Square with 1.5% platform fee." position="bottom">
          <div className="grid grid-cols-4 gap-3 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 cursor-help"
            >
              <div className="flex items-center gap-2 mb-2">
                <Mail size={16} className="text-stone-400" />
                <span className="text-xs text-stone-500 uppercase tracking-wide">Inquiries</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">56</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 cursor-help"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-xs text-stone-500 uppercase tracking-wide">Booked</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">23</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 cursor-help"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-emerald-500" />
                <span className="text-xs text-stone-500 uppercase tracking-wide">Revenue</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">$142K</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 cursor-help"
            >
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={16} className="text-purple-500" />
                <span className="text-xs text-stone-500 uppercase tracking-wide">Referrals</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">15</p>
            </motion.div>
          </div>
        </Explainer>

        <section className="mb-8">
          <Explainer tip="CALENDAR SMART MODE: When a new inquiry comes in, the system checks the artist's calendar instantly. If the date is available, it auto-sends pricing. If booked, it auto-refers to their Trusted Circle. Zero manual work." position="bottom">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 cursor-help">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  <h2 className="font-serif text-lg text-stone-900">Instant Response Mode</h2>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Active</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setResponseMode("manual")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    responseMode === "manual" 
                      ? "border-stone-900 bg-stone-900 text-white" 
                      : "border-stone-200 bg-stone-50 hover:border-stone-300"
                  }`}
                >
                  <p className={`font-medium text-sm ${responseMode === "manual" ? "text-white" : "text-stone-900"}`}>Manual</p>
                  <p className={`text-xs mt-1 ${responseMode === "manual" ? "text-stone-300" : "text-stone-500"}`}>Review each inquiry</p>
                </button>
                
                <button
                  onClick={() => setResponseMode("calendar_smart")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    responseMode === "calendar_smart" 
                      ? "border-amber-500 bg-amber-500 text-white" 
                      : "border-stone-200 bg-stone-50 hover:border-stone-300"
                  }`}
                >
                  <p className={`font-medium text-sm ${responseMode === "calendar_smart" ? "text-white" : "text-stone-900"}`}>Calendar Smart</p>
                  <p className={`text-xs mt-1 ${responseMode === "calendar_smart" ? "text-amber-100" : "text-stone-500"}`}>Auto-respond based on availability</p>
                </button>
                
                <button
                  onClick={() => setResponseMode("vacation")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    responseMode === "vacation" 
                      ? "border-stone-900 bg-stone-900 text-white" 
                      : "border-stone-200 bg-stone-50 hover:border-stone-300"
                  }`}
                >
                  <p className={`font-medium text-sm ${responseMode === "vacation" ? "text-white" : "text-stone-900"}`}>Vacation</p>
                  <p className={`text-xs mt-1 ${responseMode === "vacation" ? "text-stone-300" : "text-stone-500"}`}>Away message + referrals</p>
                </button>
              </div>
            </div>
          </Explainer>
        </section>

        <section className="mb-8">
          <Explainer tip="CALENDAR CONFLICT DETECTION: The system automatically detects when two clients want the same date and flags it. Artists see this warning before responding, preventing double-bookings." position="bottom">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden cursor-help">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <h2 className="font-serif text-lg text-stone-900">Client Inbox</h2>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <CalendarCheck size={14} className="text-emerald-500" />
                  <span>Calendar synced</span>
                </div>
              </div>
              
              <div className="divide-y divide-stone-100">
                {sampleInquiries.map((inquiry, idx) => (
                  <motion.div
                    key={inquiry.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="p-4 hover:bg-stone-50 transition-colors"
                  >
                    {inquiry.hasConflict && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                        <CalendarX size={14} className="shrink-0" />
                        <span>Date conflict with {inquiry.conflictWith} - already booked May 15</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center text-stone-600 font-medium">
                          {inquiry.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-900">{inquiry.name}</h3>
                          <p className="text-sm text-stone-500">{inquiry.venue} · {inquiry.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${inquiry.velocityColor}`}>{inquiry.velocity}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusStyles[inquiry.status]}`}>
                          {inquiry.status.replace('_', ' ')}
                        </span>
                        {inquiry.revenue && (
                          <span className="text-sm font-medium text-emerald-600">${inquiry.revenue.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Explainer>
        </section>

        <section className="mb-8">
          <Explainer tip="CDI = Choreography Depth Index. A backend coordination metric that quantifies human-system coordination readiness in real-time. Higher CDI = smoother coordination. Lower CDI = friction signals detected. We're showing you the backend view here." position="bottom">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-6 border border-violet-200 cursor-help">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-violet-500" />
                <h2 className="font-serif text-lg text-stone-900">Choreography Depth Index (CDI)</h2>
                <span className="ml-auto text-xs bg-violet-500 text-white px-2 py-1 rounded-full">Backend Metric</span>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-stone-500">Sarah C.</span>
                    <span className="text-xs font-bold text-emerald-600">CDI: 0.92</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-2">High coordination</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-stone-500">Jessica M.</span>
                    <span className="text-xs font-bold text-emerald-600">CDI: 0.78</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "78%" }} />
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-2">Good coordination</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-stone-500">Emily T.</span>
                    <span className="text-xs font-bold text-amber-600">CDI: 0.45</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "45%" }} />
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2">Friction detected</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-violet-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-stone-500">Amanda W.</span>
                    <span className="text-xs font-bold text-violet-600">CDI: 0.31</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: "31%" }} />
                  </div>
                  <p className="text-[10px] text-violet-600 mt-2">Needs attention</p>
                </div>
              </div>
            </div>
          </Explainer>
        </section>

        <section className="grid grid-cols-2 gap-4 mb-8">
          <Explainer tip="AI-powered day-of schedules. Artist says 'Create a schedule for 8 people, bride needs 2 hours' and the grid auto-populates. Clients get shareable links to see real-time updates." position="bottom">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 cursor-help h-full">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-blue-500" />
                <h3 className="font-serif text-lg text-stone-900">Day-of Schedules</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">8:00 AM</span>
                  <span className="text-stone-900">Sarah (Bride)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">9:00 AM</span>
                  <span className="text-stone-900">Mom of Bride</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">10:00 AM</span>
                  <span className="text-stone-900">Bridesmaid 1</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-600">
                <Sparkles size={12} />
                <span>AI-generated from voice command</span>
              </div>
            </div>
          </Explainer>

          <Explainer tip="TRUSTED CIRCLE = Artist referral network. When an artist is booked, they refer clients to trusted colleagues. Builds goodwill. Creates network effects. Triple flywheel." position="bottom">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 cursor-help h-full">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-purple-500" />
                <h3 className="font-serif text-lg text-stone-900">Trusted Circle</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-medium">EM</div>
                    <span className="text-sm text-stone-900">Erika Marie</span>
                  </div>
                  <span className="text-xs text-stone-500">8 referrals · 5 booked</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-medium">LS</div>
                    <span className="text-sm text-stone-900">Lash Studio</span>
                  </div>
                  <span className="text-xs text-stone-500">4 referrals · 2 booked</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-700">More artists → More referrals → More bookings → More artists</p>
              </div>
            </div>
          </Explainer>
        </section>

        <section className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-8 text-white mb-8">
          <h2 className="font-serif text-2xl mb-6">Key Value Props</h2>
          <div className="grid grid-cols-2 gap-6">
            <Explainer tip="All client-facing emails, forms, and communications show ONLY the artist's brand. Briarwood is invisible infrastructure." position="right">
              <div className="flex items-start gap-4 cursor-help">
                <div className="p-2 bg-white/10 rounded-lg shrink-0">
                  <Eye size={20} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">100% White-Label</h4>
                  <p className="text-sm text-stone-400">Clients never see Briarwood. Artists own the relationship.</p>
                </div>
              </div>
            </Explainer>

            <Explainer tip="Clients never create accounts. Magic links in emails give them instant access to threads, contracts, and payments." position="left">
              <div className="flex items-start gap-4 cursor-help">
                <div className="p-2 bg-white/10 rounded-lg shrink-0">
                  <Link2 size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Zero-Login Architecture</h4>
                  <p className="text-sm text-stone-400">Private magic links. No friction for clients.</p>
                </div>
              </div>
            </Explainer>

            <Explainer tip="1.5% platform fee on payments via Square. Artist retains 98.5%. Revenue grows with artist success." position="right">
              <div className="flex items-start gap-4 cursor-help">
                <div className="p-2 bg-white/10 rounded-lg shrink-0">
                  <CreditCard size={20} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">1.5% Platform Fee</h4>
                  <p className="text-sm text-stone-400">Revenue-aligned. We win when artists win.</p>
                </div>
              </div>
            </Explainer>

            <Explainer tip="Calendar Smart mode checks availability and auto-responds in seconds. Vacation mode auto-refers to Trusted Circle. Artists sleep while the system works." position="left">
              <div className="flex items-start gap-4 cursor-help">
                <div className="p-2 bg-white/10 rounded-lg shrink-0">
                  <Zap size={20} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Instant Auto-Response</h4>
                  <p className="text-sm text-stone-400">Calendar-aware. Responds in seconds, not hours.</p>
                </div>
              </div>
            </Explainer>
          </div>
        </section>

        <footer className="flex justify-between items-center pt-6 border-t border-stone-200">
          <p className="text-sm text-stone-500">
            Questions? <span className="underline">Contact support</span>
          </p>
          <button
            onClick={() => setLocation("/demo")}
            className="text-sm text-stone-900 hover:text-stone-600 transition-colors flex items-center gap-1"
            data-testid="button-explore-demo"
          >
            Explore Full Demo
            <ArrowRight size={14} />
          </button>
        </footer>
      </main>
    </div>
  );
}
