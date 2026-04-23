import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";

interface Subject {
  id: string;
  subject_name: string;
  topics?: { id: string; topic_name: string }[];
}

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      // Fetch subjects and topics in parallel (single query each — no N+1)
      const [{ data: subs }, { data: allTopics }] = await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("topics").select("id, topic_name, subject_id"),
      ]);

      if (subs) {
        // Group topics by subject_id in memory
        const topicsBySubject = new Map<string, { id: string; topic_name: string }[]>();
        (allTopics ?? []).forEach((t) => {
          const list = topicsBySubject.get(t.subject_id) ?? [];
          list.push({ id: t.id, topic_name: t.topic_name });
          topicsBySubject.set(t.subject_id, list);
        });

        const withTopics = subs.map((s) => ({
          ...s,
          topics: topicsBySubject.get(s.id) ?? [],
        }));
        setSubjects(withTopics);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          Subjects & Topics
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role === "admin" ? "Manage subjects and topics" : "Browse and practice by topic"}
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                    {subject.subject_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {subject.topics && subject.topics.length > 0 ? (
                    <ul className="space-y-2">
                      {subject.topics.map((topic) => (
                        <li key={topic.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-between text-sm"
                            onClick={() => navigate(`/practice/${topic.id}`)}
                          >
                            {topic.topic_name}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No topics yet</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {subjects.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">No subjects available yet.</p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SubjectsPage;
