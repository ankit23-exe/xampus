import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminLayout } from "./layouts/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StudentProtectedRoute } from "./components/StudentProtectedRoute";
import CampusQueries from "./pages/CampusQueries";
import CampusComplaints from "./pages/CampusComplaints";
import Login from "./pages/Login";
import StudentLogin from "./pages/StudentLogin";
import StudentSignup from "./pages/StudentSignup";
import StudentDashboard from "./pages/StudentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Admin Routes */}
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<CampusQueries />} />
              <Route path="/complaints" element={<CampusComplaints />} />
            </Route>

            {/* Student Routes */}
            <Route path="/user/login" element={<StudentLogin />} />
            <Route path="/user/signup" element={<StudentSignup />} />
            <Route
              path="/user/dashboard"
              element={
                <StudentProtectedRoute>
                  <StudentDashboard />
                </StudentProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
