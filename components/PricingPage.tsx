import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { HomeView } from './HomeView';

/**
 * Strona /pricing — landing z otwartym modalem cennika.
 * Używana m.in. jako cancel_url po anulowaniu Stripe Checkout.
 */
export const PricingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const setIsPricingModalOpen = useUIStore((s) => s.setIsPricingModalOpen);

  useEffect(() => {
    setIsPricingModalOpen(true);
  }, [setIsPricingModalOpen]);

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      // Modal pozostaje otwarty — użytkownik może spróbować ponownie
    }
  }, [searchParams]);

  return <HomeView />;
};
