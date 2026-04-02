import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, LogOut, LayoutDashboard, BookOpen, FileText, Users, Settings } from "lucide-react";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  const navItems = {
    student: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/subjects", icon: BookOpen, label: "Subjects" },
      { to: "/tests", icon: FileText, label: "Mock Tests" },
    ],
    teacher: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/questions", icon: BookOpen, label: "Questions" },
      { to: "/tests", icon: FileText, label: "Tests" },
    ],
    admin: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/users", icon: Users, label: "Users" },
      { to: "/subjects", icon: BookOpen, label: "Subjects" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  };

  const items = role ? navItems[role] : [];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card p-6 md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>GATE Prep</span>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{role}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card p-4 md:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>GATE Prep</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 md:hidden">
          {items.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
