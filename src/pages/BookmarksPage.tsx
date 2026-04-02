import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Bookmark, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookmarkedQuestion {
  id: string;
  question_id: string;
  question: {
    id: string;
    question_text: string;
    difficulty: string;
    question_type: string;
  } | null;
}

const BookmarksPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("bookmarks")
        .select("id, question_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const withQuestions = await Promise.all(
          data.map(async (bm) => {
            const { data: q } = await supabase
              .from("questions")
              .select("id, question_text, difficulty, question_type")
              .eq("id", bm.question_id)
              .maybeSingle();
            return { ...bm, question: q };
          })
        );
        setBookmarks(withQuestions);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const removeBookmark = async (bookmarkId: string) => {
    await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    toast({ title: "Bookmark removed" });
  };

  const diffColors: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Bookmarked Questions
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">Questions you've saved for later review</p>
      </motion.div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : bookmarks.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No bookmarked questions yet. Bookmark questions while practicing!
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {bookmarks.map((bm, i) => (
            <motion.div
              key={bm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="card-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-sm">{bm.question?.question_text || "Question unavailable"}</p>
                    <div className="mt-2 flex gap-2">
                      {bm.question && (
                        <>
                          <Badge variant="outline" className={diffColors[bm.question.difficulty] || ""}>
                            {bm.question.difficulty}
                          </Badge>
                          <Badge variant="outline">{bm.question.question_type}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeBookmark(bm.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BookmarksPage;
