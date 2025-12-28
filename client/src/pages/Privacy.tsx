import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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

        <h1 className="font-script text-4xl text-[#5A1F2B] mb-8" data-testid="text-privacy-title">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-[#5A1F2B]/80 text-sm leading-relaxed">
          <p className="text-xs text-[#5A1F2B]/50">Last updated: December 2024</p>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Your Privacy Matters</h2>
            <p>
              We understand that you're entrusting us with personal details about your clients and business. We take that responsibility seriously and are committed to protecting your information.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">What We Collect</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Contact information (email address)</li>
              <li>Event details (date, location, services needed)</li>
              <li>Inspiration images you choose to upload</li>
              <li>Communications between you and artists</li>
            </ul>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">How We Protect Your Data</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All data is encrypted in transit using SSL/TLS</li>
              <li>Information is stored on secure, enterprise-grade servers</li>
              <li>Payment processing is handled by Square, a PCI-compliant provider</li>
              <li>Access to your data is limited to vetted team members and artists you choose to work with</li>
            </ul>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Match you with suitable beauty artists in your area</li>
              <li>Facilitate communication and bookings</li>
              <li>Send you updates about your waitlist status and bookings</li>
              <li>Improve our platform and services</li>
            </ul>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">We Never Sell Your Data</h2>
            <p>
              Your personal information is never sold, rented, or shared with third parties for marketing purposes. Period.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="font-medium text-[#5A1F2B] text-base mb-2">Questions?</h2>
            <p>
              If you have any questions about our privacy practices, please contact us at{" "}
              <a href="mailto:support@dateinquiry.com" className="text-[#5A1F2B] underline">
                support@dateinquiry.com
              </a>
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
