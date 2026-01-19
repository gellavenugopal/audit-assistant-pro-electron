import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Download, Activity, FileCheck, Upload, CheckCircle, LogIn, UserPlus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useActivityLogs } from '@/hooks/useActivityLogs';

const getEventIcon = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('login') || lowerAction.includes('signed in')) return LogIn;
  if (lowerAction.includes('signup') || lowerAction.includes('registered')) return UserPlus;
  if (lowerAction.includes('upload')) return Upload;
  if (lowerAction.includes('delete')) return Trash2;
  if (lowerAction.includes('update') || lowerAction.includes('edit')) return Edit;
  if (lowerAction.includes('complete') || lowerAction.includes('approve')) return CheckCircle;
  if (lowerAction.includes('review')) return FileCheck;
  return Activity;
};

const getEventColor = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('delete')) return 'text-destructive bg-destructive/10';
  if (lowerAction.includes('complete') || lowerAction.includes('approve')) return 'text-success bg-success/10';
  if (lowerAction.includes('review')) return 'text-info bg-info/10';
  if (lowerAction.includes('create') || lowerAction.includes('upload')) return 'text-primary bg-primary/10';
  if (lowerAction.includes('login') || lowerAction.includes('signup')) return 'text-amber-500 bg-amber-500/10';
  return 'text-muted-foreground bg-muted';
};

export default function AuditTrail() {
  const { logs, loading, stats } = useActivityLogs();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
          <p className="text-muted-foreground mt-1">
            Complete history of all actions and changes
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Log
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Events
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Today's Activity
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-12" /> : stats.today}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active Users
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-10" /> : stats.activeUsers}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Events Table */}
      <div className="audit-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-36">Timestamp</TableHead>
                <TableHead className="w-32">User</TableHead>
                <TableHead className="w-28">Action</TableHead>
                <TableHead className="w-28">Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No events match your search' : 'No activity logged yet'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = getEventIcon(log.action);
                  const colorClass = getEventColor(log.action);
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className={cn('p-1.5 rounded-lg w-fit', colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                            {log.user_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">{log.action}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
                          {log.entity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.details || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
