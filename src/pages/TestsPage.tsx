import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { PlusCircle, Clock, FileText, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Test {
  id: string;
  title: string;
  duration: number;
  created_by: string;
  created_at: string;
}

const TestsPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("180");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("tests").select("*").order("created_at", { ascending: false });
      setTests(data ?? []);
      setLoading(false);
    };
    fetch();
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
      setTests((prev) => [data, ...prev]);
      toast({ title: "Test created!" });
      setDialogOpen(false);
      setTitle("");
      setDuration("180");
    }
  };

  const isTeacherOrAdmin = role === "teacher" || role === "admin";

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
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    <span>{test.duration} minutes</span>
                  </div>
                  {role === "student" && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => navigate(`/test/${test.id}`)}
                    >
                      <Play className="h-4 w-4" /> Start Test
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default TestsPage;
