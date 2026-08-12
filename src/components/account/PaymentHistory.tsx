import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { openStripeBillingPortal } from '../../services/accountService';
import { CreditCardIcon } from '../icons/CreditCardIcon';

/**
 * Historia płatności — bez mocków. Faktury i karty w Stripe Customer Portal.
 */
export const PaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleOpenPortal = async () => {
    setError(null);
    setLoading(true);
    try {
      await openStripeBillingPortal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się otworzyć portalu rozliczeń. Upewnij się, że masz aktywną subskrypcję lub zakup.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
        <CreditCardIcon className="w-6 h-6 text-blue-500" />
        Płatności i faktury
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Faktury, metody płatności i anulowanie subskrypcji znajdziesz w bezpiecznym portalu Stripe.
      </p>
      <button
        type="button"
        onClick={handleOpenPortal}
        disabled={loading}
        className="px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:brightness-110 disabled:opacity-50"
        style={{ backgroundColor: 'var(--hero-accent)' }}
      >
        {loading ? 'Przekierowanie…' : 'Otwórz portal rozliczeń'}
      </button>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
