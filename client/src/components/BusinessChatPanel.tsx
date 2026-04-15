import { useState, useRef, useEffect } from "react";
import { Send, Users, Plus, X, MessageSquare, Loader2, Zap, Clock, Shield, TrendingUp, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessChatMessageUI as Message, ContactUI as TeamMember } from "@shared/types";
import type { Conversation, BusinessChatInsight as MessageInsight } from "@shared/schema";

interface LaborStats {
  totalPivots: number;
  totalLaborMinutes: number;
  crisesPrevented: number;
}

interface BusinessChatPanelProps {
  userId: string;
  userName?: string;
}

export default function BusinessChatPanel({ userId, userName }: BusinessChatPanelProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<MessageInsight[]>([]);
  const [laborStats, setLaborStats] = useState<LaborStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchTeamMembers();
    fetchLaborStats();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      fetchInsights(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/business-chat/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/team-members", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/business-chat/conversations/${conversationId}/messages`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const fetchInsights = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/business-chat/conversations/${conversationId}/insights`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
    }
  };

  const fetchLaborStats = async () => {
    try {
      const res = await fetch("/api/invisible-labor/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLaborStats(data);
      }
    } catch (err) {
      console.error("Error fetching labor stats:", err);
    }
  };

  const getInsightForMessage = (messageId: string): MessageInsight | undefined => {
    return insights.find(i => i.messageId === messageId);
  };

  const getPivotBadge = (pivotType: string) => {
    const badges: Record<string, { icon: any; color: string; label: string }> = {
      schedule_change: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "Schedule" },
      last_minute_save: { icon: Zap, color: "bg-yellow-100 text-yellow-700", label: "Quick Fix" },
      crisis_averted: { icon: Shield, color: "bg-green-100 text-green-700", label: "Crisis Averted" },
      client_accommodation: { icon: TrendingUp, color: "bg-purple-100 text-purple-700", label: "Accommodation" },
      vendor_coordination: { icon: Users, color: "bg-pink-100 text-pink-700", label: "Coordination" },
      problem_resolution: { icon: Sparkles, color: "bg-orange-100 text-orange-700", label: "Resolved" }
    };
    return badges[pivotType] || null;
  };

  const createConversation = async () => {
    try {
      const res = await fetch("/api/business-chat/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Team Chat" })
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(prev => [data, ...prev]);
        setSelectedConversation(data);
        toast({
          title: "Chat Created",
          description: "New team chat created successfully"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedConversation) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/business-chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() })
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, { ...newMessage, senderName: userName }]);
        setInput("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const addTeamMember = async () => {
    if (!newMemberName || !newMemberEmail) return;

    try {
      const res = await fetch("/api/team-members", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName: newMemberName,
          memberEmail: newMemberEmail,
          role: "team_member"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTeamMembers(prev => [...prev, data]);
        setNewMemberName("");
        setNewMemberEmail("");
        setShowAddTeamMember(false);
        toast({
          title: "Team Member Added",
          description: `${newMemberName} has been added to your team`
        });
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to add team member",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add team member",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-cream/50 rounded-lg border border-black/10">
      <div className="flex items-center justify-between p-3 border-b border-black/10 bg-black/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-forest" />
          <span className="font-playfair text-sm font-medium">Business Chat</span>
          <span className="text-xs text-pink">(AI-Powered)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiInsights(!showAiInsights)}
            className={`p-1.5 rounded transition-colors ${showAiInsights ? 'bg-forest/20 text-forest' : 'hover:bg-black/10'}`}
            title="AI Insights"
            data-testid="button-toggle-insights"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowAddTeamMember(!showAddTeamMember)}
            className="p-1.5 rounded hover:bg-black/10 transition-colors"
            title="Add Team Member"
            data-testid="button-add-team-member"
          >
            <Users className="h-4 w-4" />
          </button>
          {conversations.length === 0 && (
            <button
              onClick={createConversation}
              className="p-1.5 rounded hover:bg-black/10 transition-colors"
              title="Create New Chat"
              data-testid="button-create-chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* AI Insights / Invisible Labor Stats */}
      {showAiInsights && laborStats && (
        <div className="px-3 py-2 border-b border-black/10 bg-gradient-to-r from-forest/5 to-gold/5">
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="h-3 w-3 text-gold" />
            <span className="text-[10px] font-medium text-forest">Invisible Labor Captured</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/60 rounded px-2 py-1">
              <div className="text-sm font-bold text-forest">{laborStats.totalPivots}</div>
              <div className="text-[9px] text-black/60">Pivots</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1">
              <div className="text-sm font-bold text-forest">
                {laborStats.totalLaborMinutes >= 60 
                  ? `${Math.round(laborStats.totalLaborMinutes / 60)}h` 
                  : `${laborStats.totalLaborMinutes}m`}
              </div>
              <div className="text-[9px] text-black/60">Labor</div>
            </div>
            <div className="bg-white/60 rounded px-2 py-1">
              <div className="text-sm font-bold text-forest">{laborStats.crisesPrevented}</div>
              <div className="text-[9px] text-black/60">Crises Saved</div>
            </div>
          </div>
        </div>
      )}

      {showAddTeamMember && (
        <div className="p-3 border-b border-black/10 bg-powder-blue/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Add Team Member</span>
            <button onClick={() => setShowAddTeamMember(false)} className="p-1 hover:bg-black/10 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-black/20 bg-white"
              data-testid="input-member-name"
            />
            <input
              type="email"
              placeholder="Email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-black/20 bg-white"
              data-testid="input-member-email"
            />
            <button
              onClick={addTeamMember}
              className="w-full py-1.5 text-xs bg-forest text-white rounded hover:bg-forest/90 transition-colors"
              data-testid="button-submit-member"
            >
              Add to Team
            </button>
          </div>
          {teamMembers.length > 0 && (
            <div className="mt-3 pt-2 border-t border-black/10">
              <span className="text-xs font-medium text-black/60">Current Team:</span>
              <div className="mt-1 space-y-1">
                {teamMembers.map(member => (
                  <div key={member.id} className="text-xs flex items-center justify-between">
                    <span>{member.memberName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      member.status === 'active' ? 'bg-forest/20 text-forest' : 'bg-gold/20 text-gold'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]"
        data-testid="business-chat-messages"
      >
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-black/50">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No business chats yet</p>
            <button
              onClick={createConversation}
              className="mt-2 text-xs text-forest underline"
              data-testid="button-create-first-chat"
            >
              Create your first team chat
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-black/50">
            <MessageSquare className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-xs">No messages yet. Start coordinating with your team!</p>
          </div>
        ) : (
          messages.map((message) => {
            const insight = getInsightForMessage(message.id);
            const pivotBadge = insight?.pivotType ? getPivotBadge(insight.pivotType) : null;
            const BadgeIcon = pivotBadge?.icon;
            
            return (
              <div
                key={message.id}
                className={`flex ${message.senderId === userId ? "justify-end" : "justify-start"}`}
              >
                <div className="flex flex-col items-end max-w-[85%]">
                  {/* Pivot Badge */}
                  {pivotBadge && showAiInsights && (
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium mb-1 ${pivotBadge.color}`}>
                      {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5" />}
                      <span>{pivotBadge.label}</span>
                      {insight?.estimatedLaborMinutes && (
                        <span className="opacity-70">~{insight.estimatedLaborMinutes}m</span>
                      )}
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.senderId === userId
                        ? "bg-forest text-white rounded-br-sm"
                        : "bg-black/10 text-black rounded-bl-sm"
                    }`}
                  >
                    {message.senderId !== userId && message.senderName && (
                      <p className="text-[10px] font-medium mb-0.5 opacity-70">{message.senderName}</p>
                    )}
                    <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[10px] opacity-60">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {insight?.aiSummary && showAiInsights && (
                        <p className="text-[9px] italic opacity-50 max-w-[150px] truncate" title={insight.aiSummary}>
                          {insight.aiSummary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedConversation && (
        <div className="p-3 border-t border-black/10">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message your team..."
              className="flex-1 resize-none rounded-lg border border-black/20 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 min-h-[40px] max-h-[100px]"
              rows={1}
              disabled={isLoading}
              data-testid="input-business-message"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-lg bg-forest text-white hover:bg-forest/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-send-business"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
