import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, DollarSign, TrendingUp, Mail, Calendar, FileText, 
  Share2, MessageSquare, CreditCard, ArrowRight, Info, 
  CheckCircle, Clock, Send, Sparkles, Link2, Eye
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
      className="relative inline-block"
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
            className={`absolute ${positionClasses[position]} z-50 w-64 p-3 bg-[hsl(0,0%,10%)] text-[hsl(36,24%,95%)] text-xs rounded-lg shadow-lg pointer-events-none`}
          >
            <div className="flex gap-2">
              <Info size={14} className="text-[hsl(42,33%,57%)] shrink-0 mt-0.5" />
              <span>{tip}</span>
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
    venue: "Fairmont Olympic, Seattle",
    budget: "$520,000",
    revenue: 6500
  },
  { 
    id: 2, 
    name: "Jessica Martinez", 
    date: "June 22, 2026", 
    status: "contract_sent",
    venue: "The Foundry, Portland",
    budget: "$380,000",
    revenue: 4200
  },
  { 
    id: 3, 
    name: "Emily Thompson", 
    date: "July 8, 2026", 
    status: "pending",
    venue: "Chateau Ste Michelle",
    budget: "$750,000",
    revenue: null
  },
  { 
    id: 4, 
    name: "Amanda Wilson", 
    date: "Aug 3, 2026", 
    status: "referred",
    venue: "Sodo Park",
    budget: "$420,000",
    referredTo: "Erika Marie Artistry",
    revenue: null
  },
];

const sampleCircle = [
  { name: "Erika Marie Artistry", specialty: "Bridal Hair", referrals: 8, booked: 5 },
  { name: "Lash Studio PDX", specialty: "Lashes", referrals: 4, booked: 2 },
  { name: "Nouveau Beauty", specialty: "Hair + Makeup", referrals: 3, booked: 3 },
];

export default function InvestorDemo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"inbox" | "circle" | "schedule">("inbox");

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-100", text: "text-amber-700", label: "New Lead" },
    contract_sent: { bg: "bg-blue-100", text: "text-blue-700", label: "Contract Sent" },
    deposit_paid: { bg: "bg-green-100", text: "text-green-700", label: "Deposit Paid" },
    referred: { bg: "bg-purple-100", text: "text-purple-700", label: "Referred Out" },
  };

  return (
    <div className="min-h-screen bg-[hsl(36,24%,95%)]">
      <div className="bg-[hsl(36,18%,93%)] border-b border-[hsl(36,10%,84%)]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-[hsl(42,33%,57%)] mb-1">
                Investor Preview for Grace Dai
              </p>
              <h1 className="font-['Fraunces'] text-2xl text-[hsl(0,0%,10%)] tracking-tight">
                Beauvette Secretary
              </h1>
            </div>
            <Explainer tip="Artists get their own white-label URL they can share. Example: dateinquiry.com/inquire/studio-name" position="left">
              <div className="px-3 py-1.5 bg-[hsl(36,14%,90%)] border border-[hsl(36,10%,84%)] rounded text-xs text-[hsl(0,0%,23%)] flex items-center gap-2">
                <Link2 size={12} />
                dateinquiry.com/inquire/maya-glam
              </div>
            </Explainer>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Explainer tip="Total inquiries received through the artist's white-label form. Zero cold outreach needed.">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] p-4 rounded cursor-help"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(42,33%,57%)]/10 rounded">
                  <Mail size={18} className="text-[hsl(42,33%,57%)]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[hsl(0,0%,10%)]">56</p>
                  <p className="text-xs text-[hsl(0,0%,35%)]">Inquiries</p>
                </div>
              </div>
            </motion.div>
          </Explainer>

          <Explainer tip="Clients who signed contracts and paid deposits. 41% conversion from inquiry to booking.">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] p-4 rounded cursor-help"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded">
                  <CheckCircle size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[hsl(0,0%,10%)]">23</p>
                  <p className="text-xs text-[hsl(0,0%,35%)]">Booked</p>
                </div>
              </div>
            </motion.div>
          </Explainer>

          <Explainer tip="Revenue processed through Square with 1% platform fee. Artist retains 99%.">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] p-4 rounded cursor-help"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(0,50%,24%)]/10 rounded">
                  <DollarSign size={18} className="text-[hsl(0,50%,24%)]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[hsl(0,0%,10%)]">$142K</p>
                  <p className="text-xs text-[hsl(0,0%,35%)]">Revenue</p>
                </div>
              </div>
            </motion.div>
          </Explainer>

          <Explainer tip="Artist-to-artist referrals within the Trusted Circle. Network effect flywheel.">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] p-4 rounded cursor-help"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded">
                  <Share2 size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[hsl(0,0%,10%)]">15</p>
                  <p className="text-xs text-[hsl(0,0%,35%)]">Referrals Sent</p>
                </div>
              </div>
            </motion.div>
          </Explainer>
        </div>

        <div className="flex gap-4 mb-6 border-b border-[hsl(36,10%,84%)]">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "inbox" 
                ? "border-[hsl(0,0%,10%)] text-[hsl(0,0%,10%)]" 
                : "border-transparent text-[hsl(0,0%,35%)] hover:text-[hsl(0,0%,23%)]"
            }`}
            data-testid="tab-inbox"
          >
            Inquiry Inbox
          </button>
          <button
            onClick={() => setActiveTab("circle")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "circle" 
                ? "border-[hsl(0,0%,10%)] text-[hsl(0,0%,10%)]" 
                : "border-transparent text-[hsl(0,0%,35%)] hover:text-[hsl(0,0%,23%)]"
            }`}
            data-testid="tab-circle"
          >
            Trusted Circle
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "schedule" 
                ? "border-[hsl(0,0%,10%)] text-[hsl(0,0%,10%)]" 
                : "border-transparent text-[hsl(0,0%,35%)] hover:text-[hsl(0,0%,23%)]"
            }`}
            data-testid="tab-schedule"
          >
            Day-of Schedule
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "inbox" && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {sampleInquiries.map((inquiry, idx) => (
                <Explainer 
                  key={inquiry.id}
                  tip={
                    inquiry.status === "pending" 
                      ? "New inquiry auto-triggers info sheet email. Artist can respond via thread." 
                      : inquiry.status === "contract_sent"
                      ? "Contract sent via e-signature. Client can sign without creating an account."
                      : inquiry.status === "deposit_paid"
                      ? "Deposit collected via Square. 1% platform fee applied."
                      : "Client referred to Trusted Circle member. Builds goodwill and network."
                  }
                  position="bottom"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] p-4 rounded hover:border-[hsl(0,0%,10%)]/20 transition-colors cursor-help"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-[hsl(0,0%,10%)]">{inquiry.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${statusColors[inquiry.status].bg} ${statusColors[inquiry.status].text}`}>
                            {statusColors[inquiry.status].label}
                          </span>
                        </div>
                        <p className="text-sm text-[hsl(0,0%,35%)]">{inquiry.venue}</p>
                        <p className="text-xs text-[hsl(0,0%,35%)] mt-1 flex items-center gap-1">
                          <Calendar size={12} />
                          {inquiry.date}
                        </p>
                        {inquiry.referredTo && (
                          <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                            <Send size={12} />
                            Referred to {inquiry.referredTo}
                          </p>
                        )}
                      </div>
                      {inquiry.revenue && (
                        <span className="text-lg font-semibold text-green-600">${inquiry.revenue.toLocaleString()}</span>
                      )}
                    </div>
                  </motion.div>
                </Explainer>
              ))}
            </motion.div>
          )}

          {activeTab === "circle" && (
            <motion.div
              key="circle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Explainer tip="Artists build their own referral network. When they're booked, they refer clients to trusted colleagues. This is the triple flywheel: More artists → More referrals → More bookings → More artists." position="bottom">
                <div className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] rounded p-6 mb-6 cursor-help">
                  <h3 className="font-['Fraunces'] text-lg text-[hsl(0,0%,10%)] tracking-tight mb-4 flex items-center gap-2">
                    <Share2 size={18} className="text-purple-600" />
                    The Trusted Circle Flywheel
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-2xl font-semibold text-purple-700">3</p>
                      <p className="text-xs text-purple-600">Circle Members</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-2xl font-semibold text-purple-700">15</p>
                      <p className="text-xs text-purple-600">Referrals Sent</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-2xl font-semibold text-green-700">10</p>
                      <p className="text-xs text-green-600">Converted to Bookings</p>
                    </div>
                  </div>
                </div>
              </Explainer>

              <div className="space-y-3">
                {sampleCircle.map((member, idx) => (
                  <motion.div
                    key={member.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] p-4 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-[hsl(0,0%,10%)]">{member.name}</h3>
                        <p className="text-sm text-[hsl(0,0%,35%)]">{member.specialty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-[hsl(0,0%,35%)]">{member.referrals} referred</span>
                          <span className="mx-2 text-[hsl(36,10%,84%)]">·</span>
                          <span className="text-green-600 font-medium">{member.booked} booked</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Explainer tip="Day-of schedules with shareable links. Clients and planners see real-time updates. Built with AI-powered grid creation." position="bottom">
                <div className="bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] rounded p-6 cursor-help">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-['Fraunces'] text-lg text-[hsl(0,0%,10%)] tracking-tight flex items-center gap-2">
                      <Calendar size={18} className="text-[hsl(42,33%,57%)]" />
                      Chen-Martinez Wedding
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[hsl(0,0%,35%)]">
                      <Eye size={14} />
                      Shareable link active
                    </div>
                  </div>
                  
                  <div className="border border-[hsl(36,10%,84%)] rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[hsl(36,14%,90%)]">
                          <th className="p-2 text-left font-medium text-[hsl(0,0%,23%)] border-r border-[hsl(36,10%,84%)]">Time</th>
                          <th className="p-2 text-left font-medium text-[hsl(0,0%,23%)] border-r border-[hsl(36,10%,84%)]">Maya (Lead)</th>
                          <th className="p-2 text-left font-medium text-[hsl(0,0%,23%)]">Erika (Hair)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-[hsl(36,10%,84%)]">
                          <td className="p-2 text-[hsl(0,0%,35%)] border-r border-[hsl(36,10%,84%)]">8:00 AM</td>
                          <td className="p-2 border-r border-[hsl(36,10%,84%)]">Sarah (Bride)</td>
                          <td className="p-2">Setup</td>
                        </tr>
                        <tr className="border-t border-[hsl(36,10%,84%)]">
                          <td className="p-2 text-[hsl(0,0%,35%)] border-r border-[hsl(36,10%,84%)]">9:00 AM</td>
                          <td className="p-2 border-r border-[hsl(36,10%,84%)]">Sarah (Bride)</td>
                          <td className="p-2">Mom of Bride</td>
                        </tr>
                        <tr className="border-t border-[hsl(36,10%,84%)]">
                          <td className="p-2 text-[hsl(0,0%,35%)] border-r border-[hsl(36,10%,84%)]">10:00 AM</td>
                          <td className="p-2 border-r border-[hsl(36,10%,84%)]">Bridesmaid 1</td>
                          <td className="p-2">Bridesmaid 2</td>
                        </tr>
                        <tr className="border-t border-[hsl(36,10%,84%)]">
                          <td className="p-2 text-[hsl(0,0%,35%)] border-r border-[hsl(36,10%,84%)]">11:00 AM</td>
                          <td className="p-2 border-r border-[hsl(36,10%,84%)]">Touch-ups</td>
                          <td className="p-2">Bridesmaid 3</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-[hsl(0,0%,35%)]">
                    <Sparkles size={14} className="text-[hsl(42,33%,57%)]" />
                    AI-powered: "Create a schedule for 6 people, bride gets 2 hours"
                  </div>
                </div>
              </Explainer>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 p-6 bg-[hsl(36,18%,93%)] border border-[hsl(36,10%,84%)] rounded">
          <h3 className="font-['Fraunces'] text-lg text-[hsl(0,0%,10%)] tracking-tight mb-4">
            Key Value Propositions
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <Explainer tip="All client-facing emails show artist's brand, not Beauvette. Embed code keeps their website branding intact." position="right">
              <div className="flex items-start gap-3 cursor-help">
                <div className="p-2 bg-[hsl(42,33%,57%)]/10 rounded shrink-0">
                  <Eye size={16} className="text-[hsl(42,33%,57%)]" />
                </div>
                <div>
                  <h4 className="font-medium text-[hsl(0,0%,10%)]">White-Label Infrastructure</h4>
                  <p className="text-sm text-[hsl(0,0%,35%)]">Beauvette is invisible to clients. Artists own the relationship.</p>
                </div>
              </div>
            </Explainer>

            <Explainer tip="Clients never create accounts. Magic links in emails give them access to threads, contracts, and payments." position="left">
              <div className="flex items-start gap-3 cursor-help">
                <div className="p-2 bg-green-100 rounded shrink-0">
                  <Link2 size={16} className="text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-[hsl(0,0%,10%)]">Zero-Login Architecture</h4>
                  <p className="text-sm text-[hsl(0,0%,35%)]">Private links for everything. No friction for clients.</p>
                </div>
              </div>
            </Explainer>

            <Explainer tip="Artist A is booked → refers to Artist B → Artist B signs up → invites Artist C. Network grows organically." position="right">
              <div className="flex items-start gap-3 cursor-help">
                <div className="p-2 bg-purple-100 rounded shrink-0">
                  <Share2 size={16} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-[hsl(0,0%,10%)]">Triple Flywheel</h4>
                  <p className="text-sm text-[hsl(0,0%,35%)]">More artists → More referrals → More bookings → More artists</p>
                </div>
              </div>
            </Explainer>

            <Explainer tip="1% platform fee on payments via Square. Artist retains 99%. Sustainable unit economics." position="left">
              <div className="flex items-start gap-3 cursor-help">
                <div className="p-2 bg-[hsl(0,50%,24%)]/10 rounded shrink-0">
                  <CreditCard size={16} className="text-[hsl(0,50%,24%)]" />
                </div>
                <div>
                  <h4 className="font-medium text-[hsl(0,0%,10%)]">1% Platform Fee</h4>
                  <p className="text-sm text-[hsl(0,0%,35%)]">Revenue-aligned monetization. Grows with artist success.</p>
                </div>
              </div>
            </Explainer>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[hsl(36,10%,84%)] flex justify-between items-center">
          <p className="text-xs text-[hsl(0,0%,35%)]">
            Questions? Email maya@beauvette.app
          </p>
          <button
            onClick={() => setLocation("/demo")}
            className="text-sm text-[hsl(0,0%,10%)] underline hover:text-[hsl(0,0%,23%)] transition-colors flex items-center gap-1"
            data-testid="button-explore-demo"
          >
            Explore Full Demo
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
