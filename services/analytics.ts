/**
 * Analytics Service — PostHog integration
 *
 * Trackuje eventy użytkownika dla data-driven decisions.
 * Jeśli VITE_POSTHOG_KEY nie jest ustawiony, eventy są logowane do konsoli (dev mode).
 * Zero hard dependency — brak klucza nie powoduje błędów.
 */

type EventProperties = Record<string, string | number | boolean | undefined | null>;

interface PosthogInstance {
  capture: (event: string, properties?: EventProperties) => void;
  identify: (userId: string, properties?: EventProperties) => void;
  reset: () => void;
}

let posthog: PosthogInstance | null = null;
let initialized = false;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://app.posthog.com';

async function initPosthog(): Promise<PosthogInstance | null> {
  if (!POSTHOG_KEY) {
    return null;
  }

  if (initialized) return posthog;
  initialized = true;

  try {
    const { default: posthogLib } = await import('posthog-js');
    posthogLib.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      disable_session_recording: true,
      persistence: 'localStorage+cookie',
    });
    posthog = posthogLib as unknown as PosthogInstance;
  } catch {
    // posthog-js nie zainstalowany — dev mode
    posthog = null;
  }

  return posthog;
}

// Dev mode fallback — log do konsoli
const devTracker: PosthogInstance = {
  capture: (event, properties) => {
    // eslint-disable-next-line no-console
    console.debug('[Analytics]', event, properties || {});
  },
  identify: (userId, properties) => {
    // eslint-disable-next-line no-console
    console.debug('[Analytics] identify', userId, properties || {});
  },
  reset: () => {
    // eslint-disable-next-line no-console
    console.debug('[Analytics] reset');
  },
};

async function getTracker(): Promise<PosthogInstance> {
  const ph = await initPosthog();
  return ph || devTracker;
}

// ============================================================
// Public API
// ============================================================

export const analytics = {
  /** Trackuj event z opcjonalnymi właściwościami */
  async track(event: string, properties?: EventProperties): Promise<void> {
    try {
      const tracker = await getTracker();
      tracker.capture(event, properties);
    } catch {
      // silent — analytics nie może blokować UX
    }
  },

  /** Zidentyfikuj użytkownika po zalogowaniu */
  async identify(userId: string, properties?: EventProperties): Promise<void> {
    try {
      const tracker = await getTracker();
      tracker.identify(userId, properties);
    } catch {
      // silent
    }
  },

  /** Resetuj tożsamość po wylogowaniu */
  async reset(): Promise<void> {
    try {
      const tracker = await getTracker();
      tracker.reset();
    } catch {
      // silent
    }
  },
};

// ============================================================
// Predefiniowane eventy (funnel events)
// ============================================================

export const AnalyticsEvents = {
  // Acquisition
  SIGNUP: 'user_signed_up',
  LOGIN: 'user_logged_in',
  LOGOUT: 'user_logged_out',

  // Activation
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP: 'onboarding_step',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_POST_GENERATED: 'first_post_generated',
  FIRST_IMAGE_GENERATED: 'first_image_generated',
  FIRST_VIDEO_GENERATED: 'first_video_generated',
  FIRST_POST_PUBLISHED: 'first_post_published',
  FIRST_POST_SCHEDULED: 'first_post_scheduled',

  // Engagement
  POST_GENERATED: 'post_generated',
  IMAGE_GENERATED: 'image_generated',
  VIDEO_GENERATED: 'video_generated',
  POST_OPTIMIZED: 'post_optimized',
  POST_PUBLISHED: 'post_published',
  POST_SCHEDULED: 'post_scheduled',
  BRAND_VOICE_USED: 'brand_voice_used',
  ANALYTICS_VIEWED: 'analytics_viewed',
  CALENDAR_USED: 'calendar_used',
  STRATEGIST_USED: 'strategist_used',

  // Conversion
  PRICING_VIEWED: 'pricing_page_viewed',
  PRICING_MODAL_OPENED: 'pricing_modal_opened',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_CANCELED: 'checkout_canceled',
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDED: 'trial_ended',
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
  UPGRADE_PROMPT_CLICKED: 'upgrade_prompt_clicked',
  CREDIT_PACK_PURCHASED: 'credit_pack_purchased',

  // Retention
  CREDITS_LOW: 'credits_low',
  CREDITS_EXHAUSTED: 'credits_exhausted',
  CREDIT_BANK_VIEWED: 'credit_bank_viewed',
  REENGAGEMENT_EMAIL_OPENED: 'reengagement_email_opened',

  // Referral
  REFERRAL_LINK_SHARED: 'referral_link_shared',
  REFERRAL_SIGNED_UP: 'referral_signed_up',
} as const;
