import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { Users, Shield, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  user_id: string;
  full_name: string | null;
  branch: string | null;
  role: string | null;
}

const UsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, branch");
if (profiles) {
        const withRoles = await Promise.all(
          profiles.map(async (p) => {
            if (p) {
              const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", p.user_id)
              .maybeSingle();
            return { ...p, role: roleData?.role ?? "none" };
          })
        );
        setUsers(withRoles);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const roleColors: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    teacher: "bg-blue-100 text-blue-700",
    student: "bg-emerald-100 text-emerald-700",
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold lg:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            User Management
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">View and manage all platform users</p>
      </motion.div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card className="mt-8">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.branch || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[u.role ?? ""] || ""}>
                        {u.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default UsersPage;
