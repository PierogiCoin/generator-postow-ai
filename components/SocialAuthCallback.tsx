import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../services/apiClient';

export const SocialAuthCallback: React.FC = () => {
    const { platform } = useParams<{ platform: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [status, setStatus] = useState<string>('Trwa autoryzacja z serwisem...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processCallback = async () => {
            if (!user || !platform) {
                setError('Brak uwierzytelnienia lub platformy');
                return;
            }

            // Pobieranie kodów z URL
            const searchParams = new URLSearchParams(location.search);
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const oauth_token = searchParams.get('oauth_token');
            const oauth_verifier = searchParams.get('oauth_verifier');

            if (!code && !oauth_token) {
                setError('Zalogowano poprawnie lub brak kodu autoryzacji z serwisu.');
                setTimeout(() => navigate('/dashboard'), 3000);
                return;
            }

            try {
                setStatus(`Łączenie z platformą ${platform}...`);

                const response = await fetch(`${getApiBaseUrl()}/api/social/callback/${platform}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': user.id
                    },
                    body: JSON.stringify({ code, state, oauth_token, oauth_verifier })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || 'Błąd połączenia z API serwisu webowego');
                }

                setStatus('Połączono pomyślnie!');
                setTimeout(() => navigate('/dashboard'), 2000);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
                setError(errorMessage);
            }
        };

        processCallback();
    }, [user, platform, location.search, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="p-8 bg-white dark:bg-slate-800 shadow-xl rounded-2xl max-w-md w-full text-center">
                {error ? (
                    <div>
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Błąd połączenia</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                        <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                            Wróć do panelu
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{status}</h2>
                        <p className="text-slate-500 dark:text-slate-400">Proszę czekać, nie zamykaj tego okna.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
