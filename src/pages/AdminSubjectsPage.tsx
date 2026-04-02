import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { PlusCircle, BookOpen, Trash2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subject { id: string; subject_name: string; }
interface Topic { id: string; topic_name: string; subject_id: string; }

const AdminSubjectsPage = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [topicDialog, setTopicDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState("");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [{ data: subs }, { data: tops }] = await Promise.all([
      supabase.from("subjects").select("*").order("subject_name"),
      supabase.from("topics").select("*").order("topic_name"),
    ]);
    setSubjects(subs ?? []);
    setTopics(tops ?? []);
    setLoading(false);
  };

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    const { data, error } = await supabase.from("subjects").insert({ subject_name: newSubjectName.trim() }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) setSubjects((prev) => [...prev, data]);
    setNewSubjectName("");
    setSubjectDialog(false);
    toast({ title: "Subject added!" });
  };

  const addTopic = async () => {
    if (!newTopicName.trim() || !selectedSubjectForTopic) return;
    const { data, error } = await supabase
      .from("topics")
      .insert({ topic_name: newTopicName.trim(), subject_id: selectedSubjectForTopic })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) setTopics((prev) => [...prev, data]);
    setNewTopicName("");
    setTopicDialog(false);
    toast({ title: "Topic added!" });
  };

  const deleteSubject = async (id: string) => {
    await supabase.from("subjects").delete().eq("id", id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopics((prev) => prev.filter((t) => t.subject_id !== id));
    toast({ title: "Subject deleted" });
  };

  const deleteTopic = async (id: string) => {
    await supabase.from("topics").delete().eq("id", id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Topic deleted" });
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
              Subject & Topic Management
            </h1>
            <p className="mt-1 text-muted-foreground">Manage the knowledge structure</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject Name</Label>
                    <Input placeholder="e.g. Data Structures" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
                  </div>
                  <Button onClick={addSubject} className="w-full">Add Subject</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={topicDialog} onOpenChange={setTopicDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Topic</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubjectForTopic} onValueChange={setSelectedSubjectForTopic}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Topic Name</Label>
                    <Input placeholder="e.g. Binary Trees" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} />
                  </div>
                  <Button onClick={addTopic} className="w-full">Add Topic</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {subjects.map((subject, i) => {
            const subTopics = topics.filter((t) => t.subject_id === subject.id);
            const isExpanded = expandedSubject === subject.id;
            return (
              <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-0">
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{subject.subject_name}</p>
                          <p className="text-xs text-muted-foreground">{subTopics.length} topics</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        {subTopics.map((topic) => (
                          <div key={topic.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                            <span className="text-sm">{topic.topic_name}</span>
                            <Button variant="ghost" size="sm" onClick={() => deleteTopic(topic.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        {subTopics.length === 0 && (
                          <p className="text-sm text-muted-foreground py-2">No topics yet</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {subjects.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No subjects yet. Add one to get started!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminSubjectsPage;
