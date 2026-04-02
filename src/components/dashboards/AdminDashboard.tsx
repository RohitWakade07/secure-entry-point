import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, BookOpen, FileText, Shield } from "lucide-react";

const AdminDashboard = () => {
  const [counts, setCounts] = useState({ users: 0, subjects: 0, questions: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [{ count: subjectCount }, { count: questionCount }] = await Promise.all([
        supabase.from("subjects").select("*", { count: "exact", head: true }),
        supabase.from("questions").select("*", { count: "exact", head: true }),
      ]);
      setCounts({
        users: 0,
        subjects: subjectCount ?? 0,
        questions: questionCount ?? 0,
      });
    };
    fetchCounts();
  }, []);

  const stats = [
    { label: "Total Users", value: String(counts.users), icon: Users, color: "text-primary" },
    { label: "Subjects", value: String(counts.subjects), icon: BookOpen, color: "text-emerald-500" },
    { label: "Questions", value: String(counts.questions), icon: FileText, color: "text-amber-500" },
    { label: "Active Roles", value: "3", icon: Shield, color: "text-violet-500" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Admin Dashboard 🛠️
        </h1>
        <p className="mt-1 text-muted-foreground">Platform overview and management</p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>Management</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <button className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Manage Users</p>
                <p className="text-xs text-muted-foreground">View & edit user roles</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium text-sm">Manage Subjects</p>
                <p className="text-xs text-muted-foreground">Add subjects & topics</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary">
              <Shield className="h-5 w-5 text-violet-500" />
              <div>
                <p className="font-medium text-sm">Content Moderation</p>
                <p className="text-xs text-muted-foreground">Review & approve</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
