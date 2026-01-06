import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/contexts/EngagementContext';
import { Loader2 } from 'lucide-react';

interface ProtectedEngagementRouteProps {
  children: ReactNode;
}

export function ProtectedEngagementRoute({ children }: ProtectedEngagementRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentEngagement, loading: engagementLoading } = useEngagement();

  if (authLoading || engagementLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!currentEngagement) {
    return <Navigate to="/select-engagement" replace />;
  }

  return <>{children}</>;
}
