import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Signup() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { refetch } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const role = params.get("role");
    if (role && ["client", "artist", "planner"].includes(role)) {
      setSelectedRole(role);
    }
  }, [search]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to create account");
        return;
      }

      await refetch();
      
      // If a role was pre-selected, redirect to the appropriate intake form
      if (selectedRole) {
        // First update the user's role
        const userData = await fetch("/api/auth/user", { credentials: "include" }).then(r => r.json());
        if (userData?.id) {
          await fetch(`/api/users/${userData.id}/role`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ role: selectedRole }),
          });
        }
        
        switch (selectedRole) {
          case "client":
            setLocation("/intake/client");
            break;
          case "artist":
            setLocation("/intake/artist");
            break;
          case "planner":
            setLocation("/intake/planner");
            break;
          default:
            setLocation("/register");
        }
      } else {
        setLocation("/register");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-powder-blue flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-cream p-8 rounded-sm shadow-lg border border-black/20">
          <div className="text-center mb-8">
            <h1 className="font-script text-4xl text-black mb-2">Create Account</h1>
            <p className="text-sm text-black/60">Join Beauvette today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-black/60">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="w-full border border-black/20 bg-white rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/30"
                  data-testid="input-signup-firstname"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-black/60">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  className="w-full border border-black/20 bg-white rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/30"
                  data-testid="input-signup-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/60">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border border-black/20 bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/30"
                data-testid="input-signup-email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/60">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full border border-black/20 bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/30 pr-12"
                  data-testid="input-signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req) => (
                  <div
                    key={req.label}
                    className={`flex items-center gap-2 text-xs ${
                      req.met ? "text-green-600" : "text-black/40"
                    }`}
                  >
                    <Check size={12} className={req.met ? "opacity-100" : "opacity-30"} />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/60">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className={`w-full border bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/30 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "border-green-500"
                      : "border-red-400"
                    : "border-black/20"
                }`}
                data-testid="input-signup-confirm-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded" data-testid="text-signup-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !allRequirementsMet || !passwordsMatch}
              className="w-full bg-black text-white text-sm uppercase tracking-widest py-3 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-signup-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-black/60">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="underline hover:text-black transition-colors"
                data-testid="link-to-login"
              >
                Sign in
              </button>
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
