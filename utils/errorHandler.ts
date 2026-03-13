import { toast } from 'sonner';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Format error message for user
export function formatErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const apiError = error as any;

    // Google API quota error
    if (apiError.message?.includes('quota') || apiError.message?.includes('429')) {
      return 'Przekroczono limit API. Spróbuj ponownie za chwilę lub użyj innego modelu.';
    }

    // Network errors
    if (apiError.message?.includes('Network') || apiError.message?.includes('fetch')) {
      return 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.';
    }

    // Timeout
    if (apiError.message?.includes('timeout')) {
      return 'Żądanie przekroczyło limit czasu. Spróbuj ponownie.';
    }

    // Supabase errors
    if (apiError.message?.includes('Supabase') || apiError.message?.includes('RLS')) {
      return 'Błąd bazy danych. Skontaktuj się z administratorem.';
    }

    // Auth errors
    if (apiError.status === 401 || apiError.status === 403) {
      return 'Brak autoryzacji. Zaloguj się ponownie.';
    }

    // Server errors
    if (apiError.status === 500) {
      return 'Błąd serwera. Spróbuj ponownie za chwilę.';
    }

    // Rate limiting
    if (apiError.status === 429) {
      return 'Zbyt wiele żądań. Poczekaj chwilę i spróbuj ponownie.';
    }

    // Generic API error
    if (apiError.message) {
      return apiError.message;
    }
  }

  return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
}

// Show error toast
export function showError(error: unknown, customMessage?: string) {
  const message = customMessage || formatErrorMessage(error);
  toast.error(message, {
    duration: 5000,
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
    error?: string | ((error: any) => string);
  }
): Promise<T> {
  toast.promise(promise, messages);
  return promise;
}
