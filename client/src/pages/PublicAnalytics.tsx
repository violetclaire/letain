import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Calendar, MessageCircle, TrendingUp, Clock, Award, Users, BarChart3 } from "lucide-react";
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
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="px-6 py-4 bg-[#FFFEF9] border-b border-[#2C2C2C]">
        <h1 className="font-script text-2xl text-[#2C2C2C] text-center">Beauvette</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <h2 className="font-header text-2xl text-[#2C2C2C] mb-2 tracking-wide uppercase">
            Beauvette Metrics
          </h2>
          <p className="text-sm text-[#666]">Last 24 Hours</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
          >
            <div className="border border-[#2C2C2C] p-4 text-center">
              <Calendar className="w-6 h-6 text-[#2C2C2C] mx-auto mb-2" />
              <p className="text-2xl font-header text-[#2C2C2C]">
                {metricsLoading ? "..." : metrics?.calendarsCreated || 0}
              </p>
              <p className="text-xs text-[#666] uppercase tracking-wide">Calendars Created</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
          >
            <div className="border border-[#2C2C2C] p-4 text-center">
              <MessageCircle className="w-6 h-6 text-[#2C2C2C] mx-auto mb-2" />
              <p className="text-2xl font-header text-[#2C2C2C]">
                {metricsLoading ? "..." : metrics?.chatsStarted || 0}
              </p>
              <p className="text-xs text-[#666] uppercase tracking-wide">Chats Started</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
          >
            <div className="border border-[#2C2C2C] p-4 text-center">
              <TrendingUp className="w-6 h-6 text-[#2C2C2C] mx-auto mb-2" />
              <p className="text-2xl font-header text-[#2C2C2C]">
                {metricsLoading ? "..." : `${metrics?.artistActivationRate || 0}%`}
              </p>
              <p className="text-xs text-[#666] uppercase tracking-wide">Activation Rate</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
          >
            <div className="border border-[#2C2C2C] p-4 text-center">
              <BarChart3 className="w-6 h-6 text-[#2C2C2C] mx-auto mb-2" />
              <p className="text-2xl font-header text-[#2C2C2C]">
                {metricsLoading ? "..." : (metrics?.chatsPerCalendar || 0).toFixed(2)}
              </p>
              <p className="text-xs text-[#666] uppercase tracking-wide">Chats / Calendar</p>
              <p className="text-[10px] text-[#999]">(Target: 0.3)</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
        >
          <div className="border border-[#2C2C2C]">
            <div className="px-6 py-4 border-b border-[#2C2C2C] bg-[#FAF9F7]">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-[#2C2C2C]" />
                <h3 className="font-header text-lg text-[#2C2C2C] uppercase tracking-wide">Top Responsive Artists</h3>
              </div>
            </div>

            {leaderboardLoading ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 border border-[#2C2C2C] mx-auto mb-4" />
                <p className="text-[#666]">Loading leaderboard...</p>
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="divide-y divide-[#2C2C2C]">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#FAF9F7] text-xs font-medium text-[#666] uppercase tracking-wide">
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
                      index === 0 ? "bg-[#FAF9F7]" : ""
                    }`}
                  >
                    <div className="col-span-1">
                      {index === 0 ? (
                        <span className="text-lg">1</span>
                      ) : index === 1 ? (
                        <span className="text-lg">2</span>
                      ) : index === 2 ? (
                        <span className="text-lg">3</span>
                      ) : (
                        <span className="text-sm text-[#666]">{entry.rank}</span>
                      )}
                    </div>
                    
                    <div className="col-span-4">
                      <a 
                        href={`/${entry.artistSlug}`}
                        className="font-medium text-[#2C2C2C] hover:underline"
                      >
                        {entry.artistName}
                      </a>
                      {entry.instagramHandle && (
                        <p className="text-xs text-[#666]">@{entry.instagramHandle}</p>
                      )}
                    </div>
                    
                    <div className="col-span-2 flex justify-center">
                      {entry.badge === "quick_responder" && (
                        <div className="flex items-center gap-1 px-2 py-1 border border-[#2C2C2C]">
                          <Award size={10} className="text-[#2C2C2C]" />
                          <span className="text-[10px] font-medium text-[#2C2C2C] uppercase">Quick</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={12} className="text-[#666]" />
                        <span className="text-sm text-[#2C2C2C]">{formatResponseTime(entry.avgResponseMinutes)}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-1 text-center text-sm text-[#2C2C2C]">
                      {entry.totalChats}
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-medium text-[#2C2C2C]">
                        {entry.responseRate}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Users className="w-16 h-16 text-[#ccc] mx-auto mb-4" />
                <p className="text-[#2C2C2C] font-medium mb-2">No artists yet</p>
                <p className="text-sm text-[#666]">Be the first to join the leaderboard!</p>
                <a
                  href="/onboarding"
                  className="inline-block mt-4 px-6 py-2 bg-[#2C2C2C] text-[#FFFEF9] hover:bg-[#1a1a1a] transition-colors"
                >
                  Create Your Calendar
                </a>
              </div>
            )}
          </div>
        </motion.div>

        <div className="text-center text-xs text-[#666] pb-8">
          {metrics?.lastUpdated && (
            <p>Last updated: {format(new Date(metrics.lastUpdated), "h:mm a")}</p>
          )}
          <p className="mt-2">Updates every 5 minutes</p>
        </div>
      </main>

      <footer className="px-6 py-4 bg-[#FFFEF9] border-t border-[#2C2C2C] text-center">
        <p className="text-xs text-[#666] mb-2">
          © 2025 Beauvette. For life's most important days.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/" className="text-xs text-[#2C2C2C] hover:underline">Home</a>
          <a href="/onboarding" className="text-xs text-[#2C2C2C] hover:underline">Create Calendar</a>
          <a href="/login" className="text-xs text-[#2C2C2C] hover:underline">Sign In</a>
        </div>
      </footer>
    </div>
  );
}
