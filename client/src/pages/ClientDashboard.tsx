import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Upload, X, UserPlus, MessageCircle, Send, Phone, Heart, Star, AlertTriangle, Calendar, Clock, LogOut, Settings } from "lucide-react";
import VoiceDictation from "../components/VoiceDictation";
import { useDashboard } from "@/hooks/useDashboard";
import type { BookingUI as Booking, ClientDashboardChatMessage as ChatMessage, ContactUI as Contact, ViewedVendor } from "@shared/types";

export default function ClientDashboard() {
  const { user, authLoading, isAuthenticated, toast, setLocation } = useDashboard("client");
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "other", text: "Welcome! Select a contact to start chatting.", senderName: "System" }
  ]);
  const [inputText, setInputText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [thankYouRecipient, setThankYouRecipient] = useState("");
  
  const [viewedVendors, setViewedVendors] = useState<ViewedVendor[]>([]);
  
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [serviceType, setServiceType] = useState("Hair & Makeup");
  const [notes, setNotes] = useState("");
  
  // Availability check state
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Check for vendorId in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vendorId = params.get('vendorId');
    if (vendorId) {
      setSelectedVendorId(vendorId);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'client') {
      fetchClientData();
    }
  }, [user]);
  
  const fetchClientData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const bookingsRes = await fetch(`/api/bookings/client/${user.id}`, { credentials: "include" });
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
    
    try {
      const contactsRes = await fetch(`/api/contacts/${user.id}`, { credentials: "include" });
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        if (Array.isArray(data)) {
          setContacts(data);
        }
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
    
    setLoading(false);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !selectedContact) return;
    
    setMessages(prev => [...prev, { from: "me", text: inputText }]);
    setInputText("");

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        from: "other", 
        text: "Thank you for your message. I'll get back to you shortly!",
        senderName: selectedContact.fullName
      }]);
    }, 800);
  };

  const handleVoiceMessage = (transcript: string) => {
    setInputText(prev => prev + " " + transcript);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setMessages([
      { from: "other", text: `Chat started with ${contact.fullName}`, senderName: "System" }
    ]);
  };

  const handleInviteContact = async () => {
    if (!inviteEmail.trim() || !user) return;
    
    try {
      const response = await fetch("/api/chat-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          senderId: user.id,
          inviteeEmail: inviteEmail,
          status: "pending"
        })
      });

      if (response.ok) {
        toast({ title: "Invitation Sent", description: `Invitation sent to ${inviteEmail}` });
        setInviteEmail("");
        setShowInviteModal(false);
      }
    } catch (error) {
      console.error("Error sending invite:", error);
    }
  };

  const checkVendorAvailability = async (vendorId: string, date: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/availability/${vendorId}/check?date=${new Date(date).toISOString()}`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        return data.isAvailable;
      }
    } catch (error) {
      console.error("Error checking availability:", error);
    }
    return true; // Default to available if check fails
  };

  const submitBooking = async (bookingData: any) => {
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const newBooking = await response.json();
        setBookings(prev => [newBooking, ...prev]);
        setShowConfirmation(true);
        setEventDate("");
        setEventLocation("");
        setNotes("");
        setSelectedVendorId(null);
        setTimeout(() => setShowConfirmation(false), 5000);
      } else {
        toast({ title: "Error", description: "Failed to create booking", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({ title: "Error", description: "Error creating booking", variant: "destructive" });
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventDate || !eventLocation || !user) {
      toast({ title: "Missing Information", description: "Please fill in event date and location", variant: "destructive" });
      return;
    }

    const bookingData = {
      artistId: selectedVendorId,
      plannerId: null,
      status: "pending",
      eventDate: new Date(eventDate).toISOString(),
      location: eventLocation,
      serviceType,
      notes: notes || null,
      inspirationPhotos: null
    };

    // If a specific vendor is selected, check their availability first
    if (selectedVendorId) {
      setCheckingAvailability(true);
      const isAvailable = await checkVendorAvailability(selectedVendorId, eventDate);
      setCheckingAvailability(false);

      if (!isAvailable) {
        // Vendor is not available - show modal with chat option
        setPendingBookingData(bookingData);
        setShowUnavailableModal(true);
        return;
      }
    }

    // Vendor is available or no specific vendor selected - proceed with booking
    await submitBooking(bookingData);
  };

  const handleSendChatAnyway = async () => {
    // Close the modal
    setShowUnavailableModal(false);
    
    if (!selectedVendorId) {
      toast({ 
        title: "Error", 
        description: "No vendor selected for chat.",
        variant: "destructive" 
      });
      return;
    }

    try {
      // First check if vendor is already in contacts
      let vendorContact = contacts.find(c => c.id === selectedVendorId);
      
      // If not in contacts, fetch vendor info and add them
      if (!vendorContact) {
        const response = await fetch(`/api/users/${selectedVendorId}`, { credentials: "include" });
        if (response.ok) {
          const vendorUser = await response.json();
          vendorContact = {
            id: vendorUser.id,
            fullName: vendorUser.firstName && vendorUser.lastName 
              ? `${vendorUser.firstName} ${vendorUser.lastName}` 
              : vendorUser.firstName || vendorUser.email || 'Vendor',
            email: vendorUser.email || '',
            role: vendorUser.role || 'artist'
          };
          // Add to contacts list locally
          setContacts(prev => [...prev, vendorContact!]);
        } else {
          // Fallback: create a placeholder contact
          vendorContact = {
            id: selectedVendorId,
            fullName: 'Selected Vendor',
            email: '',
            role: 'artist'
          };
        }
      }

      // Set up the chat with the vendor
      setSelectedContact(vendorContact);
      const inquiryMessage = `Hi! I'm interested in booking you for ${serviceType} on ${eventDate} at ${eventLocation}. I saw you might not be available that day - is there any flexibility or alternative dates you could suggest?`;
      setMessages([
        { from: "other", text: `Chat started with ${vendorContact.fullName}`, senderName: "System" },
        { from: "me", text: inquiryMessage }
      ]);
      
      toast({ 
        title: "Chat Started", 
        description: `You can now message ${vendorContact.fullName} directly about your booking.` 
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({ 
        title: "Error", 
        description: "Failed to start chat with vendor.",
        variant: "destructive" 
      });
    }
    
    // Clear the pending booking
    setPendingBookingData(null);
    setEventDate("");
    setEventLocation("");
    setNotes("");
  };

  const handleProceedAnyway = async () => {
    setShowUnavailableModal(false);
    if (pendingBookingData) {
      await submitBooking(pendingBookingData);
    }
    setPendingBookingData(null);
  };

  const removeViewedVendor = (vendorId: string) => {
    setViewedVendors(prev => prev.filter(v => v.id !== vendorId));
  };

  const handleSendThankYou = () => {
    if (!thankYouMessage.trim() || !thankYouRecipient) return;
    toast({ title: "Thank You Sent", description: `Thank you note sent to ${thankYouRecipient}!` });
    setThankYouMessage("");
    setThankYouRecipient("");
    setShowThankYouModal(false);
  };

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
      <div className="max-w-6xl mx-auto frame-outer shadow-sm">
        <div className="frame-inner">
          <header className="flex items-baseline justify-between mb-6">
            <div>
              <h1 className="font-script text-3xl ink-main">
                Your Private Secretary
              </h1>
              <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] ink-soft">
                Beauty Booking Made Simple
              </p>
              <p className="mt-2 font-script text-xl ink-main">
                Bonjour, {user?.firstName || 'there'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/settings" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-settings">
                <Settings size={14} /> Settings
              </Link>
              <a href="/api/logout" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-logout">
                <LogOut size={14} /> Logout
              </a>
              <Link href="/" className="text-[0.7rem] ink-soft underline" data-testid="link-back">
                Back to home
              </Link>
            </div>
          </header>

          <section className="grid md:grid-cols-3 gap-6 items-start">
            {/* LEFT: booking form & inspiration */}
            <div className="md:col-span-2 space-y-6">
              {/* Vendor Search */}
              <div className="card-frame rounded-md px-5 py-4">
                <h2 className="font-header text-lg ink-main mb-2">
                  Search for Vendors
                </h2>
                <p className="text-xs ink-soft mb-3">
                  Find available vendors for your special day. Only vendors with open dates will appear.
                </p>

                <form className="space-y-3 text-xs" onSubmit={(e) => {
                  e.preventDefault();
                  const params = new URLSearchParams();
                  if (eventDate) params.set('date', eventDate);
                  if (eventLocation) params.set('location', eventLocation);
                  if (serviceType) params.set('service', serviceType);
                  setLocation(`/search?${params.toString()}`);
                }}>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.7rem]">
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6d7280]"
                        data-testid="input-search-date"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.7rem]">
                        Location
                      </label>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Napa, Carmel, San Francisco…"
                        className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6d7280]"
                        data-testid="input-search-location"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.7rem]">
                      Service Category
                    </label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6d7280]"
                      data-testid="select-service-category"
                    >
                      <option value="">All Categories</option>
                      <option value="Hair & Makeup">Hair & Makeup</option>
                      <option value="Makeup Only">Makeup Only</option>
                      <option value="Hair Only">Hair Only</option>
                      <option value="Photography">Photography</option>
                      <option value="Videography">Videography</option>
                      <option value="Florals">Florals</option>
                      <option value="Wedding Planner">Wedding Planner</option>
                      <option value="Catering">Catering</option>
                      <option value="DJ & Music">DJ & Music</option>
                      <option value="Officiant">Officiant</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-black text-white text-sm font-semibold tracking-wide hover:bg-gray-800 transition-colors cursor-pointer"
                    data-testid="button-search-vendors"
                  >
                    Search Available Vendors
                  </button>
                </form>
              </div>

              {/* My Calendar */}
              <div className="card-frame rounded-md px-5 py-4">
                <h2 className="font-header text-lg ink-main mb-3 flex items-center gap-2">
                  <Calendar size={16} /> My Event Calendar
                </h2>
                {bookings.length === 0 ? (
                  <p className="text-xs ink-soft">No upcoming events. Book your first artist above!</p>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="flex items-center gap-3 border border-[#d1d5e0] bg-[#fbfcff] rounded p-3"
                        data-testid={`calendar-event-${booking.id}`}
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-powder-blue rounded flex flex-col items-center justify-center">
                          <span className="text-[0.6rem] uppercase">
                            {new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(booking.eventDate).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold ink-main truncate">{booking.serviceType}</p>
                          <p className="text-[0.7rem] ink-soft truncate">{booking.location}</p>
                        </div>
                        <span className={`text-[0.6rem] uppercase px-2 py-1 rounded whitespace-nowrap ${
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          booking.status === 'declined' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recently Viewed Vendors */}
              <div className="card-frame rounded-md px-5 py-4">
                <h2 className="font-header text-lg ink-main mb-3 flex items-center gap-2">
                  <Clock size={16} /> Recently Viewed Vendors
                </h2>
                {viewedVendors.length === 0 ? (
                  <p className="text-xs ink-soft">No vendors viewed yet. Start searching to see your history.</p>
                ) : (
                  <div className="space-y-2">
                    {viewedVendors.map((vendor) => (
                      <div 
                        key={vendor.id} 
                        className="flex items-center justify-between border border-[#d1d5e0] bg-[#fbfcff] rounded p-3"
                        data-testid={`viewed-vendor-${vendor.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pink rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {vendor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold ink-main">{vendor.name}</p>
                            <p className="text-[0.7rem] ink-soft">{vendor.service}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-xs">{vendor.rating}</span>
                          </div>
                          <button 
                            onClick={() => removeViewedVendor(vendor.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove from list"
                            data-testid={`button-remove-vendor-${vendor.id}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Prompts */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Thank You / Review */}
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
                      <p className="text-[0.7rem] ink-soft">Or write a review for your artist</p>
                    </div>
                  </div>
                </div>

                {/* Emergency */}
                <div 
                  onClick={() => setShowEmergencyModal(true)}
                  className="card-frame rounded-md px-5 py-4 cursor-pointer hover:border-red-500 transition-colors group border-red-200"
                  data-testid="button-emergency"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                      <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-header text-sm ink-main">Need Emergency Help?</h3>
                      <p className="text-[0.7rem] ink-soft">Click here for immediate support</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Chat */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-header text-lg ink-main">
                    Messages
                  </h2>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1 text-[0.7rem] ink-soft hover:ink-main transition-colors"
                    data-testid="button-invite-contact"
                  >
                    <UserPlus size={14} /> Invite
                  </button>
                </div>
                
                <div className="h-[400px] border border-[#d1d5e0] bg-[#fbfcff] flex flex-col text-[0.8rem] rounded-md">
                  {/* Contacts List */}
                  <div className="border-b border-[#e2e4ef] p-2 bg-white rounded-t-md max-h-[120px] overflow-y-auto">
                    <label className="block text-[0.65rem] uppercase tracking-wide text-gray-500 mb-2">Your Contacts:</label>
                    {contacts.length === 0 ? (
                      <p className="text-xs text-gray-400">No contacts yet. Invite someone to chat!</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {contacts.map((contact: Contact) => (
                          <button
                            key={contact.id}
                            onClick={() => handleSelectContact(contact)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${
                              selectedContact?.id === contact.id 
                                ? "bg-powder-blue border-black text-black" 
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                            }`}
                            data-testid={`button-contact-${contact.id}`}
                          >
                            <MessageCircle size={10} />
                            <span>{contact.fullName}</span>
                            <span className="text-[0.6rem] text-gray-400 capitalize">({contact.role})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div className={`max-w-[85%] ${msg.from === 'me' ? 'text-right' : 'text-left'}`}>
                          {msg.senderName && msg.from !== 'me' && (
                            <p className="text-[0.6rem] text-gray-400 mb-0.5">{msg.senderName}</p>
                          )}
                          <div className={`rounded-xl px-3 py-1.5 inline-block ${
                            msg.from === 'me' 
                              ? 'rounded-br-none bubble-mine' 
                              : 'rounded-bl-none bubble-other'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chat Input with Voice */}
                  <div className="border-t border-[#e2e4ef] p-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={selectedContact ? `Message ${selectedContact.fullName}...` : "Select a contact first..."}
                      disabled={!selectedContact}
                      className="flex-1 text-xs border border-[#c5ccd8] rounded px-2 py-1.5 bg-[#fbfcff] focus:outline-none focus:ring-1 focus:ring-[#6d7280] disabled:opacity-50"
                      data-testid="input-message"
                    />
                    <VoiceDictation onTranscript={handleVoiceMessage} />
                    <button
                      onClick={sendMessage}
                      disabled={!selectedContact}
                      className="text-xs px-3 py-1.5 rounded btn-soft transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      data-testid="button-send-message"
                    >
                      <Send size={12} /> Send
                    </button>
                  </div>
                </div>
              </div>
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
              Enter their email address. They'll need to create a profile to start chatting with you.
            </p>
            
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
              data-testid="input-invite-email"
            />
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                data-testid="button-cancel-invite"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteContact}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800 transition-colors"
                data-testid="button-send-invite"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="font-header text-lg ink-main">Emergency Support</h3>
            </div>
            <p className="text-xs ink-soft mb-4">
              We're here to help! Choose how you'd like to reach us:
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowEmergencyModal(false);
                  const supportContact = { id: "support", fullName: "Support", role: "support", email: "violet@beauvette.com" };
                  handleSelectContact(supportContact);
                }}
                className="w-full flex items-center gap-3 p-3 border border-[#c5ccd8] rounded hover:border-black transition-colors"
                data-testid="button-emergency-chat"
              >
                <MessageCircle size={20} />
                <div className="text-left">
                  <p className="text-sm font-semibold">Start Emergency Chat</p>
                  <p className="text-[0.7rem] ink-soft">Get help via chat immediately</p>
                </div>
              </button>

              <button
                onClick={() => window.open('tel:+15551234567')}
                className="w-full flex items-center gap-3 p-3 border border-red-200 rounded hover:border-red-500 hover:bg-red-50 transition-colors"
                data-testid="button-emergency-call"
              >
                <Phone size={20} className="text-red-500" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-red-600">Call Violet Directly</p>
                  <p className="text-[0.7rem] ink-soft">For urgent matters only</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full mt-4 px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
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
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Select recipient...</option>
                  {contacts.map((c: Contact) => (
                    <option key={c.id} value={c.fullName}>{c.fullName} ({c.role})</option>
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
                    className="flex-1 border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <VoiceDictation onTranscript={(t) => setThankYouMessage(prev => prev + " " + t)} size="md" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs ink-soft">
                <Star size={12} className="text-yellow-500" />
                <span>Or leave a public review for others to see</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowThankYouModal(false)}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendThankYou}
                className="px-4 py-2 text-xs rounded bg-pink text-white hover:bg-pink/80 transition-colors flex items-center gap-2"
              >
                <Heart size={12} /> Send Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unavailable Vendor Modal */}
      {showUnavailableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Calendar size={24} className="text-yellow-600" />
              </div>
              <h3 className="font-header text-lg ink-main">Date Not Available</h3>
            </div>
            
            <p className="text-sm ink-soft mb-4">
              This vendor isn't showing availability for <span className="font-semibold">{eventDate}</span>. 
              They may still be able to accommodate you.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleSendChatAnyway}
                className="w-full flex items-center gap-3 p-3 border-2 border-black rounded hover:bg-gray-50 transition-colors"
                data-testid="button-chat-anyway"
              >
                <MessageCircle size={20} />
                <div className="text-left">
                  <p className="text-sm font-semibold">Send a Chat Instead</p>
                  <p className="text-[0.7rem] ink-soft">Ask about their schedule flexibility</p>
                </div>
              </button>

              <button
                onClick={handleProceedAnyway}
                className="w-full flex items-center gap-3 p-3 border border-[#c5ccd8] rounded hover:border-black transition-colors"
                data-testid="button-send-request-anyway"
              >
                <Send size={20} />
                <div className="text-left">
                  <p className="text-sm font-semibold">Send Request Anyway</p>
                  <p className="text-[0.7rem] ink-soft">They can still accept or decline</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowUnavailableModal(false);
                setPendingBookingData(null);
              }}
              className="w-full mt-4 px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 transition-colors"
              data-testid="button-cancel-unavailable"
            >
              Choose a Different Date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
