import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, FileText, Search, Settings, ArrowLeft, Clock, MapPin, Users } from "lucide-react";
import { demoUser, demoBookings, demoMessages } from "@/lib/demoData";

export default function DemoClientDashboard() {
  const [, setLocation] = useLocation();
  const user = demoUser.client;
  const bookings = demoBookings.filter(b => b.clientId === user.id || b.clientId === "demo-client-001");
  const messages = demoMessages;

  const [activeTab, setActiveTab] = useState<"bookings" | "messages">("bookings");

  return (
    <div className="min-h-screen bg-powder-blue">
      <div className="bg-cream border-b border-black/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/demo")}
                className="text-black/50 hover:text-black transition-colors"
                data-testid="button-back-demo"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="text-xs text-pink uppercase tracking-widest">Demo Mode</p>
                <h1 className="font-script text-2xl">Briarwood</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-black/60">Welcome, {user.firstName}</span>
              <div className="w-10 h-10 rounded-full bg-pink/20 flex items-center justify-center text-pink font-medium">
                {user.firstName[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-header text-xl">Your Bookings</h2>
                <button
                  onClick={() => setLocation("/search")}
                  className="flex items-center gap-2 text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                  data-testid="button-find-vendors"
                >
                  <Search size={14} /> Find Vendors
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-black/20 mb-4" size={48} />
                  <p className="text-black/60">No bookings yet</p>
                  <p className="text-sm text-black/40 mt-1">Start by searching for vendors</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-black/10 rounded-lg p-4 hover:border-black/20 transition-colors"
                      data-testid={`card-booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-black">{booking.eventType}</h3>
                          <p className="text-sm text-black/60">{booking.artist?.firstName} {booking.artist?.lastName}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                          booking.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-black/50">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {booking.eventDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {booking.eventLocation}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {booking.partySize} people
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-xl mb-4">Recent Messages</h2>
              <div className="space-y-3">
                {messages.slice(0, 3).map((msg) => (
                  <div key={msg.id} className="flex gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-pink/20 flex items-center justify-center text-pink text-sm font-medium">
                      {msg.sender.firstName[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{msg.sender.firstName} {msg.sender.lastName}</p>
                      <p className="text-sm text-black/60 line-clamp-1">{msg.content}</p>
                    </div>
                    <span className="text-xs text-black/40">
                      {msg.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-lg mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <Search size={18} className="text-black/50" />
                  <span className="text-sm">Search Vendors</span>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <MessageSquare size={18} className="text-black/50" />
                  <span className="text-sm">Messages</span>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <FileText size={18} className="text-black/50" />
                  <span className="text-sm">Contracts</span>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <Settings size={18} className="text-black/50" />
                  <span className="text-sm">Settings</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-lg mb-4">Upcoming</h2>
              {bookings.filter(b => b.status === "confirmed").slice(0, 2).map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-pink/10 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-xs text-pink font-medium">
                      {booking.eventDate.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-pink">
                      {booking.eventDate.getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{booking.eventType}</p>
                    <p className="text-xs text-black/50">{booking.eventLocation}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
