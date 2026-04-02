import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

const Dashboard = () => {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === "student" && <StudentDashboard />}
      {role === "teacher" && <TeacherDashboard />}
      {role === "admin" && <AdminDashboard />}
    </DashboardLayout>
  );
};

export default Dashboard;
