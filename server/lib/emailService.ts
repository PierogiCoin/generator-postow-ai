/**
 * Email Service — Resend integration
 *
 * Wysyła transakcyjne i marketingowe emaile przez Resend API.
 * Jeśli RESEND_API_KEY nie jest ustawiony, emaile są logowane (dev mode).
 */

import axios from 'axios';
import logger from '../logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@generatorpostow.ai';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Generator Postów AI';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Wysyła email przez Resend API. W dev mode (brak API key) loguje do konsoli.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    logger.info('[Email] DEV MODE — email not sent', {
      to: message.to,
      subject: message.subject,
    });
    return { success: true, id: 'dev-mode' };
  }

  try {
    const response = await axios.post(
      RESEND_API_URL,
      {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
        tags: message.tags?.map((name) => ({ name })),
      },
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    logger.info('[Email] Sent successfully', {
      to: message.to,
      subject: message.subject,
      id: response.data?.id,
    });

    return { success: true, id: response.data?.id };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string };
    logger.error('[Email] Failed to send', {
      to: message.to,
      subject: message.subject,
      error: axiosError.message,
      details: axiosError.response?.data,
    });
    return {
      success: false,
      error: axiosError.message || 'Unknown email error',
    };
  }
}

/**
 * Sprawdza czy email service jest skonfigurowany (ma API key).
 */
export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export { FRONTEND_URL };
