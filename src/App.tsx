import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SubjectsPage from "./pages/SubjectsPage";
import PracticePage from "./pages/PracticePage";
import TestsPage from "./pages/TestsPage";
import TestEnginePage from "./pages/TestEnginePage";
import BookmarksPage from "./pages/BookmarksPage";
import PerformancePage from "./pages/PerformancePage";
import QuestionsPage from "./pages/QuestionsPage";
import UsersPage from "./pages/UsersPage";
import AdminSubjectsPage from "./pages/AdminSubjectsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AuthRedirect><Index /></AuthRedirect>} />
            <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
            <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
            <Route path="/practice/:topicId" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><TestsPage /></ProtectedRoute>} />
            <Route path="/test/generate" element={<ProtectedRoute allowedRoles={["student"]}><TestEnginePage /></ProtectedRoute>} />
            <Route path="/test/:testId" element={<ProtectedRoute allowedRoles={["student"]}><TestEnginePage /></ProtectedRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute allowedRoles={["student"]}><BookmarksPage /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
            <Route path="/questions" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><QuestionsPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
            <Route path="/admin-subjects" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSubjectsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
