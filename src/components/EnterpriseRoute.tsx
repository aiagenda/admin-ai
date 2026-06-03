import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanType } from "@/hooks/usePlanType";

interface EnterpriseRouteProps {
  children: React.ReactNode;
  featureName?: string;
}

export function EnterpriseRoute({ children, featureName = "This feature" }: EnterpriseRouteProps) {
  const { user } = useAuth();
  const { planType, loading } = usePlanType(user);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Checking subscription…</p>
        </div>
      </div>
    );
  }

  if (planType !== "enterprise") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-lg p-8">
          <h1 className="text-2xl font-bold mb-4">Enterprise feature</h1>
          <p className="text-muted-foreground mb-6">
            {featureName} is only available on the Enterprise plan. Upgrade your subscription to get access.
          </p>
          <Link to="/pricing" className="text-primary hover:underline">
            View plans
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
