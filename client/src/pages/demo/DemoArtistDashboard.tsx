import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, FileText, DollarSign, Settings, ArrowLeft, Clock, MapPin, Users, CheckCircle, XCircle, Palette } from "lucide-react";
import { demoUser, demoBookings, demoContracts, demoServices, demoArtistProfile } from "@/lib/demoData";

export default function DemoArtistDashboard() {
  const [, setLocation] = useLocation();
  const user = demoUser.artist;
  const profile = demoArtistProfile;
  const bookings = demoBookings;
  const contracts = demoContracts;
  const services = demoServices;

  const pendingBookings = bookings.filter(b => b.status === "pending");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const pendingContracts = contracts.filter(c => c.status === "pending");

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
                <p className="text-xs text-gold uppercase tracking-widest">Demo Mode - Vendor</p>
                <h1 className="font-script text-2xl">Beauvette</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-black/60">{profile.businessName}</span>
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-medium">
                {user.firstName[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cream rounded-lg shadow-sm border border-black/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingBookings.length}</p>
                <p className="text-xs text-black/50">Pending Requests</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-cream rounded-lg shadow-sm border border-black/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmedBookings.length}</p>
                <p className="text-xs text-black/50">Confirmed</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-cream rounded-lg shadow-sm border border-black/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingContracts.length}</p>
                <p className="text-xs text-black/50">Awaiting Signature</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-cream rounded-lg shadow-sm border border-black/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink/20 rounded-lg">
                <DollarSign size={20} className="text-pink" />
              </div>
              <div>
                <p className="text-2xl font-bold">$18,500</p>
                <p className="text-xs text-black/50">This Month</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-xl mb-4">Booking Requests</h2>
              {pendingBookings.length === 0 ? (
                <p className="text-black/50 text-center py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-black/10 rounded-lg p-4"
                      data-testid={`card-booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{booking.client?.firstName} {booking.client?.lastName}</h3>
                          <p className="text-sm text-black/60">{booking.eventType}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-black/50 mb-4">
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
                      <div className="flex gap-2">
                        <button className="flex-1 bg-black text-white text-xs uppercase tracking-wide py-2 rounded hover:bg-gray-800 transition-colors">
                          Accept
                        </button>
                        <button className="flex-1 border border-black/20 text-xs uppercase tracking-wide py-2 rounded hover:border-black transition-colors">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-xl mb-4">Upcoming Events</h2>
              <div className="space-y-3">
                {confirmedBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 p-3 bg-white/50 rounded-lg">
                    <div className="w-14 h-14 bg-green-50 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs text-green-600 font-medium">
                        {booking.eventDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        {booking.eventDate.getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{booking.client?.firstName} {booking.client?.lastName}</p>
                      <p className="text-sm text-black/50">{booking.eventLocation}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Confirmed
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
              transition={{ delay: 0.3 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-lg mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <Calendar size={18} className="text-black/50" />
                  <span className="text-sm">Manage Availability</span>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <Palette size={18} className="text-black/50" />
                  <span className="text-sm">Edit Services</span>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <FileText size={18} className="text-black/50" />
                  <span className="text-sm">Contract Templates</span>
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-3">
                  <Settings size={18} className="text-black/50" />
                  <span className="text-sm">Profile Settings</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
            >
              <h2 className="font-header text-lg mb-4">Your Services</h2>
              <div className="space-y-3">
                {services.slice(0, 3).map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-2 border-b border-black/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-black/50">{service.duration} min</p>
                    </div>
                    <span className="text-sm font-medium">${service.price}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
