import React, { useState, useContext, useEffect } from 'react';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
  subtitle?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onSwitchToSignUp, onClose, subtitle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const auth = useContext(AuthContext) as AuthContextType;

  useEffect(() => {
    if (isOpen) {
        setIsClosing(false);
        // Reset state on open
        setEmail('');
        setPassword('');
        setError(null);
        setValidationErrors({ email: '', password: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  
  const validateField = (name: 'email' | 'password', value: string) => {
    let fieldError = '';
    switch (name) {
      case 'email':
        if (!value) {
          fieldError = 'Adres e-mail jest wymagany.';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          fieldError = 'Proszę podać prawidłowy adres e-mail.';
        }
        break;
      case 'password':
        if (!value) {
          fieldError = 'Hasło jest wymagane.';
        }
        break;
      default:
        break;
    }
    setValidationErrors(prev => ({ ...prev, [name]: fieldError }));
    return fieldError === '';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target as { name: 'email' | 'password', value: string };
    validateField(name, value);
  };

  const handleClose = () => {
    if (isLoading || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
        onClose();
    }, 300); // Animation duration
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = validateField('email', email);
    const isPasswordValid = validateField('password', password);

    if (!isEmailValid || !isPasswordValid) return;

    setIsLoading(true);
    try {
      await auth.login(email, password);
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się zalogować. Sprawdź swoje dane.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isSubmitDisabled = isLoading || !!validationErrors.email || !!validationErrors.password || !email || !password;
  
  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className={`relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all duration-300 ease-out ${isOpen && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Zamknij"
          className="absolute top-4 right-4 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 id="login-modal-title" className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Witaj ponownie!</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
          {subtitle || 'Zaloguj się, aby kontynuować.'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">{error}</div>}
          
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adres e-mail</label>
            <input
              type="email"
              id="login-email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={handleBlur}
              required
              className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-md py-3 px-3 focus:ring-2 focus:border-blue-500 transition ${validationErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'}`}
              placeholder="ty@example.com"
              aria-invalid={!!validationErrors.email}
              aria-describedby="login-email-error"
            />
            {validationErrors.email && <p id="login-email-error" className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
          </div>
          
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hasło</label>
            <input
              type="password"
              id="login-password"
              name="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={handleBlur}
              required
              className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-md py-3 px-3 focus:ring-2 focus:border-blue-500 transition ${validationErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'}`}
              placeholder="••••••••"
              aria-invalid={!!validationErrors.password}
              aria-describedby="login-password-error"
            />
            {validationErrors.password && <p id="login-password-error" className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mt-6"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logowanie...
              </>
            ) : (
              'Zaloguj się'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Nie masz jeszcze konta?{' '}
          <button onClick={onSwitchToSignUp} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;