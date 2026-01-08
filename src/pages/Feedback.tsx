import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const FEEDBACK_TYPES = [
  'Bug / Defect',
  'Improve Existing Feature',
  'Add New Feature',
];

const MODULE_OPTIONS = [
  'Engagement Setup',
  'Trial Balance Import',
  'Checklists',
  'Workpapers',
  'Reporting / CARO',
  'User Management',
  'Sync / Backup',
  'Performance',
  'Security',
  'Other',
];

const IMPACT_OPTIONS = ['Low', 'Medium', 'High'];
const SEVERITY_OPTIONS = ['Critical (blocks work)', 'Major (workaround exists)', 'Minor (cosmetic / low impact)'];
const REPRO_OPTIONS = ['Always', 'Sometimes', 'Once'];

const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.pdf', '.png', '.jpg', '.jpeg', '.xls', '.xlsx'];
const MAX_FILES = 5;
const MAX_FILE_MB = 25;
const DRAFT_KEY = 'auditpro_feedback_draft';

type FeedbackDraft = {
  feedbackType: string;
  moduleArea: string;
  title: string;
  description: string;
  impact: string;
  severity: string;
  reproducibility: string;
  steps: string;
  expected: string;
  actual: string;
  suggestion: string;
  justification: string;
};

export default function Feedback() {
  const { profile } = useAuth();
  const [feedbackType, setFeedbackType] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [moduleArea, setModuleArea] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [severity, setSeverity] = useState('');
  const [reproducibility, setReproducibility] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [justification, setJustification] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [confirmNoClientData, setConfirmNoClientData] = useState(false);

  const moduleOptions = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return MODULE_OPTIONS;
    return MODULE_OPTIONS.filter((opt) => opt.toLowerCase().includes(q));
  }, [moduleSearch]);

  const isBug = feedbackType === 'Bug / Defect';
  const isImprovement = feedbackType === 'Improve Existing Feature';
  const isNewFeature = feedbackType === 'Add New Feature';

  const autoCaptured = useMemo(() => {
    const device = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';
    const now = new Date();
    return {
      firmId: (profile as any)?.firm_id || null,
      firmName: (profile as any)?.firm_name || null,
      userName: profile?.full_name || null,
      userEmail: profile?.email || null,
      userMobile: (profile as any)?.phone || null,
      appVersion: (import.meta as any).env?.VITE_APP_VERSION || 'dev',
      buildNumber: (import.meta as any).env?.VITE_APP_BUILD || 'local',
      device,
      platform,
      submittedAtIst: new Date(now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
    };
  }, [profile]);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as FeedbackDraft;
      setFeedbackType(draft.feedbackType || '');
      setModuleArea(draft.moduleArea || '');
      setTitle(draft.title || '');
      setDescription(draft.description || '');
      setImpact(draft.impact || '');
      setSeverity(draft.severity || '');
      setReproducibility(draft.reproducibility || '');
      setSteps(draft.steps || '');
      setExpected(draft.expected || '');
      setActual(draft.actual || '');
      setSuggestion(draft.suggestion || '');
      setJustification(draft.justification || '');
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  const validateFiles = (incoming: File[]) => {
    if (!confirmNoClientData) {
      toast.error('Confirm the confidentiality checkbox before uploading files.');
      return false;
    }

    if (files.length + incoming.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed.`);
      return false;
    }

    for (const file of incoming) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`File type not allowed: ${file.name}`);
        return false;
      }
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) {
        toast.error(`File too large (${file.name}). Max ${MAX_FILE_MB} MB.`);
        return false;
      }
    }

    return true;
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    if (!incoming.length) return;
    if (!validateFiles(incoming)) {
      event.target.value = '';
      return;
    }
    setFiles((prev) => [...prev, ...incoming]);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = () => {
    const draft: FeedbackDraft = {
      feedbackType,
      moduleArea,
      title,
      description,
      impact,
      severity,
      reproducibility,
      steps,
      expected,
      actual,
      suggestion,
      justification,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    toast.success('Draft saved locally.');
  };

  const handleSubmit = () => {
    if (!feedbackType) {
      toast.error('Feedback type is required.');
      return;
    }
    if (!moduleArea) {
      toast.error('Module / Area is required.');
      return;
    }
    if (title.trim().length < 5 || title.trim().length > 120) {
      toast.error('Title must be between 5 and 120 characters.');
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required.');
      return;
    }
    if (!impact) {
      toast.error('Impact to audit work is required.');
      return;
    }
    if (isBug && !severity) {
      toast.error('Severity is required for bugs.');
      return;
    }
    if (isBug && !reproducibility) {
      toast.error('Reproducibility is required for bugs.');
      return;
    }

    const payload = {
      feedbackType,
      moduleArea,
      title: title.trim(),
      description: description.trim(),
      impact,
      severity: isBug ? severity : null,
      reproducibility: isBug ? reproducibility : null,
      steps: isBug ? steps.trim() : null,
      expected: isBug ? expected.trim() : null,
      actual: isBug ? actual.trim() : null,
      suggestion: (isImprovement || isNewFeature) ? suggestion.trim() : null,
      justification: justification.trim() || null,
      attachments: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      autoCaptured,
    };

    console.log('Feedback payload:', payload);
    toast.success('Feedback submitted (pending backend).');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback Form</h1>
        <p className="text-muted-foreground mt-1">
          Share product feedback with your firm context and module details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Feedback Type *</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Module / Area *</Label>
            <Input
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Search modules..."
            />
            <Select value={moduleArea} onValueChange={setModuleArea}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title / Summary *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary (5-120 chars)"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you were trying to do, what happened, and impact to audit work."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Impact to audit work *</Label>
            <Select value={impact} onValueChange={setImpact}>
              <SelectTrigger>
                <SelectValue placeholder="Select impact" />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBug && (
            <>
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reproducibility *</Label>
                <Select value={reproducibility} onValueChange={setReproducibility}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reproducibility" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPRO_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Steps to Reproduce</Label>
                <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Expected Result</Label>
                <Textarea value={expected} onChange={(e) => setExpected(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Actual Result</Label>
                <Textarea value={actual} onChange={(e) => setActual(e.target.value)} rows={3} />
              </div>
            </>
          )}

          {(isImprovement || isNewFeature) && (
            <div className="space-y-2">
              <Label>Suggested Improvement / Desired Outcome</Label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Business Justification (optional)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Time saved, quality improvement, compliance, peer review alignment..."
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="text-xs text-muted-foreground">
              Allowed: doc, docx, pdf, png, jpg, xls, xlsx. Max {MAX_FILES} files, {MAX_FILE_MB} MB each.
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm-no-client"
                checked={confirmNoClientData}
                onCheckedChange={(checked) => setConfirmNoClientData(Boolean(checked))}
              />
              <Label htmlFor="confirm-no-client" className="text-sm">
                I confirm no client confidential data is being uploaded, or it is suitably masked.
              </Label>
            </div>
            <Input
              type="file"
              multiple
              disabled={!confirmNoClientData}
              onChange={handleFiles}
              accept={ALLOWED_EXTENSIONS.join(',')}
            />
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="truncate">{file.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>Remove</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
            <Button onClick={handleSubmit}>Submit Feedback</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
