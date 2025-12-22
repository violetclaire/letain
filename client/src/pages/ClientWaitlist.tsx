import { motion } from "framer-motion";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const }
};

export default function ClientWaitlist() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="estate-pinstripe" />
      
      <main className="estate-prose py-24 md:py-32">
        <motion.div {...fadeIn}>
          <p className="text-sm tracking-[0.12em] uppercase text-mutedink mb-4">
            For Clients
          </p>
          
          <h1 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-8">
            Your artist is setting things up.
          </h1>
          
          <p className="text-lg leading-relaxed text-mutedink mb-8">
            Thank you for your patience. The artist you're looking for is creating their private link. 
            Once ready, they'll share it directly with you.
          </p>
          
          <div className="border-t border-hairline pt-8 mt-12">
            <h2 className="font-serif text-2xl tracking-tight mb-4">
              What to expect
            </h2>
            <ul className="space-y-4 text-mutedink">
              <li className="flex items-start gap-3">
                <span className="text-brass">1.</span>
                <span>Your artist will send you a link via email, Instagram, or their website</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brass">2.</span>
                <span>Click the link to submit your inquiry directly to them</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brass">3.</span>
                <span>No accounts to create. Everything happens through private links.</span>
              </li>
            </ul>
          </div>
          
          <div className="border-t border-hairline pt-8 mt-12">
            <h2 className="font-serif text-2xl tracking-tight mb-4">
              Already have a link?
            </h2>
            <p className="text-mutedink mb-4">
              If your artist shared an inquiry link with you, paste it in your browser to get started.
            </p>
          </div>
          
          <div className="bg-surface border border-hairline p-8 mt-12">
            <p className="text-sm text-mutedink italic">
              Built by an artist, for artists and their clients. 
              We handle the admin work so artists can focus on what they do best.
            </p>
          </div>
        </motion.div>
      </main>
      
      <footer className="estate-prose py-12 text-sm text-mutedink border-t border-hairline">
        <p>Questions? Your artist will be in touch soon.</p>
      </footer>
    </div>
  );
}
