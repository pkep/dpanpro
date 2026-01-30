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
import ClientDashboardPage from "./pages/ClientDashboardPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientNewInterventionPage from "./pages/ClientNewInterventionPage";
import ClientInterventionsPage from "./pages/ClientInterventionsPage";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import TechnicianInterventionPage from "./pages/TechnicianInterventionPage";
import TechnicianStatsPage from "./pages/TechnicianStatsPage";
import TechnicianRevenuePage from "./pages/TechnicianRevenuePage";
import TechnicianSchedulePage from "./pages/TechnicianSchedulePage";
import TechnicianProfilePage from "./pages/TechnicianProfilePage";
import InterventionDetails from "./pages/InterventionDetails";
import StatisticsDashboard from "./pages/StatisticsDashboard";
import PlanningPage from "./pages/PlanningPage";
import MapPage from "./pages/MapPage";
import LiveTrackingPage from "./pages/LiveTrackingPage";
import QuoteApprovalPage from "./pages/QuoteApprovalPage";
import TrackInterventionPage from "./pages/TrackInterventionPage";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Manager pages
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage";
import ManagerTechniciansPage from "./pages/manager/ManagerTechniciansPage";
import ManagerPerformancePage from "./pages/manager/ManagerPerformancePage";
import ManagerMapPage from "./pages/manager/ManagerMapPage";
import ManagerPlanningPage from "./pages/manager/ManagerPlanningPage";

// Admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminTechniciansPage from "./pages/admin/AdminTechniciansPage";
import AdminPerformancePage from "./pages/admin/AdminPerformancePage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminConfigHistoryPage from "./pages/admin/AdminConfigHistoryPage";
import AdminMapPage from "./pages/admin/AdminMapPage";
import AdminPlanningPage from "./pages/admin/AdminPlanningPage";

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
            
            {/* Client routes with sidebar */}
            <Route path="/dashboard" element={<ClientDashboardPage />} />
            <Route path="/dashboard/profile" element={<ClientProfilePage />} />
            <Route path="/dashboard/new-intervention" element={<ClientNewInterventionPage />} />
            <Route path="/dashboard/interventions" element={<ClientInterventionsPage />} />
            
            {/* Technician routes */}
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/technician/stats" element={<TechnicianStatsPage />} />
            <Route path="/technician/revenue" element={<TechnicianRevenuePage />} />
            <Route path="/technician/schedule" element={<TechnicianSchedulePage />} />
            <Route path="/technician/profile" element={<TechnicianProfilePage />} />
            <Route path="/technician/intervention/:id" element={<TechnicianInterventionPage />} />
            
            {/* Manager routes */}
            <Route path="/manager" element={<ManagerDashboardPage />} />
            <Route path="/manager/technicians" element={<ManagerTechniciansPage />} />
            <Route path="/manager/performance" element={<ManagerPerformancePage />} />
            <Route path="/manager/map" element={<ManagerMapPage />} />
            <Route path="/manager/planning" element={<ManagerPlanningPage />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/technicians" element={<AdminTechniciansPage />} />
            <Route path="/admin/performance" element={<AdminPerformancePage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/config-history" element={<AdminConfigHistoryPage />} />
            <Route path="/admin/map" element={<AdminMapPage />} />
            <Route path="/admin/planning" element={<AdminPlanningPage />} />
            
            {/* Shared routes */}
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
