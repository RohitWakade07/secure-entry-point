import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Users, BookOpen, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ questions: 0, tests: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      // Fetch question count and test count + test IDs in parallel
      const [{ count: questionCount }, { data: testsData }] = await Promise.all([
        supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id),
        supabase
          .from("tests")
          .select("id")
          .eq("created_by", user.id),
      ]);

      let studentCount = 0;
      const testIds = testsData?.map((t) => t.id) ?? [];
      if (testIds.length > 0) {
        // Count distinct students who attempted these tests
        const { data: attempts } = await supabase
          .from("attempts")
          .select("user_id")
          .in("test_id", testIds);
        if (attempts) {
          const uniqueStudents = new Set(attempts.map((a) => a.user_id));
          studentCount = uniqueStudents.size;
        }
      }

      setCounts({
        questions: questionCount ?? 0,
        tests: testIds.length,
        students: studentCount,
      });
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  const stats = [
    { label: "Questions Added", value: String(counts.questions), icon: FileText, color: "text-primary" },
    { label: "Tests Created", value: String(counts.tests), icon: BookOpen, color: "text-emerald-500" },
    { label: "Students Reached", value: String(counts.students), icon: Users, color: "text-amber-500" },
  ];

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
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted/40" />
                ) : (
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                )}
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
