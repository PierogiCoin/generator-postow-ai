import React from 'react';
import { Link } from 'react-router-dom';

type LegalKind = 'terms' | 'privacy';

const CONTENT: Record<LegalKind, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  terms: {
    title: 'Regulamin serwisu Generator Postów AI',
    updated: '1 lipca 2026',
    sections: [
      {
        h: '1. Postanowienia ogólne',
        p: 'Regulamin określa zasady korzystania z aplikacji Generator Postów AI (dalej: Serwis). Korzystając z Serwisu, akceptujesz niniejszy Regulamin.',
      },
      {
        h: '2. Konto użytkownika',
        p: 'Rejestracja wymaga podania prawidłowego adresu e-mail. Użytkownik odpowiada za bezpieczeństwo hasła i działania wykonane z jego konta.',
      },
      {
        h: '3. Plany i płatności',
        p: 'Płatności obsługiwane są przez Stripe. Subskrypcje odnawiają się automatycznie do momentu anulowania w panelu rozliczeń. Kredyty są naliczane zgodnie z wybranym planem.',
      },
      {
        h: '4. Treści generowane przez AI',
        p: 'Użytkownik ponosi odpowiedzialność za publikowanie treści wygenerowanych w Serwisie. Zalecamy weryfikację merytoryczną i prawną przed publikacją.',
      },
      {
        h: '5. Kontakt',
        p: 'W sprawach regulaminu skontaktuj się z administratorem Serwisu przez formularz w aplikacji lub e-mail podany na stronie głównej.',
      },
    ],
  },
  privacy: {
    title: 'Polityka prywatności',
    updated: '1 lipca 2026',
    sections: [
      {
        h: '1. Administrator danych',
        p: 'Administratorem danych osobowych jest operator Serwisu Generator Postów AI (RODO).',
      },
      {
        h: '2. Jakie dane przetwarzamy',
        p: 'Adres e-mail, dane profilu, historia generacji, dane subskrypcji (Stripe), logi techniczne niezbędne do działania usługi.',
      },
      {
        h: '3. Cele przetwarzania',
        p: 'Świadczenie usługi, rozliczenia, wsparcie techniczne, bezpieczeństwo i rozwój produktu — na podstawie umowy i prawnie uzasadnionego interesu.',
      },
      {
        h: '4. Podmioty przetwarzające',
        p: 'Supabase (baza danych, auth), Stripe (płatności), Vercel/Railway (hosting), Google (modele AI — zgodnie z ich polityką).',
      },
      {
        h: '5. Prawa użytkownika',
        p: 'Masz prawo dostępu, sprostowania, usunięcia, ograniczenia przetwarzania i przenoszenia danych. Skontaktuj się z administratorem.',
      },
      {
        h: '6. Pliki cookies',
        p: 'Serwis używa cookies niezbędnych do logowania i preferencji (np. motyw, język).',
      },
    ],
  },
};

export const LegalPage: React.FC<{ kind: LegalKind }> = ({ kind }) => {
  const doc = CONTENT[kind];
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <Link to="/" className="text-sm text-cyan-600 hover:underline">
        ← Strona główna
      </Link>
      <h1 className="mt-6 text-3xl font-black text-slate-900 dark:text-white">{doc.title}</h1>
      <p className="mt-2 text-sm text-slate-500">Ostatnia aktualizacja: {doc.updated}</p>
      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{s.h}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
};
