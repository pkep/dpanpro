import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
// Common pages
import Home from "./pages/common/Home";
import Index from "./pages/common/Index";
import Auth from "./pages/common/Auth";
import JoinPage from "./pages/common/JoinPage";
import NewIntervention from "./pages/common/NewIntervention";
import Dashboard from "./pages/common/Dashboard";
import InterventionDetails from "./pages/common/InterventionDetails";
import StatisticsDashboard from "./pages/common/StatisticsDashboard";
import PlanningPage from "./pages/common/PlanningPage";
import MapPage from "./pages/common/MapPage";
import LiveTrackingPage from "./pages/common/LiveTrackingPage";
import QuoteApprovalPage from "./pages/common/QuoteApprovalPage";
import TrackInterventionPage from "./pages/common/TrackInterventionPage";
import ResetPassword from "./pages/common/ResetPassword";
import PricingExplanationPage from "./pages/common/PricingExplanationPage";
import CGUPage from "./pages/common/CGUPage";
import PrivacyPolicyPage from "./pages/common/PrivacyPolicyPage";
import CookiePolicyPage from "./pages/common/CookiePolicyPage";
import LegalNoticePage from "./pages/common/LegalNoticePage";
import ContactPage from "./pages/common/ContactPage";
import NotFound from "./pages/common/NotFound";

// Client pages
import ClientDashboardPage from "./pages/client/ClientDashboardPage";
import ClientProfilePage from "./pages/client/ClientProfilePage";
import ClientNewInterventionPage from "./pages/client/ClientNewInterventionPage";
import ClientInterventionsPage from "./pages/client/ClientInterventionsPage";

// Technician pages
import TechnicianDashboard from "./pages/technician/TechnicianDashboard";
import TechnicianInterventionPage from "./pages/technician/TechnicianInterventionPage";
import TechnicianStatsPage from "./pages/technician/TechnicianStatsPage";
import TechnicianRevenuePage from "./pages/technician/TechnicianRevenuePage";
import TechnicianSchedulePage from "./pages/technician/TechnicianSchedulePage";
import TechnicianProfilePage from "./pages/technician/TechnicianProfilePage";
import TechnicianInterventionsPage from "./pages/technician/TechnicianInterventionsPage";

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
            <Route path="/technician/interventions" element={<TechnicianInterventionsPage />} />
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
            <Route path="/comprendre-nos-tarifs" element={<PricingExplanationPage />} />
            <Route path="/cgu" element={<CGUPage />} />
            <Route path="/politique-de-confidentialite" element={<PrivacyPolicyPage />} />
            <Route path="/politique-cookies" element={<CookiePolicyPage />} />
            <Route path="/mentions-legales" element={<LegalNoticePage />} />
            <Route path="/contact" element={<ContactPage />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
