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
      title: 'Bride or Client',
      subtitle: 'Planning your special day',
      description: 'Find and book talented beauty artists for your wedding, photoshoot, or special event',
      icon: Heart,
      accentIcon: Crown,
      gradient: 'from-rose-50 to-pink-50',
      borderColor: 'border-rose-200',
      iconColor: 'text-rose-400',
      hoverBg: 'hover:bg-rose-50/80',
    },
    {
      id: 'artist',
      title: 'Beauty Artist',
      subtitle: 'Share your artistry',
      description: 'Showcase your portfolio, manage bookings, and grow your beauty business',
      icon: Palette,
      accentIcon: Sparkles,
      gradient: 'from-violet-50 to-purple-50',
      borderColor: 'border-violet-200',
      iconColor: 'text-violet-400',
      hoverBg: 'hover:bg-violet-50/80',
    },
    {
      id: 'planner',
      title: 'Wedding Planner',
      subtitle: 'Coordinate with ease',
      description: 'Manage vendors, coordinate schedules, and deliver flawless events',
      icon: Calendar,
      accentIcon: Users,
      gradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-400',
      hoverBg: 'hover:bg-emerald-50/80',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] relative overflow-hidden">
      {/* Decorative background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 24px, #6B4A55 24px, #6B4A55 25px),
            repeating-linear-gradient(90deg, transparent, transparent 24px, #6B4A55 24px, #6B4A55 25px)
          `,
        }}
      />
      
      {/* Floating decorative elements */}
      <motion.div 
        className="absolute top-20 left-10 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.3, 0.2, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 
            className="text-5xl md:text-6xl text-[#6B4A55] mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
          >
            Beauvette
          </h1>
          <p className="text-sm text-[#6B4A55]/70 tracking-[0.3em] uppercase mb-8">
            For Life's Most Important Days
          </p>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#6B4A55]/40 to-transparent mx-auto mb-8" />
          <h2 className="text-xl md:text-2xl text-gray-700 font-light">
            How will you use Beauvette?
          </h2>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-[#6B4A55]/40" />
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
          >
            {roles.map((role, index) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect(role.id)}
                onMouseEnter={() => setHoveredRole(role.id)}
                onMouseLeave={() => setHoveredRole(null)}
                disabled={isSubmitting}
                className={`
                  relative group p-8 rounded-2xl bg-white/80 backdrop-blur-sm
                  border-2 ${role.borderColor} shadow-lg
                  transition-all duration-300 text-left
                  ${role.hoverBg}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-xl hover:border-opacity-100
                `}
                data-testid={`button-register-${role.id}`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon container */}
                  <div className="relative mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center ${role.borderColor} border`}>
                      {isSubmitting && hoveredRole === role.id ? (
                        <Loader2 className={`w-8 h-8 animate-spin ${role.iconColor}`} />
                      ) : (
                        <role.icon className={`w-8 h-8 ${role.iconColor}`} />
                      )}
                    </div>
                    <motion.div 
                      className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center ${role.borderColor} border`}
                      animate={hoveredRole === role.id ? { scale: [1, 1.1, 1], rotate: [0, 10, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <role.accentIcon className={`w-4 h-4 ${role.iconColor}`} />
                    </motion.div>
                  </div>

                  {/* Text content */}
                  <h3 className="text-xl font-semibold text-gray-800 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {role.title}
                  </h3>
                  <p className={`text-sm ${role.iconColor} font-medium mb-3`}>
                    {role.subtitle}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {role.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                    <span>Get Started</span>
                    <motion.span
                      animate={hoveredRole === role.id ? { x: [0, 4, 0] } : {}}
                      transition={{ duration: 0.5, repeat: hoveredRole === role.id ? Infinity : 0 }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Footer links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center space-y-4"
        >
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <a 
              href="/login" 
              className="text-[#6B4A55] font-medium hover:underline transition-colors"
            >
              Sign in here
            </a>
          </p>
          <button
            onClick={() => setLocation("/")}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="button-back-home"
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>
    </div>
  );
}
