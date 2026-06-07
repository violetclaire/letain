import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const personas = [
  {
    id: "client",
    label: "Client",
    description: "Book beauty services for your special day",
    route: "/demo/client",
  },
  {
    id: "artist",
    label: "Vendor / Artist",
    description: "Manage bookings, contracts, and availability",
    route: "/demo/artist",
  },
  {
    id: "planner",
    label: "Wedding Planner",
    description: "Coordinate vendors and manage events",
    route: "/demo/planner",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Monitor platform health and user activity",
    route: "/demo/admin",
  },
];

export default function DemoLanding() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-powder-blue py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-cream p-8 rounded-sm shadow-lg border border-black/20">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-widest text-black/50 mb-2">Demo Mode</p>
            <h1 className="font-script text-5xl text-black mb-3">
              Briarwood
            </h1>
            <p className="text-sm text-black/60 max-w-md mx-auto">
              Preview the full experience for each user type. 
              No login required - explore freely!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <motion.button
                key={persona.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocation(persona.route)}
                className="text-left p-6 bg-white rounded-lg border border-black/10 hover:border-black/30 transition-all group"
                data-testid={`button-demo-${persona.id}`}
              >
                <h3 className="font-header text-xl text-black mb-2 flex items-center justify-between">
                  {persona.label}
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-black/60">
                  {persona.description}
                </p>
              </motion.button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-black/10 text-center">
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-black/50 hover:text-black transition-colors"
              data-testid="button-exit-demo"
            >
              Exit Demo Mode
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-black/40">
            This is a preview with sample data. 
            <button 
              onClick={() => setLocation("/register")}
              className="underline ml-1 hover:text-black/60"
            >
              Create a real account
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
