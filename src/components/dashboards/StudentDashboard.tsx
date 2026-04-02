import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Target, Clock, TrendingUp, Bookmark, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Questions Practiced", value: "0", icon: BookOpen, color: "text-primary" },
  { label: "Accuracy", value: "—", icon: Target, color: "text-emerald-500" },
  { label: "Avg. Time / Q", value: "—", icon: Clock, color: "text-amber-500" },
  { label: "Tests Taken", value: "0", icon: TrendingUp, color: "text-violet-500" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Welcome back! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">{user?.email}</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <motion.div key={s.label} variants={item}>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
        <Card>
          <CardHeader><CardTitle style={{ fontFamily: 'var(--font-heading)' }}>Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/subjects" className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <BookOpen className="h-5 w-5 text-primary" />
              <div><p className="font-medium text-sm">Practice</p><p className="text-xs text-muted-foreground">Topic-wise</p></div>
            </Link>
            <Link to="/tests" className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <Target className="h-5 w-5 text-emerald-500" />
              <div><p className="font-medium text-sm">Mock Test</p><p className="text-xs text-muted-foreground">Full-length</p></div>
            </Link>
            <Link to="/bookmarks" className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <Bookmark className="h-5 w-5 text-amber-500" />
              <div><p className="font-medium text-sm">Bookmarks</p><p className="text-xs text-muted-foreground">Saved questions</p></div>
            </Link>
            <Link to="/performance" className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              <div><p className="font-medium text-sm">Analytics</p><p className="text-xs text-muted-foreground">Performance</p></div>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StudentDashboard;
