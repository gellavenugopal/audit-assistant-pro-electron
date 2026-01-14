import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EngagementProvider } from "@/contexts/EngagementContext";
import { TallyProvider } from "@/contexts/TallyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProtectedEngagementRoute } from "@/components/auth/ProtectedEngagementRoute";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import StaffDashboard from "./pages/StaffDashboard";
import SelectEngagement from "./pages/SelectEngagement";
import Engagements from "./pages/Engagements";
import TrialBalance from "./pages/TrialBalance";
import TrialBalanceNew from "./pages/TrialBalanceNew";
import Appointment from "./pages/Appointment";
import Materiality from "./pages/Materiality";
import RiskRegister from "./pages/RiskRegister";
import AuditPrograms from "./pages/AuditPrograms";
import AuditProgramNew from "./pages/AuditProgramNew";
import EvidenceVault from "./pages/EvidenceVault";
import ProcedureWorkpaper from "./pages/ProcedureWorkpaper";
import ReviewNotes from "./pages/ReviewNotes";
import Misstatements from "./pages/Misstatements";
import AuditTrail from "./pages/AuditTrail";
import Completion from "./pages/Completion";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import AuditTools from "./pages/AuditTools";
import AuditReport from "./pages/AuditReport";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import GstzenIntegration from "./pages/GstzenIntegration";
import GstzenLogin from "./pages/GstzenLogin";
import Gstr1Dashboard from "./pages/Gstr1Dashboard";
import ComplianceApplicability from "./pages/ComplianceApplicability";
import Feedback from "./pages/Feedback";
import SRMPro from "./pages/SRMPro";
import { EngagementLetterGenerator } from "@/components/appointment/EngagementLetterGenerator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <EngagementProvider>
            <TallyProvider>
              <Routes>
                {/* Public route */}
                <Route path="/auth" element={<Auth />} />

                {/* Engagement selection (requires auth but not engagement) */}
                <Route
                  path="/select-engagement"
                  element={
                    <ProtectedRoute>
                      <SelectEngagement />
                    </ProtectedRoute>
                  }
                />

                {/* Protected routes that require engagement selection */}
                <Route
                  path="/"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <Dashboard />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/engagements"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Engagements />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trial-balance"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <TrialBalance />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/trial-balance-new"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <TrialBalanceNew />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/appointment"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <Appointment />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/appointment/engagement-letter"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <EngagementLetterGenerator />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/materiality"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <Materiality />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/risks"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <RiskRegister />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/programs"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <AuditPrograms />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/programs-new"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <AuditProgramNew />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/procedures/:procedureId/workpaper"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <ProcedureWorkpaper />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/evidence"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <EvidenceVault />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/review-notes"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <ReviewNotes />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/misstatements"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <Misstatements />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/audit-trail"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <AuditTrail />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/completion"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <Completion />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/audit-tools"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <AuditTools />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit-report"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <AuditReport />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Settings />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gstr1-integration"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <GstzenIntegration />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gstzen-login"
                  element={
                    <ProtectedRoute>
                      <GstzenLogin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gstin/:gstinUuid/gstr1"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Gstr1Dashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <MainLayout>
                        <AdminDashboard />
                      </MainLayout>
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedAdminRoute>
                      <MainLayout>
                        <AdminSettings />
                      </MainLayout>
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/my-dashboard"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <StaffDashboard />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/compliance-applicability"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <ComplianceApplicability />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/programs-new"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <AuditProgramNew />
                      </MainLayout>
                    </ProtectedEngagementRoute>
                  }
                />
                <Route
                  path="/feedback"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Feedback />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/srm-pro"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <SRMPro />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TallyProvider>
          </EngagementProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
