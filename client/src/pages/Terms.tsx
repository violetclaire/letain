import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#FCF9F4] py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto"
      >
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-[#5A1F2B]/60 hover:text-[#5A1F2B] mb-8 transition-colors"
          data-testid="button-back-home"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back to Home</span>
        </button>

        <h1 className="font-script text-4xl text-[#5A1F2B] mb-8" data-testid="text-terms-title">
          Terms of Service
        </h1>

        <div className="space-y-6 text-[#5A1F2B]/80 text-sm leading-relaxed">
          <p className="text-xs text-[#5A1F2B]/50">Last updated: December 2024</p>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Welcome to Beauvette</h2>
            <p>
              By using Beauvette, you agree to these terms. We're building a platform to connect clients with vetted beauty artists for life's most important occasions.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Our Platform</h2>
            <p>
              Beauvette is a marketplace that facilitates connections between clients seeking beauty services and independent beauty artists. We do not employ the artists directly—they are independent professionals who set their own rates, policies, and availability.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Bookings & Payments</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Booking terms, cancellation policies, and pricing are set by individual artists</li>
              <li>Payments are processed securely through Stripe</li>
              <li>Deposits and payment schedules vary by artist</li>
              <li>Refund policies are determined by each artist's terms</li>
            </ul>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">User Conduct</h2>
            <p>When using Beauvette, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Provide accurate information</li>
              <li>Communicate respectfully with artists and staff</li>
              <li>Honor your booking commitments</li>
              <li>Not use the platform for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Artist Verification</h2>
            <p>
              We vet artists before they join our platform, but we cannot guarantee the quality of every service. We encourage clients to review portfolios, read reviews, and communicate clearly with artists about expectations.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Limitation of Liability</h2>
            <p>
              Beauvette provides a platform for connection. We are not liable for disputes between clients and artists, the quality of services rendered, or any damages arising from use of our platform.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Questions?</h2>
            <p>
              If you have any questions about these terms, please contact us at{" "}
              <a href="mailto:violet@beauvette.com" className="text-[#5A1F2B] underline">
                violet@beauvette.com
              </a>
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
