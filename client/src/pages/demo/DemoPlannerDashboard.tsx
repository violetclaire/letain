import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Users, ClipboardList, MessageSquare, ArrowLeft, CheckCircle, Clock, MapPin } from "lucide-react";
import { demoUser, demoPlannerClients } from "@/lib/demoData";

export default function DemoPlannerDashboard() {
  const [, setLocation] = useLocation();
  const user = demoUser.planner;
  const clients = demoPlannerClients;

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
                <p className="text-xs text-forest uppercase tracking-widest">Demo Mode - Planner</p>
                <h1 className="font-script text-2xl">Beauvette</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-black/60">{user.firstName} {user.lastName}</span>
              <div className="w-10 h-10 rounded-full bg-forest/20 flex items-center justify-center text-forest font-medium">
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
              <div className="p-2 bg-forest/10 rounded-lg">
                <Users size={20} className="text-forest" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-black/50">Active Clients</p>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-black/50">Upcoming Events</p>
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
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-xs text-black/50">Pending Vendors</p>
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
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-black/50">Confirmed Vendors</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
        >
          <h2 className="font-header text-xl mb-6">Your Clients</h2>
          <div className="space-y-6">
            {clients.map((client) => (
              <div
                key={client.id}
                className="border border-black/10 rounded-lg p-5"
                data-testid={`card-client-${client.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-header text-lg">
                      {client.client.firstName} {client.client.lastName}
                    </h3>
                    <p className="text-sm text-black/60">{client.eventType} • {client.venue}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{client.eventDate.toLocaleDateString()}</p>
                    <p className="text-xs text-black/50">Budget: {client.budget}</p>
                  </div>
                </div>

                <div className="border-t border-black/10 pt-4">
                  <p className="text-xs uppercase tracking-wide text-black/50 mb-3">Vendors</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {client.vendors.map((vendor, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          vendor.status === "confirmed" ? "bg-green-50" : "bg-yellow-50"
                        }`}
                      >
                        <div>
                          <p className="text-xs text-black/50">{vendor.type}</p>
                          <p className="text-sm font-medium">{vendor.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          vendor.status === "confirmed" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {vendor.status}
                        </span>
                      </div>
                    ))}
                    <button className="flex items-center justify-center p-3 rounded-lg border border-dashed border-black/20 hover:border-black/40 transition-colors">
                      <span className="text-sm text-black/50">+ Add Vendor</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
