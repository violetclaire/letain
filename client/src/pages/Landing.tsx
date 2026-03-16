import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";

function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouse);

    const draw = () => {
      time += 0.003;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.03;
      m.y += (m.targetY - m.y) * 0.03;

      ctx.clearRect(0, 0, w, h);

      const shimmerY = ((time * 80) % (h + 200)) - 100;
      const shimmerGrad = ctx.createLinearGradient(0, shimmerY - 60, 0, shimmerY + 60);
      shimmerGrad.addColorStop(0, "rgba(245,243,239,0)");
      shimmerGrad.addColorStop(0.5, "rgba(245,243,239,0.018)");
      shimmerGrad.addColorStop(1, "rgba(245,243,239,0)");
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i++) {
        const scanY = ((time * (40 + i * 15) + i * 300) % (h + 100)) - 50;
        ctx.strokeStyle = `rgba(245,243,239,${0.012 + Math.sin(time + i) * 0.005})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
      }

      const pulseCount = 6;
      for (let i = 0; i < pulseCount; i++) {
        const px = (w / (pulseCount + 1)) * (i + 1) + m.x * 8;
        const py = h * 0.3 + Math.sin(time * 0.7 + i * 1.2) * h * 0.2 + m.y * 8;
        const pulsePhase = (time * 2 + i * 0.8) % (Math.PI * 2);
        const alpha = Math.max(0, Math.sin(pulsePhase)) * 0.02;
        if (alpha > 0.002) {
          ctx.beginPath();
          const dashLen = 2 + Math.sin(time + i) * 1;
          ctx.setLineDash([dashLen, dashLen * 3]);
          ctx.strokeStyle = `rgba(245,243,239,${alpha})`;
          ctx.lineWidth = 0.5;
          const len = 40 + Math.sin(time * 0.5 + i) * 20;
          ctx.moveTo(px - len / 2, py);
          ctx.lineTo(px + len / 2, py);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url(/pinstripe.jpeg)",
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
          transform: `translate(${mouseRef.current?.x || 0}px, ${mouseRef.current?.y || 0}px)`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}

function ParallaxPinstripe() {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 8;
      setOffset({ x, y });
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0 opacity-30 transition-transform duration-700 ease-out"
      style={{
        backgroundImage: "url(/pinstripe.jpeg)",
        backgroundRepeat: "repeat",
        backgroundSize: "400px",
        transform: `translate(${offset.x}px, ${offset.y}px) scale(1.05)`,
      }}
    />
  );
}

function NetworkDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let startTime = Date.now();

    const nodes = Array.from({ length: 18 }, (_, i) => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      scatteredX: Math.random(),
      scatteredY: Math.random(),
      r: 2 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));

    const edges: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.35) {
          edges.push([i, j]);
        }
      }
    }

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.scale(dpr, dpr);
    };
    resize();

    const draw = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / 3);
      const ease = 1 - Math.pow(1 - progress, 3);

      const rect = canvas.parentElement!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      edges.forEach(([a, b]) => {
        const na = nodes[a];
        const nb = nodes[b];
        const ax = (na.scatteredX + (na.x - na.scatteredX) * ease) * w;
        const ay = (na.scatteredY + (na.y - na.scatteredY) * ease) * h;
        const bx = (nb.scatteredX + (nb.x - nb.scatteredX) * ease) * w;
        const by = (nb.scatteredY + (nb.y - nb.scatteredY) * ease) * h;

        const edgeAlpha = Math.max(0, (ease - 0.3) / 0.7) * 0.25;
        if (edgeAlpha > 0) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(61,26,34,${edgeAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      });

      nodes.forEach((n, i) => {
        const x = (n.scatteredX + (n.x - n.scatteredX) * ease) * w;
        const y = (n.scatteredY + (n.y - n.scatteredY) * ease) * h;
        const pulse = 1 + Math.sin(elapsed * 1.5 + n.phase) * 0.15;

        ctx.beginPath();
        ctx.arc(x, y, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(61,26,34,${0.15 + ease * 0.35})`;
        ctx.fill();
      });

      if (ease > 0.6) {
        const labelAlpha = Math.min(1, (ease - 0.6) / 0.4) * 0.7;
        const cx = w * 0.5;
        const cy = h * 0.5;

        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(61,26,34,${labelAlpha * 0.12})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(61,26,34,${labelAlpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "600 10px Inter, sans-serif";
        ctx.fillStyle = `rgba(61,26,34,${labelAlpha})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CDI", cx, cy);
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animId);
  }, [isVisible]);

  return (
    <div ref={containerRef} className="relative w-full h-[360px] md:h-[420px]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const sectionFade = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.5, ease: "easeOut" },
  };

  return (
    <div className="bg-[#FAF8F5] text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#e8e2d9]/50">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 flex items-center justify-between h-14">
          <span className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Briarwood</span>
          <nav className="hidden md:flex items-center gap-5">
            <button
              onClick={() => window.location.href = "https://dateinquiry.com/artist-login"}
              className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors"
              data-testid="button-nav-login"
            >
              Sign in
            </button>
            <button
              onClick={() => setLocation("/secretary")}
              className="bg-[#1a1a1a] text-[#f5f3ef] px-4 py-2 text-sm hover:bg-[#333] transition-colors"
              data-testid="button-nav-cta"
            >
              Request a Demo
            </button>
          </nav>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2"
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#FAF8F5] z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 h-14">
            <span className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Briarwood</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2"><X size={22} /></button>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 gap-8">
            <button onClick={() => { setMobileMenuOpen(false); window.location.href = "https://dateinquiry.com/artist-login"; }} className="text-lg" data-testid="button-mobile-login">Sign in</button>
            <button onClick={() => { setMobileMenuOpen(false); setLocation("/secretary"); }} className="text-lg font-medium" data-testid="button-mobile-get-started">Request a Demo</button>
          </div>
        </div>
      )}

      {/* PAGE 1 -- HERO */}
      <section className="relative min-h-screen flex flex-col justify-center bg-[#3d1a22] text-[#f5f3ef] overflow-hidden">
        <ParallaxPinstripe />
        <HeroBackground />

        <div className="relative z-10 max-w-[1100px] mx-auto px-6 sm:px-10 py-32 md:py-40">
          <motion.p
            className="text-xs tracking-[0.2em] uppercase text-[#f5f3ef]/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            Briarwood
          </motion.p>

          <motion.h1
            className="mt-8 text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.12] tracking-tight max-w-[20ch]"
            style={{ fontFamily: "'Fraunces', serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          >
            Integral OS & Private API for the Physical Economy
          </motion.h1>

          <motion.p
            className="mt-4 text-sm tracking-[0.08em] uppercase text-[#f5f3ef]/45"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            The Trust Verification Layer for Behavioral Integrity
          </motion.p>

          <motion.p
            className="mt-8 text-base sm:text-lg leading-relaxed text-[#f5f3ef]/65 max-w-[52ch]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            The physical economy runs on behavioral trust. Briarwood captures the coordination patterns that determine who can be trusted to execute — and structures them into CDI, a private, verifiable trust signal for real-world execution.
          </motion.p>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            <button
              onClick={() => setLocation("/secretary")}
              className="bg-[#f5f3ef] text-[#1a1a1a] px-6 py-3 text-sm font-medium hover:bg-white transition-colors"
              data-testid="button-hero-demo"
            >
              Request a Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* PAGE 2 -- THE SIGNAL */}
      <section className="py-24 md:py-36">
        <div className="max-w-[700px] mx-auto px-6 sm:px-10">
          <motion.div className="space-y-8" {...sectionFade}>
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Signal</p>
            <h2
              className="text-2xl sm:text-3xl leading-[1.15] tracking-tight max-w-[22ch]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              The highest-value work in the physical world still depends on signals most systems cannot see.
            </h2>
            <div className="space-y-5 text-[#555] leading-relaxed">
              <p>Follow-through. Timing. Discretion. Recovery under pressure. Referral trust.</p>
              <p>These signals already determine who gets trusted, who gets called again, and who can carry outcomes forward under real conditions.</p>
              <p>The problem is that they remain trapped in memory, relationships, private channels, and invisible labor.</p>
            </div>
            <div className="border-l-2 border-[#3d1a22] pl-5 py-1">
              <p className="text-[#1a1a1a] text-base leading-relaxed font-medium" style={{ fontFamily: "'Fraunces', serif" }}>
                Briarwood turns that layer into infrastructure.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION -- INFRASTRUCTURE */}
      <section className="py-24 md:py-36 bg-[#f5f3ef]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            <motion.div className="space-y-6" {...sectionFade}>
              <p className="text-xs tracking-[0.16em] uppercase text-[#888]">Infrastructure</p>
              <h2
                className="text-2xl sm:text-3xl leading-[1.15] tracking-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Infrastructure begins where a system becomes legible.
              </h2>
              <div className="space-y-4 text-[#555] leading-relaxed text-[15px]">
                <p>What was miscategorized as fragmented services was already operating as decentralized enterprise: dense networks of professionals coordinating through trust, standards, referrals, and repeated execution.</p>
                <p>The economic system was already there. What never existed was the infrastructure to observe it, verify its behavioral signals, and let them compound.</p>
                <p className="text-[#1a1a1a] font-medium">Briarwood makes that layer legible.</p>
                <p>By structuring high-stakes coordination into CDI, Briarwood turns behavioral trust into a private, verifiable signal for real-world execution.</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <NetworkDiagram />
            </motion.div>
          </div>
        </div>
      </section>

      {/* PAGE 3 -- HOW IT WORKS */}
      <section className="py-24 md:py-36">
        <div className="max-w-[700px] mx-auto px-6 sm:px-10">
          <motion.div className="space-y-8" {...sectionFade}>
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">How Briarwood Works</p>
            <h2
              className="text-2xl sm:text-3xl leading-[1.15] tracking-tight max-w-[24ch]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Briarwood works inside the flow of real coordination.
            </h2>
            <div className="space-y-5 text-[#555] leading-relaxed">
              <p>It reads the behavioral patterns that emerge across live execution, structures them into CDI, and gives professionals, networks, and intelligent systems a private trust signal for who can actually perform in the physical world.</p>
            </div>
            <div className="border-l-2 border-[#3d1a22] pl-5 py-1">
              <p className="text-[#1a1a1a] text-base leading-relaxed font-medium" style={{ fontFamily: "'Fraunces', serif" }}>
                Briarwood transforms the intuition humans use to recognize trust into a digital signal agents can act on.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PAGE 4 -- AI TRUST GAP */}
      <section className="relative py-24 md:py-36 bg-[#3d1a22] text-[#f5f3ef] overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "url(/pinstripe.jpeg)",
            backgroundRepeat: "repeat",
            backgroundSize: "400px",
          }}
        />
        <div className="relative z-10 max-w-[700px] mx-auto px-6 sm:px-10">
          <motion.div className="space-y-8" {...sectionFade}>
            <p className="text-xs tracking-[0.16em] uppercase text-[#f5f3ef]/35">The Trust Gap</p>
            <h2
              className="text-2xl sm:text-3xl leading-[1.15] tracking-tight max-w-[22ch]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              AI does not know who to trust in the real world.
            </h2>
            <div className="space-y-5 text-[#f5f3ef]/60 leading-relaxed">
              <p>As software, agents, and machines move into physical-world workflows, they need more than intelligence. They need a way to verify who can actually execute.</p>
              <p className="text-[#f5f3ef]/80 font-medium">Briarwood provides that signal.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setLocation("/spec")}
                className="bg-[#f5f3ef] text-[#1a1a1a] px-5 py-3 text-sm font-medium hover:bg-white transition-colors"
                data-testid="button-demo-link"
              >
                View Interactive Demo
              </button>
              <button
                onClick={() => setLocation("/secretary")}
                className="border border-[#f5f3ef]/30 text-[#f5f3ef] px-5 py-3 text-sm hover:border-[#f5f3ef]/60 transition-colors"
                data-testid="button-contact-link"
              >
                Contact
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-[#e8e2d9]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#888]">&copy; 2026 Briarwood AI</span>
          <div className="flex gap-5">
            <button onClick={() => setLocation("/privacy")} className="text-xs text-[#888] hover:text-[#1a1a1a] underline transition-colors">Privacy</button>
            <button onClick={() => setLocation("/about")} className="text-xs text-[#888] hover:text-[#1a1a1a] underline transition-colors">About</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
