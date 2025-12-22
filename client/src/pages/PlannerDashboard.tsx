import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { DollarSign, Search, Send, CreditCard, Users, Palette, Grid3X3, Image, ExternalLink, Upload, ChevronDown, ChevronRight, Plus, Check, Heart, Instagram, Facebook, Globe, MessageCircle, UserPlus, Phone, LogOut, FileUp, Settings, Wallet, Link as LinkIcon, ArrowUpRight, Loader2, Sparkles, Download, Copy } from "lucide-react";
import VoiceDictation from "../components/VoiceDictation";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import AIChatPanel from "../components/AIChatPanel";
import BusinessChatPanel from "../components/BusinessChatPanel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface RolodexVendor {
  id: string;
  name: string;
  type: string;
  approved: boolean;
}

export default function PlannerDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [messages, setMessages] = useState([
    { from: "other", text: "Select a client to start chatting." }
  ]);
  const [inputText, setInputText] = useState("");
  const [chatRecipient, setChatRecipient] = useState("Artist");
  const [clientSearch, setClientSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [selectedPaymentClient, setSelectedPaymentClient] = useState<string | null>(null);
  const [vendorPaymentAmount, setVendorPaymentAmount] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [thankYouRecipient, setThankYouRecipient] = useState("");
  const [rolodexSearch, setRolodexSearch] = useState("");
  const [rolodexTypeFilter, setRolodexTypeFilter] = useState("all");
  const [newTodoText, setNewTodoText] = useState("");
  const [loading, setLoading] = useState(true);

  const [squareStatus, setSquareStatus] = useState<{
    connected: boolean;
    paymentsEnabled: boolean;
    merchantId?: string;
  } | null>(null);
  const [squareLoading, setSquareLoading] = useState(false);
  const [paymentLinkAmount, setPaymentLinkAmount] = useState("");
  const [paymentLinkDescription, setPaymentLinkDescription] = useState("");
  const [paymentLinkClient, setPaymentLinkClient] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState<string | null>(null);

  const [todos, setTodos] = useState<TodoItem[]>([]);

  const [rolodex, setRolodex] = useState<RolodexVendor[]>([]);
  
  const [clients, setClients] = useState<any[]>([]);
  
  const [mockupPrompt, setMockupPrompt] = useState("");
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [generatedMockup, setGeneratedMockup] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Access Required",
        description: "Please log in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
    
    if (user && user.role !== 'planner') {
      toast({
        title: "Access Denied",
        description: "This dashboard is for planners.",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }
    
    if (user) {
      fetchPlannerData();
    }
  }, [authLoading, isAuthenticated, user]);
  
  const fetchPlannerData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const bookingsRes = await fetch(`/api/bookings/planner/${user.id}`, { credentials: "include" });
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setClients(data.map((b: any) => ({
            id: b.id,
            name: `Event ${b.id.slice(0, 8)}`,
            date: new Date(b.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            location: b.location
          })));
        }
      }
      
      const squareRes = await fetch('/api/square/connect/status', { credentials: 'include' });
      if (squareRes.ok) {
        const squareData = await squareRes.json();
        setSquareStatus(squareData);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" });
    }
    
    setLoading(false);
  };

  const handleSquareConnect = async () => {
    setSquareLoading(true);
    try {
      const res = await fetch('/api/square/connect/authorize', {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to start Square setup",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to Square",
        variant: "destructive",
      });
    }
    setSquareLoading(false);
  };

  const handleCreatePaymentLink = async () => {
    if (!paymentLinkAmount || !paymentLinkDescription) return;
    setGeneratingLink(true);
    
    try {
      const res = await fetch('/api/square/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Math.round(parseFloat(paymentLinkAmount) * 100),
          description: paymentLinkDescription,
          clientName: paymentLinkClient || 'Client',
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setGeneratedPaymentLink(data.paymentLink);
        toast({
          title: "Payment Link Created",
          description: "Copy and send this link to your client",
        });
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to create payment link",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create payment link",
        variant: "destructive",
      });
    }
    setGeneratingLink(false);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { from: "me", text: inputText }]);
    setInputText("");

    setTimeout(() => {
      setMessages(prev => [...prev, { from: "other", text: `${chatRecipient}: Great — we'll mirror whatever is in your master timeline here.` }]);
    }, 800);
  };

  const handleVoiceMessage = (transcript: string) => {
    setInputText(prev => prev + " " + transcript);
  };

  const vendors = [
    { name: "Coquette Beauty Co.", service: "Hair & Makeup" },
    { name: "Haus of Glow", service: "Skincare" },
    { name: "Valley Hair Team", service: "Hair Styling" },
    { name: "Bloom Florals", service: "Flowers" },
    { name: "Sweet Moments Bakery", service: "Cake" },
  ];

  const contacts: any[] = [];

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.date.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredPaymentClients = clients.filter(c => 
    c.name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    c.date.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  const filteredRolodex = rolodex.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(rolodexSearch.toLowerCase());
    const matchesType = rolodexTypeFilter === "all" || v.type.toLowerCase().includes(rolodexTypeFilter.toLowerCase());
    return matchesSearch && matchesType;
  });

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    setTodos(prev => [...prev, { id: Date.now().toString(), text: newTodoText, completed: false }]);
    setNewTodoText("");
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSendThankYou = () => {
    if (!thankYouMessage.trim() || !thankYouRecipient) return;
    toast({ title: "Thank You Sent", description: `Thank you note sent to ${thankYouRecipient}!` });
    setThankYouMessage("");
    setThankYouRecipient("");
    setShowThankYouModal(false);
  };

  const handleGenerateMockup = async () => {
    if (!mockupPrompt.trim()) {
      toast({ title: "Missing Description", description: "Please describe what you'd like to create", variant: "destructive" });
      return;
    }
    
    setGeneratingMockup(true);
    setGeneratedMockup(null);
    
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: mockupPrompt }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setGeneratedMockup(data.imageUrl);
        toast({ title: "Mockup Generated!", description: "Your wedding concept image is ready" });
      } else {
        const err = await res.json();
        toast({ title: "Generation Failed", description: err.error || "Please try a different description", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate mockup. Please try again.", variant: "destructive" });
    }
    
    setGeneratingMockup(false);
  };

  const downloadMockup = () => {
    if (!generatedMockup) return;
    const link = document.createElement('a');
    link.href = generatedMockup;
    link.download = `beauvette-mockup-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyMockupToClipboard = async () => {
    if (!generatedMockup) return;
    try {
      const response = await fetch(generatedMockup);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast({ title: "Copied!", description: "Image copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy image", variant: "destructive" });
    }
  };

  const vendorTypes = ["all", "Hair & Makeup", "Florist", "Bakery", "Photography", "Catering"];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm text-black/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen overflow-y-auto p-4 bg-powder-blue">
      <div className="max-w-7xl mx-auto frame-outer shadow-sm">
        <div className="frame-inner">
          <header className="mb-6">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
              <div>
                <h1 className="font-script text-3xl ink-main">
                  Beauvette
                </h1>
                <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] ink-soft">
                  Your Private Secretary
                </p>
                <p className="mt-2 font-script text-xl ink-main">
                  Bonjour, {user?.firstName || 'there'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <Link 
                  href="/planner/import" 
                  className="p-2 md:px-3 md:py-1.5 bg-[#3D5A3B] text-white text-xs rounded-full md:rounded-md hover:bg-[#3D5A3B]/90 transition-colors flex items-center justify-center gap-0 md:gap-1.5"
                  data-testid="link-import-bookings"
                  title="Import Bookings"
                >
                  <FileUp size={16} className="md:w-3.5 md:h-3.5" />
                  <span className="hidden md:inline">Import Bookings</span>
                </Link>
                <div className="flex items-center gap-1">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-black/10 transition-colors" data-testid="link-instagram">
                    <Instagram size={16} className="ink-soft" />
                  </a>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-black/10 transition-colors" data-testid="link-facebook">
                    <Facebook size={16} className="ink-soft" />
                  </a>
                  <a href="#" className="p-1.5 rounded-full hover:bg-black/10 transition-colors" data-testid="link-website">
                    <Globe size={16} className="ink-soft" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/settings" className="p-1.5 md:p-0 rounded-full md:rounded-none hover:bg-black/10 md:hover:bg-transparent ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-settings" title="Settings">
                    <Settings size={16} className="md:w-3.5 md:h-3.5" />
                    <span className="hidden md:inline text-xs">Settings</span>
                  </Link>
                  <a href="/api/logout" className="p-1.5 md:p-0 rounded-full md:rounded-none hover:bg-black/10 md:hover:bg-transparent ink-soft hover:ink-main flex items-center gap-1 transition-colors" title="Logout">
                    <LogOut size={16} className="md:w-3.5 md:h-3.5" />
                    <span className="hidden md:inline text-xs">Logout</span>
                  </a>
                  <Link href="/" className="hidden md:inline text-[0.7rem] ink-soft underline" data-testid="link-back-home">
                    Back to home
                  </Link>
                </div>
              </div>
            </div>
          </header>

          <section className="grid md:grid-cols-3 gap-6 items-start">
            {/* LEFT: main content */}
            <div className="md:col-span-2 space-y-4">
              
              {/* 1. Event Calendar */}
              <div className="card-frame rounded-md px-5 py-4">
                <h2 className="font-header text-lg ink-main mb-2">
                  Event calendar
                </h2>
                <ul className="text-xs ink-soft space-y-1">
                  <li>Sat · Oct 12 – Carneros Resort – Beauty locked · 7:30 AM call time</li>
                  <li>Sun · Oct 20 – City rooftop ceremony – Beauty awaiting artist confirmation</li>
                  <li>Sat · Nov 02 – Sonoma barn wedding – Two beauty teams, staggered arrivals</li>
                </ul>
              </div>

              {/* 2. AI Mockup Generator */}
              <div className="card-frame rounded-md px-5 py-4 bg-gradient-to-br from-pink/5 to-powder/10">
                <h2 className="font-header text-lg ink-main mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-pink" /> AI Wedding Mockup Generator
                </h2>
                <p className="text-xs ink-soft mb-3">Describe your vision and AI will create a concept image to share with clients.</p>
                
                <div className="space-y-3">
                  <textarea
                    value={mockupPrompt}
                    onChange={(e) => setMockupPrompt(e.target.value)}
                    placeholder="E.g., Elegant outdoor ceremony with blush roses, white chairs, and a wooden arch draped with flowing fabric..."
                    rows={3}
                    className="w-full text-xs border border-[#c5ccd8] rounded-md p-3 bg-white focus:outline-none focus:border-pink resize-none"
                    data-testid="input-mockup-prompt"
                  />
                  
                  <button
                    onClick={handleGenerateMockup}
                    disabled={generatingMockup || !mockupPrompt.trim()}
                    className="w-full py-2.5 bg-pink text-white rounded-md text-sm font-medium hover:bg-pink/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    data-testid="button-generate-mockup"
                  >
                    {generatingMockup ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating your mockup...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate Mockup
                      </>
                    )}
                  </button>
                  
                  {generatedMockup && (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-[#c5ccd8]">
                        <img 
                          src={generatedMockup} 
                          alt="Generated wedding mockup" 
                          className="w-full h-auto"
                          data-testid="image-mockup-result"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={downloadMockup}
                          className="flex-1 py-2 border border-[#c5ccd8] rounded-md text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                          data-testid="button-download-mockup"
                        >
                          <Download size={14} /> Download
                        </button>
                        <button
                          onClick={copyMockupToClipboard}
                          className="flex-1 py-2 border border-[#c5ccd8] rounded-md text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                          data-testid="button-copy-mockup"
                        >
                          <Copy size={14} /> Copy to Clipboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Mood Boards, Mockups & Seating Charts */}
              <div className="card-frame rounded-md px-5 py-4">
                <h2 className="font-header text-lg ink-main mb-3 flex items-center gap-2">
                  <Palette size={16} /> Client Folders & Resources
                </h2>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search by client name or date..." 
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                    data-testid="input-client-search"
                  />
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredClients.map((client, i) => (
                    <div key={i} className="border border-[#c5ccd8] bg-white rounded-md overflow-hidden" data-testid={`folder-client-${i}`}>
                      <button 
                        onClick={() => setExpandedClient(expandedClient === client.name ? null : client.name)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-sm ink-main">{client.name}</p>
                          <p className="text-[0.65rem] ink-soft">{client.date} • {client.location}</p>
                        </div>
                        {expandedClient === client.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      
                      {expandedClient === client.name && (
                        <div className="border-t border-[#e2e4ef] p-4 bg-[#fbfcff] space-y-4">
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold ink-main flex items-center gap-2">
                              <Palette size={12} /> 1. Mood Board
                            </h4>
                            <p className="text-[0.65rem] ink-soft">Drag photos, colors, fabrics, flowers — anything.</p>
                            <a href="https://www.canva.com/create/wedding-mood-boards" target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[0.7rem] text-blue-600 hover:underline">
                              <ExternalLink size={10} /> Open Canva Mood Board
                            </a>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold ink-main flex items-center gap-2">
                              <Grid3X3 size={12} /> 2. Venue Mockup / Floor Plan
                            </h4>
                            <p className="text-[0.65rem] ink-soft">3D layouts, table arrangements, lighting ideas.</p>
                            <a href="https://app.allseated.com/login" target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[0.7rem] text-blue-600 hover:underline">
                              <ExternalLink size={10} /> Open AllSeated Floor Plan
                            </a>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold ink-main flex items-center gap-2">
                              <Users size={12} /> 3. Seating Chart
                            </h4>
                            <p className="text-[0.65rem] ink-soft">Drag-and-drop guests to tables.</p>
                            <a href="https://app.allseated.com/seating" target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[0.7rem] text-blue-600 hover:underline">
                              <ExternalLink size={10} /> Open AllSeated Seating Chart
                            </a>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold ink-main flex items-center gap-2">
                              <Image size={12} /> 4. Inspiration Photos
                            </h4>
                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#c5ccd8] rounded-md cursor-pointer hover:border-black transition-colors bg-white">
                              <Upload size={14} className="ink-soft" />
                              <span className="text-[0.7rem] ink-soft">Upload inspiration photos</span>
                              <input type="file" className="hidden" accept="image/*" multiple />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {/* To-Do List (replaces Timing Checkpoints) */}
                <div className="card-frame rounded-md px-4 py-3">
                  <h3 className="font-header text-sm ink-main mb-2 flex items-center gap-2">
                    <Check size={14} /> To-Do List
                  </h3>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                      placeholder="Add new task..."
                      className="flex-1 text-xs border border-[#c5ccd8] rounded px-2 py-1.5 bg-[#fbfcff] focus:outline-none focus:border-black"
                      data-testid="input-new-todo"
                    />
                    <VoiceDictation onTranscript={(t) => setNewTodoText(t)} />
                    <button onClick={addTodo} className="p-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                    {todos.map((todo) => (
                      <div 
                        key={todo.id} 
                        className={`flex items-center gap-2 p-2 rounded border ${todo.completed ? 'bg-green-50 border-green-200' : 'bg-white border-[#c5ccd8]'}`}
                        data-testid={`todo-${todo.id}`}
                      >
                        <button 
                          onClick={() => toggleTodo(todo.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center ${todo.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                        >
                          {todo.completed && <Check size={10} />}
                        </button>
                        <span className={`text-xs flex-1 ${todo.completed ? 'line-through text-gray-400' : 'ink-main'}`}>
                          {todo.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Hub */}
                <div className="card-frame rounded-md px-4 py-3">
                  <h3 className="font-header text-sm ink-main mb-3 flex items-center gap-2">
                    <Wallet size={14} /> Payment Hub
                  </h3>
                  
                  {/* Square Connect Status */}
                  {!squareStatus?.connected ? (
                    <div className="bg-[#fbfcff] border border-dashed border-[#c5ccd8] rounded-md p-3 mb-3">
                      <p className="text-xs ink-soft mb-2">Connect your Square account to receive payments and pay vendors</p>
                      <button
                        onClick={handleSquareConnect}
                        disabled={squareLoading}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-black text-white rounded text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {squareLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        {squareLoading ? 'Connecting...' : 'Connect Square'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 border border-green-200 rounded">
                      <Check size={12} className="text-green-600" />
                      <span className="text-xs text-green-700 flex-1">Square Connected</span>
                    </div>
                  )}

                  {/* Get Paid Section */}
                  <div className="border-t border-[#e5e8f2] pt-3 mb-3">
                    <h4 className="text-[0.65rem] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                      <LinkIcon size={10} /> Get Paid - Send Payment Link
                    </h4>
                    <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input 
                          type="number" 
                          placeholder="Amount" 
                          value={paymentLinkAmount}
                          onChange={(e) => setPaymentLinkAmount(e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Description (e.g., Design consultation)" 
                        value={paymentLinkDescription}
                        onChange={(e) => setPaymentLinkDescription(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                      />
                      <input 
                        type="text" 
                        placeholder="Client name (optional)" 
                        value={paymentLinkClient}
                        onChange={(e) => setPaymentLinkClient(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                      />
                      <button 
                        onClick={handleCreatePaymentLink}
                        disabled={!squareStatus?.connected || !paymentLinkAmount || !paymentLinkDescription || generatingLink}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#3D5A3B] text-white rounded text-xs font-medium hover:bg-[#3D5A3B]/90 transition-colors disabled:opacity-50"
                      >
                        {generatingLink ? <Loader2 size={12} className="animate-spin" /> : <LinkIcon size={12} />}
                        {generatingLink ? 'Creating...' : 'Create Payment Link'}
                      </button>
                      {generatedPaymentLink && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-[0.65rem] text-green-700 mb-1">Payment link created!</p>
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={generatedPaymentLink} 
                              readOnly 
                              className="flex-1 text-[0.6rem] px-2 py-1 border rounded bg-white"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(generatedPaymentLink);
                                toast({ title: "Copied!", description: "Payment link copied to clipboard" });
                              }}
                              className="px-2 py-1 text-[0.6rem] bg-black text-white rounded hover:bg-gray-800"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pay Vendor Section */}
                  <div className="border-t border-[#e5e8f2] pt-3">
                    <h4 className="text-[0.65rem] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                      <Send size={10} /> Pay a Vendor
                    </h4>
                    <div className="space-y-2">
                      <select 
                        value={selectedPaymentClient || ""}
                        onChange={(e) => setSelectedPaymentClient(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                      >
                        <option value="">Select client...</option>
                        {clients.map((c, i) => (
                          <option key={i} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <select 
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                      >
                        <option value="">Choose vendor...</option>
                        {vendors.map((v, i) => (
                          <option key={i} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input 
                          type="number" 
                          placeholder="Amount" 
                          value={vendorPaymentAmount}
                          onChange={(e) => setVendorPaymentAmount(e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                        />
                      </div>
                      <button 
                        className="w-full flex items-center justify-center gap-2 py-2 border border-black rounded bg-cream hover:bg-[#ebe7de] transition-colors text-xs font-medium disabled:opacity-50"
                        disabled={!selectedPaymentClient || !selectedVendor || !vendorPaymentAmount}
                      >
                        <Send size={12} /> Send Payment
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rolodex */}
              <div className="card-frame rounded-md px-5 py-4">
                <h2 className="font-header text-lg ink-main mb-3 flex items-center gap-2">
                  <Users size={16} /> My Vendor Rolodex
                </h2>
                
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                    <input 
                      type="text" 
                      placeholder="Search vendors..." 
                      value={rolodexSearch}
                      onChange={(e) => setRolodexSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                      data-testid="input-rolodex-search"
                    />
                  </div>
                  <select 
                    value={rolodexTypeFilter}
                    onChange={(e) => setRolodexTypeFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-[#c5ccd8] rounded bg-[#fbfcff] focus:outline-none focus:border-black"
                  >
                    {vendorTypes.map(type => (
                      <option key={type} value={type}>{type === "all" ? "All Types" : type}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredRolodex.map((vendor) => (
                    <div 
                      key={vendor.id} 
                      className={`flex items-center gap-2 p-2 rounded border ${vendor.approved ? 'border-green-200 bg-green-50' : 'border-[#c5ccd8] bg-white'}`}
                      data-testid={`rolodex-vendor-${vendor.id}`}
                    >
                      <div className="w-8 h-8 bg-powder-blue rounded-full flex items-center justify-center text-xs font-semibold">
                        {vendor.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold ink-main truncate">{vendor.name}</p>
                        <p className="text-[0.6rem] ink-soft">{vendor.type}</p>
                      </div>
                      {vendor.approved && (
                        <div className="p-1 bg-green-500 text-white rounded-full" title="Approved">
                          <Check size={10} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Thank You Note Button */}
              <div 
                onClick={() => setShowThankYouModal(true)}
                className="card-frame rounded-md px-5 py-4 cursor-pointer hover:border-black transition-colors group"
                data-testid="button-thank-you"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink/20 rounded-full group-hover:bg-pink/40 transition-colors">
                    <Heart size={20} className="text-pink" />
                  </div>
                  <div>
                    <h3 className="font-header text-sm ink-main">Send a Thank You Note</h3>
                    <p className="text-[0.7rem] ink-soft">Voice or text — show appreciation to your vendors and clients</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Calendar + Dual Chat */}
            <div className="space-y-4">
              {/* Client Chat - AI Assistant (Top) */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-playfair font-medium text-black/70">Client Chat</span>
                  <span className="text-[10px] text-pink">(AI-Powered)</span>
                </div>
                {user && (
                  <AIChatPanel 
                    userId={user.id} 
                    userName={user.firstName || user.email?.split('@')[0] || 'there'}
                    onAvailabilityUpdate={() => {}}
                  />
                )}
              </div>
              
              {/* Business Chat - Internal Team (Below) */}
              {user && (
                <BusinessChatPanel 
                  userId={user.id}
                  userName={user.firstName || user.email?.split('@')[0] || 'there'}
                />
              )}

              {/* Availability Calendar */}
              {user && <AvailabilityCalendar userId={user.id} />}
            </div>
          </section>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="font-header text-lg ink-main mb-4">Invite Someone to Chat</h3>
            <p className="text-xs ink-soft mb-4">
              Enter their email. They'll receive an invite link to create a Beauvette profile.
            </p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button 
                onClick={() => { alert(`Invite sent to ${inviteEmail}`); setInviteEmail(""); setShowInviteModal(false); }}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800"
              >
                Send Invite Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYouModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink/20 rounded-full">
                <Heart size={24} className="text-pink" />
              </div>
              <h3 className="font-header text-lg ink-main">Send a Thank You Note</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">To:</label>
                <select
                  value={thankYouRecipient}
                  onChange={(e) => setThankYouRecipient(e.target.value)}
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                >
                  <option value="">Select recipient...</option>
                  {[...contacts, ...vendors.map((v, i) => ({ id: `v${i}`, name: v.name, role: v.service }))].map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Your Message:</label>
                <div className="flex gap-2">
                  <textarea
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    placeholder="Write your thank you message..."
                    rows={4}
                    className="flex-1 border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                  />
                  <VoiceDictation onTranscript={(t) => setThankYouMessage(prev => prev + " " + t)} size="md" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowThankYouModal(false)} className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSendThankYou} className="px-4 py-2 text-xs rounded bg-pink text-white hover:bg-pink/80 flex items-center gap-2">
                <Heart size={12} /> Send Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
