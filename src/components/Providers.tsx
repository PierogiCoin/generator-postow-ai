"use client";

import React, { Suspense, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../i18n';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { ToastProvider } from './ui/Toast';
import { initErrorReporting } from '../utils/errorReporting';
import PageSkeleton from './ui/SkeletonLoader';
import { setupChunkReloadRecovery } from '../utils/chunkReload';

if (typeof window !== 'undefined') {
  initErrorReporting();
  setupChunkReloadRecovery();
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <ToastProvider />
              {children}
            </NotificationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nextProvider>
    </Suspense>
  );
}
