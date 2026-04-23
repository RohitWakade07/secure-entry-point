import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Option { id: string; option_text: string; is_correct: boolean; }
interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  year: number | null;
  options: Option[];
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const TestEnginePage = () => {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const isGenerated = !testId; // generated mode when no :testId
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [test, setTest] = useState<{ title: string; duration: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const startTimeRef = useRef<Record<string, number>>({});
  const timeSpentRef = useRef<Record<string, number>>({});
  const handleSubmitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const fetchData = async () => {
      if (isGenerated) {
        // ===== Generated mode =====
        const subjectId = searchParams.get("subject");
        const count = Math.max(1, parseInt(searchParams.get("count") || "10"));
        const dur = Math.max(5, parseInt(searchParams.get("duration") || "30"));
        const yearsParam = searchParams.get("years");
        const years = yearsParam ? yearsParam.split(",").map((y) => parseInt(y)).filter(Boolean) : [];

        if (!subjectId) {
          setLoading(false);
          return;
        }

        // Subject name for title
        const { data: subj } = await supabase.from("subjects").select("subject_name").eq("id", subjectId).maybeSingle();
        const yearLabel = years.length > 0 ? `(${years.join(", ")})` : "(All Years)";
        setTest({
          title: `${subj?.subject_name ?? "Custom"} Mock ${yearLabel}`,
          duration: dur,
        });
        setTimeLeft(dur * 60);

        // Get topics for this subject
        const { data: topics } = await supabase.from("topics").select("id").eq("subject_id", subjectId);
        const topicIds = (topics ?? []).map((t) => t.id);
        if (topicIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch questions matching subject (via topics) + optional years
        let qQuery = supabase
          .from("questions")
          .select("id, question_text, question_type, difficulty, marks, negative_marks, year")
          .in("topic_id", topicIds);
        if (years.length > 0) {
          qQuery = qQuery.in("year", years);
        }
        const { data: pool } = await qQuery;

        if (!pool || pool.length === 0) {
          setLoading(false);
          return;
        }

        const picked = shuffle(pool).slice(0, count);
        const qIds = picked.map((q) => q.id);

        const { data: allOpts } = await supabase
          .from("options")
          .select("id, option_text, is_correct, question_id")
          .in("question_id", qIds);

        const optsByQuestion = new Map<string, Option[]>();
        (allOpts ?? []).forEach((opt) => {
          const list = optsByQuestion.get(opt.question_id) ?? [];
          list.push({ id: opt.id, option_text: opt.option_text, is_correct: opt.is_correct });
          optsByQuestion.set(opt.question_id, list);
        });

        const withOpts: Question[] = picked.map((q: any) => ({
          ...q,
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0.33,
          options: shuffle(optsByQuestion.get(q.id) ?? []),
        }));
        setQuestions(withOpts);
        setLoading(false);
        return;
      }

      // ===== Pre-built test mode =====
      if (!testId) return;
      const { data: t } = await supabase.from("tests").select("title, duration").eq("id", testId).maybeSingle();
      if (t) {
        setTest(t);
        setTimeLeft(t.duration * 60);
      }

      const { data: tqs } = await supabase.from("test_questions").select("question_id").eq("test_id", testId);
      if (tqs && tqs.length > 0) {
        const qIds = tqs.map((tq) => tq.question_id);
        const { data: qs } = await supabase
          .from("questions")
          .select("id, question_text, question_type, difficulty, marks, negative_marks, year")
          .in("id", qIds);
        if (qs) {
          const { data: allOpts } = await supabase
            .from("options")
            .select("id, option_text, is_correct, question_id")
            .in("question_id", qIds);

          const optsByQuestion = new Map<string, Option[]>();
          (allOpts ?? []).forEach((opt) => {
            const list = optsByQuestion.get(opt.question_id) ?? [];
            list.push({ id: opt.id, option_text: opt.option_text, is_correct: opt.is_correct });
            optsByQuestion.set(opt.question_id, list);
          });

          const withOpts = qs.map((q: any) => ({
            ...q,
            marks: Number(q.marks) || 3,
            negative_marks: Number(q.negative_marks) || 1,
            options: optsByQuestion.get(q.id) ?? [],
          }));
          setQuestions(withOpts);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [testId, isGenerated, searchParams]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !user) return;
    setSubmitted(true);

    let totalMarks = 0;
    let maxMarks = 0;
    questions.forEach((q) => {
      maxMarks += q.marks;
      const selectedIds = answers[q.id] ?? [];
      if (selectedIds.length === 0) return;

      if (q.question_type === "MSQ") {
        const correctIds = new Set(q.options.filter((o) => o.is_correct).map((o) => o.id));
        const selectedSet = new Set(selectedIds);
        const isFullyCorrect =
          correctIds.size === selectedSet.size &&
          [...correctIds].every((id) => selectedSet.has(id));
        if (isFullyCorrect) totalMarks += q.marks;
        else totalMarks -= q.negative_marks;
      } else {
        const selectedId = selectedIds[0];
        const opt = q.options.find((o) => o.id === selectedId);
        if (opt?.is_correct) totalMarks += q.marks;
        else totalMarks -= q.negative_marks;
      }
    });

    totalMarks = Math.max(0, totalMarks);
    setScore(totalMarks);
    setMaxScore(maxMarks);

    const pct = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

    // Only persist attempts for pre-built tests (we have a test_id).
    // Generated tests are ad-hoc — show results without DB write.
    if (testId) {
      const { data: attempt, error } = await supabase
        .from("attempts")
        .insert({
          user_id: user.id,
          test_id: testId,
          score: pct,
          status: "completed",
          end_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Attempt insert error:", error);
        toast({ title: "Failed to save attempt", description: error.message, variant: "destructive" });
      }

      if (attempt) {
        const answerInserts = questions.map((q) => {
          const selectedIds = answers[q.id] ?? [];
          const selectedId = selectedIds[0] || null;
          const isCorrect = selectedId
            ? q.options.find((o) => o.id === selectedId)?.is_correct ?? false
            : false;
          return {
            attempt_id: attempt.id,
            question_id: q.id,
            selected_option_id: selectedId,
            is_correct: isCorrect,
            time_taken: timeSpentRef.current[q.id] || 0,
          };
        });
        const { error: answersError } = await supabase.from("answers").insert(answerInserts);
        if (answersError) {
          console.error("Answers insert error:", answersError);
        }
      }
    }

    setShowResult(true);
    toast({ title: "Test submitted!" });
  }, [submitted, user, testId, questions, answers, toast]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (submitted || loading || questions.length === 0) return;
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, loading, questions.length]);

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

  const handleOptionClick = (questionId: string, optionId: string, questionType: string) => {
    if (submitted) return;
    setAnswers((prev) => {
      if (questionType === "MSQ") {
        const current = prev[questionId] ?? [];
        const exists = current.includes(optionId);
        return {
          ...prev,
          [questionId]: exists
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isOptionSelected = (questionId: string, optionId: string) =>
    (answers[questionId] ?? []).includes(optionId);

  const hasAnswer = (questionId: string) => (answers[questionId] ?? []).length > 0;

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
            <p className="text-lg font-medium mb-4">No matching questions</p>
            <p className="text-muted-foreground mb-6">
              {isGenerated
                ? "No questions match your subject/year filters. Try different years or remove the year filter."
                : "This test has no questions yet."}
            </p>
            <Button onClick={() => navigate("/tests")}>Back to Tests</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        <div className="mb-6 flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                i === currentIdx
                  ? "bg-primary text-primary-foreground"
                  : hasAnswer(q.id)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentQ && (
          <motion.div key={currentQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Q{currentIdx + 1}</span>
                  <Badge variant="outline">{currentQ.question_type}</Badge>
                  <Badge variant="outline">{currentQ.difficulty}</Badge>
                  {currentQ.year && (
                    <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15 border-primary/20">
                      <Calendar className="h-3 w-3" />
                      GATE {currentQ.year}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    +{currentQ.marks} / −{currentQ.negative_marks}
                  </Badge>
                </div>

                <p className="mb-6 text-lg font-medium">{currentQ.question_text}</p>

                {currentQ.question_type === "MSQ" && (
                  <p className="mb-3 text-xs text-muted-foreground italic">
                    Multiple correct answers — select all that apply
                  </p>
                )}

                <div className="space-y-3">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionClick(currentQ.id, opt.id, currentQ.question_type)}
                      disabled={submitted}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        isOptionSelected(currentQ.id, opt.id)
                          ? "border-2 border-primary bg-primary/5"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {currentQ.question_type === "MSQ" ? (
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                            isOptionSelected(currentQ.id, opt.id)
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}>
                            {isOptionSelected(currentQ.id, opt.id) && (
                              <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                        ) : (
                          <div className={`h-4 w-4 rounded-full border-2 ${
                            isOptionSelected(currentQ.id, opt.id)
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`} />
                        )}
                        <span className="text-sm">{opt.option_text}</span>
                      </div>
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

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Test Results</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <p className="text-4xl font-bold mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              {score} / {maxScore}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}% score
            </p>
            <p className="text-muted-foreground">
              You answered {Object.keys(answers).filter((k) => (answers[k] ?? []).length > 0).length} out of {questions.length} questions
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
