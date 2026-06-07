import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Users, AlertTriangle, Shield, Activity, ArrowLeft, TrendingUp, TrendingDown, MessageSquare } from "lucide-react";
import { demoCDIScores, demoSupportCases } from "@/lib/demoData";

export default function DemoAdminDashboard() {
  const [, setLocation] = useLocation();
  const cdiScores = demoCDIScores;
  const supportCases = demoSupportCases;

  const criticalClients = cdiScores.filter(c => c.riskLevel === "critical" || c.riskLevel === "high");

  return (
    <div className="min-h-screen bg-powder-blue">
      <div className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/demo")}
                className="text-white/50 hover:text-white transition-colors"
                data-testid="button-back-demo"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest">Demo Mode - Admin</p>
                <h1 className="font-script text-2xl">Briarwood Admin</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">Admin Dashboard</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                A
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-black/50">Total Users</p>
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
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalClients.length}</p>
                <p className="text-xs text-black/50">High Risk Clients</p>
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
                <MessageSquare size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supportCases.length}</p>
                <p className="text-xs text-black/50">Open Cases</p>
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
                <Activity size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">98%</p>
                <p className="text-xs text-black/50">Platform Health</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-header text-xl">Choreography Depth Index (CDI)</h2>
              <span className="text-xs text-black/50 uppercase tracking-wide">AI Monitoring</span>
            </div>
            
            <div className="space-y-3">
              {cdiScores.map((client) => (
                <div
                  key={client.clientId}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    client.riskLevel === "critical" ? "bg-red-50 border border-red-200" :
                    client.riskLevel === "high" ? "bg-orange-50 border border-orange-200" :
                    client.riskLevel === "medium" ? "bg-yellow-50 border border-yellow-200" :
                    "bg-green-50 border border-green-200"
                  }`}
                  data-testid={`cdi-row-${client.clientId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      client.riskLevel === "critical" ? "bg-red-200 text-red-700" :
                      client.riskLevel === "high" ? "bg-orange-200 text-orange-700" :
                      client.riskLevel === "medium" ? "bg-yellow-200 text-yellow-700" :
                      "bg-green-200 text-green-700"
                    }`}>
                      {client.firstName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{client.firstName} {client.lastName}</p>
                      <p className="text-xs text-black/50">
                        {client.lastEvent ? `Last: ${client.lastEvent.replace(/_/g, " ")}` : "No recent events"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className={`text-lg font-bold ${
                        client.riskLevel === "critical" ? "text-red-600" :
                        client.riskLevel === "high" ? "text-orange-600" :
                        client.riskLevel === "medium" ? "text-yellow-600" :
                        "text-green-600"
                      }`}>
                        {client.score}
                      </span>
                      {client.score > 50 ? (
                        <TrendingUp size={14} className="text-red-500" />
                      ) : (
                        <TrendingDown size={14} className="text-green-500" />
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      client.riskLevel === "critical" ? "bg-red-200 text-red-700" :
                      client.riskLevel === "high" ? "bg-orange-200 text-orange-700" :
                      client.riskLevel === "medium" ? "bg-yellow-200 text-yellow-700" :
                      "bg-green-200 text-green-700"
                    }`}>
                      {client.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-cream rounded-lg shadow-sm border border-black/10 p-6"
          >
            <h2 className="font-header text-xl mb-4">Support Cases</h2>
            
            <div className="space-y-4">
              {supportCases.map((supportCase) => (
                <div
                  key={supportCase.id}
                  className="border border-black/10 rounded-lg p-4"
                  data-testid={`support-case-${supportCase.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{supportCase.subject}</h3>
                      <p className="text-sm text-black/60">
                        {supportCase.client.firstName} {supportCase.client.lastName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        supportCase.priority === "high" ? "bg-red-100 text-red-700" :
                        supportCase.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {supportCase.priority}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        supportCase.status === "open" ? "bg-blue-100 text-blue-700" :
                        supportCase.status === "in_progress" ? "bg-purple-100 text-purple-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {supportCase.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-black/60 mb-3">{supportCase.description}</p>
                  <div className="flex gap-2">
                    <button className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors">
                      View Details
                    </button>
                    <button className="text-xs border border-black/20 px-3 py-1.5 rounded hover:border-black transition-colors">
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
