import type { EngagementLetterMasterData, GeneratedLetterResult } from '@/types/engagementLetter';
import { EngagementLetterTemplateEngine } from './engagementLetterEngine';
import { EngagementLetterDocxGenerator } from './engagementLetterDocxGenerator';
import type { EngagementLetterTemplatePayload } from './engagementLetterTemplatePayload';

export class EngagementLetterDocxTemplate {
  static async generateFromTemplate(
    payload: EngagementLetterTemplatePayload,
    masterData: EngagementLetterMasterData
  ): Promise<GeneratedLetterResult> {
    if (!payload?.text) {
      return {
        success: false,
        error: 'Template preview text is missing. Re-upload the template with preview text.',
        letter_type: masterData.engagement_type,
        generated_at: new Date().toISOString(),
      };
    }

    const context = EngagementLetterTemplateEngine.buildContext(masterData);
    const renderedText = EngagementLetterTemplateEngine.render(payload.text, context);
    return EngagementLetterDocxGenerator.generateDocx(renderedText, masterData);
  }
}
