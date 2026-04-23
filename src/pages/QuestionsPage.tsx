import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subject { id: string; subject_name: string; }
interface Topic { id: string; topic_name: string; subject_id: string; }
interface QuestionRow {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  explanation: string | null;
  topic_id: string;
  marks?: number;
  negative_marks?: number;
}

interface OptionRow { id?: string; text: string; isCorrect: boolean; }

const QuestionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MCQ");
  const [difficulty, setDifficulty] = useState("medium");
  const [explanation, setExplanation] = useState("");
  const [marks, setMarks] = useState("3");
  const [negativeMarks, setNegativeMarks] = useState("1");
  const [options, setOptions] = useState<OptionRow[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: subs }, { data: tops }, { data: qs }] = await Promise.all([
      supabase.from("subjects").select("*"),
      supabase.from("topics").select("*"),
      supabase.from("questions").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSubjects(subs ?? []);
    setTopics(tops ?? []);
    setQuestions(qs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setFilteredTopics(topics.filter((t) => t.subject_id === selectedSubject));
    if (!editingId) setSelectedTopic("");
  }, [selectedSubject, topics]);

  const resetForm = () => {
    setEditingId(null);
    setSelectedSubject("");
    setSelectedTopic("");
    setQuestionText("");
    setQuestionType("MCQ");
    setDifficulty("medium");
    setExplanation("");
    setMarks("3");
    setNegativeMarks("1");
    setOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = async (q: QuestionRow) => {
    setEditingId(q.id);
    setQuestionText(q.question_text);
    setQuestionType(q.question_type);
    setDifficulty(q.difficulty);
    setExplanation(q.explanation ?? "");
    setMarks(String(q.marks ?? 3));
    setNegativeMarks(String(q.negative_marks ?? 1));
    setSelectedTopic(q.topic_id);

    // Find subject for this topic
    const topic = topics.find((t) => t.id === q.topic_id);
    if (topic) setSelectedSubject(topic.subject_id);

    // Load existing options
    const { data: opts } = await supabase
      .from("options")
      .select("id, option_text, is_correct")
      .eq("question_id", q.id);

    if (opts && opts.length > 0) {
      setOptions(opts.map((o) => ({ id: o.id, text: o.option_text, isCorrect: o.is_correct })));
    } else {
      setOptions([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
    }

    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !selectedTopic || !questionText.trim()) {
      toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: "Need at least 2 options", variant: "destructive" });
      return;
    }
    if (!validOptions.some((o) => o.isCorrect)) {
      toast({ title: "Mark at least one correct answer", variant: "destructive" });
      return;
    }

    if (editingId) {
      // UPDATE existing question
      const { error } = await supabase
        .from("questions")
        .update({
          topic_id: selectedTopic,
          question_text: questionText.trim(),
          question_type: questionType,
          difficulty,
          explanation: explanation.trim() || null,
          marks: parseFloat(marks) || 3,
          negative_marks: parseFloat(negativeMarks) || 1,
        })
        .eq("id", editingId);

      if (error) {
        toast({ title: "Error updating question", description: error.message, variant: "destructive" });
        return;
      }

      // Delete old options and insert new ones
      await supabase.from("options").delete().eq("question_id", editingId);
      const optInserts = validOptions.map((o) => ({
        question_id: editingId,
        option_text: o.text.trim(),
        is_correct: o.isCorrect,
      }));
      await supabase.from("options").insert(optInserts);

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingId
            ? {
                ...q,
                topic_id: selectedTopic,
                question_text: questionText.trim(),
                question_type: questionType,
                difficulty,
                explanation: explanation.trim() || null,
                marks: parseFloat(marks) || 3,
                negative_marks: parseFloat(negativeMarks) || 1,
              }
            : q
        )
      );
      toast({ title: "Question updated!" });
    } else {
      // CREATE new question
      const { data: q, error } = await supabase
        .from("questions")
        .insert({
          teacher_id: user.id,
          topic_id: selectedTopic,
          question_text: questionText.trim(),
          question_type: questionType,
          difficulty,
          explanation: explanation.trim() || null,
          marks: parseFloat(marks) || 3,
          negative_marks: parseFloat(negativeMarks) || 1,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Error creating question", description: error.message, variant: "destructive" });
        return;
      }

      if (q) {
        const optInserts = validOptions.map((o) => ({
          question_id: q.id,
          option_text: o.text.trim(),
          is_correct: o.isCorrect,
        }));
        await supabase.from("options").insert(optInserts);
        setQuestions((prev) => [q, ...prev]);
        toast({ title: "Question created!" });
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast({ title: "Question deleted" });
  };

  const getTopicName = (topicId: string) => topics.find((t) => t.id === topicId)?.topic_name || "Unknown";

  const diffColors: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
              Questions Management
            </h1>
            <p className="mt-1 text-muted-foreground">Create and manage your questions</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <PlusCircle className="h-4 w-4" /> Add Question
          </Button>
        </div>
      </motion.div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Edit Question" : "Create Question"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    {filteredTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.topic_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="MSQ">MSQ</SelectItem>
                    <SelectItem value="NAT">NAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Marks (correct)</Label>
                <Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} min="0" step="0.5" />
              </div>
              <div className="space-y-2">
                <Label>Negative Marks (wrong)</Label>
                <Input type="number" value={negativeMarks} onChange={(e) => setNegativeMarks(e.target.value)} min="0" step="0.01" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter the question..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Options (mark correct answer)</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type={questionType === "MSQ" ? "checkbox" : "radio"}
                    name="correct"
                    checked={opt.isCorrect}
                    onChange={() => {
                      setOptions((prev) =>
                        prev.map((o, i) =>
                          questionType === "MSQ"
                            ? i === idx ? { ...o, isCorrect: !o.isCorrect } : o
                            : { ...o, isCorrect: i === idx }
                        )
                      );
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o)))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Add explanation..."
                rows={2}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              {editingId ? "Update Question" : "Create Question"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No questions yet. Click "Add Question" to create your first one!
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {questions.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="card-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-sm line-clamp-2">{q.question_text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className={diffColors[q.difficulty] || ""}>{q.difficulty}</Badge>
                      <Badge variant="outline">{q.question_type}</Badge>
                      <Badge variant="secondary">{getTopicName(q.topic_id)}</Badge>
                      <Badge variant="secondary" className="ml-auto">
                        +{q.marks ?? 3} / −{q.negative_marks ?? 1}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuestionsPage;
