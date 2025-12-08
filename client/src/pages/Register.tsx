import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Circle, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already logged in and has a role, redirect to their dashboard
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
    // If user is already logged in, update their role directly
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
          // Redirect to intake form
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
      // Not logged in - redirect to signup with role parameter
      setLocation(`/signup?role=${roleId}`);
    }
  };

  const roles = [
    {
      id: 'client',
      title: 'Client',
      description: 'Look for services',
      icon: Circle,
      color: 'bg-cream hover:bg-cream/80',
    },
    {
      id: 'artist',
      title: 'Vendor',
      description: 'Offer your services and operate your entire business',
      icon: Circle,
      color: 'bg-cream hover:bg-cream/80',
    },
    {
      id: 'planner',
      title: 'Planner',
      description: 'Coordinate, manage and operate your business',
      icon: Circle,
      color: 'bg-cream hover:bg-cream/80',
    },
  ];

  return (
    <div className="min-h-screen bg-powder-blue flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-cream p-6 rounded-sm shadow-lg border border-black/20">
          <div className="text-center mb-8">
            <h1 className="font-script text-4xl text-black mb-2">
              Join Beauvette
            </h1>
            <p className="text-sm text-black/60">
              Select your role to get started
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-black/40" />
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((roleOption) => (
                <motion.button
                  key={roleOption.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect(roleOption.id)}
                  disabled={isSubmitting}
                  className={`w-full p-4 rounded-md border border-black/20 ${roleOption.color} transition-colors flex items-center gap-4 disabled:opacity-50`}
                  data-testid={`button-register-${roleOption.id}`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-8 h-8 animate-spin text-black/70" />
                  ) : (
                    <roleOption.icon className="w-8 h-8 text-black/70" />
                  )}
                  <div className="text-left">
                    <h3 className="font-header text-lg text-black">{roleOption.title}</h3>
                    <p className="text-xs text-black/60">{roleOption.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-black/50">
              Already have an account?{" "}
              <a 
                href="/login" 
                className="underline hover:text-black transition-colors"
              >
                Log in here
              </a>
            </p>
          </div>

          <button
            onClick={() => setLocation("/")}
            className="mt-4 w-full text-center text-xs text-black/40 hover:text-black/60 transition-colors"
            data-testid="button-back-home"
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
