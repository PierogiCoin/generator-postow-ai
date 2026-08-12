'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  consumePendingCheckoutInterval,
  consumePendingCheckoutPlan,
  consumePendingLifetimeCheckout,
  redirectToLifetimeCheckout,
  redirectToSubscriptionCheckout,
} from '../services/paymentService';

/**
 * Po signup/login: wznawia Stripe Checkout z sessionStorage
 * (subscription plan lub Lifetime Deal).
 */
export function usePendingCheckout(): void {
  const { user, authLoading } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user || ranRef.current) return;
    if (typeof window === 'undefined') return;

    if (consumePendingLifetimeCheckout()) {
      ranRef.current = true;
      void redirectToLifetimeCheckout(1).catch((err) => {
        console.error('[pendingLifetime]', err);
        ranRef.current = false;
      });
      return;
    }

    const plan = consumePendingCheckoutPlan();
    if (!plan) return;

    ranRef.current = true;
    const interval = consumePendingCheckoutInterval();

    void redirectToSubscriptionCheckout(plan, interval).catch((err) => {
      console.error('[pendingCheckout]', err);
      ranRef.current = false;
    });
  }, [user, authLoading]);
}
