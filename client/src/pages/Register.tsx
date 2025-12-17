import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Palette, Calendar, Heart, Crown, Users, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user && user.role) {
      switch (user.role) {
        case 'client':
          setLocation("/client");
          break;
        case 'artist':
          setLocation("/artist");
          break;
        case 'planner':
          setLocation("/planner");
          break;
        case 'admin':
          setLocation("/admin");
          break;
      }
    }
  }, [user, isLoading, setLocation]);

  const handleRoleSelect = async (roleId: string) => {
    if (user) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/users/${user.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role: roleId }),
        });
        
        if (response.ok) {
          switch (roleId) {
            case 'client':
              setLocation("/intake/client");
              break;
            case 'artist':
              setLocation("/intake/artist");
              break;
            case 'planner':
              setLocation("/intake/planner");
              break;
          }
        }
      } catch (error) {
        console.error('Failed to update role:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setLocation(`/signup?role=${roleId}`);
    }
  };

  const roles = [
    {
      id: 'client',
      title: 'Client',
      description: 'Book beauty artists for your event',
      icon: Heart,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      hoverBorder: 'hover:border-rose-400',
    },
    {
      id: 'artist',
      title: 'Artist',
      description: 'Manage bookings & grow your business',
      icon: Palette,
      color: 'text-violet-500',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
      hoverBorder: 'hover:border-violet-400',
    },
    {
      id: 'planner',
      title: 'Planner',
      description: 'Coordinate vendors & schedules',
      icon: Calendar,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Left side - Branding */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Decorative background */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 24px, #6B4A55 24px, #6B4A55 25px),
              repeating-linear-gradient(90deg, transparent, transparent 24px, #6B4A55 24px, #6B4A55 25px)
            `,
          }}
        />
        
        <motion.div 
          className="absolute top-20 left-10 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.2, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl lg:text-7xl text-[#6B4A55] mb-4"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
          >
            Beauvette
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm text-[#6B4A55]/70 tracking-[0.3em] uppercase"
          >
            For Life's Most Important Days
          </motion.p>
        </div>
      </div>

      {/* Right side - Role Selection */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center p-6 md:p-12 bg-white/50">
        {/* Mobile header */}
        <div className="md:hidden text-center mb-8">
          <h1 
            className="text-4xl text-[#6B4A55] mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
          >
            Beauvette
          </h1>
          <p className="text-xs text-[#6B4A55]/70 tracking-[0.2em] uppercase">
            For Life's Most Important Days
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm mx-auto w-full"
        >
          <h2 className="text-lg font-medium text-gray-700 mb-6 text-center md:text-left">
            I am a...
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#6B4A55]/40" />
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role, index) => (
                <motion.button
                  key={role.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect(role.id)}
                  onMouseEnter={() => setHoveredRole(role.id)}
                  onMouseLeave={() => setHoveredRole(null)}
                  disabled={isSubmitting}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl
                    bg-white border-2 ${role.borderColor} ${role.hoverBorder}
                    transition-all duration-200 text-left
                    disabled:opacity-50 disabled:cursor-not-allowed
                    hover:shadow-md
                  `}
                  data-testid={`button-register-${role.id}`}
                >
                  <div className={`w-12 h-12 rounded-lg ${role.bgColor} flex items-center justify-center flex-shrink-0`}>
                    {isSubmitting && hoveredRole === role.id ? (
                      <Loader2 className={`w-6 h-6 animate-spin ${role.color}`} />
                    ) : (
                      <role.icon className={`w-6 h-6 ${role.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">{role.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{role.description}</p>
                  </div>
                  <span className="text-gray-400 text-lg">→</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Footer links */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <a 
                href="/login" 
                className="text-[#6B4A55] font-medium hover:underline"
              >
                Sign in
              </a>
            </p>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-gray-400 hover:text-gray-600"
              data-testid="button-back-home"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
