import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import JoinPage from "./pages/JoinPage";
import NewIntervention from "./pages/NewIntervention";
import Dashboard from "./pages/Dashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import TechnicianInterventionPage from "./pages/TechnicianInterventionPage";
import TechnicianStatsPage from "./pages/TechnicianStatsPage";
import TechnicianRevenuePage from "./pages/TechnicianRevenuePage";
import TechnicianSchedulePage from "./pages/TechnicianSchedulePage";
import TechnicianProfilePage from "./pages/TechnicianProfilePage";
import AdminDashboard from "./pages/AdminDashboard";
import InterventionDetails from "./pages/InterventionDetails";
import StatisticsDashboard from "./pages/StatisticsDashboard";
import PlanningPage from "./pages/PlanningPage";
import MapPage from "./pages/MapPage";
import LiveTrackingPage from "./pages/LiveTrackingPage";
import QuoteApprovalPage from "./pages/QuoteApprovalPage";
import TrackInterventionPage from "./pages/TrackInterventionPage";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/new-intervention" element={<NewIntervention />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/technician/stats" element={<TechnicianStatsPage />} />
            <Route path="/technician/revenue" element={<TechnicianRevenuePage />} />
            <Route path="/technician/schedule" element={<TechnicianSchedulePage />} />
            <Route path="/technician/profile" element={<TechnicianProfilePage />} />
            <Route path="/technician/intervention/:id" element={<TechnicianInterventionPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/intervention/:id" element={<InterventionDetails />} />
            <Route path="/statistics" element={<StatisticsDashboard />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/live-tracking" element={<LiveTrackingPage />} />
            <Route path="/quote-approval/:token" element={<QuoteApprovalPage />} />
            <Route path="/track/:tracking_code" element={<TrackInterventionPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
