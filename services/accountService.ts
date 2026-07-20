import type { PaymentHistoryItem, User } from '../types';

/**
 * Pobiera symulowaną historię płatności.
 */
export const fetchPaymentHistory = async (user: User): Promise<PaymentHistoryItem[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const mockHistory: PaymentHistoryItem[] = [
                { id: 'pay_1', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), amount: 89.00, plan: 'Pro', status: 'Zapłacono' },
                { id: 'pay_2', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), amount: 89.00, plan: 'Pro', status: 'Zapłacono' },
                { id: 'pay_3', date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), amount: 39.00, plan: 'Creator', status: 'Zapłacono' },
            ];
            resolve(mockHistory);
        }, 500);
    });
};

/**
 * Symuluje aktualizację profilu użytkownika.
 */
export const updateUserProfile = async (user: User, action: 'change_password' | 'delete_account', data?: Record<string, unknown>): Promise<{ success: boolean; message: string }> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (action === 'change_password') {
                resolve({ success: true, message: 'Hasło zostało pomyślnie zmienione (symulacja).' });
            } else if (action === 'delete_account') {
                resolve({ success: true, message: 'Konto zostało usunięte (symulacja).' });
            }
        }, 1000);
    });
};
