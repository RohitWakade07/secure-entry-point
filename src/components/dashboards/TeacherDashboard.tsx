import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Users, BookOpen, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Questions Added", value: "0", icon: FileText, color: "text-primary" },
  { label: "Tests Created", value: "0", icon: BookOpen, color: "text-emerald-500" },
  { label: "Students Reached", value: "0", icon: Users, color: "text-amber-500" },
];

const TeacherDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Teacher Dashboard 📚
        </h1>
        <p className="mt-1 text-muted-foreground">{user?.email}</p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8">
        <Card>
          <CardHeader><CardTitle style={{ fontFamily: 'var(--font-heading)' }}>Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link to="/questions" className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <PlusCircle className="h-5 w-5 text-primary" />
              <div><p className="font-medium text-sm">Manage Questions</p><p className="text-xs text-muted-foreground">Create & edit</p></div>
            </Link>
            <Link to="/tests" className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <FileText className="h-5 w-5 text-emerald-500" />
              <div><p className="font-medium text-sm">Manage Tests</p><p className="text-xs text-muted-foreground">Create test series</p></div>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TeacherDashboard;
