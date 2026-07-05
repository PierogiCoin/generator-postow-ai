/**
 * Szablony email HTML — wszystkie transakcyjne i marketingowe wiadomości.
 * Style inline (dla zgodności z klientami email).
 */

import { FRONTEND_URL } from './emailService.js';

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 0;
  background-color: #f8fafc;
`;

const headerBg = `
  background: linear-gradient(135deg, #d946ef 0%, #6366f1 100%);
  padding: 32px 24px;
  text-align: center;
  border-radius: 16px 16px 0 0;
`;

const headerTitle = `
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  margin: 0;
`;

const headerSubtitle = `
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  margin: 8px 0 0;
`;

const contentBlock = `
  background: #ffffff;
  padding: 32px 24px;
  border-radius: 0 0 16px 16px;
`;

const ctaButton = `
  display: inline-block;
  background: linear-gradient(135deg, #d946ef 0%, #6366f1 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  padding: 14px 32px;
  border-radius: 12px;
  text-decoration: none;
  margin: 16px 0;
`;

const footerText = `
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
  padding: 24px;
  line-height: 1.6;
`;

const sectionTitle = `
  color: #1e293b;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 12px;
`;

const paragraph = `
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
  margin: 0 0 16px;
`;

const listItem = `
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
  margin: 0 0 8px;
  padding-left: 24px;
  position: relative;
`;

const bullet = `
  position: absolute;
  left: 0;
  color: #d946ef;
  font-weight: bold;
`;

function wrapBody(inner: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;">
  <div style="${baseStyles}">
    ${inner}
    <p style="${footerText}">
      Otrzymujesz ten email ponieważ masz konto w Generatorze Postów AI.<br>
      <a href="${FRONTEND_URL}/account" style="color:#94a3b8;text-decoration:underline">Ustawienia powiadomień</a>
    </p>
  </div>
</body>
</html>`;
}

function header(title: string, subtitle?: string): string {
  return `<div style="${headerBg}">
    <h1 style="${headerTitle}">${title}</h1>
    ${subtitle ? `<p style="${headerSubtitle}">${subtitle}</p>` : ''}
  </div>`;
}

// ============================================================
// WELCOME EMAIL (Dzień 0 — natychmiast po rejestracji)
// ============================================================
export function welcomeEmail(name: string): string {
  return wrapBody(`
    ${header('Witaj w Generatorze Postów AI! 🎉', 'Twój pierwszy post w mniej niż minutę')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Dziękujemy za rejestrację! Otrzymałeś <strong>100 darmowych kredytów</strong> — wystarczy na ~10 postów, 3 obrazy AI i 1 kampanię.
      </p>
      <p style="${sectionTitle}">Zacznij w 3 krokach:</p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">→</span> Wybierz platformę i opisz swój cel</li>
        <li style="${listItem}"><span style="${bullet}">→</span> Wybierz ton i styl wizualny</li>
        <li style="${listItem}"><span style="${bullet}">→</span> Kliknij "Generuj" — gotowe!</li>
      </ul>
      <a href="${FRONTEND_URL}/generator" style="${ctaButton}">Wygeneruj pierwszy post →</a>
      <p style="${paragraph};margin-top:24px;font-size:13px;color:#94a3b8;">
        💡 Wskazówka: Użyj Onboarding Wizard, aby dopasować AI do Twojej niszy.
      </p>
    </div>
  `);
}

// ============================================================
// ONBOARDING TIP (Dzień 1 — jak napisać dobry prompt)
// ============================================================
export function onboardingTipEmail(name: string): string {
  return wrapBody(`
    ${header('Jak pisać posty, które ludzie czytają? 📝', 'Wskazówka dnia 1')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Najlepsze posty zaczynają się od <strong>konkretnego celu</strong>. Zamiast "napisz post o marketingu", spróbuj:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">✓</span> "Edukacyjny post o 3 błędach początkujących marketerów"</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> "Story o tym jak AI zmienił mój workflow — ton inspirujący"</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> "Post z pytaniem do społeczności o ulubione narzędzia"</li>
      </ul>
      <a href="${FRONTEND_URL}/generator" style="${ctaButton}">Wypróbuj teraz →</a>
    </div>
  `);
}

// ============================================================
// ENGAGEMENT BOOST (Dzień 3 — multi-platform optimizer)
// ============================================================
export function engagementBoostEmail(name: string): string {
  return wrapBody(`
    ${header('Jeden post, 6 platform 🚀', 'Wskazówka dnia 3')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Wiesz, że możesz <strong>zoptymalizować jeden post dla 6 platform jednocześnie</strong>?
        AI automatycznie dostosuje długość, hashtagi i ton do LinkedIn, Instagram, X, Facebook, TikTok i YouTube.
      </p>
      <p style="${paragraph}">
        Oznacza to <strong>6x więcej zasięgów</strong> z jednego pomysłu — bez ręcznego przeklejania.
      </p>
      <a href="${FRONTEND_URL}/generator" style="${ctaButton}">Optymalizuj post →</a>
    </div>
  `);
}

// ============================================================
// FEATURE SHOWCASE (Dzień 7 — kalendarz i planowanie)
// ============================================================
export function featureShowcaseEmail(name: string): string {
  return wrapBody(`
    ${header('Planuj cały tydzień w 10 minut 📅', 'Wskazówka dnia 7')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Zamiast generować posty codziennie, użyj <strong>Kalendarza Treści</strong>:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">→</span> Zaplanuj posty na cały tydzień</li>
        <li style="${listItem}"><span style="${bullet}">→</span> AI sugeruje najlepsze dni i godziny</li>
        <li style="${listItem}"><span style="${bullet}">→</span> Automatyczna publikacja (plan Pro)</li>
      </ul>
      <a href="${FRONTEND_URL}/calendar" style="${ctaButton}">Otwórz kalendarz →</a>
      <p style="${paragraph};margin-top:24px;font-size:13px;color:#94a3b8;">
        💡 Planowanie i auto-publikacja dostępne od planu Creator (79 zł/mc).
      </p>
    </div>
  `);
}

// ============================================================
// LOW CREDITS WARNING (80% zużycia)
// ============================================================
export function lowCreditsEmail(name: string, remaining: number, planName: string): string {
  return wrapBody(`
    ${header('Zostało Ci niewiele kredytów ⚠️', 'Wykorzystałeś 80% limitu')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Na Twoim planie <strong>${planName}</strong> zostało <strong>${remaining} kredytów</strong>.
        To wystarczy na około ${Math.max(1, Math.floor(remaining / 10))} postów.
      </p>
      <p style="${paragraph}">
        Nie przerywaj swojej cadencji — doładuj kredyty lub przejdź na wyższy plan.
      </p>
      <a href="${FRONTEND_URL}/pricing" style="${ctaButton}">Zobacz opcje →</a>
    </div>
  `);
}

// ============================================================
// CREDITS EXHAUSTED (0 kredytów)
// ============================================================
export function creditsExhaustedEmail(name: string): string {
  return wrapBody(`
    ${header('Skończyły się kredyty 😅', 'Ale nie martw się — mamy rozwiązanie')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Wykorzystałeś wszystkie kredyty w tym miesiącu. Masz dwie opcje:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">⚡</span> <strong>Pakiet kredytów</strong> — jednorazowe doładowanie (od 39 zł)</li>
        <li style="${listItem}"><span style="${bullet}">🔄</span> <strong>Subskrypcja</strong> — niższa cena za kredyt + funkcje premium</li>
      </ul>
      <a href="${FRONTEND_URL}/pricing" style="${ctaButton}">Wybierz opcję →</a>
      <p style="${paragraph};margin-top:24px;font-size:13px;color:#94a3b8;">
        💡 Plan Pro (119 zł/mc) daje 1.800 kredytów + analitykę + strategiste AI.
      </p>
    </div>
  `);
}

// ============================================================
// RE-ENGAGEMENT (14 dni nieaktywny)
// ============================================================
export function reengagementEmail(name: string, daysInactive: number): string {
  return wrapBody(`
    ${header('Brakuje nam Twoich postów! 👋', 'Wróć i generuj z AI')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Nie widzieliśmy Cię od <strong>${daysInactive} dni</strong>. Twoje 100 darmowych kredytów wciąż czeka!
      </p>
      <p style="${paragraph}">
        Oto co możesz zrobić w 5 minut:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">→</span> Wygeneruj post z gotowego szablonu</li>
        <li style="${listItem}"><span style="${bullet}">→</span> Zoptymalizuj go dla 6 platform</li>
        <li style="${listItem}"><span style="${bullet}">→</span> Zaplanuj publikację na najlepszy czas</li>
      </ul>
      <a href="${FRONTEND_URL}/generator" style="${ctaButton}">Wróć do generatora →</a>
    </div>
  `);
}

// ============================================================
// UPGRADE NUDGE (gdy użytkownik regularnie kupuje pakiety)
// ============================================================
export function upgradeNudgeEmail(name: string, currentPlan: string, suggestedPlan: string, savings: string): string {
  return wrapBody(`
    ${header('Opłaca Ci się przejść na wyższy plan 💡', 'Mniej płacisz, więcej masz')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Zauważyliśmy, że regularnie doładowujesz kredyty na planie <strong>${currentPlan}</strong>.
        Przejście na plan <strong>${suggestedPlan}</strong> da Ci:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">✓</span> Niższa cena za kredyt (oszczędność ${savings})</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> Więcej kredytów miesięcznie</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> Dodatkowe funkcje premium</li>
      </ul>
      <a href="${FRONTEND_URL}/pricing" style="${ctaButton}">Zobacz plan ${suggestedPlan} →</a>
    </div>
  `);
}

// ============================================================
// FREE TRIAL PRO — start
// ============================================================
export function trialStartedEmail(name: string, trialDays: number): string {
  return wrapBody(`
    ${header('Twój darmowy okres Pro rozpoczęty! 🎁', '${trialDays} dni pełnego dostępu')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Aktywowałeś <strong>${trialDays}-dniowy darmowy okres Pro</strong>. Oto co masz teraz dostępne:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">✓</span> 1.800 kredytów (zamiast 100)</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> Analityka AI i strategista</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> 5 profili głosu marki</li>
        <li style="${listItem}"><span style="${bullet}">✓</span> 10 wideo AI miesięcznie</li>
      </ul>
      <a href="${FRONTEND_URL}/generator" style="${ctaButton}">Korzystaj z Pro →</a>
      <p style="${paragraph};margin-top:24px;font-size:13px;color:#94a3b8;">
        💡 Po ${trialDays} dniach automatycznie wrócisz do planu Free. Bez zobowiązań.
      </p>
    </div>
  `);
}

// ============================================================
// FREE TRIAL PRO — kończy się za 2 dni
// ============================================================
export function trialEndingEmail(name: string): string {
  return wrapBody(`
    ${header('Twój okres Pro kończy się za 2 dni ⏰', 'Nie trać dostępu do premium')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Twój darmowy okres Pro kończy się za <strong>2 dni</strong>. Po tym czasie:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">
        <li style="${listItem}"><span style="${bullet}">✗</span> Kredyty spadną do 100/mc</li>
        <li style="${listItem}"><span style="${bullet}">✗</span> Brak analityki i strategisty AI</li>
        <li style="${listItem}"><span style="${bullet}">✗</span> Brak wideo AI</li>
      </ul>
      <p style="${paragraph}">
        <strong>Nie trać momentum!</strong> Przejdź na Pro za 119 zł/mc i kontynuuj bez przerw.
      </p>
      <a href="${FRONTEND_URL}/pricing" style="${ctaButton}">Zachowaj Pro →</a>
    </div>
  `);
}

// ============================================================
// FREE TRIAL PRO — zakończony
// ============================================================
export function trialEndedEmail(name: string): string {
  return wrapBody(`
    ${header('Twój okres Pro zakończony', 'Wróć kiedy chcesz')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Twój darmowy okres Pro zakończył się. Wróciłeś do planu Free (100 kredytów/mc).
      </p>
      <p style="${paragraph}">
        Jeśli podobały Ci się funkcje premium, możesz wrócić w każdej chwili:
      </p>
      <a href="${FRONTEND_URL}/pricing" style="${ctaButton}">Zobacz plany →</a>
    </div>
  `);
}

// ============================================================
// REFERRAL — zaproszenie zaakceptowane
// ============================================================
export function referralAcceptedEmail(name: string, friendEmail: string, bonusCredits: number): string {
  return wrapBody(`
    ${header('Twój znajomy dołączył! 🎉', '+${bonusCredits} kredytów dla Ciebie')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        <strong>${friendEmail}</strong> założył konto dzięki Twojemu zaproszeniu!
        Otrzymujesz <strong>${bonusCredits} bonusowych kredytów</strong> 🎁
      </p>
      <a href="${FRONTEND_URL}/generator" style="${ctaButton}">Wykorzystaj kredyty →</a>
      <p style="${paragraph};margin-top:24px;font-size:13px;color:#94a3b8;">
        💡 Zaproś więcej znajomych — za każdego dostajesz ${bonusCredits} kredytów!
      </p>
    </div>
  `);
}

// ============================================================
// SCHEDULED POST PUBLISHED
// ============================================================
export function postPublishedEmail(name: string, platform: string, postPreview: string): string {
  return wrapBody(`
    ${header('Post opublikowany! ✅', 'Twoja zaplanowana treść jest live')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Twój post na <strong>${platform}</strong> został pomyślnie opublikowany:
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
          ${postPreview.substring(0, 200)}${postPreview.length > 200 ? '...' : ''}
        </p>
      </div>
      <a href="${FRONTEND_URL}/analytics" style="${ctaButton}">Zobacz analitykę →</a>
    </div>
  `);
}

// ============================================================
// ABANDONED CHECKOUT — przypomnienie o niedokończonej płatności
// ============================================================
export function abandonedCheckoutEmail(name: string, planName: string): string {
  return wrapBody(`
    ${header('Zaczęłeś, ale nie dokończyłeś 🛒', 'Twój koszyk czeka')}
    <div style="${contentBlock}">
      <p style="${paragraph}">Cześć${name ? ` ${name}` : ''}!</p>
      <p style="${paragraph}">
        Zauważyliśmy, że zacząłeś proces płatności dla planu <strong>${planName}</strong>, ale nie dokończyłeś.
      </p>
      <p style="${paragraph}">
        Bez obaw — możesz wrócić w każdej chwili i dokończyć w mniej niż minutę.
      </p>
      <div style="background:#fef3c7;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #fde68a;">
        <p style="color:#92400e;font-size:14px;margin:0;">
          💡 <strong>Wskazówka:</strong> Możesz też wypróbować <strong>7-dniowy darmowy trial</strong> — bez podawania karty!
        </p>
      </div>
      <a href="${FRONTEND_URL}/pricing" style="${ctaButton}">Dokończ płatność →</a>
      <p style="${footerText}">
        Nie chcesz tych emaili? <a href="${FRONTEND_URL}/settings" style="color:#6366f1;">Zarządzaj powiadomieniami</a>
      </p>
    </div>
  `);
}
