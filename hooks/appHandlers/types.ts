import type { TFunction } from 'i18next';
import type { AppError } from '../../types';
import { NotificationType } from '../../types';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

export interface ToastExtras {
  title?: string;
  action?: string;
}

export type ToastFn = (
  message: string,
  type: NotificationType,
  duration?: number,
  extras?: ToastExtras
) => void;
export type NotificationFn = (message: string, type: NotificationType, link?: string) => void;
export type ApiErrorHandler = (error: unknown, defaultMessageKey: string) => AppError;

export interface BaseHandlerDeps {
    addToast: ToastFn;
    t: TFunction;
    handleApiError: ApiErrorHandler;
}
