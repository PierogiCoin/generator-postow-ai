/**
 * Email Routes — endpointy do zarządzania subskrypcją email,
 * wyzwalania sekwencji i trackingu.
 */

import express, { Request, Response, NextFunction } from 'express';
import { requireSupabaseAuth, SupabaseAuthRequest } from '../middleware/supabaseAuth.js';
import { supabase } from '../supabase.js';
import { sendEmail, isEmailConfigured } from '../lib/emailService.js';
import {
  welcomeEmail,
  onboardingTipEmail,
  engagementBoostEmail,
  featureShowcaseEmail,
  lowCreditsEmail,
  creditsExhaustedEmail,
  reengagementEmail,
  upgradeNudgeEmail,
  trialStartedEmail,
  trialEndingEmail,
  trialEndedEmail,
  referralAcceptedEmail,
  abandonedCheckoutEmail,
} from '../lib/emailTemplates.js';
import logger from '../logger.js';

const router = express.Router();

// ============================================
// HEALTH CHECK — czy email service jest skonfigurowany
// ============================================
router.get('/status', (_req: Request, res: Response) => {
  res.json({ configured: isEmailConfigured() });
});

// ============================================
// TRIGGER WELCOME EMAIL — wywoływane po rejestracji
// ============================================
router.post('/welcome', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;

    // Sprawdź czy welcome email był już wysłany
    const { data: existing } = await supabase
      .from('email_log')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'welcome')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({ success: true, message: 'Welcome email already sent' });
    }

    // Pobierz imię z profilu
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || profile?.username || '';

    const html = welcomeEmail(name);
    const result = await sendEmail({
      to: email,
      subject: 'Witaj w Generatorze Postów AI! 🎉',
      html,
      tags: ['welcome', 'onboarding'],
    });

    // Zaloguj wysyłkę
    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: 'welcome',
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    // Zaplanuj sekwencję onboarding (dzień 1, 3, 7)
    const sequenceDates = [
      { type: 'onboarding_tip', days: 1 },
      { type: 'engagement_boost', days: 3 },
      { type: 'feature_showcase', days: 7 },
    ];

    for (const step of sequenceDates) {
      const sendAt = new Date();
      sendAt.setDate(sendAt.getDate() + step.days);
      await supabase.from('email_queue').insert({
        user_id: userId,
        email_type: step.type,
        send_at: sendAt.toISOString(),
        status: 'queued',
      });
    }

    res.json({ success: result.success, error: result.error });
  } catch (error) {
    next(error);
  }
});

// ============================================
// TRIGGER LOW CREDITS EMAIL
// ============================================
router.post('/low-credits', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const { remaining, planName } = req.body as { remaining: number; planName: string };

    // Sprawdź czy nie wysłano w ostatnich 7 dniach
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recent } = await supabase
      .from('email_log')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'low_credits')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return res.json({ success: true, message: 'Low credits email recently sent' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || profile?.username || '';
    const html = lowCreditsEmail(name, remaining, planName);

    const result = await sendEmail({
      to: email,
      subject: 'Zostało Ci niewiele kredytów ⚠️',
      html,
      tags: ['low-credits', 'conversion'],
    });

    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: 'low_credits',
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    res.json({ success: result.success, error: result.error });
  } catch (error) {
    next(error);
  }
});

// ============================================
// TRIGGER CREDITS EXHAUSTED EMAIL
// ============================================
router.post('/credits-exhausted', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;

    // Sprawdź czy nie wysłano w ostatnich 3 dniach
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: recent } = await supabase
      .from('email_log')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'credits_exhausted')
      .gte('created_at', threeDaysAgo.toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return res.json({ success: true, message: 'Credits exhausted email recently sent' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || profile?.username || '';
    const html = creditsExhaustedEmail(name);

    const result = await sendEmail({
      to: email,
      subject: 'Skończyły się kredyty 😅',
      html,
      tags: ['credits-exhausted', 'conversion'],
    });

    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: 'credits_exhausted',
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    res.json({ success: result.success, error: result.error });
  } catch (error) {
    next(error);
  }
});

// ============================================
// TRIGGER RE-ENGAGEMENT EMAIL
// ============================================
router.post('/reengagement', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const { daysInactive } = req.body as { daysInactive: number };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || profile?.username || '';
    const html = reengagementEmail(name, daysInactive);

    const result = await sendEmail({
      to: email,
      subject: 'Brakuje nam Twoich postów! 👋',
      html,
      tags: ['reengagement', 'retention'],
    });

    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: 'reengagement',
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    res.json({ success: result.success, error: result.error });
  } catch (error) {
    next(error);
  }
});

// ============================================
// TRIGGER UPGRADE NUDGE EMAIL
// ============================================
router.post('/upgrade-nudge', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const { currentPlan, suggestedPlan, savings } = req.body as {
      currentPlan: string;
      suggestedPlan: string;
      savings: string;
    };

    // Sprawdź czy nie wysłano w ostatnich 14 dniach
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: recent } = await supabase
      .from('email_log')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'upgrade_nudge')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return res.json({ success: true, message: 'Upgrade nudge recently sent' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || profile?.username || '';
    const html = upgradeNudgeEmail(name, currentPlan, suggestedPlan, savings);

    const result = await sendEmail({
      to: email,
      subject: 'Opłaca Ci się przejść na wyższy plan 💡',
      html,
      tags: ['upgrade-nudge', 'conversion'],
    });

    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: 'upgrade_nudge',
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    res.json({ success: result.success, error: result.error });
  } catch (error) {
    next(error);
  }
});

// ============================================
// TRIGGER TRIAL EMAILS
// ============================================
router.post('/trial-started', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const { trialDays } = req.body as { trialDays: number };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || profile?.username || '';
    const html = trialStartedEmail(name, trialDays);

    const result = await sendEmail({
      to: email,
      subject: `Twój darmowy okres Pro rozpoczęty! 🎁`,
      html,
      tags: ['trial', 'conversion'],
    });

    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: 'trial_started',
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    // Zaplanuj email "trial ending" na 2 dni przed końcem
    const endingAt = new Date();
    endingAt.setDate(endingAt.getDate() + trialDays - 2);
    await supabase.from('email_queue').insert({
      user_id: userId,
      email_type: 'trial_ending',
      send_at: endingAt.toISOString(),
      status: 'queued',
    });

    // Zaplanuj email "trial ended" na koniec
    const endedAt = new Date();
    endedAt.setDate(endedAt.getDate() + trialDays);
    await supabase.from('email_queue').insert({
      user_id: userId,
      email_type: 'trial_ended',
      send_at: endedAt.toISOString(),
      status: 'queued',
    });

    res.json({ success: result.success, error: result.error });
  } catch (error) {
    next(error);
  }
});

// ============================================
// UNSUBSCRIBE
// ============================================
router.post('/unsubscribe', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { types } = req.body as { types?: string[] };

    if (types && types.length > 0) {
      // Unsubscribe od konkretnych typów
      for (const type of types) {
        await supabase.from('email_unsubscribe').upsert({
          user_id: userId,
          email_type: type,
        });
      }
    } else {
      // Global unsubscribe
      await supabase.from('email_unsubscribe').upsert({
        user_id: userId,
        email_type: 'all',
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET EMAIL PREFERENCES
// ============================================
router.get('/preferences', requireSupabaseAuth, async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { data: unsubscribes } = await supabase
      .from('email_unsubscribe')
      .select('email_type')
      .eq('user_id', userId);

    const unsubscribedTypes = (unsubscribes || []).map((u) => u.email_type);

    res.json({
      configured: isEmailConfigured(),
      unsubscribed: unsubscribedTypes,
      globallyUnsubscribed: unsubscribedTypes.includes('all'),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ABANDONED CHECKOUT RECOVERY — cron endpoint
// Wysyła przypomnienia do użytkowników z niedokończonym checkoutem (>2h)
// ============================================
router.post('/abandoned-checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Wymagany CRON_SECRET — bez niego endpoint jest wyłączony (nie otwarty)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error('[email/abandoned-checkout] CRON_SECRET is not configured');
      return res.status(503).json({ error: 'Cron endpoint not configured' });
    }
    const cronKey = req.headers['x-cron-key'];
    if (typeof cronKey !== 'string' || cronKey !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isEmailConfigured()) {
      return res.json({ sent: 0, reason: 'email_not_configured' });
    }

    // Znajdź abandoned checkouts starsze niż 2h, bez wysłanego emaila
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: abandoned, error } = await supabase
      .from('abandoned_checkouts')
      .select(`
        id,
        user_id,
        plan,
        price_id,
        created_at,
        profiles!inner(email, name)
      `)
      .eq('status', 'pending')
      .lt('created_at', twoHoursAgo)
      .is('recovery_email_sent_at', null);

    if (error) {
      logger.error('[Email] Failed to fetch abandoned checkouts', { error });
      return res.status(500).json({ error: 'db_error' });
    }

    if (!abandoned || abandoned.length === 0) {
      return res.json({ sent: 0, reason: 'no_abandoned' });
    }

    let sentCount = 0;
    for (const item of abandoned) {
      const profile = item.profiles as Record<string, any>;
      if (!profile?.email) continue;

      // Sprawdź czy użytkownik nie unsubskrybował
      const { data: unsub } = await supabase
        .from('email_unsubscribe')
        .select('email_type')
        .eq('user_id', item.user_id)
        .in('email_type', ['all', 'abandoned-checkout']);

      if (unsub && unsub.length > 0) continue;

      const planName = item.plan === 'subscription' ? 'subskrypcji' : 'paketu kredytów';
      const html = abandonedCheckoutEmail(profile.name || '', planName);

      await sendEmail({
        to: profile.email,
        subject: 'Zaczęłeś, ale nie dokończyłeś 🛒',
        html,
      });

      // Oznacz email jako wysłany
      await supabase
        .from('abandoned_checkouts')
        .update({ recovery_email_sent_at: new Date().toISOString() })
        .eq('id', item.id);

      sentCount++;
    }

    logger.info('[Email] Abandoned checkout recovery sent', { sent: sentCount, total: abandoned.length });
    res.json({ sent: sentCount, total: abandoned.length });
  } catch (error) {
    next(error);
  }
});

export default router;
