import { toast } from 'sonner';
import { parseUserFacingError } from './userFacingError';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Format error message for user
export function formatErrorMessage(error: unknown): string {
  const parsed = parseUserFacingError(error);
  if (parsed.action) {
    return `${parsed.title}: ${parsed.message} ${parsed.action}`;
  }
  return `${parsed.title}: ${parsed.message}`;
}

// Show error toast
export function showError(error: unknown, customMessage?: string) {
  const parsed = parseUserFacingError(error);
  const title = customMessage || parsed.title;
  toast.error(title, {
    description: parsed.action ? `${parsed.message} — ${parsed.action}` : parsed.message,
    duration: 6000,
    action: {
      label: 'Zamknij',
      onClick: () => { },
    },
  });
}

// Show success toast
export function showSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

// Show info toast
export function showInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 3000,
  });
}

// Show warning toast
export function showWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

// Show loading toast (returns id to dismiss later)
export function showLoading(message: string = 'Ładowanie...') {
  return toast.loading(message);
}

// Dismiss toast by id
export function dismissToast(id: string | number) {
  toast.dismiss(id);
}

// Promise toast - shows loading, then success/error
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((error: unknown) => string);
  }
): Promise<T> {
  toast.promise(promise, messages);
  return promise;
}
