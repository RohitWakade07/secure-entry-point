import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { PlusCircle, Clock, FileText, Play, Settings, Trash2, Plus, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  questionCount?: number;
}

interface QuestionBrief {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
}

const TestsPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("180");

  // Question management state
  const [manageTestId, setManageTestId] = useState<string | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [attachedQuestions, setAttachedQuestions] = useState<QuestionBrief[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionBrief[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [manageLoading, setManageLoading] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      const { data } = await supabase.from("tests").select("*").order("created_at", { ascending: false });
      if (data) {
        // Batch-fetch question counts per test
        const testIds = data.map((t) => t.id);
        const { data: tqs } = await supabase
          .from("test_questions")
          .select("test_id")
          .in("test_id", testIds);

        const countMap = new Map<string, number>();
        (tqs ?? []).forEach((tq) => {
          countMap.set(tq.test_id, (countMap.get(tq.test_id) ?? 0) + 1);
        });

        setTests(data.map((t) => ({ ...t, questionCount: countMap.get(t.id) ?? 0 })));
      }
      setLoading(false);
    };
    fetchTests();
  }, []);

  const createTest = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Enter a test title", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("tests")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        duration: parseInt(duration) || 180,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      setTests((prev) => [{ ...data, questionCount: 0 }, ...prev]);
      toast({ title: "Test created!" });
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setDuration("180");
    }
  };

  const openManageQuestions = async (testId: string) => {
    if (!user) return;
    setManageTestId(testId);
    setManageLoading(true);
    setManageDialogOpen(true);
    setSearchQuery("");

    // Fetch attached question IDs for this test
    const { data: tqs } = await supabase
      .from("test_questions")
      .select("question_id")
      .eq("test_id", testId);
    const attachedIds = new Set((tqs ?? []).map((tq) => tq.question_id));

    // Fetch all questions the teacher has created
    const { data: allQs } = await supabase
      .from("questions")
      .select("id, question_text, question_type, difficulty")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    const all = allQs ?? [];
    setAttachedQuestions(all.filter((q) => attachedIds.has(q.id)));
    setAvailableQuestions(all.filter((q) => !attachedIds.has(q.id)));
    setManageLoading(false);
  };

  const addQuestionToTest = async (questionId: string) => {
    if (!manageTestId) return;
    const { error } = await supabase
      .from("test_questions")
      .insert({ test_id: manageTestId, question_id: questionId });
    if (error) {
      toast({ title: "Error adding question", description: error.message, variant: "destructive" });
      return;
    }

    const q = availableQuestions.find((aq) => aq.id === questionId);
    if (q) {
      setAvailableQuestions((prev) => prev.filter((aq) => aq.id !== questionId));
      setAttachedQuestions((prev) => [...prev, q]);
      // Update count in test list
      setTests((prev) =>
        prev.map((t) =>
          t.id === manageTestId ? { ...t, questionCount: (t.questionCount ?? 0) + 1 } : t
        )
      );
    }
    toast({ title: "Question added to test" });
  };

  const removeQuestionFromTest = async (questionId: string) => {
    if (!manageTestId) return;
    await supabase
      .from("test_questions")
      .delete()
      .eq("test_id", manageTestId)
      .eq("question_id", questionId);

    const q = attachedQuestions.find((aq) => aq.id === questionId);
    if (q) {
      setAttachedQuestions((prev) => prev.filter((aq) => aq.id !== questionId));
      setAvailableQuestions((prev) => [...prev, q]);
      setTests((prev) =>
        prev.map((t) =>
          t.id === manageTestId ? { ...t, questionCount: Math.max(0, (t.questionCount ?? 0) - 1) } : t
        )
      );
    }
    toast({ title: "Question removed from test" });
  };

  const filteredAvailable = availableQuestions.filter((q) =>
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isTeacherOrAdmin = role === "teacher" || role === "admin";

  const diffColors: Record<string, string> = {
    easy: "text-emerald-600",
    medium: "text-amber-600",
    hard: "text-red-600",
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
              {isTeacherOrAdmin ? "Test Management" : "Mock Tests"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isTeacherOrAdmin ? "Create and manage test series" : "Take full-length mock tests"}
            </p>
          </div>
          {isTeacherOrAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Create Test
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Create New Test</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Test Title</Label>
                    <Input placeholder="e.g. GATE CS 2026 Mock Test 1" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="Brief description of the test..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="10" max="360" />
                  </div>
                  <Button onClick={createTest} className="w-full">Create Test</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tests.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No tests available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test, i) => (
            <motion.div key={test.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                      {test.title}
                    </CardTitle>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {test.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{test.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{test.duration} min</span>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Hash className="h-3 w-3" />
                      {test.questionCount ?? 0} questions
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {role === "student" && (
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => navigate(`/test/${test.id}`)}
                        disabled={(test.questionCount ?? 0) === 0}
                      >
                        <Play className="h-4 w-4" /> Start Test
                      </Button>
                    )}
                    {isTeacherOrAdmin && (
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => openManageQuestions(test.id)}
                      >
                        <Settings className="h-4 w-4" /> Manage Questions
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manage Questions Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Manage Test Questions</DialogTitle>
          </DialogHeader>

          {manageLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Attached questions */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Attached Questions ({attachedQuestions.length})
                </h3>
                {attachedQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No questions attached yet. Add from below.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {attachedQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1 pr-3">
                          <p className="text-sm line-clamp-1">{q.question_text}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs font-medium ${diffColors[q.difficulty] || ""}`}>
                              {q.difficulty}
                            </span>
                            <span className="text-xs text-muted-foreground">{q.question_type}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestionFromTest(q.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available questions */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Available Questions ({filteredAvailable.length})
                </h3>
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-3"
                />
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {availableQuestions.length === 0
                      ? "All your questions are already attached, or you have none. Create questions first."
                      : "No questions match your search."}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredAvailable.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1 pr-3">
                          <p className="text-sm line-clamp-1">{q.question_text}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs font-medium ${diffColors[q.difficulty] || ""}`}>
                              {q.difficulty}
                            </span>
                            <span className="text-xs text-muted-foreground">{q.question_type}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => addQuestionToTest(q.id)}
                        >
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TestsPage;
