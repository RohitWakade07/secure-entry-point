import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart3, Target, Clock, TrendingUp } from "lucide-react";

const PerformancePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalAttempts: 0, avgScore: 0, totalAnswers: 0, correctAnswers: 0, avgTime: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data: attempts } = await supabase.from("attempts").select("*").eq("user_id", user.id);
      const attemptIds = attempts?.map((a) => a.id) ?? [];

      let totalAnswers = 0;
      let correctAnswers = 0;
      let totalTime = 0;

      if (attemptIds.length > 0) {
        const { data: answers } = await supabase
          .from("answers")
          .select("is_correct, time_taken")
          .in("attempt_id", attemptIds);
        if (answers) {
          totalAnswers = answers.length;
          correctAnswers = answers.filter((a) => a.is_correct).length;
          totalTime = answers.reduce((sum, a) => sum + (a.time_taken ?? 0), 0);
        }
      }

      const avgScore = attempts && attempts.length > 0
        ? attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length
        : 0;

      setStats({
        totalAttempts: attempts?.length ?? 0,
        avgScore: Math.round(avgScore * 10) / 10,
        totalAnswers,
        correctAnswers,
        avgTime: totalAnswers > 0 ? Math.round(totalTime / totalAnswers) : 0,
      });
      setLoading(false);
    };
    fetch();
  }, [user]);

  const accuracy = stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;

  const cards = [
    { label: "Tests Taken", value: String(stats.totalAttempts), icon: BarChart3, color: "text-primary" },
    { label: "Avg Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Accuracy", value: `${accuracy}%`, icon: Target, color: "text-amber-500" },
    { label: "Avg Time/Q", value: `${stats.avgTime}s`, icon: Clock, color: "text-violet-500" },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          Performance Analytics 📊
        </h1>
        <p className="mt-1 text-muted-foreground">Track your progress and identify weak areas</p>
      </motion.div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="card-hover">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>{c.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Questions Attempted</span>
                  <span className="font-medium">{stats.totalAnswers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Correct Answers</span>
                  <span className="font-medium text-emerald-600">{stats.correctAnswers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wrong Answers</span>
                  <span className="font-medium text-red-600">{stats.totalAnswers - stats.correctAnswers}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accuracy < 50 && (
                  <p className="text-sm text-muted-foreground">
                    📚 Focus on understanding concepts first. Review explanations after each question.
                  </p>
                )}
                {accuracy >= 50 && accuracy < 80 && (
                  <p className="text-sm text-muted-foreground">
                    👍 Good progress! Try harder difficulty questions to improve further.
                  </p>
                )}
                {accuracy >= 80 && (
                  <p className="text-sm text-muted-foreground">
                    🌟 Excellent! You're doing great. Try full-length mock tests now.
                  </p>
                )}
                {stats.avgTime > 120 && (
                  <p className="text-sm text-muted-foreground">
                    ⏱️ Your average time per question is high. Practice timed sessions.
                  </p>
                )}
                {stats.totalAttempts === 0 && (
                  <p className="text-sm text-muted-foreground">
                    🚀 Start by taking a mock test to see your performance stats here!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default PerformancePage;
