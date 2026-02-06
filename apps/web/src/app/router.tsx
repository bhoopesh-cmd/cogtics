import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuth } from '@/lib/auth/useAuth';

// Feature pages
import { SummaryPage } from '@/features/dashboard/SummaryPage';
import { IssuesPage } from '@/features/dashboard/IssuesPage';
import { ContractsPage } from '@/features/dashboard/ContractsPage';
import { RevRecPage } from '@/features/dashboard/RevRecPage';
import { SimulationsPage } from '@/features/dashboard/SimulationsPage';
import { ExportsPage } from '@/features/exports/ExportsPage';
import { ConnectionsPage } from '@/features/connections/ConnectionsPage';
import { JobsPage } from '@/features/admin/JobsPage';
import { AuditPage } from '@/features/admin/AuditPage';
import { DevLoginPage } from '@/features/auth/DevLoginPage';
// Phase 2 pages
import { DataExplorerPage } from '@/features/data/DataExplorerPage';
import { CustomerDetailPage } from '@/features/data/CustomerDetailPage';
import { ContractDetailPage } from '@/features/data/ContractDetailPage';
import { SnapshotsPage } from '@/features/snapshots/SnapshotsPage';
// Phase 3 pages
import { IdentityQueuePage } from '@/features/identity/IdentityQueuePage';
import { ResolvedCustomersPage } from '@/features/identity/ResolvedCustomersPage';
// Phase 4 pages
import { UploadsPage } from '@/features/uploads/UploadsPage';
import { UploadDetailPage } from '@/features/uploads/UploadDetailPage';
// Phase 5 pages
import { ContractIntelligencePage } from '@/features/contracts/ContractIntelligencePage';
import { ReviewQueuePage } from '@/features/contracts';
// Phase 6 pages
import { RevRecDashboardPage } from '@/features/revrec/RevRecDashboardPage';
// Phase 7 pages
import { IssuesPage as IssuesPageV2, IssueDetailPage, DetectionRunsPage } from '@/features/issues';
// Phase 9 pages
import { SimulationDetailPage } from '@/features/simulations';
// Phase 10 pages
import { DigestSettingsPage } from '@/features/digests';
// Phase 11 pages
import { DLQPage } from '@/features/admin/DLQPage';
import { SystemHealthPage } from '@/features/admin/SystemHealthPage';
// AI Feature pages (detail pages only - lists integrated into Simulations)
import { RecommendationDetailPage } from '@/features/ai';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<SummaryPage />} />
        <Route path="/issues" element={<IssuesPageV2 />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
        <Route path="/issues/runs" element={<DetectionRunsPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/revrec" element={<RevRecPage />} />
        <Route path="/simulations" element={<SimulationsPage />} />
        <Route path="/simulations/:id" element={<SimulationDetailPage />} />
        <Route path="/exports" element={<ExportsPage />} />
        <Route path="/digests" element={<DigestSettingsPage />} />
        <Route path="/data" element={<DataExplorerPage />} />
        <Route path="/data/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/data/contracts/:contractId" element={<ContractDetailPage />} />
        <Route path="/snapshots" element={<SnapshotsPage />} />
        <Route path="/settings/integrations" element={<ConnectionsPage />} />
        <Route path="/settings/jobs" element={<JobsPage />} />
        <Route path="/settings/audit" element={<AuditPage />} />
        <Route path="/settings/snapshots" element={<SnapshotsPage />} />
        {/* Phase 11 Admin Routes */}
        <Route path="/admin/health" element={<SystemHealthPage />} />
        <Route path="/admin/dlq" element={<DLQPage />} />
        {/* Phase 3 Identity Routes */}
        <Route path="/identity/queue" element={<IdentityQueuePage />} />
        <Route path="/identity/resolved" element={<ResolvedCustomersPage />} />
        {/* Phase 4 Upload Routes */}
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/uploads/:uploadId" element={<UploadDetailPage />} />
        {/* Phase 5 Contract Intelligence Routes */}
        <Route path="/contracts/:contractId/intelligence" element={<ContractIntelligencePage />} />
        <Route path="/contracts/review" element={<ReviewQueuePage />} />
        {/* Phase 6 Revenue Recognition Routes */}
        <Route path="/revrec" element={<RevRecDashboardPage />} />
        {/* AI Recommendation detail page - list integrated into Simulations */}
        <Route path="/ai/recommendations/:id" element={<RecommendationDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

import { SignUpPage } from '@/features/auth/SignUpPage';

// ... (existing imports)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<DevLoginPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

