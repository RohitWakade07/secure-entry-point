import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Target, Clock, TrendingUp, Bookmark, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    totalAnswers: "0", 
    accuracy: "—", 
    avgTime: "—", 
    totalAttempts: "0" 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const [{ data: attempts }, { data: practiceSessions }] = await Promise.all([
        supabase.from("attempts").select("id").eq("user_id", user.id),
        supabase.from("practice_sessions").select("questions_answered, correct_answers, total_time").eq("user_id", user.id)
      ]);
      
      const attemptIds = attempts?.map((a) => a.id) ?? [];

      let totalAnswers = 0;
      let correctAnswers = 0;
      let totalTime = 0;

      // Add formal test answers
      if (attemptIds.length > 0) {
        const { data: answers } = await supabase
          .from("answers")
          .select("is_correct, time_taken")
          .in("attempt_id", attemptIds);
        if (answers) {
          totalAnswers += answers.length;
          correctAnswers += answers.filter((a) => a.is_correct).length;
          totalTime += answers.reduce((sum, a) => sum + (a.time_taken ?? 0), 0);
        }
      }

      // Add practice session stats
      if (practiceSessions) {
        practiceSessions.forEach((p) => {
          totalAnswers += p.questions_answered || 0;
          correctAnswers += p.correct_answers || 0;
          totalTime += p.total_time || 0;
        });
      }

      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
      const avgTime = totalAnswers > 0 ? Math.round(totalTime / totalAnswers) : 0;

      setStats({
        totalAnswers: String(totalAnswers),
        accuracy: totalAnswers > 0 ? `${accuracy}%` : "—",
        avgTime: totalAnswers > 0 ? `${avgTime}s` : "—",
        totalAttempts: String(attempts?.length ?? 0),
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const displayStats = [
    { label: "Questions Practiced", value: stats.totalAnswers, icon: BookOpen, color: "text-primary" },
    { label: "Accuracy", value: stats.accuracy, icon: Target, color: "text-emerald-500" },
    { label: "Avg. Time / Q", value: stats.avgTime, icon: Clock, color: "text-amber-500" },
    { label: "Tests Taken", value: stats.totalAttempts, icon: TrendingUp, color: "text-violet-500" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Welcome back! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">{user?.email}</p>
      </motion.div>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/40 border-none" />
          ))}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayStats.map((s) => (
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
      )}

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
