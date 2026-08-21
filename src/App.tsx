import { Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/hooks/useAuth"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { AppShell } from "@/components/layout/AppShell"
import LoginPage from "@/routes/LoginPage"
import ImportPage from "@/routes/ImportPage"
import LeadsListPage from "@/routes/LeadsListPage"
import LeadDetailPage from "@/routes/LeadDetailPage"
import NotFoundPage from "@/routes/NotFoundPage"

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/leads" replace />} />
            <Route path="/leads" element={<LeadsListPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
