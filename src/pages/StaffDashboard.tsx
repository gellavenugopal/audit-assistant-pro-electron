import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, getStatusVariant } from '@/components/ui/status-badge';
import { 
  ClipboardList, 
  MessageSquare, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';

interface AssignedProcedure {
  id: string;
  procedure_name: string;
  area: string;
  status: string;
  due_date: string | null;
  engagement: {
    name: string;
    client_name: string;
  };
}

interface AssignedReviewNote {
  id: string;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  engagement: {
    name: string;
  };
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState<AssignedProcedure[]>([]);
  const [reviewNotes, setReviewNotes] = useState<AssignedReviewNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAssignedTasks();
  }, [user]);

  const fetchAssignedTasks = async () => {
    setLoading(true);
    try {
      // Fetch assigned procedures
      const { data: proceduresData, error: procError } = await supabase
        .from('audit_procedures')
        .select(`
          id, procedure_name, area, status, due_date,
          engagements!audit_procedures_engagement_id_fkey (name, client_name)
        `)
        .eq('assigned_to', user?.id)
        .neq('status', 'reviewed')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (procError) throw procError;

      const formattedProcedures = (proceduresData || []).map((p: any) => ({
        id: p.id,
        procedure_name: p.procedure_name,
        area: p.area,
        status: p.status,
        due_date: p.due_date,
        engagement: {
          name: p.engagements?.name || 'Unknown',
          client_name: p.engagements?.client_name || 'Unknown'
        }
      }));

      setProcedures(formattedProcedures);

      // Fetch assigned review notes
      const { data: notesData, error: notesError } = await supabase
        .from('review_notes')
        .select(`
          id, title, priority, status, created_at,
          engagements!review_notes_engagement_id_fkey (name)
        `)
        .eq('assigned_to', user?.id)
        .neq('status', 'closed')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      const formattedNotes = (notesData || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        priority: n.priority,
        status: n.status,
        created_at: n.created_at,
        engagement: {
          name: n.engagements?.name || 'Unknown'
        }
      }));

      setReviewNotes(formattedNotes);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'low': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const pendingProcedures = procedures.filter(p => p.status !== 'completed');
  const openNotes = reviewNotes.filter(n => n.status === 'open');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground">Your assigned tasks and pending items</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-8 w-8" /> : pendingProcedures.length}
                </p>
                <p className="text-xs text-muted-foreground">Pending Procedures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-8 w-8" /> : openNotes.length}
                </p>
                <p className="text-xs text-muted-foreground">Open Review Notes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-8 w-8" /> : procedures.filter(p => p.status === 'completed').length}
                </p>
                <p className="text-xs text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-8 w-8" /> : procedures.filter(p => p.due_date && new Date(p.due_date) < new Date()).length}
                </p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              My Procedures
            </CardTitle>
            <CardDescription>Procedures assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : pendingProcedures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No pending procedures</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingProcedures.map(proc => (
                  <div key={proc.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{proc.procedure_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {proc.engagement.client_name} • {proc.engagement.name}
                        </p>
                      </div>
                      <StatusBadge variant={getStatusVariant(proc.status)} className="shrink-0">
                        {proc.status.replace('_', ' ')}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{proc.area}</Badge>
                      {proc.due_date && (
                        <span className={`flex items-center gap-1 ${new Date(proc.due_date) < new Date() ? 'text-destructive' : ''}`}>
                          <Clock className="h-3 w-3" />
                          {format(new Date(proc.due_date), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Review Notes
            </CardTitle>
            <CardDescription>Notes assigned to you for response</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : reviewNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No review notes assigned</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {reviewNotes.map(note => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground">{note.engagement.name}</p>
                      </div>
                      <Badge className={getPriorityColor(note.priority)}>
                        {note.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <StatusBadge variant={getStatusVariant(note.status)}>
                        {note.status}
                      </StatusBadge>
                      <span>{format(new Date(note.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
