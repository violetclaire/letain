import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AIOnboardingChat from "../components/AIOnboardingChat";
import VintageCalendar from "../components/VintageCalendar";

export default function Landing() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  const openElevator = () => {
    setIsOpen(true);
  };

  const handleDatesMentioned = (dates: Date[]) => {
    setBookedDates(prev => {
      const combined = [...prev, ...dates];
      const unique = combined.filter((date, index, self) => 
        self.findIndex(d => d.getTime() === date.getTime()) === index
      );
      return unique.sort((a, b) => a.getTime() - b.getTime());
    });
  };

  return (
    <div 
      className="min-h-screen overflow-y-auto overflow-x-hidden font-sans"
      style={{ 
        backgroundColor: '#FFF9F0',
        fontFamily: 'Georgia, Garamond, serif'
      }}
    >
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={openElevator}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <motion.div
              className="absolute left-0 top-0 w-1/2 h-full border-r overflow-hidden"
              style={{ 
                backgroundColor: '#F5EDE0',
                borderColor: '#D4A574'
              }}
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-0 opacity-10">
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 40px,
                      #D4A574 40px,
                      #D4A574 41px
                    ),
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 40px,
                      #D4A574 40px,
                      #D4A574 41px
                    )`
                  }}
                />
              </div>
            </motion.div>

            <motion.div
              className="absolute right-0 top-0 w-1/2 h-full border-l overflow-hidden"
              style={{ 
                backgroundColor: '#F5EDE0',
                borderColor: '#D4A574'
              }}
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-0 opacity-10">
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 40px,
                      #D4A574 40px,
                      #D4A574 41px
                    ),
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 40px,
                      #D4A574 40px,
                      #D4A574 41px
                    )`
                  }}
                />
              </div>
            </motion.div>

            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div 
                className="p-6 rounded-lg shadow-xl"
                style={{ 
                  backgroundColor: '#FFF9F0',
                  border: '3px solid #D4A574'
                }}
              >
                <div 
                  className="px-12 py-8"
                  style={{ 
                    borderTop: '1px solid #D4A574',
                    borderBottom: '1px solid #D4A574'
                  }}
                >
                  <h1 
                    className="text-5xl md:text-6xl mb-4"
                    style={{ 
                      color: '#5D4037',
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontStyle: 'italic'
                    }}
                  >
                    Beauvette
                  </h1>
                  <p 
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{ color: '#8B7355' }}
                  >
                    The First Concierge for Beauty
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={`min-h-screen transition-opacity duration-1000 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <header 
          className="w-full px-6 py-4 flex items-center justify-between border-b"
          style={{ 
            backgroundColor: '#FFF9F0',
            borderColor: '#E8DFD0'
          }}
        >
          <h1 
            className="text-2xl"
            style={{ 
              color: '#5D4037',
              fontFamily: 'Playfair Display, Georgia, serif',
              fontStyle: 'italic'
            }}
          >
            Beauvette
          </h1>
          <button
            onClick={() => setLocation("/login")}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ 
              color: '#8B7355',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5EDE0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            data-testid="button-sign-in"
          >
            Sign in
          </button>
        </header>

        <main className="px-4 py-8 max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 
              className="text-3xl md:text-4xl mb-3"
              style={{ 
                color: '#5D4037',
                fontFamily: 'Playfair Display, Georgia, serif'
              }}
            >
              Beauvette
            </h2>
            <p 
              className="text-lg mb-2"
              style={{ color: '#8B7355' }}
            >
              The first concierge for beauty artists and clients
            </p>
            <p 
              className="text-sm italic"
              style={{ color: '#A89F8F' }}
            >
              We answer the #1 question: "Are you available for my date?"
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="order-1 lg:order-1">
              <AIOnboardingChat onDatesMentioned={handleDatesMentioned} />
            </div>

            <div className="order-2 lg:order-2">
              <VintageCalendar 
                bookedDates={bookedDates}
                onDatesChange={setBookedDates}
                minYear={2026}
                maxYear={2027}
              />
              
              <div 
                className="mt-4 p-4 rounded-lg text-center"
                style={{ 
                  backgroundColor: '#F5EDE0',
                  border: '1px solid #E8DFD0'
                }}
              >
                <p 
                  className="text-sm mb-3"
                  style={{ color: '#5D4037' }}
                >
                  Tap dates on the calendar to mark your availability
                </p>
                <p 
                  className="text-xs"
                  style={{ color: '#8B7355' }}
                >
                  Or tell the assistant about your event dates
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer 
          className="w-full px-6 py-6 mt-8 border-t text-center"
          style={{ 
            backgroundColor: '#F5EDE0',
            borderColor: '#E8DFD0'
          }}
        >
          <p 
            className="text-sm mb-4"
            style={{ color: '#8B7355' }}
          >
            Are you a beauty artist or vendor?
          </p>
          <button
            onClick={() => setLocation("/register?role=artist")}
            className="px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: '#C85A54',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#B04A44';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#C85A54';
            }}
            data-testid="button-vendor-create-account"
          >
            Create Vendor Account
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              onClick={() => setLocation("/register?role=client")}
              className="text-xs transition-colors"
              style={{ color: '#A89F8F' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#5D4037';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#A89F8F';
              }}
              data-testid="button-client-register"
            >
              Client Registration
            </button>
            <span style={{ color: '#D4A574' }}>|</span>
            <button
              onClick={() => setLocation("/register?role=planner")}
              className="text-xs transition-colors"
              style={{ color: '#A89F8F' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#5D4037';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#A89F8F';
              }}
              data-testid="button-planner-register"
            >
              Planner Registration
            </button>
            <span style={{ color: '#D4A574' }}>|</span>
            <button
              onClick={() => setLocation("/admin")}
              className="text-xs transition-colors"
              style={{ color: '#A89F8F' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#5D4037';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#A89F8F';
              }}
              data-testid="button-admin-login"
            >
              Admin
            </button>
          </div>
          
          <p 
            className="mt-6 text-xs"
            style={{ color: '#C5B8A8' }}
          >
            © 2025 Beauvette. For life's most important days.
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
