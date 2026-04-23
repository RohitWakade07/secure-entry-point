import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  explanation: string | null;
  options: { id: string; option_text: string; is_correct: boolean }[];
}

const PracticePage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [topicName, setTopicName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Practice session tracking
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const answeredCountRef = useRef(0);
  const correctCountRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!topicId) return;
      const { data: topic } = await supabase.from("topics").select("topic_name").eq("id", topicId).maybeSingle();
      if (topic) setTopicName(topic.topic_name);

      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, question_type, difficulty, explanation")
        .eq("topic_id", topicId);

      if (qs && qs.length > 0) {
        // Batch-fetch options instead of N+1
        const qIds = qs.map((q) => q.id);
        const { data: allOpts } = await supabase
          .from("options")
          .select("id, option_text, is_correct, question_id")
          .in("question_id", qIds);

        const optsByQuestion = new Map<string, { id: string; option_text: string; is_correct: boolean }[]>();
        (allOpts ?? []).forEach((opt) => {
          const list = optsByQuestion.get(opt.question_id) ?? [];
          list.push({ id: opt.id, option_text: opt.option_text, is_correct: opt.is_correct });
          optsByQuestion.set(opt.question_id, list);
        });

        const withOptions = qs.map((q) => ({
          ...q,
          options: optsByQuestion.get(q.id) ?? [],
        }));
        setQuestions(withOptions);
      }

      if (user) {
        const { data: bm } = await supabase
          .from("bookmarks")
          .select("question_id")
          .eq("user_id", user.id);
        if (bm) setBookmarkedIds(new Set(bm.map((b) => b.question_id)));

        // Create a practice session
        if (topicId) {
          const { data: session } = await supabase
            .from("practice_sessions")
            .insert({
              user_id: user.id,
              topic_id: topicId,
              questions_answered: 0,
              correct_answers: 0,
              total_time: 0,
            })
            .select("id")
            .single();
          if (session) {
            sessionIdRef.current = session.id;
            sessionStartRef.current = Date.now();
          }
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [topicId, user]);

  // Save practice session on unmount
  const savePracticeSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const totalTime = Math.round((Date.now() - sessionStartRef.current) / 1000);
    await supabase
      .from("practice_sessions")
      .update({
        questions_answered: answeredCountRef.current,
        correct_answers: correctCountRef.current,
        total_time: totalTime,
      })
      .eq("id", sessionIdRef.current);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      savePracticeSession();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      savePracticeSession();
    };
  }, [savePracticeSession]);

  const currentQ = questions[currentIdx];

  const toggleBookmark = async () => {
    if (!user || !currentQ) return;
    if (bookmarkedIds.has(currentQ.id)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("question_id", currentQ.id);
      setBookmarkedIds((prev) => { const n = new Set(prev); n.delete(currentQ.id); return n; });
      toast({ title: "Bookmark removed" });
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, question_id: currentQ.id });
      setBookmarkedIds((prev) => new Set(prev).add(currentQ.id));
      toast({ title: "Question bookmarked!" });
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedOption || !currentQ) return;
    setShowAnswer(true);
    answeredCountRef.current += 1;
    const opt = currentQ.options.find((o) => o.id === selectedOption);
    if (opt?.is_correct) {
      correctCountRef.current += 1;
    }
  };

  const handleNext = () => {
    if (currentIdx === questions.length - 1) {
      setShowResults(true);
    } else {
      setSelectedOption(null);
      setShowAnswer(false);
      setCurrentIdx((prev) => Math.min(prev + 1, questions.length - 1));
    }
  };

  const handlePrev = () => {
    setSelectedOption(null);
    setShowAnswer(false);
    setCurrentIdx((prev) => Math.max(prev - 1, 0));
  };

  const diffColors: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/subjects")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {topicName || "Practice"}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No questions available for this topic yet.
            </CardContent>
          </Card>
        ) : showResults ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Practice Complete!</h2>
              <p className="text-muted-foreground mb-8">
                Great job! You've completed all available questions for this topic. Here is your summary:
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-primary">{answeredCountRef.current}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Answered</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-emerald-600">{correctCountRef.current}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Correct</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {answeredCountRef.current > 0 
                      ? Math.round((correctCountRef.current / answeredCountRef.current) * 100) 
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Accuracy</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((Date.now() - sessionStartRef.current) / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Time</div>
                </div>
              </div>

              <Button size="lg" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
            </Card>
          </motion.div>
        ) : currentQ ? (
          <motion.div key={currentQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {currentIdx + 1} / {questions.length}
                    </span>
                    <Badge variant="outline" className={diffColors[currentQ.difficulty] || ""}>
                      {currentQ.difficulty}
                    </Badge>
                    <Badge variant="outline">{currentQ.question_type}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleBookmark}>
                    {bookmarkedIds.has(currentQ.id) ? (
                      <BookmarkCheck className="h-5 w-5 text-primary" />
                    ) : (
                      <Bookmark className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                <p className="mb-6 text-lg font-medium">{currentQ.question_text}</p>

                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    let optClass = "border border-border bg-card hover:bg-secondary";
                    if (showAnswer && opt.is_correct) {
                      optClass = "border-2 border-emerald-500 bg-emerald-50";
                    } else if (showAnswer && selectedOption === opt.id && !opt.is_correct) {
                      optClass = "border-2 border-red-500 bg-red-50";
                    } else if (selectedOption === opt.id) {
                      optClass = "border-2 border-primary bg-primary/5";
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => !showAnswer && setSelectedOption(opt.id)}
                        disabled={showAnswer}
                        className={`w-full rounded-xl p-4 text-left transition-all ${optClass}`}
                      >
                        <div className="flex items-center gap-3">
                          {showAnswer && opt.is_correct && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                          {showAnswer && selectedOption === opt.id && !opt.is_correct && (
                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                          )}
                          <span className="text-sm">{opt.option_text}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showAnswer && currentQ.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 rounded-xl bg-secondary p-4"
                  >
                    <p className="text-sm font-medium mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{currentQ.explanation}</p>
                  </motion.div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="outline" onClick={handlePrev} disabled={currentIdx === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  {!showAnswer ? (
                    <Button onClick={handleCheckAnswer} disabled={!selectedOption}>
                      Check Answer
                    </Button>
                  ) : (
                    <Button onClick={handleNext}>
                      {currentIdx === questions.length - 1 ? "Finish Practice" : (
                        <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default PracticePage;
