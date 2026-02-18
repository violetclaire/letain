import { motion } from "framer-motion";

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: "#1a1a1a" }}>
      <span>9:41</span>
      <div className="absolute left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-[18px]" />
      <div className="flex items-center gap-1.5">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect x="0" y="5" width="3" height="7" rx="0.5" fill="#1a1a1a"/>
          <rect x="4.5" y="3.5" width="3" height="8.5" rx="0.5" fill="#1a1a1a"/>
          <rect x="9" y="1.5" width="3" height="10.5" rx="0.5" fill="#1a1a1a"/>
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#1a1a1a" opacity="0.3"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 2.5C10.5 2.5 12.7 3.6 14.2 5.3L15.6 3.9C13.7 1.8 11 0.5 8 0.5C5 0.5 2.3 1.8 0.4 3.9L1.8 5.3C3.3 3.6 5.5 2.5 8 2.5Z" fill="#1a1a1a"/>
          <path d="M8 6.5C9.6 6.5 11 7.1 12 8.1L13.4 6.7C12 5.3 10.1 4.5 8 4.5C5.9 4.5 4 5.3 2.6 6.7L4 8.1C5 7.1 6.4 6.5 8 6.5Z" fill="#1a1a1a"/>
          <circle cx="8" cy="11" r="1.5" fill="#1a1a1a"/>
        </svg>
        <div className="flex items-center">
          <div className="w-[22px] h-[11px] border border-[#1a1a1a] rounded-[3px] relative">
            <div className="absolute inset-[1.5px] right-[3px] bg-[#1a1a1a] rounded-[1px]" style={{ width: "60%" }}/>
          </div>
          <div className="w-[1.5px] h-[5px] bg-[#1a1a1a] rounded-r-sm ml-[1px] opacity-40"/>
        </div>
      </div>
    </div>
  );
}

function EmailHeader() {
  return (
    <div className="px-5 pt-3 pb-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-3 mb-3">
        <button className="text-[#007AFF] text-[15px] flex items-center gap-0.5">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M9 1L2 8L9 15" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="ml-0.5">Inbox</span>
        </button>
        <div className="flex-1"/>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-40">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#1a1a1a] mb-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
        Seed Stage Fintech Pitch — Aura Protocol
      </h1>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-semibold" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          JK
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-medium text-[#1a1a1a]">Jake Kellerman</span>
            <span className="text-[12px] text-[#8e8e93]">10:23 AM</span>
          </div>
          <span className="text-[12px] text-[#8e8e93]">to me</span>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-30">
          <path d="M15 8L10 13L5 8" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function EmailBody() {
  return (
    <div className="px-5 py-5 text-[15px] leading-[1.55] text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <p className="mb-4">Hi Grace,</p>
      
      <p className="mb-4">
        Hope you're well — wanted to get this in front of you quickly since I know you're 
        heads-down on thesis work for Q1. Marcus from Compound passed along your name, said 
        you'd be the right person to look at this.
      </p>

      <p className="mb-4">
        We're building <strong>Aura Protocol</strong> — real-time treasury infrastructure for 
        Series A-C startups. Think of it as "Ramp meets Plaid" but for multi-entity cash 
        management. We're live with 14 companies, $38M in AUM, growing 22% MoM.
      </p>

      <p className="mb-4">
        Quick context on us: I was previously eng lead at Stripe Treasury, my co-founder Sarah 
        ran ops at Mercury for 3 years. We've been building in the fintech infra layer for almost 
        a decade between us. The team is 6 people — 4 eng, plus Sarah and me.
      </p>

      <p className="mb-4">
        <strong>What we're raising:</strong> $3.5M seed. We have $1.8M committed from Elad Gil 
        and a few angels. Looking for a lead who can bring fintech distribution. I've attached the 
        deck and a short Loom walkthrough below.
      </p>

      <p className="mb-4">
        A few things that might matter for your thesis:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-1">
        <li>Net revenue retention is 142% (upsell from single to multi-entity)</li>
        <li>CAC payback is ~3 months via CFO community referrals</li>
        <li>We're pre-empting compliance with SOC 2 Type II (done) and pursuing money transmitter licenses in 6 states</li>
        <li>No direct Bessemer portfolio conflicts that I can see — happy to discuss</li>
      </ul>

      <p className="mb-4">
        The deck is attached (14 slides, I promise). Would love 20 minutes to walk through the 
        treasury mechanics — they're unusual and hard to convey in slides. Happy to work around 
        your schedule, including evenings or early mornings.
      </p>

      <p className="mb-4">
        Also cc'ing Sarah in case you'd want to hear the ops/compliance angle directly from her.
      </p>

      <p className="mb-2">Best,</p>
      <p className="font-medium">Jake Kellerman</p>
      <p className="text-[13px] text-[#8e8e93]">Co-founder & CEO, Aura Protocol</p>
      <p className="text-[13px] text-[#8e8e93]">jake@auraprotocol.co</p>

      <div className="mt-5 flex gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f7] rounded-lg">
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <rect x="0.5" y="0.5" width="15" height="17" rx="2" stroke="#8e8e93" strokeWidth="1"/>
            <path d="M4 5h8M4 8h8M4 11h5" stroke="#8e8e93" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span className="text-[13px] text-[#8e8e93]">Aura_Seed_Deck.pdf</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f7] rounded-lg">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.5" stroke="#8e8e93" strokeWidth="1"/>
            <polygon points="6,4.5 12,8 6,11.5" fill="#8e8e93"/>
          </svg>
          <span className="text-[13px] text-[#8e8e93]">Loom: 4min demo</span>
        </div>
      </div>
      <div className="h-32"/>
    </div>
  );
}

function ToileOverlay() {
  return (
    <motion.div 
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-50"
    >
      <div className="mx-3 mb-3">
        <div 
          className="rounded-2xl px-4 pt-3 pb-4 shadow-2xl border"
          style={{ 
            background: "rgba(255,255,255,0.92)", 
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderColor: "rgba(0,0,0,0.06)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.3 }}
            className="flex items-center gap-1.5 mb-3 px-0.5"
          >
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: "#22c55e" }}/>
            <span className="text-[11px] tracking-[0.03em] text-[#8e8e93]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Toile Context: Matches Q1 Thesis & Team Capacity
            </span>
          </motion.div>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors"
              style={{ background: "rgba(0,0,0,0.04)" }}
              data-testid="button-route-team"
            >
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5 0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .83-.67 1.5-1.5 1.5z" fill="white"/>
                  <path d="M20.5 2H3.5C2.67 2 2 2.67 2 3.5v13c0 .83.67 1.5 1.5 1.5H5v3.5L9.5 18h11c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5zM20 16H9l-2 2v-2H4V4h16v12z" fill="white"/>
                  <path d="M9.5 10C8.67 10 8 9.33 8 8.5S8.67 7 9.5 7s1.5.67 1.5 1.5S10.33 10 9.5 10z" fill="white"/>
                  <path d="M7 13.5c0-1 2-1.5 2.5-1.5s2.5.5 2.5 1.5V14H7v-.5zM12 13.5c0-1 2-1.5 2.5-1.5s2.5.5 2.5 1.5V14h-5v-.5z" fill="white"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[#1a1a1a] tracking-[-0.01em]">Route to Team</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors"
              style={{ background: "rgba(0,0,0,0.04)" }}
              data-testid="button-refer-network"
            >
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4.5C10.07 4.5 8.5 6.07 8.5 8C8.5 9.56 9.53 10.88 10.94 11.33C9.13 11.87 7.5 13.22 7.5 15.5H9C9 13.57 10.57 12 12.5 12H11.5C13.43 12 15 13.57 15 15.5H16.5C16.5 13.22 14.87 11.87 13.06 11.33C14.47 10.88 15.5 9.56 15.5 8C15.5 6.07 13.93 4.5 12 4.5ZM12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6Z" fill="white"/>
                  <path d="M4.5 9C3.67 9 3 9.67 3 10.5S3.67 12 4.5 12C5.33 12 6 11.33 6 10.5S5.33 9 4.5 9Z" fill="white"/>
                  <path d="M19.5 9C18.67 9 18 9.67 18 10.5S18.67 12 19.5 12C20.33 12 21 11.33 21 10.5S20.33 9 19.5 9Z" fill="white"/>
                  <path d="M4 14C2.5 14 1.5 15 1.5 16.5H3C3 15.67 3.67 15 4.5 15C5.33 15 6 15.67 6 16.5H7.5C7.5 15 6.5 14 5 14H4Z" fill="white"/>
                  <path d="M19 14C17.5 14 16.5 15 16.5 16.5H18C18 15.67 18.67 15 19.5 15C20.33 15 21 15.67 21 16.5H22.5C22.5 15 21.5 14 20 14H19Z" fill="white"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[#1a1a1a] tracking-[-0.01em]">Refer to Network</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors"
              style={{ background: "rgba(0,0,0,0.04)" }}
              data-testid="button-polite-pass"
            >
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4.17-2.78 8.14-6 9.15-3.22-1.01-6-4.98-6-9.15V6.39l6-2.25 6 2.25v4.7z" fill="white"/>
                  <path d="M10.5 13.5l-1.5-1.5-1 1 2.5 2.5 5-5-1-1-4 4z" fill="white"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[#1a1a1a] tracking-[-0.01em]">Polite Pass</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ToileInbound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#e8e8ed", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div 
        className="relative w-[390px] h-[844px] rounded-[44px] overflow-hidden shadow-2xl border-[6px]"
        style={{ 
          borderColor: "#1a1a1a",
          background: "#fafafa",
          boxShadow: "0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)"
        }}
      >
        <StatusBar />
        <div className="overflow-y-auto" style={{ height: "calc(100% - 38px)" }}>
          <EmailHeader />
          <EmailBody />
        </div>
        <ToileOverlay />
      </div>
    </div>
  );
}