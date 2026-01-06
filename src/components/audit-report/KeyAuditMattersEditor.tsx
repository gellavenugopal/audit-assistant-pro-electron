import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Save,
  FileText,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { useKeyAuditMatters, KeyAuditMatter } from '@/hooks/useKeyAuditMatters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface KeyAuditMattersEditorProps {
  engagementId: string;
}

export function KeyAuditMattersEditor({ engagementId }: KeyAuditMattersEditorProps) {
  const { kams, loading, createKam, updateKam, deleteKam } = useKeyAuditMatters(engagementId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingKam, setEditingKam] = useState<Partial<KeyAuditMatter> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddKam = async () => {
    const newKam = await createKam({
      title: 'New Key Audit Matter',
      description: 'Describe the key audit matter...',
      audit_response: 'How the audit addressed the matter...',
    });
    if (newKam) {
      setExpandedIds(prev => new Set(prev).add(newKam.id));
    }
  };

  const handleSaveKam = async (kam: KeyAuditMatter, updates: Partial<KeyAuditMatter>) => {
    setSaving(kam.id);
    await updateKam(kam.id, updates);
    setSaving(null);
  };

  const handleDeleteKam = async (id: string) => {
    if (confirm('Are you sure you want to delete this Key Audit Matter?')) {
      await deleteKam(id);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Loading Key Audit Matters...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Key Audit Matters (KAM)
            </CardTitle>
            <CardDescription>
              Add and manage Key Audit Matters for the audit report
            </CardDescription>
          </div>
          <Button onClick={handleAddKam} className="gap-2">
            <Plus className="h-4 w-4" />
            Add KAM
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Key Audit Matters are those matters that, in the auditor's professional judgment, 
            were of most significance in the audit of the financial statements. 
            These will be included in the main audit report.
          </AlertDescription>
        </Alert>

        {kams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No Key Audit Matters added yet</p>
            <p className="text-sm mt-1">Click "Add KAM" to create your first Key Audit Matter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kams.map((kam, index) => (
              <KamItem
                key={kam.id}
                kam={kam}
                index={index}
                isExpanded={expandedIds.has(kam.id)}
                isSaving={saving === kam.id}
                onToggle={() => toggleExpanded(kam.id)}
                onSave={(updates) => handleSaveKam(kam, updates)}
                onDelete={() => handleDeleteKam(kam.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KamItemProps {
  kam: KeyAuditMatter;
  index: number;
  isExpanded: boolean;
  isSaving: boolean;
  onToggle: () => void;
  onSave: (updates: Partial<KeyAuditMatter>) => void;
  onDelete: () => void;
}

function KamItem({ kam, index, isExpanded, isSaving, onToggle, onSave, onDelete }: KamItemProps) {
  const [localTitle, setLocalTitle] = useState(kam.title);
  const [localDescription, setLocalDescription] = useState(kam.description);
  const [localResponse, setLocalResponse] = useState(kam.audit_response);

  const hasChanges = 
    localTitle !== kam.title || 
    localDescription !== kam.description || 
    localResponse !== kam.audit_response;

  const handleSave = () => {
    onSave({
      title: localTitle,
      description: localDescription,
      audit_response: localResponse,
    });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn(
        'border rounded-lg',
        isExpanded ? 'border-primary' : 'border-border'
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                KAM {index + 1}
              </span>
              <span className="font-medium">{kam.title}</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t">
            <div className="space-y-2 pt-4">
              <Label>Title</Label>
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="E.g., Revenue Recognition"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="Describe why this matter is significant to the audit..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>How our audit addressed the matter</Label>
              <Textarea
                value={localResponse}
                onChange={(e) => setLocalResponse(e.target.value)}
                placeholder="Describe the audit procedures performed..."
                rows={5}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
