export interface EngagementLetterTemplatePayload {
  type: 'docx';
  base64: string;
  text?: string;
  version?: number;
}

export const buildEngagementLetterTemplatePayload = (
  base64: string,
  text?: string
): string => {
  const payload: EngagementLetterTemplatePayload = {
    type: 'docx',
    base64,
    text,
    version: 1,
  };
  return JSON.stringify(payload);
};

export const parseEngagementLetterTemplatePayload = (
  value: string
): EngagementLetterTemplatePayload | null => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.type === 'docx' && typeof parsed.base64 === 'string') {
      return parsed as EngagementLetterTemplatePayload;
    }
  } catch {}

  return null;
};
