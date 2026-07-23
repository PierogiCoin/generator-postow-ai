import { showSuccess, showWarning } from '../../utils/errorHandler';
import { canAutoPublish, autoPublishToConnectedAccounts } from '../../services/autoPublishService';
import type { FormData, GenerationResult } from '../../types';
import type { ApiErrorHandler } from './types';

interface RunAutoPublishIfEnabledParams {
  userId?: string;
  finalResult: GenerationResult;
  formData: FormData;
  setProgress: (message: string) => void;
  handleApiError: ApiErrorHandler;
}

export async function runAutoPublishIfEnabled({
  userId,
  finalResult,
  formData,
  setProgress,
  handleApiError,
}: RunAutoPublishIfEnabledParams): Promise<void> {
  if (!userId || !canAutoPublish(finalResult, formData)) return;

  setProgress('Sprawdzanie bramy jakości przed publikacją…');
  try {
    const { enforcePublishQualityGate } = await import('../../services/autoPublishService');
    const gate = await enforcePublishQualityGate(finalResult, formData, userId);
    if (!gate.ok) {
      showWarning('Auto-publikacja wstrzymana', gate.reason);
      return;
    }
  } catch {
    showWarning(
      'Auto-publikacja wstrzymana',
      'Nie udało się ocenić treści — opublikuj ręcznie po sprawdzeniu jakości.'
    );
    return;
  }

  setProgress('Publikowanie na połączonych kontach…');
  try {
    const summary = await autoPublishToConnectedAccounts(finalResult, formData, userId, {
      skipQualityGate: true,
    });

    if (summary.published.length > 0) {
      const names = summary.published.map((p) => p.platform).join(', ');
      showSuccess(`Opublikowano na ${summary.published.length} kontach`, names);
    }

    if (summary.skipped.length > 0 && summary.published.length === 0) {
      showWarning(
        'Brak publikacji',
        summary.skipped.map((s) => `${s.platform}: ${s.reason}`).join(' · ')
      );
    }

    if (summary.failed.length > 0) {
      showWarning(
        summary.published.length > 0
          ? 'Część publikacji nie powiodła się'
          : 'Automatyczna publikacja nie powiodła się',
        summary.failed.map((f) => `${f.platform}: ${f.error}`).join(' · ')
      );
    }
  } catch (error) {
    handleApiError(error, 'errors.unknownError');
  }
}
