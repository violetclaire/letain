import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Calendar, MessageCircle, TrendingUp, Clock, Award, Users, Target, BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface LeaderboardEntry {
  rank: number;
  artistName: string;
  instagramHandle?: string;
  artistSlug: string;
  badge: "quick_responder" | null;
  avgResponseMinutes: number;
  totalChats: number;
  responseRate: number;
}

interface AnalyticsMetrics {
  calendarsCreated: number;
  chatsStarted: number;
  artistActivationRate: number;
  chatsPerCalendar: number;
  lastUpdated: string;
}

export default function PublicAnalytics() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<AnalyticsMetrics>({
    queryKey: ["/api/public/analytics/metrics"],
    queryFn: async () => {
      const res = await fetch("/api/public/analytics/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    refetchInterval: 60000
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/public/analytics/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/public/analytics/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    refetchInterval: 60000
  });

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-powder-blue">
      <header className="px-6 py-4 bg-cream border-b border-[#c5ccd8]">
        <h1 className="font-script text-2xl ink-main text-center">Beauvette</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <h2 className="font-header text-3xl ink-main mb-2">
            BEAUVETTE METRICS
          </h2>
          <p className="text-sm ink-soft">Last 24 Hours</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-cream rounded-xl p-4 border-2 border-[#c5ccd8] text-center"
          >
            <Calendar className="w-8 h-8 text-pink mx-auto mb-2" />
            <p className="text-2xl font-header ink-main">
              {metricsLoading ? "..." : metrics?.calendarsCreated || 0}
            </p>
            <p className="text-xs ink-soft">Calendars Created</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-cream rounded-xl p-4 border-2 border-[#c5ccd8] text-center"
          >
            <MessageCircle className="w-8 h-8 text-forest mx-auto mb-2" />
            <p className="text-2xl font-header ink-main">
              {metricsLoading ? "..." : metrics?.chatsStarted || 0}
            </p>
            <p className="text-xs ink-soft">Chats Started</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-cream rounded-xl p-4 border-2 border-[#c5ccd8] text-center"
          >
            <TrendingUp className="w-8 h-8 text-gold mx-auto mb-2" />
            <p className="text-2xl font-header ink-main">
              {metricsLoading ? "..." : `${metrics?.artistActivationRate || 0}%`}
            </p>
            <p className="text-xs ink-soft">Artist Activation Rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-cream rounded-xl p-4 border-2 border-[#c5ccd8] text-center"
          >
            <BarChart3 className="w-8 h-8 text-pink mx-auto mb-2" />
            <p className="text-2xl font-header ink-main">
              {metricsLoading ? "..." : (metrics?.chatsPerCalendar || 0).toFixed(2)}
            </p>
            <p className="text-xs ink-soft">Chats per Calendar</p>
            <p className="text-[10px] text-gold">(Target: 0.3)</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-cream rounded-xl border-2 border-[#c5ccd8] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[#c5ccd8] bg-powder-blue/30">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-gold" />
              <h3 className="font-header text-xl ink-main">Top Responsive Artists</h3>
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-pink/20 rounded-full mx-auto mb-4" />
                <p className="ink-soft">Loading leaderboard...</p>
              </div>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="divide-y divide-[#c5ccd8]">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-powder-blue/20 text-xs font-medium ink-soft">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Artist</div>
                <div className="col-span-2 text-center">Badge</div>
                <div className="col-span-2 text-center">Avg Response</div>
                <div className="col-span-1 text-center">Chats</div>
                <div className="col-span-2 text-center">Rate</div>
              </div>
              
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.artistSlug}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                    index === 0 ? "bg-gold/10" : index === 1 ? "bg-pink/5" : index === 2 ? "bg-forest/5" : ""
                  }`}
                >
                  <div className="col-span-1">
                    {index === 0 ? (
                      <span className="text-2xl">🥇</span>
                    ) : index === 1 ? (
                      <span className="text-2xl">🥈</span>
                    ) : index === 2 ? (
                      <span className="text-2xl">🥉</span>
                    ) : (
                      <span className="text-sm ink-soft">{entry.rank}</span>
                    )}
                  </div>
                  
                  <div className="col-span-4">
                    <a 
                      href={`/${entry.artistSlug}`}
                      className="font-medium ink-main hover:text-pink transition-colors"
                    >
                      {entry.artistName}
                    </a>
                    {entry.instagramHandle && (
                      <p className="text-xs text-pink">@{entry.instagramHandle}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 flex justify-center">
                    {entry.badge === "quick_responder" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gold/20 rounded-full">
                        <Award size={12} className="text-gold" />
                        <span className="text-[10px] font-medium text-gold">Quick Responder</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={12} className="text-forest" />
                      <span className="text-sm ink-main">{formatResponseTime(entry.avgResponseMinutes)}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-1 text-center text-sm ink-main">
                    {entry.totalChats}
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <span className={`text-sm font-medium ${
                      entry.responseRate >= 90 ? "text-forest" : 
                      entry.responseRate >= 70 ? "text-gold" : "text-pink"
                    }`}>
                      {entry.responseRate}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="w-16 h-16 text-pink/20 mx-auto mb-4" />
              <p className="ink-main font-medium mb-2">No artists yet</p>
              <p className="text-sm ink-soft">Be the first to join the leaderboard!</p>
              <a
                href="/onboarding"
                className="inline-block mt-4 px-6 py-2 bg-pink text-white rounded-lg hover:bg-pink/90 transition-colors"
              >
                Create Your Calendar
              </a>
            </div>
          )}
        </motion.div>

        <div className="text-center text-xs ink-soft pb-8">
          {metrics?.lastUpdated && (
            <p>Last updated: {format(new Date(metrics.lastUpdated), "h:mm a")}</p>
          )}
          <p className="mt-2">Updates every 5 minutes</p>
        </div>
      </main>

      <footer className="px-6 py-4 bg-cream border-t border-[#c5ccd8] text-center">
        <p className="text-xs ink-soft mb-2">
          © 2025 Beauvette. For life's most important days.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/" className="text-xs text-gold hover:underline">Home</a>
          <a href="/onboarding" className="text-xs text-gold hover:underline">Create Calendar</a>
          <a href="/login" className="text-xs text-gold hover:underline">Sign In</a>
        </div>
      </footer>
    </div>
  );
}
