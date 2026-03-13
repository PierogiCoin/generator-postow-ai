// main.tsx

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';

// Import our promise and instance, replacing the side-effect import
import i18nPromise, { i18n } from './i18n';

// Import the main App component and views
import { App, ProtectedRoute } from './App';
// Dynamiczne importy widoków (Code Splitting dla zmniejszenia rozmiaru początkowego)
const GeneratorView = React.lazy(() => import('./components/GeneratorView').then(m => ({ default: m.GeneratorView })));
const TrendsView = React.lazy(() => import('./components/TrendsView').then(m => ({ default: m.TrendsView })));
const ContentCalendar = React.lazy(() => import('./components/ContentCalendar').then(m => ({ default: m.ContentCalendar })));
const AnalyticsView = React.lazy(() => import('./components/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const AccountView = React.lazy(() => import('./components/account/AccountView').then(m => ({ default: m.AccountView })));
const AnalyzerView = React.lazy(() => import('./components/AnalyzerView').then(m => ({ default: m.AnalyzerView })));
const StoryboardView = React.lazy(() => import('./components/StoryboardView').then(m => ({ default: m.StoryboardView })));
const HomeView = React.lazy(() => import('./components/HomeView').then(m => ({ default: m.HomeView })));
const DashboardView = React.lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const AIStrategistView = React.lazy(() => import('./components/AIStrategistView').then(m => ({ default: m.AIStrategistView })));
const SocialAuthCallback = React.lazy(() => import('./components/SocialAuthCallback').then(m => ({ default: m.SocialAuthCallback })));


// Import providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
// PAMIĘTAJ: To musi być zaimportowane!
import { initializeSupabase } from './services/supabaseClient';

// Import styles
import './styles/globals.css';
import './styles/mobile.css';


const router = createHashRouter([
  {
    path: '/',
    element: <App />, // App provides the main layout and context
    children: [
      { index: true, element: <HomeView /> }, // Always show HomeView at the root
      // Nested protected routes that will render inside App's Outlet
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardView /> },
          { path: 'generator', element: <GeneratorView /> },
          { path: 'trends', element: <TrendsView /> },
          { path: 'calendar', element: <ContentCalendar /> },
          { path: 'analytics', element: <AnalyticsView /> },
          { path: 'analyzer', element: <AnalyzerView /> },
          { path: 'account', element: <AccountView /> },
          { path: 'storyboard', element: <StoryboardView /> },
          { path: 'strategist', element: <AIStrategistView /> },
          // Obsługa przekierowań z OAuth
          { path: 'auth/:platform/callback', element: <SocialAuthCallback /> },
        ]
      }
    ],
  },
  // Fallback redirect for any unknown paths
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};


let root: ReactDOM.Root;
const container = document.getElementById('root')!;

if ((window as any)._reactRoot) {
  root = (window as any)._reactRoot;
} else {
  root = ReactDOM.createRoot(container);
  (window as any)._reactRoot = root;
}

const CenteredSpinner = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    // Używamy zmiennych CSS, aby respektować motyw ciemny/jasny
    backgroundColor: 'var(--tw-bg-slate-50, #f8fafc)',
  }}>
    <svg style={{
      animation: 'spin 1s linear infinite',
      height: '2.5rem', // h-10
      width: '2.5rem', // w-10
      color: '#3b82f6' // blue-500
    }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            body.dark .loading-spinner-bg { background-color: var(--tw-bg-slate-950, #020617); }
        `}</style>
  </div>
);


/**
 * ⚠️ Funkcja do renderowania błędów krytycznych na wczesnym etapie startu aplikacji.
 * @param message Komunikat błędu do wyświetlenia.
 */
const renderCriticalError = (message: string) => {
  root.render(
    <div style={{
      padding: '2rem',
      color: 'white',
      backgroundColor: '#ef4444', // Tailwind red-500
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h2>❌ Krytyczny Błąd Uruchamiania Aplikacji</h2>
      <p>Nie można zainicjalizować niezbędnych zasobów (Supabase / Tłumaczenia). Proszę sprawdzić zmienne środowiskowe lub konsolę.</p>
      <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', margin: '1rem auto', padding: '1rem', backgroundColor: '#dc2626' }}>{message}</pre>
    </div>
  );
};


// 1. Definiujemy asynchroniczną funkcję startową.
async function startApp() {
  try {
    // Ładujemy i18n oraz Supabase RÓWNOLEGLE
    await Promise.all([i18nPromise, initializeSupabase()]);
    console.log('✅ Aplikacja zainicjalizowana pomyślnie. Rozpoczynam renderowanie.');

    // 4. Renderowanie głównej aplikacji dopiero po udanej inicjalizacji
    console.log('🚀 root.render() calling...');
    root.render(
      <Suspense fallback={<CenteredSpinner />}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider />
              <AppRouter />
            </AuthProvider>
          </ThemeProvider>
        </I18nextProvider>
      </Suspense>
    );
    console.log('✨ root.render() called.');
  } catch (error) {
    // 5. OBSŁUGA KRYTYCZNEGO BŁĘDU: Zatrzymujemy renderowanie i pokazujemy błąd.
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Błąd krytyczny podczas inicjalizacji:", error);
    renderCriticalError(`Inicjalizacja Supabase lub i18n nie powiodła się. Szczegóły: ${errorMessage}`);
  }
}

// Wywołujemy asynchroniczną funkcję
startApp();