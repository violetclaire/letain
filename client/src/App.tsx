import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Register from "@/pages/Register";
import ServiceSelection from "@/pages/intake/ServiceSelection";
import ClientDetails from "@/pages/intake/ClientDetails";
import ArtistIntake from "@/pages/intake/ArtistIntake";
import PlannerIntake from "@/pages/intake/PlannerIntake";
import ClientDashboard from "@/pages/ClientDashboard";
import ArtistDashboard from "@/pages/ArtistDashboard";
import PlannerDashboard from "@/pages/PlannerDashboard";
import BrowseArtists from "@/pages/BrowseArtists";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminImport from "@/pages/AdminImport";
import SearchResults from "@/pages/SearchResults";
import InviteAccept from "@/pages/InviteAccept";
import VendorImport from "@/pages/VendorImport";
import PlannerImport from "@/pages/PlannerImport";
import ManageBookings from "@/pages/ManageBookings";
import ProfileSettings from "@/pages/ProfileSettings";
import ContractEditor from "@/pages/ContractEditor";
import VendorProfile from "@/pages/VendorProfile";
import ScheduleList from "@/pages/ScheduleList";
import ScheduleCreator from "@/pages/ScheduleCreator";
import PublicSchedule from "@/pages/PublicSchedule";
import MultiDaySchedule from "@/pages/MultiDaySchedule";
import DemoLanding from "@/pages/demo/DemoLanding";
import DemoClientDashboard from "@/pages/demo/DemoClientDashboard";
import DemoArtistDashboard from "@/pages/demo/DemoArtistDashboard";
import DemoPlannerDashboard from "@/pages/demo/DemoPlannerDashboard";
import DemoAdminDashboard from "@/pages/demo/DemoAdminDashboard";
import ArtistRolodex from "@/pages/ArtistRolodex";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PublicOnboarding from "@/pages/PublicOnboarding";
import PublicArtistCalendar from "@/pages/PublicArtistCalendar";
import PublicAnalytics from "@/pages/PublicAnalytics";
import Proposals from "@/pages/Proposals";

function InviteRedirectHandler() {
  const [location, setLocation] = useLocation();
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    const storedToken = sessionStorage.getItem('inviteToken');
    if (storedToken && user && location === '/') {
      setLocation(`/invite/${storedToken}`);
    }
  }, [user, location, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/register" component={Register} />
      <Route path="/intake/client" component={ServiceSelection} />
      <Route path="/intake/client/details" component={ClientDetails} />
      <Route path="/intake/artist" component={ArtistIntake} />
      <Route path="/intake/planner" component={PlannerIntake} />
      <Route path="/search" component={SearchResults} />
      <Route path="/client" component={ClientDashboard} />
      <Route path="/artist" component={ArtistDashboard} />
      <Route path="/planner" component={PlannerDashboard} />
      <Route path="/browse" component={BrowseArtists} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/import" component={AdminImport} />
      <Route path="/artist/import" component={VendorImport} />
      <Route path="/artist/manage-bookings" component={ManageBookings} />
      <Route path="/artist/rolodex" component={ArtistRolodex} />
      <Route path="/artist/proposals" component={Proposals} />
      <Route path="/planner/import" component={PlannerImport} />
      <Route path="/settings" component={ProfileSettings} />
      <Route path="/artist/contracts" component={ContractEditor} />
      <Route path="/invite/:token" component={InviteAccept} />
      <Route path="/vendor/:id" component={VendorProfile} />
      
      {/* Day-of Schedule Routes */}
      <Route path="/artist/schedules" component={ScheduleList} />
      <Route path="/schedule-creator/:scheduleId">
        {(params) => <ScheduleCreator scheduleId={params.scheduleId} />}
      </Route>
      <Route path="/schedule/:shareToken">
        {(params) => <PublicSchedule shareToken={params.shareToken} />}
      </Route>
      <Route path="/schedules/:tokens">
        {(params) => <MultiDaySchedule tokens={params.tokens} />}
      </Route>
      
      {/* Demo Mode Routes */}
      <Route path="/demo" component={DemoLanding} />
      <Route path="/demo/client" component={DemoClientDashboard} />
      <Route path="/demo/artist" component={DemoArtistDashboard} />
      <Route path="/demo/planner" component={DemoPlannerDashboard} />
      <Route path="/demo/admin" component={DemoAdminDashboard} />
      
      {/* Payment Routes */}
      <Route path="/payment-success" component={PaymentSuccess} />
      
      {/* Public Routes */}
      <Route path="/onboarding" component={PublicOnboarding} />
      <Route path="/analytics" component={PublicAnalytics} />
      <Route path="/:artistSlug">
        {(params) => <PublicArtistCalendar />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <InviteRedirectHandler />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
