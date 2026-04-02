import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Option { id: string; option_text: string; is_correct: boolean; }
interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  options: Option[];
}

const TestEnginePage = () => {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [test, setTest] = useState<{ title: string; duration: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const startTimeRef = useRef<Record<string, number>>({});
  const timeSpentRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const fetch = async () => {
      if (!testId) return;

      const { data: t } = await supabase.from("tests").select("title, duration").eq("id", testId).maybeSingle();
      if (t) {
        setTest(t);
        setTimeLeft(t.duration * 60);
      }

      const { data: tqs } = await supabase.from("test_questions").select("question_id").eq("test_id", testId);
      if (tqs && tqs.length > 0) {
        const qIds = tqs.map((tq) => tq.question_id);
        const { data: qs } = await supabase.from("questions").select("id, question_text, question_type, difficulty").in("id", qIds);
        if (qs) {
          const withOpts = await Promise.all(
            qs.map(async (q) => {
              const { data: opts } = await supabase.from("options").select("id, option_text, is_correct").eq("question_id", q.id);
              return { ...q, options: opts ?? [] };
            })
          );
          setQuestions(withOpts);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [testId]);

  // Timer
  useEffect(() => {
    if (submitted || timeLeft <= 0 || loading) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, loading]);

  // Track time per question
  useEffect(() => {
    if (questions.length === 0) return;
    const qId = questions[currentIdx]?.id;
    if (qId) startTimeRef.current[qId] = Date.now();

    return () => {
      if (qId && startTimeRef.current[qId]) {
        const elapsed = Math.round((Date.now() - startTimeRef.current[qId]) / 1000);
        timeSpentRef.current[qId] = (timeSpentRef.current[qId] || 0) + elapsed;
      }
    };
  }, [currentIdx, questions]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !user || !testId) return;
    setSubmitted(true);

    // Calculate score
    let correct = 0;
    questions.forEach((q) => {
      const selectedId = answers[q.id];
      if (selectedId) {
        const opt = q.options.find((o) => o.id === selectedId);
        if (opt?.is_correct) correct++;
      }
    });

    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setScore(pct);

    // Save attempt
    const { data: attempt } = await supabase
      .from("attempts")
      .insert({
        user_id: user.id,
        test_id: testId,
        score: pct,
        end_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (attempt) {
      setAttemptId(attempt.id);

      // Save individual answers
      const answerInserts = questions.map((q) => {
        const selectedId = answers[q.id] || null;
        const isCorrect = selectedId ? q.options.find((o) => o.id === selectedId)?.is_correct ?? false : false;
        return {
          attempt_id: attempt.id,
          question_id: q.id,
          selected_option_id: selectedId,
          is_correct: isCorrect,
          time_taken: timeSpentRef.current[q.id] || 0,
        };
      });
      await supabase.from("answers").insert(answerInserts);
    }

    setShowResult(true);
    toast({ title: "Test submitted!" });
  }, [submitted, user, testId, questions, answers, toast]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIdx];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium mb-4">No questions in this test yet</p>
            <p className="text-muted-foreground mb-6">The teacher hasn't added questions to this test.</p>
            <Button onClick={() => navigate("/tests")}>Back to Tests</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-8">
        <h2 className="text-lg font-bold truncate" style={{ fontFamily: "var(--font-heading)" }}>
          {test?.title}
        </h2>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono font-bold ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-secondary text-foreground"}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          <Button onClick={handleSubmit} disabled={submitted} variant="destructive" size="sm" className="gap-2">
            <Flag className="h-4 w-4" /> Submit
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-6">
        {/* Question navigation */}
        <div className="mb-6 flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                i === currentIdx
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        {currentQ && (
          <motion.div key={currentQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Q{currentIdx + 1}</span>
                  <Badge variant="outline">{currentQ.question_type}</Badge>
                  <Badge variant="outline">{currentQ.difficulty}</Badge>
                </div>

                <p className="mb-6 text-lg font-medium">{currentQ.question_text}</p>

                <div className="space-y-3">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => !submitted && setAnswers((prev) => ({ ...prev, [currentQ.id]: opt.id }))}
                      disabled={submitted}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        answers[currentQ.id] === opt.id
                          ? "border-2 border-primary bg-primary/5"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      <span className="text-sm">{opt.option_text}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="outline" onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))} disabled={currentIdx === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  {currentIdx < questions.length - 1 ? (
                    <Button onClick={() => setCurrentIdx((p) => p + 1)}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={submitted} variant="destructive" className="gap-2">
                      <Flag className="h-4 w-4" /> Submit Test
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Test Results</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <p className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>{score}%</p>
            <p className="text-muted-foreground">
              You answered {Object.keys(answers).length} out of {questions.length} questions
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/tests")}>Back to Tests</Button>
              <Button onClick={() => navigate("/performance")}>View Performance</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestEnginePage;
