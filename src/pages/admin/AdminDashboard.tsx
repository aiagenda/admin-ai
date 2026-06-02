import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, FileText, TrendingUp, DollarSign, Star,
  PenLine, Database, Settings2, Zap, ArrowUpRight,
  UserCheck, CreditCard, Activity, RefreshCw, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// USD price per plan per month (for MRR estimate)
const PLAN_PRICE: Record<string, number> = {
  monthly: 9.99,
  business: 29.99,
  enterprise: 49.99,
};

type RevenueStats = {
  plan_breakdown: Record<string, number>;
  paying_count: number;
  free_trial_count: number;
  prepaid_count: number;
  new_users_7d: number;
  new_users_30d: number;
  docs_this_month: number;
  docs_last_month: number;
  analyses_this_month: number;
  feedback_helpful: number;
  feedback_not_helpful: number;
  recent_users: RecentUser[];
};

type UserStats = {
  registered: number;
  active_30d: number;
};

type RecentUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  plan_type: string;
  doc_count: number;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "purple";
  href?: string;
}) {
  const accentColor = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-violet-600 dark:text-violet-400",
  }[accent ?? "blue"];

  const card = (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-semibold mt-1 ${accentColor}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted/60 ${accentColor}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link to={href}>{card}</Link> : card;
}

const ADMIN_SECTIONS = [
  { href: "/admin/blog", icon: PenLine, label: "Blog / Article Writer", desc: "Write, edit, publish posts" },
  { href: "/admin/users", icon: Users, label: "Users", desc: "All registered accounts" },
  { href: "/admin/analytics", icon: Activity, label: "Analytics", desc: "Upload funnel & feedback" },
  { href: "/admin/forms", icon: FileText, label: "Forms", desc: "IRS form catalog manager" },
  { href: "/admin/knowledge-base", icon: Database, label: "Knowledge Base", desc: "KB documents & embeddings" },
  { href: "/admin/ai-studio", icon: Zap, label: "AI Studio", desc: "Prompt versions & fields" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [revStats, setRevStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchStats() {
    setLoading(true);
    const [{ data: us }, { data: rs }] = await Promise.all([
      supabase.rpc("get_admin_user_stats"),
      supabase.rpc("get_admin_revenue_stats"),
    ]);
    if (us && !us.error) setUserStats(us as UserStats);
    if (rs && !rs.error) setRevStats(rs as RevenueStats);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, []);

  const mrr = revStats
    ? Object.entries(revStats.plan_breakdown ?? {}).reduce((sum, [plan, count]) => {
        return sum + (PLAN_PRICE[plan] ?? 0) * count;
      }, 0)
    : 0;

  const feedbackTotal = (revStats?.feedback_helpful ?? 0) + (revStats?.feedback_not_helpful ?? 0);
  const feedbackScore = feedbackTotal > 0
    ? Math.round((revStats!.feedback_helpful / feedbackTotal) * 100)
    : null;

  const docsGrowth = revStats && revStats.docs_last_month > 0
    ? Math.round(((revStats.docs_this_month - revStats.docs_last_month) / revStats.docs_last_month) * 100)
    : null;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {format(lastRefresh, "HH:mm:ss")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/admin/blog")}>
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              New article
            </Button>
          </div>
        </div>

        {/* Revenue metrics */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Revenue</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={DollarSign}
              label="MRR estimate"
              value={`$${mrr.toFixed(0)}`}
              sub="subscriptions only"
              accent="green"
            />
            <MetricCard
              icon={CreditCard}
              label="Paying subscribers"
              value={revStats?.paying_count ?? "—"}
              sub="active plans"
              accent="green"
              href="/admin/users"
            />
            <MetricCard
              icon={Star}
              label="Free trial"
              value={revStats?.free_trial_count ?? "—"}
              sub="unused trial docs"
              accent="amber"
            />
            <MetricCard
              icon={TrendingUp}
              label="Prepaid credits"
              value={revStats?.prepaid_count ?? "—"}
              sub="users with credits"
              accent="purple"
            />
          </div>
        </div>

        {/* User metrics */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Users</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={Users}
              label="Total registered"
              value={userStats?.registered ?? "—"}
              accent="blue"
              href="/admin/users"
            />
            <MetricCard
              icon={UserCheck}
              label="Active (30d)"
              value={userStats?.active_30d ?? "—"}
              sub="signed in last 30 days"
              accent="blue"
            />
            <MetricCard
              icon={ArrowUpRight}
              label="New (last 7d)"
              value={revStats?.new_users_7d ?? "—"}
              accent="green"
            />
            <MetricCard
              icon={ArrowUpRight}
              label="New (last 30d)"
              value={revStats?.new_users_30d ?? "—"}
              accent="green"
            />
          </div>
        </div>

        {/* Document metrics */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Documents</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={FileText}
              label="Docs this month"
              value={revStats?.docs_this_month ?? "—"}
              sub={docsGrowth !== null ? `${docsGrowth >= 0 ? "+" : ""}${docsGrowth}% vs last month` : undefined}
              accent="blue"
            />
            <MetricCard
              icon={FileText}
              label="Analyses this month"
              value={revStats?.analyses_this_month ?? "—"}
              accent="blue"
            />
            <MetricCard
              icon={Settings2}
              label="Feedback score"
              value={feedbackScore !== null ? `${feedbackScore}%` : "—"}
              sub={feedbackTotal > 0 ? `${feedbackTotal} responses` : "no data yet"}
              accent={feedbackScore !== null && feedbackScore >= 70 ? "green" : "amber"}
            />
            <MetricCard
              icon={Activity}
              label="Docs last month"
              value={revStats?.docs_last_month ?? "—"}
              accent="purple"
            />
          </div>
        </div>

        {/* Plan breakdown */}
        {revStats?.plan_breakdown && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Plan breakdown</p>
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3">
                  {Object.entries(revStats.plan_breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([plan, count]) => (
                      <div key={plan} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                        <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">{plan}</span>
                        <span className="text-lg font-semibold">{count}</span>
                        {PLAN_PRICE[plan] && (
                          <span className="text-xs text-muted-foreground">${(PLAN_PRICE[plan] * count).toFixed(0)}/mo</span>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick nav to all admin sections */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Admin sections</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ADMIN_SECTIONS.map((s) => (
              <Card
                key={s.href}
                className="hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => navigate(s.href)}
              >
                <CardContent className="pt-4 pb-3 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/60 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        {revStats?.recent_users && revStats.recent_users.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent signups</p>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/users">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
            <Card>
              <CardContent className="pt-3 pb-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="pb-2 pr-4 font-medium">Email</th>
                        <th className="pb-2 pr-4 font-medium">Plan</th>
                        <th className="pb-2 pr-4 font-medium">Docs</th>
                        <th className="pb-2 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revStats.recent_users.map((u) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={u.plan_type === "free" ? "secondary" : "default"} className="text-xs">
                              {u.plan_type}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{u.doc_count}</td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {format(new Date(u.created_at), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PostHog link */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
          <span>External analytics:</span>
          <a
            href="https://app.posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            PostHog <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Stripe <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Supabase <ExternalLink className="h-3 w-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
