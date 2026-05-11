import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Calendar, Clock, Bell, CheckCircle, ArrowRight, ArrowLeft, Loader2, Sparkles, Target, MessageSquare, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = "calendar" | "hold" | "sla" | "notifications" | "practice" | "complete";

interface OnboardingState {
  calendarConnected: boolean;
  defaultHoldHours: number;
  slaTargets: {
    firstResponseHours: number;
    terminalStateHours: number;
    holdWindowHours: number;
  };
  notificationChannels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  notificationTypes: {
    newInquiries: boolean;
    holdExpiring: boolean;
    slaWarnings: boolean;
    bookingConfirmations: boolean;
  };
}

const defaultState: OnboardingState = {
  calendarConnected: false,
  defaultHoldHours: 72,
  slaTargets: {
    firstResponseHours: 24,
    terminalStateHours: 48,
    holdWindowHours: 72
  },
  notificationChannels: {
    email: true,
    sms: false,
    inApp: true
  },
  notificationTypes: {
    newInquiries: true,
    holdExpiring: true,
    slaWarnings: true,
    bookingConfirmations: true
  }
};

const steps: { id: OnboardingStep; title: string; icon: any }[] = [
  { id: "calendar", title: "Calendar", icon: Calendar },
  { id: "hold", title: "Hold Window", icon: Clock },
  { id: "sla", title: "SLA Targets", icon: Target },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "practice", title: "Practice", icon: Sparkles }
];

export default function VendorOnboarding() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("calendar");
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [saving, setSaving] = useState(false);
  const [seedingInquiries, setSeedingInquiries] = useState(false);
  const [testInquiriesSeeded, setTestInquiriesSeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
      return;
    }
    
    if (isAuthenticated) {
      fetchOnboardingStatus();
    }
  }, [authLoading, isAuthenticated]);

  const fetchOnboardingStatus = async () => {
    try {
      const res = await fetch("/api/vendor/onboarding", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setState({
          calendarConnected: data.calendarConnected || false,
          defaultHoldHours: data.defaultHoldHours || 72,
          slaTargets: data.slaTargets || defaultState.slaTargets,
          notificationChannels: data.onboardingPreferences?.notificationChannels || defaultState.notificationChannels,
          notificationTypes: data.onboardingPreferences?.notificationTypes || defaultState.notificationTypes
        });
        
        if (data.onboardingCompleted) {
          setLocation("/artist");
        }
      }
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
    }
    setLoading(false);
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      await fetch("/api/vendor/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          calendarConnected: state.calendarConnected,
          defaultHoldHours: state.defaultHoldHours,
          slaTargets: state.slaTargets,
          onboardingPreferences: {
            calendarConnected: state.calendarConnected,
            defaultHoldHours: state.defaultHoldHours,
            slaTargets: state.slaTargets,
            notificationChannels: state.notificationChannels,
            notificationTypes: state.notificationTypes
          }
        })
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
    setSaving(false);
  };

  const seedTestInquiries = async () => {
    setSeedingInquiries(true);
    try {
      const res = await fetch("/api/vendor/onboarding/seed-test-inquiries", {
        method: "POST",
        credentials: "include"
      });
      
      if (res.ok) {
        setTestInquiriesSeeded(true);
        toast({
          title: "Test Inquiries Created!",
          description: "3 practice inquiries are now in your inbox. Use them to learn Confirm, Hold, and Propose."
        });
      } else {
        throw new Error("Failed to create test inquiries");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not create test inquiries. Please try again.",
        variant: "destructive"
      });
    }
    setSeedingInquiries(false);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await saveProgress();
      
      const res = await fetch("/api/vendor/onboarding/complete", {
        method: "POST",
        credentials: "include"
      });
      
      if (res.ok) {
        toast({
          title: "Onboarding Complete!",
          description: "You're all set. Welcome!"
        });
        setLocation("/artist");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not complete onboarding. Please try again.",
        variant: "destructive"
      });
    }
    setSaving(false);
  };

  const nextStep = () => {
    saveProgress();
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    } else {
      setCurrentStep("complete");
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const connectCalendar = async () => {
    try {
      const res = await fetch("/api/calendar/auth-url", { credentials: "include" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        toast({
          title: "Calendar Connection",
          description: "Calendar integration coming soon. Skipping for now.",
        });
        setState(prev => ({ ...prev, calendarConnected: true }));
      }
    } catch (error) {
      toast({
        title: "Note",
        description: "Calendar integration available soon. Proceeding without connection.",
      });
      setState(prev => ({ ...prev, calendarConnected: true }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm text-black/60">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-powder-blue">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-script text-4xl ink-main mb-2">Your Private Secretary</h1>
          <p className="text-sm ink-soft uppercase tracking-widest">Vendor Setup</p>
          <p className="mt-2 text-sm ink-soft">Get ready in 5 minutes</p>
        </div>

        {/* Progress Steps */}
        {currentStep !== "complete" && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.id === currentStep;
                const isPast = steps.findIndex(s => s.id === currentStep) > index;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive 
                          ? 'bg-[#262329] text-white' 
                          : isPast 
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-400 border border-gray-200'
                      }`}
                      data-testid={`step-indicator-${step.id}`}
                    >
                      {isPast ? <CheckCircle size={20} /> : <StepIcon size={18} />}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 ${isPast ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="frame-outer shadow-sm">
          <div className="frame-inner p-8">
            
            {/* Step 1: Calendar Connection */}
            {currentStep === "calendar" && (
              <div className="text-center">
                <Calendar size={48} className="mx-auto mb-4 text-[#262329]" />
                <h2 className="text-2xl font-semibold mb-2">Connect Your Calendar</h2>
                <p className="ink-soft mb-6 max-w-md mx-auto">
                  Sync your Google Calendar so clients can see your real availability. 
                  Booked dates will automatically be blocked.
                </p>
                
                <div className="space-y-4">
                  {state.calendarConnected ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span>Calendar Connected!</span>
                    </div>
                  ) : (
                    <button
                      onClick={connectCalendar}
                      className="px-6 py-3 bg-[#262329] text-white rounded-lg hover:bg-[#262329]/90 transition-colors flex items-center gap-2 mx-auto"
                      data-testid="button-connect-calendar"
                    >
                      <Calendar size={18} />
                      Connect Google Calendar
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setState(prev => ({ ...prev, calendarConnected: true }));
                      nextStep();
                    }}
                    className="text-sm ink-soft hover:ink-main underline"
                    data-testid="button-skip-calendar"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Hold Window */}
            {currentStep === "hold" && (
              <div>
                <div className="text-center mb-6">
                  <Clock size={48} className="mx-auto mb-4 text-[#262329]" />
                  <h2 className="text-2xl font-semibold mb-2">Default Hold Window</h2>
                  <p className="ink-soft max-w-md mx-auto">
                    When you place a hold on a date for a client, how long should it last before auto-releasing?
                  </p>
                </div>
                
                <div className="max-w-sm mx-auto space-y-4">
                  {[24, 48, 72, 96, 168].map(hours => (
                    <button
                      key={hours}
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        defaultHoldHours: hours,
                        slaTargets: { ...prev.slaTargets, holdWindowHours: hours }
                      }))}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        state.defaultHoldHours === hours
                          ? 'border-[#262329] bg-[#262329]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`option-hold-${hours}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{hours} hours</span>
                          <span className="ink-soft ml-2">
                            ({hours === 24 ? '1 day' : hours === 48 ? '2 days' : hours === 72 ? '3 days' : hours === 96 ? '4 days' : '1 week'})
                          </span>
                        </div>
                        {state.defaultHoldHours === hours && (
                          <CheckCircle size={20} className="text-green-500" />
                        )}
                      </div>
                      <p className="text-sm ink-soft mt-1">
                        {hours <= 48 && "Quick turnaround - best for high-demand dates"}
                        {hours === 72 && "Standard - gives clients time to decide"}
                        {hours >= 96 && "Extended - for complex decisions or large parties"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: SLA Targets */}
            {currentStep === "sla" && (
              <div>
                <div className="text-center mb-6">
                  <Target size={48} className="mx-auto mb-4 text-[#262329]" />
                  <h2 className="text-2xl font-semibold mb-2">Response Time Goals</h2>
                  <p className="ink-soft max-w-md mx-auto">
                    Set your service level targets. Meeting these helps you earn badges and rank higher in search.
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-6">
                  <div>
                    <label className="block font-medium mb-2">First Response Time</label>
                    <p className="text-sm ink-soft mb-3">How quickly will you respond to new inquiries?</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[4, 12, 24].map(hours => (
                        <button
                          key={hours}
                          onClick={() => setState(prev => ({
                            ...prev,
                            slaTargets: { ...prev.slaTargets, firstResponseHours: hours }
                          }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            state.slaTargets.firstResponseHours === hours
                              ? 'border-[#262329] bg-[#262329]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          data-testid={`sla-response-${hours}`}
                        >
                          <div className="font-medium">{hours}h</div>
                          {hours === 4 && <div className="text-xs text-green-600">⭐ Fast</div>}
                          {hours === 24 && <div className="text-xs ink-soft">Standard</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2">Resolution Time</label>
                    <p className="text-sm ink-soft mb-3">Target time to reach a decision (confirm, decline, or propose)</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[24, 48, 72].map(hours => (
                        <button
                          key={hours}
                          onClick={() => setState(prev => ({
                            ...prev,
                            slaTargets: { ...prev.slaTargets, terminalStateHours: hours }
                          }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            state.slaTargets.terminalStateHours === hours
                              ? 'border-[#262329] bg-[#262329]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          data-testid={`sla-terminal-${hours}`}
                        >
                          <div className="font-medium">{hours}h</div>
                          {hours === 24 && <div className="text-xs text-green-600">⭐ Fast</div>}
                          {hours === 72 && <div className="text-xs ink-soft">Standard</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Notifications */}
            {currentStep === "notifications" && (
              <div>
                <div className="text-center mb-6">
                  <Bell size={48} className="mx-auto mb-4 text-[#262329]" />
                  <h2 className="text-2xl font-semibold mb-2">Notification Preferences</h2>
                  <p className="ink-soft max-w-md mx-auto">
                    How would you like to be notified about important events?
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-6">
                  <div>
                    <label className="block font-medium mb-3">Notification Channels</label>
                    <div className="space-y-3">
                      {[
                        { key: 'email', label: 'Email', desc: 'Receive notifications via email' },
                        { key: 'sms', label: 'SMS', desc: 'Get text message alerts (requires phone)' },
                        { key: 'inApp', label: 'In-App', desc: 'See notifications in your dashboard' }
                      ].map(channel => (
                        <label key={channel.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={state.notificationChannels[channel.key as keyof typeof state.notificationChannels]}
                            onChange={(e) => setState(prev => ({
                              ...prev,
                              notificationChannels: {
                                ...prev.notificationChannels,
                                [channel.key]: e.target.checked
                              }
                            }))}
                            className="mt-1"
                            data-testid={`checkbox-channel-${channel.key}`}
                          />
                          <div>
                            <div className="font-medium">{channel.label}</div>
                            <div className="text-sm ink-soft">{channel.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-3">Notify Me About</label>
                    <div className="space-y-3">
                      {[
                        { key: 'newInquiries', label: 'New Inquiries', desc: 'When a client sends a booking request' },
                        { key: 'holdExpiring', label: 'Hold Expiring', desc: 'Reminder before a hold auto-releases' },
                        { key: 'slaWarnings', label: 'SLA Warnings', desc: 'When response time targets are at risk' },
                        { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'When a client confirms their booking' }
                      ].map(type => (
                        <label key={type.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={state.notificationTypes[type.key as keyof typeof state.notificationTypes]}
                            onChange={(e) => setState(prev => ({
                              ...prev,
                              notificationTypes: {
                                ...prev.notificationTypes,
                                [type.key]: e.target.checked
                              }
                            }))}
                            className="mt-1"
                            data-testid={`checkbox-type-${type.key}`}
                          />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm ink-soft">{type.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Practice */}
            {currentStep === "practice" && (
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-4 text-[#C9A961]" />
                <h2 className="text-2xl font-semibold mb-2">Practice with Test Inquiries</h2>
                <p className="ink-soft mb-6 max-w-md mx-auto">
                  We'll create 3 test inquiries so you can practice the workflow: 
                  <strong className="text-[#262329]"> Confirm</strong>, 
                  <strong className="text-[#262329]"> Hold</strong>, and 
                  <strong className="text-[#262329]"> Propose</strong>.
                </p>
                
                <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-medium mb-4">Your 3 Practice Scenarios:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <div className="font-medium">Emily's Wedding</div>
                        <div className="text-sm ink-soft">Perfect date, ready to confirm immediately</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Clock size={16} />
                      </div>
                      <div>
                        <div className="font-medium">Sarah's Engagement</div>
                        <div className="text-sm ink-soft">Need to check your calendar - practice placing a hold</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={16} />
                      </div>
                      <div>
                        <div className="font-medium">Amanda's Bridal Shower</div>
                        <div className="text-sm ink-soft">Date doesn't work - practice proposing alternatives</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {testInquiriesSeeded ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                    <CheckCircle size={20} />
                    <span>Test inquiries created! Check your inbox after setup.</span>
                  </div>
                ) : (
                  <button
                    onClick={seedTestInquiries}
                    disabled={seedingInquiries}
                    className="px-6 py-3 bg-gradient-to-r from-[#3D5A3B] to-[#C9A961] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto disabled:opacity-50"
                    data-testid="button-seed-inquiries"
                  >
                    {seedingInquiries ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Create Practice Inquiries
                      </>
                    )}
                  </button>
                )}
                
                <p className="text-xs ink-soft mt-4">
                  These are test inquiries marked as practice. They won't affect your real metrics.
                </p>
              </div>
            )}

            {/* Complete */}
            {currentStep === "complete" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
                  <Shield size={40} />
                </div>
                <h2 className="text-2xl font-semibold mb-2">You're All Set!</h2>
                <p className="ink-soft mb-6 max-w-md mx-auto">
                  Your vendor account is configured and ready to receive inquiries. 
                  Welcome!
                </p>
                
                <div className="max-w-sm mx-auto bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
                  <h4 className="font-medium mb-2">Your Settings:</h4>
                  <ul className="space-y-1 ink-soft">
                    <li>• Hold window: {state.defaultHoldHours} hours</li>
                    <li>• First response target: {state.slaTargets.firstResponseHours}h</li>
                    <li>• Resolution target: {state.slaTargets.terminalStateHours}h</li>
                    <li>• Calendar: {state.calendarConnected ? 'Connected' : 'Not connected'}</li>
                  </ul>
                </div>
                
                <button
                  onClick={completeOnboarding}
                  disabled={saving}
                  className="px-8 py-3 bg-[#262329] text-white rounded-lg hover:bg-[#262329]/90 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                  data-testid="button-complete-onboarding"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Navigation */}
            {currentStep !== "complete" && (
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={prevStep}
                  disabled={currentStep === "calendar"}
                  className="px-4 py-2 text-sm ink-soft hover:ink-main flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="button-prev-step"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                
                <button
                  onClick={nextStep}
                  className="px-6 py-2 bg-[#262329] text-white rounded-lg hover:bg-[#262329]/90 transition-colors flex items-center gap-2"
                  data-testid="button-next-step"
                >
                  {currentStep === "practice" ? "Finish Setup" : "Continue"}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Skip Onboarding */}
        {currentStep !== "complete" && (
          <div className="text-center mt-6">
            <Link href="/artist" className="text-sm ink-soft hover:ink-main underline" data-testid="link-skip-onboarding">
              Skip onboarding and go to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
