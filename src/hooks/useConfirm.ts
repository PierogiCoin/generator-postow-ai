import { useCallback, useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === 'string'
      ? { message: options }
      : options;

    return new Promise(resolve => {
      setState({
        title: opts.title ?? 'Potwierdź akcję',
        message: opts.message,
        confirmLabel: opts.confirmLabel,
        cancelLabel: opts.cancelLabel,
        variant: opts.variant,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  return {
    confirm,
    confirmDialogProps: state
      ? {
          open: true,
          title: state.title ?? 'Potwierdź akcję',
          message: state.message,
          confirmLabel: state.confirmLabel,
          cancelLabel: state.cancelLabel,
          variant: state.variant,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        }
      : {
          open: false,
          title: '',
          message: '',
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        },
  };
};
