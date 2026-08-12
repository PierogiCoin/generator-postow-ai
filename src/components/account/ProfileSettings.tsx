import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { changePassword, deleteAccount } from '../../services/accountService';
import { IdentificationIcon } from '../icons/IdentificationIcon';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';

export const ProfileSettings: React.FC = () => {
  const { user, logout } = useAuth();
  const { confirm, confirmDialogProps } = useConfirm();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMessage(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Nowe hasła nie są zgodne.' });
      return;
    }
    if (passwords.new.length < 6) {
      setMessage({ type: 'error', text: 'Nowe hasło musi mieć co najmniej 6 znaków.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const response = await changePassword(user.email, passwords.current, passwords.new);
      setMessage({ type: 'success', text: response.message });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się zmienić hasła.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmed = await confirm({
      title: 'Usuń konto',
      message:
        'Czy na pewno chcesz trwale usunąć swoje konto? Tej operacji nie można cofnąć. Stracisz historię, kredyty i połączenia social.',
      variant: 'danger',
      confirmLabel: 'Usuń konto',
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteAccount();
      setMessage({ type: 'success', text: 'Konto usunięte. Wylogowujemy…' });
      setTimeout(() => {
        void logout();
      }, 800);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się usunąć konta.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <ConfirmDialog {...confirmDialogProps} />
      <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
          <IdentificationIcon className="w-6 h-6 text-blue-500" />
          Ustawienia profilu
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Zarządzaj swoimi danymi i bezpieczeństwem konta.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
            Zmień hasło
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Obecne hasło
            </label>
            <input
              type="password"
              name="current"
              value={passwords.current}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nowe hasło
            </label>
            <input
              type="password"
              name="new"
              value={passwords.new}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Potwierdź nowe hasło
            </label>
            <input
              type="password"
              name="confirm"
              value={passwords.confirm}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="new-password"
            />
          </div>

          {message && (
            <div
              className={`p-3 text-sm rounded-md ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Zapisywanie...' : 'Zapisz hasło'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-red-500/30">
          <h3 className="text-md font-semibold text-red-600 dark:text-red-400">Strefa zagrożenia</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Usunięcie konta jest nieodwracalne i usuwa dane generacji, kredyty oraz połączenia social.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isLoading}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-50"
          >
            Usuń konto
          </button>
        </div>
      </div>
    </>
  );
};
