import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Clock, Play, Calendar, Sparkles, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Subject {
  id: string;
  subject_name: string;
}

const TestsPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [questionCount, setQuestionCount] = useState<string>("10");
  const [duration, setDuration] = useState<string>("30");

  useEffect(() => {
    const load = async () => {
      const [{ data: subs }, { data: qs }] = await Promise.all([
        supabase.from("subjects").select("id, subject_name").order("subject_name"),
        supabase.from("questions").select("year").not("year", "is", null),
      ]);
      if (subs) setSubjects(subs);
      if (qs) {
        const ys = Array.from(new Set(qs.map((q: any) => q.year).filter(Boolean))).sort((a, b) => b - a);
        setAvailableYears(ys);
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const matchingCount = useMemo(() => {
    // Show how many questions match — fetched live
    return null;
  }, []);

  const startTest = async () => {
    if (!user) return;
    if (!selectedSubject) {
      toast({ title: "Choose a subject", variant: "destructive" });
      return;
    }
    const count = Math.max(1, parseInt(questionCount) || 10);
    const dur = Math.max(5, parseInt(duration) || 30);

    // Build the params and navigate to the generated test engine
    const params = new URLSearchParams();
    params.set("subject", selectedSubject);
    params.set("count", String(count));
    params.set("duration", String(dur));
    if (selectedYears.size > 0) {
      params.set("years", Array.from(selectedYears).join(","));
    }
    navigate(`/test/generate?${params.toString()}`);
  };

  if (role !== "student") {
    return (
      <DashboardLayout>
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            Year-wise test generation is available for students. Use Question Management to curate the question bank.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          Year-wise Mock Tests
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pick a subject, optionally filter by GATE year(s), and start a custom test.
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                <Sparkles className="h-5 w-5 text-primary" />
                Configure Your Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Subject
                </Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Years
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional — leave empty for random across all years)
                  </span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map((y) => {
                    const active = selectedYears.has(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => toggleYear(y)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
                {selectedYears.size > 0 && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => setSelectedYears(new Set())}
                  >
                    Clear year filter
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Number of questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Duration (min)
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={360}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>

              <Button size="lg" className="w-full gap-2" onClick={startTest}>
                <Play className="h-4 w-4" /> Start Test
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ fontFamily: "var(--font-heading)" }}>
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Pick any subject from the GATE syllabus.</p>
              <p>• Select one or more years (e.g. only 2018) to focus on those papers.</p>
              <p>• Leave years empty to get a random mix across all years.</p>
              <p>• Each question shows its source year during the exam.</p>
              <div className="pt-3">
                <Badge variant="secondary">Available years</Badge>
                <div className="mt-2 flex flex-wrap gap-1">
                  {availableYears.map((y) => (
                    <span key={y} className="text-xs text-muted-foreground">{y}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TestsPage;
