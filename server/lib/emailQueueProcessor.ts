/**
 * Email Queue Processor — job w tle przetwarzający kolejkę email.
 * Uruchamiany co 10 minut. Sprawdza email_queue i wysyła zaplanowane emaile.
 */

import logger from '../logger.js';
import { supabase } from '../supabase.js';
import { sendEmail } from './emailService.js';
import {
  onboardingTipEmail,
  engagementBoostEmail,
  featureShowcaseEmail,
  reengagementEmail,
  trialEndingEmail,
  trialEndedEmail,
  upgradeNudgeEmail,
} from './emailTemplates.js';

const EMAIL_TEMPLATES: Record<string, (name: string, ...args: unknown[]) => string> = {
  onboarding_tip: (name) => onboardingTipEmail(name),
  engagement_boost: (name) => engagementBoostEmail(name),
  feature_showcase: (name) => featureShowcaseEmail(name),
  reengagement: (name, days) => reengagementEmail(name, days as number),
  trial_ending: (name) => trialEndingEmail(name),
  trial_ended: (name) => trialEndedEmail(name),
  upgrade_nudge: (name, current, suggested, savings) =>
    upgradeNudgeEmail(name, current as string, suggested as string, savings as string),
};

const EMAIL_SUBJECTS: Record<string, string> = {
  onboarding_tip: 'Jak pisać posty, które ludzie czytają? 📝',
  engagement_boost: 'Jeden post, 6 platform 🚀',
  feature_showcase: 'Planuj cały tydzień w 10 minut 📅',
  reengagement: 'Brakuje nam Twoich postów! 👋',
  trial_ending: 'Twój okres Pro kończy się za 2 dni ⏰',
  trial_ended: 'Twój okres Pro zakończony',
  upgrade_nudge: 'Opłaca Ci się przejść na wyższy plan 💡',
};

const EMAIL_TAGS: Record<string, string[]> = {
  onboarding_tip: ['onboarding', 'day-1'],
  engagement_boost: ['onboarding', 'day-3'],
  feature_showcase: ['onboarding', 'day-7'],
  reengagement: ['reengagement', 'retention'],
  trial_ending: ['trial', 'conversion'],
  trial_ended: ['trial'],
  upgrade_nudge: ['upgrade', 'conversion'],
};

/**
 * Przetwarza kolejkę email — wysyła wszystkie emaile, których czas nadszedł.
 */
export async function processEmailQueue(): Promise<void> {
  const nowIso = new Date().toISOString();

  try {
    // Pobierz emaile do wysłania
    const { data: queuedEmails, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('send_at', nowIso)
      .limit(50);

    if (error) {
      logger.error('[EmailQueue] Failed to fetch queue', { error: error.message });
      return;
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      return;
    }

    logger.info(`[EmailQueue] Processing ${queuedEmails.length} queued emails`);

    for (const item of queuedEmails) {
      try {
        // Sprawdź unsubscribe
        const { data: unsub } = await supabase
          .from('email_unsubscribe')
          .select('email_type')
          .eq('user_id', item.user_id);

        const unsubTypes = (unsub || []).map((u) => u.email_type);
        if (unsubTypes.includes('all') || unsubTypes.includes(item.email_type)) {
          // Oznacz jako skipped
          await supabase
            .from('email_queue')
            .update({ status: 'skipped', processed_at: new Date().toISOString() })
            .eq('id', item.id);
          continue;
        }

        // Pobierz email i imię użytkownika
        const { data: authUser } = await supabase.auth.admin.getUserById(item.user_id);
        const userEmail = authUser?.user?.email;
        if (!userEmail) {
          logger.warn('[EmailQueue] No email for user', { userId: item.user_id });
          await supabase
            .from('email_queue')
            .update({ status: 'failed', error: 'No email address', processed_at: new Date().toISOString() })
            .eq('id', item.id);
          continue;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', item.user_id)
          .single();

        const name = profile?.full_name || profile?.username || '';

        // Wygeneruj HTML z szablonu
        const templateFn = EMAIL_TEMPLATES[item.email_type];
        if (!templateFn) {
          logger.warn('[EmailQueue] Unknown email type', { type: item.email_type });
          await supabase
            .from('email_queue')
            .update({ status: 'failed', error: 'Unknown template', processed_at: new Date().toISOString() })
            .eq('id', item.id);
          continue;
        }

        const extraArgs = item.metadata ? Object.values(item.metadata as Record<string, unknown>) : [];
        const html = templateFn(name, ...extraArgs);
        const subject = EMAIL_SUBJECTS[item.email_type] || 'Generator Postów AI';
        const tags = EMAIL_TAGS[item.email_type] || [];

        const result = await sendEmail({
          to: userEmail,
          subject,
          html,
          tags,
        });

        // Zaktualizuj status w kolejce
        await supabase
          .from('email_queue')
          .update({
            status: result.success ? 'sent' : 'failed',
            error: result.error,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Zaloguj wysyłkę
        await supabase.from('email_log').insert({
          user_id: item.user_id,
          email_type: item.email_type,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error('[EmailQueue] Failed to process email', {
          id: item.id,
          error: errMsg,
        });
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error: errMsg, processed_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    }

    logger.info(`[EmailQueue] Done processing ${queuedEmails.length} emails`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('[EmailQueue] Fatal error', { error: errMsg });
  }
}

/**
 * Sprawdza nieaktywnych użytkowników i dodaje ich do kolejki re-engagement.
 * Uruchamiane raz dziennie.
 */
export async function checkInactiveUsers(): Promise<void> {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Znajdź użytkowników, którzy nie generowali treści od 14 dni
    const { data: inactiveUsers, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('subscription_tier', 'free')
      .lt('last_active_at', fourteenDaysAgo.toISOString());

    if (error || !inactiveUsers) {
      logger.error('[EmailQueue] Failed to fetch inactive users', { error: error?.message });
      return;
    }

    for (const user of inactiveUsers) {
      // Sprawdź czy re-engagement był już wysłany w ostatnich 30 dniach
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recent } = await supabase
        .from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_type', 'reengagement')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1);

      if (recent && recent.length > 0) continue;

      // Dodaj do kolejki
      await supabase.from('email_queue').insert({
        user_id: user.id,
        email_type: 'reengagement',
        send_at: new Date().toISOString(),
        status: 'queued',
        metadata: { daysInactive: 14 },
      });
    }

    logger.info(`[EmailQueue] Found ${inactiveUsers.length} inactive users for re-engagement`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('[EmailQueue] checkInactiveUsers error', { error: errMsg });
  }
}
