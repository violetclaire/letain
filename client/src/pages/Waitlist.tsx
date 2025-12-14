import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();
  
  const getSource = () => {
    if (location.includes('/search')) return 'search';
    if (location.includes('/browse')) return 'browse';
    return 'waitlist';
  };

  const joinWaitlist = useMutation({
    mutationFn: async (data: { email: string; source: string }) => {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join waitlist");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when client discovery opens.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Oops!",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    joinWaitlist.mutate({ email, source: getSource() });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#F7F4EF" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center"
      >
        <div className="mb-8">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: "#5A1F2B" }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-serif mb-4"
            style={{ color: "#5A1F2B", fontFamily: "Playfair Display, serif" }}
            data-testid="text-waitlist-title"
          >
            Beauvette
          </h1>
          <p
            className="text-lg"
            style={{ color: "#6B5A50", fontFamily: "Inter, sans-serif" }}
            data-testid="text-waitlist-description"
          >
            Coming soon. Join the waitlist.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base border-2 focus:ring-2"
              style={{
                borderColor: "#9A9472",
                backgroundColor: "#FAF8F5",
              }}
              data-testid="input-waitlist-email"
            />
            <Button
              type="submit"
              disabled={joinWaitlist.isPending}
              className="w-full h-12 text-base font-medium"
              style={{
                backgroundColor: "#5A1F2B",
                color: "white",
              }}
              data-testid="button-join-waitlist"
            >
              {joinWaitlist.isPending ? "Joining..." : "Join the Waitlist"}
            </Button>
          </form>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            <CheckCircle
              className="w-12 h-12"
              style={{ color: "#9A9472" }}
            />
            <p
              className="text-lg font-medium"
              style={{ color: "#5A1F2B" }}
              data-testid="text-waitlist-success"
            >
              You're on the list!
            </p>
            <p style={{ color: "#6B5A50" }}>
              We'll let you know when we're ready.
            </p>
          </motion.div>
        )}

        <p
          className="mt-8 text-sm"
          style={{ color: "#9A9472" }}
        >
          Already have a booking link from an artist?{" "}
          <span style={{ color: "#5A1F2B", fontWeight: 500 }}>
            That still works!
          </span>
        </p>
      </motion.div>
    </div>
  );
}
