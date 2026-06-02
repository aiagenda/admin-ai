import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, RefreshCw, UserCheck, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  free_trial_docs_used: number;
  prepaid_basic_credits: number;
  prepaid_pro_credits: number;
  documents_per_month: number;
  doc_count: number;
};

const PLAN_COLORS: Record<string, string> = {
  free: "secondary",
  monthly: "default",
  business: "default",
  enterprise: "default",
  pro: "default",
  basic: "outline",
};

const PAGE_SIZE = 50;

export default function UsersAdmin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_admin_users_list", {
      _limit: PAGE_SIZE,
      _offset: page * PAGE_SIZE,
      _search: debouncedSearch || null,
    });
    if (data && !data.error) {
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Users</h1>
            <Badge variant="secondary">{total} total</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-3 pb-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Docs</th>
                  <th className="pb-2 pr-4 font-medium">Credits (B/P)</th>
                  <th className="pb-2 pr-4 font-medium">Joined</th>
                  <th className="pb-2 font-medium">Last sign in</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">Loading…</td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No users found</td>
                  </tr>
                )}
                {!loading && users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs truncate max-w-[200px]">{u.email}</span>
                        {u.email_confirmed_at && <UserCheck className="h-3 w-3 text-emerald-500 shrink-0" />}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={(PLAN_COLORS[u.plan_type ?? "free"] ?? "secondary") as "default" | "secondary" | "outline"} className="text-xs capitalize">
                        {u.plan_type ?? "free"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {u.subscription_status ? (
                        <span className={`text-xs font-medium ${u.subscription_status === "active" ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {u.subscription_status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{u.doc_count}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {u.prepaid_basic_credits} / {u.prepaid_pro_credits}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {format(new Date(u.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "MMM d") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-2 text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
