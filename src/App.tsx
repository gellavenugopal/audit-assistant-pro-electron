import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
// import TrialBalance from "./pages/TrialBalance"; // DEPRECATED - Migrated to TrialBalanceNew
import TrialBalanceNew from "./pages/TrialBalanceNew";
import Materiality from "./pages/Materiality";
import RiskRegister from "./pages/RiskRegister";
import AuditPrograms from "./pages/AuditPrograms";
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
import GstzenIntegration from "./pages/GstzenIntegration";
import GstzenLogin from "./pages/GstzenLogin";
import Gstr1Dashboard from '@/pages/Gstr1Dashboard';
import NotFound from "./pages/NotFound";
import Feedback from "./pages/Feedback";

import ComplianceApplicability from "./pages/ComplianceApplicability";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                {/* Old Trial Balance route - DEPRECATED, redirecting to new */}
                <Route
                  path="/trial-balance"
                  element={
                    <ProtectedEngagementRoute>
                      <MainLayout>
                        <TrialBalanceNew />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TallyProvider>
          </EngagementProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
