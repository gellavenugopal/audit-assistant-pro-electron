import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createNotification } from '@/hooks/useNotifications';

export interface ReviewNote {
  id: string;
  procedure_id: string | null;
  engagement_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  content: string;
  status: string;
  priority: string;
  response: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  procedure?: { procedure_name: string; area: string } | null;
  engagement?: { name: string; client_name: string } | null;
  // Approval workflow fields
  approval_stage: 'draft' | 'prepared' | 'reviewed' | 'approved';
  prepared_by: string | null;
  prepared_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  unlock_reason: string | null;
}

export function useReviewNotes(engagementId?: string) {
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, role } = useAuth();

  const logActivity = async (action: string, entity: string, details: string, entityId?: string, logEngagementId?: string) => {
    if (!user || !profile) return;
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      user_name: profile.full_name,
      action,
      entity,
      entity_id: entityId || null,
      engagement_id: logEngagementId || null,
      details,
    }]);
  };

  const logAuditTrail = async (
    entityType: string,
    entityId: string,
    action: string,
    oldValue?: string,
    newValue?: string,
    reason?: string
  ) => {
    if (!user) return;
    await supabase.from('audit_trail').insert([{
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_value: oldValue || null,
      new_value: newValue || null,
      reason: reason || null,
      performed_by: user.id,
    }]);
  };

  const fetchNotes = async () => {
    try {
      let query = supabase
        .from('review_notes')
        .select(`
          *,
          procedure:audit_procedures(procedure_name, area),
          engagement:engagements(name, client_name)
        `)
        .order('created_at', { ascending: false });

      if (engagementId) {
        query = query.eq('engagement_id', engagementId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotes((data || []) as ReviewNote[]);
    } catch (error) {
      console.error('Error fetching review notes:', error);
      toast.error('Failed to load review notes');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (note: {
    procedure_id?: string | null;
    engagement_id: string;
    assigned_to?: string | null;
    title: string;
    content: string;
    priority?: string;
  }) => {
    if (!user || !profile) return null;

    try {
      const { data, error } = await supabase
        .from('review_notes')
        .insert({ 
          ...note, 
          created_by: user.id,
          status: 'open',
          priority: note.priority || 'medium'
        })
        .select()
        .single();

      if (error) throw error;
      
      await logActivity('Created', 'Review Note', `Raised review note: ${note.title}`, data.id, note.engagement_id);
      
      // Send notification to assigned user
      if (note.assigned_to && note.assigned_to !== user.id) {
        await createNotification(
          note.assigned_to,
          'review_note_assigned',
          'New Review Note Assigned',
          `${profile.full_name} assigned you a review note: "${note.title}"`,
          '/review-notes'
        );
      }
      
      toast.success('Review note raised successfully');
      await fetchNotes();
      return data;
    } catch (error: any) {
      console.error('Error creating review note:', error);
      toast.error(error.message || 'Failed to create review note');
      return null;
    }
  };

  const updateNote = async (id: string, updates: Partial<ReviewNote>) => {
    try {
      const { error } = await supabase
        .from('review_notes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      const action = updates.status === 'cleared' 
        ? 'Cleared' 
        : updates.response 
          ? 'Responded' 
          : 'Updated';
      const note = notes.find(n => n.id === id);
      await logActivity(action, 'Review Note', `${action} review note`, id, note?.engagement_id);
      
      toast.success(`Review note ${action.toLowerCase()}`);
      await fetchNotes();
    } catch (error: any) {
      console.error('Error updating review note:', error);
      toast.error(error.message || 'Failed to update review note');
    }
  };

  const respondToNote = async (id: string, response: string) => {
    if (!user || !profile) return;
    
    // Get the note to find who created it
    const note = notes.find(n => n.id === id);
    
    await updateNote(id, {
      response,
      status: 'responded'
    });
    
    // Notify the note creator
    if (note && note.created_by !== user.id) {
      await createNotification(
        note.created_by,
        'review_note_responded',
        'Review Note Response',
        `${profile.full_name} responded to your review note: "${note.title}"`,
        '/review-notes'
      );
    }
  };

  const clearNote = async (id: string) => {
    if (!user) return;
    
    await updateNote(id, {
      status: 'cleared',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id
    });
  };

  const reopenNote = async (id: string) => {
    await updateNote(id, {
      status: 'open',
      response: null,
      resolved_at: null,
      resolved_by: null
    });
  };

  const deleteNote = async (id: string) => {
    const note = notes.find(n => n.id === id);
    try {
      const { error } = await supabase
        .from('review_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await logActivity('Deleted', 'Review Note', `Deleted review note: ${note?.title || 'Unknown'}`, id, note?.engagement_id);
      toast.success('Review note deleted');
      await fetchNotes();
    } catch (error: any) {
      console.error('Error deleting review note:', error);
      toast.error(error.message || 'Failed to delete review note');
    }
  };

  // Approval workflow actions
  const markPrepared = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      const { error } = await supabase
        .from('review_notes')
        .update({ approval_stage: 'prepared' })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('review_note', id, 'marked_prepared', note.approval_stage, 'prepared');
      await logActivity('Prepared', 'Review Note', `Marked note as prepared: ${note.title}`, id, note.engagement_id);
      
      toast.success('Note marked as prepared');
      await fetchNotes();
    } catch (error: any) {
      console.error('Error marking prepared:', error);
      toast.error(error.message || 'Failed to mark as prepared');
    }
  };

  const markReviewed = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    if (role !== 'partner' && role !== 'manager') {
      toast.error('Only Partner/Manager can mark as reviewed');
      return;
    }

    try {
      const { error } = await supabase
        .from('review_notes')
        .update({ approval_stage: 'reviewed' })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('review_note', id, 'marked_reviewed', note.approval_stage, 'reviewed');
      await logActivity('Reviewed', 'Review Note', `Marked note as reviewed: ${note.title}`, id, note.engagement_id);
      
      toast.success('Note marked as reviewed');
      await fetchNotes();
    } catch (error: any) {
      console.error('Error marking reviewed:', error);
      toast.error(error.message || 'Failed to mark as reviewed');
    }
  };

  const approveNote = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    if (role !== 'partner' && role !== 'manager') {
      toast.error('Only Partner/Manager can approve');
      return;
    }

    try {
      const { error } = await supabase
        .from('review_notes')
        .update({ approval_stage: 'approved' })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('review_note', id, 'approved', note.approval_stage, 'approved');
      await logActivity('Approved', 'Review Note', `Approved note: ${note.title}`, id, note.engagement_id);
      
      toast.success('Note approved and locked');
      await fetchNotes();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || 'Failed to approve');
    }
  };

  const unlockNote = async (id: string, reason: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    if (role !== 'partner' && role !== 'manager') {
      toast.error('Only Partner/Manager can unlock');
      return;
    }

    if (!reason.trim()) {
      toast.error('Unlock reason is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('review_notes')
        .update({ 
          locked: false, 
          unlock_reason: reason,
          approval_stage: 'reviewed'
        })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('review_note', id, 'unlocked', 'locked', 'unlocked', reason);
      await logActivity('Unlocked', 'Review Note', `Unlocked note: ${note.title}. Reason: ${reason}`, id, note.engagement_id);
      
      toast.success('Note unlocked');
      await fetchNotes();
    } catch (error: any) {
      console.error('Error unlocking:', error);
      toast.error(error.message || 'Failed to unlock');
    }
  };

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel('review-notes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_notes' }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId]);

  return {
    notes,
    loading,
    createNote,
    updateNote,
    respondToNote,
    clearNote,
    reopenNote,
    deleteNote,
    markPrepared,
    markReviewed,
    approveNote,
    unlockNote,
    refetch: fetchNotes,
    canReview: role === 'partner' || role === 'manager',
    canApprove: role === 'partner' || role === 'manager',
    canUnlock: role === 'partner' || role === 'manager',
  };
}
