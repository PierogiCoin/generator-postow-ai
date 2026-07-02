import type Stripe from 'stripe';
import { supabase } from '../supabase.js';
import logger from '../logger.js';

type StripeClient = {
  subscriptions: {
    retrieve: (id: string) => Promise<Stripe.Subscription>;
  };
};

/** Rozwiązuje userId z faktury Stripe (subscription metadata → customer → profiles). */
export async function resolveUserIdFromInvoice(
  invoice: Stripe.Invoice,
  stripeClient: StripeClient
): Promise<string | null> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  if (subscriptionId) {
    try {
      const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
      if (subscription.metadata?.userId) {
        return subscription.metadata.userId;
      }
      const customerId = customerIdFrom(subscription.customer);
      const fromCustomer = await resolveUserIdFromCustomerId(customerId);
      if (fromCustomer) return fromCustomer;
    } catch (error) {
      logger.warn('[Stripe] Failed to resolve user from subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return resolveUserIdFromCustomerId(customerIdFrom(invoice.customer));
}

export async function resolveUserIdFromCustomerId(
  customerId: string | null | undefined
): Promise<string | null> {
  if (!customerId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  return profile?.id ?? null;
}

function customerIdFrom(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  if ('deleted' in customer && customer.deleted) return null;
  return customer.id;
}
