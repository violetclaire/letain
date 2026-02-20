import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Plus, X, Users, User, Check } from "lucide-react";

type UserType = "solo" | "executive" | null;

interface Referral {
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.3, ease: "easeOut" as const }
};

export default function ToileOnboarding() {
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<UserType>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [newReferral, setNewReferral] = useState<Referral>({
    name: "",
    phone: "",
    email: "",
    relationship: "",
  });
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [completed, setCompleted] = useState(false);

  const addReferral = () => {
    if (newReferral.name.trim() && (newReferral.phone.trim() || newReferral.email.trim())) {
      setReferrals([...referrals, { ...newReferral }]);
      setNewReferral({ name: "", phone: "", email: "", relationship: "" });
      setShowAddReferral(false);
    }
  };

  const removeReferral = (index: number) => {
    setReferrals(referrals.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    if (step === 0) return userType !== null;
    if (step === 1) return formData.name.trim() && formData.email.trim() && formData.phone.trim();
    return true;
  };

  const totalSteps = 3;

  return (
    <div className="bg-[#0A0A0A] text-[#E8E4DF] min-h-screen flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {!completed && (
        <div className="px-8 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.5em] uppercase text-[#E8E4DF]/60">Toile</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-[2px] w-8 transition-colors duration-500 ${
                  i <= step ? "bg-[#E8E4DF]/60" : "bg-[#E8E4DF]/10"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-xl w-full">
          <AnimatePresence mode="wait">
            {completed ? (
              <motion.div key="complete" {...fadeIn} className="text-center">
                <div className="w-16 h-16 rounded-full border border-[#E8E4DF]/20 flex items-center justify-center mx-auto mb-8">
                  <Check size={24} className="text-[#E8E4DF]/85" />
                </div>
                <p className="text-[10px] tracking-[0.5em] uppercase text-[#E8E4DF]/60 mb-6">you're in</p>
                <h1 className="text-3xl md:text-4xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                  {formData.businessName || formData.name}
                </h1>
                <p className="text-sm text-[#E8E4DF]/80 leading-relaxed max-w-md mx-auto mb-4">
                  {userType === "solo"
                    ? "Your invisible secretary is being configured. Inquiries, contracts, and payments will flow through your existing email and texts. No app to learn. No login to remember."
                    : "Your coordination layer is being configured. Task delegation, team routing, and payment processing will embed directly into your existing email and text workflows."}
                </p>
                <p className="text-sm text-[#E8E4DF]/80 leading-relaxed max-w-md mx-auto mb-10">
                  {referrals.length > 0
                    ? `${referrals.length} referral${referrals.length > 1 ? "s" : ""} added to your trusted network. When you're at capacity, one click routes the opportunity.`
                    : "You can add trusted referrals anytime from your dashboard."}
                </p>

                <div className="border border-[#E8E4DF]/20 p-6 mb-6 text-left">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 mb-4">your plan</p>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>$20/month</span>
                    <span className="text-[11px] text-[#E8E4DF]/70">+ 1.5% on payments</span>
                  </div>
                  <div className="border-t border-[#E8E4DF]/20 pt-3 mt-3">
                    <p className="text-xs text-[#E8E4DF]/70">
                      Process $1,000+ in any month and the $20 fee is waived. We only earn when you do.
                    </p>
                  </div>
                </div>

                <div className="border border-[#E8E4DF]/20 p-6 text-left">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 mb-4">what happens next</p>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <span className="text-[10px] text-[#E8E4DF]/50 mt-1">01</span>
                      <p className="text-sm text-[#E8E4DF]/85">We configure your invisible layer. Takes under 2 minutes.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-[10px] text-[#E8E4DF]/50 mt-1">02</span>
                      <p className="text-sm text-[#E8E4DF]/85">
                        {userType === "solo"
                          ? "Inquiries start flowing through your email. Accept, refer, or decline with one tap."
                          : "Tasks route to your team automatically. You delegate via email or text. We handle the rest."}
                      </p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-[10px] text-[#E8E4DF]/50 mt-1">03</span>
                      <p className="text-sm text-[#E8E4DF]/85">Your CDI score begins building silently. The better you execute, the more visible you become to AI agents.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : step === 0 ? (
              <motion.div key="step0" {...fadeIn}>
                <p className="text-[10px] tracking-[0.5em] uppercase text-[#E8E4DF]/60 mb-6">how do you work?</p>
                <h1 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
                  Tell us about your business.
                </h1>
                <p className="text-sm text-[#E8E4DF]/70 mb-12 max-w-md">
                  This determines how Toile fits into your workflow. No app to download. No software to learn. It lives where you already work.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setUserType("solo")}
                    className={`w-full text-left p-6 border transition-all duration-300 group ${
                      userType === "solo"
                        ? "border-[#E8E4DF]/40 bg-[#E8E4DF]/5"
                        : "border-[#E8E4DF]/20 hover:border-[#E8E4DF]/20"
                    }`}
                    data-testid="button-select-solo"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        userType === "solo" ? "border-[#E8E4DF]/40" : "border-[#E8E4DF]/20"
                      }`}>
                        <User size={18} className={userType === "solo" ? "text-[#E8E4DF]/85" : "text-[#E8E4DF]/50"} />
                      </div>
                      <div>
                        <p className="text-base mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                          I do the work myself
                        </p>
                        <p className="text-xs text-[#E8E4DF]/70 leading-relaxed">
                          Solopreneur or independent professional. You handle client inquiries, show up, and deliver the service personally. Architect, makeup artist, personal chef, landscape architect, stylist, interior designer.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setUserType("executive")}
                    className={`w-full text-left p-6 border transition-all duration-300 group ${
                      userType === "executive"
                        ? "border-[#E8E4DF]/40 bg-[#E8E4DF]/5"
                        : "border-[#E8E4DF]/20 hover:border-[#E8E4DF]/20"
                    }`}
                    data-testid="button-select-executive"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        userType === "executive" ? "border-[#E8E4DF]/40" : "border-[#E8E4DF]/20"
                      }`}>
                        <Users size={18} className={userType === "executive" ? "text-[#E8E4DF]/85" : "text-[#E8E4DF]/50"} />
                      </div>
                      <div>
                        <p className="text-base mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                          I delegate to a team
                        </p>
                        <p className="text-xs text-[#E8E4DF]/70 leading-relaxed">
                          You run the business and coordinate. Tasks get assigned to your team via email or text. Creative director, event producer, estate manager, design firm principal, agency owner, studio owner.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="step1" {...fadeIn}>
                <p className="text-[10px] tracking-[0.5em] uppercase text-[#E8E4DF]/60 mb-6">your details</p>
                <h1 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
                  {userType === "solo" ? "About you." : "About your business."}
                </h1>
                <p className="text-sm text-[#E8E4DF]/70 mb-12 max-w-md">
                  {userType === "solo"
                    ? "We'll configure your invisible secretary around these details. Clients never see our name."
                    : "We'll build your coordination layer around these details. Your team sees your brand, never ours."}
                </p>

                <div className="space-y-10">
                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-4">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                      placeholder="Full name"
                      data-testid="input-name"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-4">
                      {userType === "executive" ? "Business Name" : "Business or Display Name"}
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                      placeholder={userType === "executive" ? "Your company name" : "What clients call you"}
                      data-testid="input-business-name"
                    />
                    <p className="text-[10px] text-[#E8E4DF]/50 mt-3">Optional. This is what clients see.</p>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-4">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                      placeholder="(555) 555-5555"
                      data-testid="input-phone"
                    />
                    <p className="text-[10px] text-[#E8E4DF]/50 mt-3">
                      {userType === "solo"
                        ? "Where clients already text you. Toile lives here."
                        : "Where you delegate tasks. Toile intercepts and routes."}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-4">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                      placeholder="you@yourbusiness.com"
                      data-testid="input-email"
                    />
                    <p className="text-[10px] text-[#E8E4DF]/50 mt-3">
                      {userType === "solo"
                        ? "Inquiries flow here. Accept, refer, or decline with one tap."
                        : "Your inbox becomes your command center. Assign tasks without opening another app."}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : step === 2 ? (
              <motion.div key="step2" {...fadeIn}>
                <p className="text-[10px] tracking-[0.5em] uppercase text-[#E8E4DF]/60 mb-6">your network</p>
                <h1 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
                  {userType === "solo" ? "Who do you refer work to?" : "Who is on your team?"}
                </h1>
                <p className="text-sm text-[#E8E4DF]/70 mb-10 max-w-md">
                  {userType === "solo"
                    ? "When you're booked, one click routes the opportunity to someone you trust. No more lost referrals."
                    : "Add the people you delegate tasks to. They'll receive assignments through their existing email or text. No app required."}
                </p>

                {referrals.length > 0 && (
                  <div className="space-y-3 mb-8">
                    {referrals.map((ref, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-[#E8E4DF]/20">
                        <div>
                          <p className="text-sm">{ref.name}</p>
                          <p className="text-[11px] text-[#E8E4DF]/60">
                            {ref.relationship && <span>{ref.relationship} · </span>}
                            {ref.phone || ref.email}
                          </p>
                        </div>
                        <button
                          onClick={() => removeReferral(i)}
                          className="text-[#E8E4DF]/50 hover:text-[#E8E4DF]/50 transition-colors"
                          data-testid={`button-remove-referral-${i}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {showAddReferral && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-[#E8E4DF]/20 p-6 mb-6 overflow-hidden"
                    >
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-3">Name</label>
                          <input
                            type="text"
                            value={newReferral.name}
                            onChange={(e) => setNewReferral({ ...newReferral, name: e.target.value })}
                            className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-3 text-sm"
                            placeholder="Their name"
                            data-testid="input-referral-name"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-3">
                            {userType === "solo" ? "Relationship" : "Role"}
                          </label>
                          <input
                            type="text"
                            value={newReferral.relationship}
                            onChange={(e) => setNewReferral({ ...newReferral, relationship: e.target.value })}
                            className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-3 text-sm"
                            placeholder={userType === "solo" ? "e.g. Photographer, Plumber, Stylist" : "e.g. Lead stylist, Project manager"}
                            data-testid="input-referral-relationship"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-3">Phone</label>
                            <input
                              type="tel"
                              value={newReferral.phone}
                              onChange={(e) => setNewReferral({ ...newReferral, phone: e.target.value })}
                              className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-3 text-sm"
                              placeholder="(555) 555-5555"
                              data-testid="input-referral-phone"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] tracking-[0.3em] uppercase text-[#E8E4DF]/60 block mb-3">Email</label>
                            <input
                              type="email"
                              value={newReferral.email}
                              onChange={(e) => setNewReferral({ ...newReferral, email: e.target.value })}
                              className="w-full bg-transparent border-0 border-b border-[#E8E4DF]/25 text-white placeholder:text-[#E8E4DF]/40 focus:border-[#E8E4DF]/40 focus:outline-none focus:ring-0 px-0 py-3 text-sm"
                              placeholder="them@email.com"
                              data-testid="input-referral-email"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={addReferral}
                            disabled={!newReferral.name.trim() || (!newReferral.phone.trim() && !newReferral.email.trim())}
                            className="flex-1 border border-[#E8E4DF]/30 py-3 text-xs tracking-[0.15em] uppercase hover:bg-[#E8E4DF] hover:text-[#0A0A0A] transition-all duration-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#E8E4DF]"
                            data-testid="button-confirm-referral"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setShowAddReferral(false); setNewReferral({ name: "", phone: "", email: "", relationship: "" }); }}
                            className="px-6 py-3 text-xs text-[#E8E4DF]/60 hover:text-[#E8E4DF]/60 transition-colors"
                            data-testid="button-cancel-referral"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showAddReferral && (
                  <button
                    onClick={() => setShowAddReferral(true)}
                    className="w-full border border-dashed border-[#E8E4DF]/25 py-5 text-xs tracking-[0.15em] uppercase text-[#E8E4DF]/60 hover:border-[#E8E4DF]/30 hover:text-[#E8E4DF]/50 transition-all duration-300 flex items-center justify-center gap-2"
                    data-testid="button-add-referral"
                  >
                    <Plus size={14} />
                    {userType === "solo" ? "Add a trusted referral" : "Add a team member"}
                  </button>
                )}

                <p className="text-[10px] text-[#E8E4DF]/50 mt-6 text-center">
                  {userType === "solo"
                    ? "Every referral strengthens your network. When they sign up, your CDI score grows."
                    : "Team members don't need to download anything. They just respond to emails and texts like they already do."}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {!completed && (
        <div className="px-8 pb-8">
          <div className="max-w-xl mx-auto flex gap-4">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-4 text-xs tracking-[0.15em] uppercase text-[#E8E4DF]/60 hover:text-[#E8E4DF]/60 transition-colors flex items-center gap-2"
                data-testid="button-back"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < totalSteps - 1) {
                  setStep(step + 1);
                } else {
                  setCompleted(true);
                }
              }}
              disabled={!canProceed()}
              className="flex-1 border border-[#E8E4DF]/30 py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#E8E4DF] hover:text-[#0A0A0A] transition-all duration-500 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#E8E4DF] flex items-center justify-center gap-3"
              data-testid="button-continue"
            >
              {step === totalSteps - 1 ? "Activate Toile" : "Continue"}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
