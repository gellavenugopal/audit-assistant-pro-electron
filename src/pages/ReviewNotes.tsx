import { useState } from 'react';
import { useReviewNotes } from '@/hooks/useReviewNotes';
import { useEngagements } from '@/hooks/useEngagements';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useEngagement } from '@/contexts/EngagementContext';
import { StatusBadge, getStatusVariant, getRiskVariant } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  User, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Briefcase,
  Trash2,
  Lock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { ReviewNote } from '@/hooks/useReviewNotes';
import { ApprovalBadge } from '@/components/audit/ApprovalBadge';
import { ApprovalActions } from '@/components/audit/ApprovalActions';
import { UnlockDialog } from '@/components/audit/UnlockDialog';

export default function ReviewNotes() {
  const { currentEngagement } = useEngagement();
  const { 
    notes, 
    loading, 
    createNote, 
    respondToNote, 
    clearNote, 
    reopenNote, 
    deleteNote,
    markPrepared,
    markReviewed,
    approveNote,
    unlockNote,
    canReview,
    canApprove,
    canUnlock
  } = useReviewNotes(currentEngagement?.id);
  const { engagements } = useEngagements();
  const { members: teamMembers } = useTeamMembers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ReviewNote | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [responseText, setResponseText] = useState('');
  const [unlockDialogNote, setUnlockDialogNote] = useState<ReviewNote | null>(null);

  // Form state - pre-fill with current engagement
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    engagement_id: currentEngagement?.id || '',
    assigned_to: '',
  });

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'open') return matchesSearch && note.status === 'open';
    if (activeTab === 'responded') return matchesSearch && note.status === 'responded';
    if (activeTab === 'cleared') return matchesSearch && note.status === 'cleared';
    return matchesSearch;
  });

  const noteCounts = {
    all: notes.length,
    open: notes.filter((n) => n.status === 'open').length,
    responded: notes.filter((n) => n.status === 'responded').length,
    cleared: notes.filter((n) => n.status === 'cleared').length,
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content || !formData.engagement_id) return;

    await createNote({
      title: formData.title,
      content: formData.content,
      priority: formData.priority,
      engagement_id: formData.engagement_id,
      assigned_to: formData.assigned_to || null,
    });

    setFormData({
      title: '',
      content: '',
      priority: 'medium',
      engagement_id: currentEngagement?.id || '',
      assigned_to: '',
    });
    setIsDialogOpen(false);
  };

  const handleRespond = async () => {
    if (!selectedNote || !responseText.trim()) return;
    await respondToNote(selectedNote.id, responseText);
    setResponseText('');
    setSelectedNote(null);
  };

  const handleClear = async () => {
    if (!selectedNote) return;
    await clearNote(selectedNote.id);
    setSelectedNote(null);
  };

  const handleReopen = async () => {
    if (!selectedNote) return;
    await reopenNote(selectedNote.id);
    setSelectedNote(null);
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    await deleteNote(selectedNote.id);
    setSelectedNote(null);
  };

  const handleUnlock = async (reason: string) => {
    if (!unlockDialogNote) return;
    await unlockNote(unlockDialogNote.id, reason);
    setUnlockDialogNote(null);
  };

  const NoteCard = ({ note }: { note: ReviewNote }) => (
    <div
      className="audit-card cursor-pointer hover:border-primary/50 transition-all"
      onClick={() => {
        setSelectedNote(note);
        setResponseText('');
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge variant={getStatusVariant(note.status)}>
              {note.status}
            </StatusBadge>
            <StatusBadge variant={getRiskVariant(note.priority)} dot={false}>
              {note.priority}
            </StatusBadge>
            <ApprovalBadge 
              stage={note.approval_stage || 'draft'} 
              locked={note.locked} 
            />
          </div>
          <h3 className="font-medium text-foreground">{note.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {note.content}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ApprovalActions
            stage={note.approval_stage || 'draft'}
            locked={note.locked}
            canPrepare={!note.locked}
            canReview={canReview}
            canApprove={canApprove}
            canUnlock={canUnlock}
            canEdit={!note.locked}
            canDelete={!note.locked}
            onMarkPrepared={() => markPrepared(note.id)}
            onMarkReviewed={() => markReviewed(note.id)}
            onApprove={() => approveNote(note.id)}
            onUnlock={() => setUnlockDialogNote(note)}
            onEdit={() => {
              setSelectedNote(note);
              setResponseText('');
            }}
            onDelete={() => deleteNote(note.id)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>Unknown</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
        </div>
        {note.engagement && (
          <div className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            <span>{note.engagement.client_name}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (!currentEngagement) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Notes</h1>
          <p className="text-muted-foreground mt-1">
            Track and clear review comments
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an engagement from the sidebar to view and manage review notes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Notes</h1>
          <p className="text-muted-foreground mt-1">
            {currentEngagement.client_name} - {currentEngagement.name}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Raise Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Raise Review Note</DialogTitle>
              <DialogDescription>
                Create a review note for an engagement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Engagement *</Label>
                <Select 
                  value={formData.engagement_id} 
                  onValueChange={(v) => setFormData({ ...formData, engagement_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.client_name} - {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input 
                  placeholder="Brief description of the issue" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea 
                  placeholder="Detailed explanation..." 
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select 
                    value={formData.assigned_to} 
                    onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!formData.title || !formData.content || !formData.engagement_id}
              >
                Raise Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="audit-card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{noteCounts.all}</p>
            <p className="text-xs text-muted-foreground">Total Notes</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertCircle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{noteCounts.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-info/10">
            <Clock className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{noteCounts.responded}</p>
            <p className="text-xs text-muted-foreground">Responded</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{noteCounts.cleared}</p>
            <p className="text-xs text-muted-foreground">Cleared</p>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All ({noteCounts.all})</TabsTrigger>
            <TabsTrigger value="open">Open ({noteCounts.open})</TabsTrigger>
            <TabsTrigger value="responded">Responded ({noteCounts.responded})</TabsTrigger>
            <TabsTrigger value="cleared">Cleared ({noteCounts.cleared})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="audit-card text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-foreground">No review notes found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm ? 'Try adjusting your search' : 'Raise a note to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge variant={getStatusVariant(selectedNote?.status || '')}>
                {selectedNote?.status}
              </StatusBadge>
              <StatusBadge variant={getRiskVariant(selectedNote?.priority || '')} dot={false}>
                {selectedNote?.priority}
              </StatusBadge>
            </div>
            <DialogTitle>{selectedNote?.title}</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm text-foreground mt-1">{selectedNote.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Raised By</Label>
                  <p className="text-foreground mt-1">Unknown</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Raised On</Label>
                  <p className="text-foreground mt-1">
                    {format(new Date(selectedNote.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                {selectedNote.engagement && (
                  <div>
                    <Label className="text-muted-foreground">Engagement</Label>
                    <p className="text-foreground mt-1">
                      {selectedNote.engagement.client_name} - {selectedNote.engagement.name}
                    </p>
                  </div>
                )}
              </div>

              {selectedNote.response && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground">Response</Label>
                  <p className="text-sm text-foreground mt-1">{selectedNote.response}</p>
                </div>
              )}

              {selectedNote.status === 'cleared' && selectedNote.resolved_at && (
                <div className="p-4 bg-success/10 rounded-lg">
                  <Label className="text-muted-foreground">Cleared</Label>
                  <p className="text-sm text-foreground mt-1">
                    Cleared on {format(new Date(selectedNote.resolved_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
              )}

              {selectedNote.status === 'open' && !selectedNote.locked && (
                <div className="space-y-2">
                  <Label>Add Response</Label>
                  <Textarea 
                    placeholder="Enter your response..." 
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                </div>
              )}

              {selectedNote.locked && (
                <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    This note is locked after approval. Only Partner/Manager can unlock it.
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4 border-t border-border">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDelete}
                  className="gap-2"
                  disabled={selectedNote.locked}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <div className="flex gap-3">
                  {selectedNote.status === 'open' && !selectedNote.locked && (
                    <Button onClick={handleRespond} disabled={!responseText.trim()}>
                      Submit Response
                    </Button>
                  )}
                  {selectedNote.status === 'responded' && !selectedNote.locked && (
                    <>
                      <Button variant="outline" onClick={handleReopen}>
                        Reopen
                      </Button>
                      <Button className="gap-2" onClick={handleClear}>
                        <CheckCircle className="h-4 w-4" />
                        Clear Note
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <UnlockDialog
        open={!!unlockDialogNote}
        onOpenChange={(open) => !open && setUnlockDialogNote(null)}
        onConfirm={handleUnlock}
        itemName={unlockDialogNote?.title || 'note'}
      />
    </div>
  );
}
