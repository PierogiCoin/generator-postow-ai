import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  scanContentSafety,
  quickShadowbanCheck,
  brandSafetyCheck,
  ContentSafetyReport,
  ShadowbanRisk,
  BrandSafetyCheck,
  cacheSafetyReport,
  getCachedSafetyReport,
} from '../services/contentSafetyService';
import { Platform, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { HashIcon } from './icons/HashIcon';
import { XMarkIcon } from './icons/XMarkIcon';

interface ContentSafetyPanelProps {
  postText: string;
  hashtags: string[];
  platform: Platform;
  isPromotional?: boolean;
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
  safe: 'bg-green-100 text-green-700 border-green-300',
  caution: 'bg-amber-100 text-amber-700 border-amber-300',
  risky: 'bg-orange-100 text-orange-700 border-orange-300',
  unsafe: 'bg-red-100 text-red-700 border-red-300',
};

const RECOMMENDATION_COLORS = {
  publish: 'bg-green-500 text-white',
  edit: 'bg-amber-500 text-white',
  review: 'bg-orange-500 text-white',
  reject: 'bg-red-500 text-white',
};

export const ContentSafetyPanel: React.FC<ContentSafetyPanelProps> = ({
  postText,
  hashtags,
  platform,
  isPromotional = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [report, setReport] = useState<ContentSafetyReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastScanHash, setLastScanHash] = useState('');

  // Auto-scan when content changes significantly
  useEffect(() => {
    const contentHash = btoa(`${postText}-${hashtags.join(',')}`).slice(0, 20);
    if (postText.length > 20 && contentHash !== lastScanHash && user?.id) {
      const timer = setTimeout(() => {
        handleScan();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [postText, hashtags, lastScanHash, user]);

  const handleScan = useCallback(async () => {
    if (!user?.id) return;
    if (!postText.trim()) return;

    const contentHash = btoa(`${postText}-${hashtags.join(',')}`).slice(0, 20);
    
    // Check cache
    const cached = getCachedSafetyReport(contentHash);
    if (cached) {
      setReport(cached);
      setLastScanHash(contentHash);
      return;
    }

    setIsScanning(true);
    try {
      const result = await scanContentSafety(
        postText,
        '', // image description
        hashtags,
        platform,
        isPromotional,
        user.id
      );
      setReport(result);
      setLastScanHash(contentHash);
      cacheSafetyReport(contentHash, result);
      
      if (result.overallRecommendation !== 'publish') {
        notifications.addToast(
          `Wykryto ${result.shadowban.riskScore > 50 ? 'wysokie' : 'umiarkowane'} ryzyko - sprawdź raport`,
          NotificationType.Info
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd skanowania bezpieczeństwa';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsScanning(false);
    }
  }, [postText, hashtags, platform, isPromotional, user, notifications]);

  const getRiskIcon = (risk: string) => {
    if (risk === 'low' || risk === 'safe') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (risk === 'medium' || risk === 'caution') return <AlertTriangleIcon className="w-5 h-5 text-amber-500" />;
    if (risk === 'high' || risk === 'risky') return <AlertTriangleIcon className="w-5 h-5 text-orange-500" />;
    return <XMarkIcon className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Content Safety Scanner
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ochrona przed shadowbanem i kontrowersjami
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
        >
          {isScanning ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SparklesIcon className="w-4 h-4" />
          )}
          {isScanning ? 'Skanuję...' : 'Skanuj'}
        </button>
      </div>

      {isScanning && !report ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-emerald-900 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">
            AI skanuje treść pod kątem ryzyka...
          </p>
          <p className="text-sm text-slate-400">
            Sprawdzam: shadowban, regulamin, brand safety
          </p>
        </div>
      ) : report ? (
        <>
          {/* Overall Status */}
          <div className={`p-6 rounded-2xl border-2 ${
            report.overallRecommendation === 'publish' ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
            report.overallRecommendation === 'edit' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' :
            report.overallRecommendation === 'review' ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
            'border-red-300 bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getRiskIcon(report.shadowban.overallRisk)}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Rekomendacja: {report.overallRecommendation === 'publish' ? '✅ Można publikować' :
                                   report.overallRecommendation === 'edit' ? '⚠️ Wymaga edycji' :
                                   report.overallRecommendation === 'review' ? '👁️ Do przeglądu' : '❌ Odrzuć'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Shadowban Risk: {report.shadowban.riskScore}/100
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                RECOMMENDATION_COLORS[report.overallRecommendation]
              }`}>
                {report.shadowban.riskScore > 70 ? 'HIGH RISK' : 
                 report.shadowban.riskScore > 40 ? 'MODERATE' : 'SAFE'}
              </div>
            </div>

            {report.priorityActions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Priorytetowe działania:
                </p>
                <ul className="space-y-1">
                  {report.priorityActions.map((action, i) => (
                    <li key={`action-${i}`} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'overview', label: 'Podsumowanie', icon: SparklesIcon },
              { id: 'shadowban', label: 'Shadowban', icon: AlertTriangleIcon, badge: report.shadowban.riskScore > 40 ? '!' : null },
              { id: 'compliance', label: 'Regulamin', icon: CheckCircleIcon, badge: report.compliance.violations.length > 0 ? '!' : null },
              { id: 'brand', label: 'Brand Safety', icon: SparklesIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <HashIcon className="w-5 h-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Hashtagi</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    report.shadowban.factors.overusedHashtags.length > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {report.shadowban.factors.overusedHashtags.length > 0 ? 
                      `${report.shadowban.factors.overusedHashtags.length} ryzykowne` : 
                      'W porządku'}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangleIcon className="w-5 h-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Wykryte</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    report.shadowban.factors.restrictedKeywords.length > 0 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {report.shadowban.factors.restrictedKeywords.length} słowa
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="w-5 h-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Brand</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    report.brandSafety.overallRisk === 'safe' ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {report.brandSafety.overallRisk === 'safe' ? 'Bezpieczne' : 'Sprawdź'}
                  </div>
                </div>
              </div>

              {/* Safe Version */}
              {report.shadowban.safeVersion && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-bold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    Bezpieczna wersja (zalecana):
                  </h4>
                  <p className="text-green-800 dark:text-green-300 text-sm">
                    {report.shadowban.safeVersion}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Shadowban Tab */}
          {activeTab === 'shadowban' && (
            <div className="space-y-4">
              {report.shadowban.factors.overusedHashtags.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="font-bold text-red-900 dark:text-red-200 mb-3">
                    ⚠️ Nadmiernie używane hashtagi (ryzyko shadowbana):
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {report.shadowban.factors.overusedHashtags.map((tag, i) => (
                      <span key={`hashtag-${tag}`} className="px-3 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm line-through">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.shadowban.factors.restrictedKeywords.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-3">
                    🚫 Ograniczone słowa kluczowe:
                  </h4>
                  <ul className="space-y-2">
                    {report.shadowban.factors.restrictedKeywords.map((word, i) => (
                      <li key={`keyword-${word}`} className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <XMarkIcon className="w-4 h-4" />
                        {word}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.shadowban.factors.spamIndicators.length > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <h4 className="font-bold text-orange-900 dark:text-orange-200 mb-3">
                    🤖 Wskaźniki spamu:
                  </h4>
                  <ul className="space-y-1">
                    {report.shadowban.factors.spamIndicators.map((indicator, i) => (
                      <li key={`indicator-${i}`} className="text-sm text-orange-800 dark:text-orange-300">
                        • {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Platform Specific */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">
                  📱 Ryzyko na poszczególnych platformach:
                </h4>
                <div className="space-y-2">
                  {Object.entries(report.shadowban.platformSpecific).map(([platform, data]) => (
                    <div key={platform} className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                        {platform}
                      </span>
                      <div className="flex items-center gap-2">
                        {data.issues.length > 0 && (
                          <span className="text-xs text-red-500">{data.issues.length} problemów</span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          data.risk === 'low' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {data.risk}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {report.shadowban.mitigationSteps.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-3">
                    💡 Jak naprawić:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
                    {report.shadowban.mitigationSteps.map((step, i) => (
                      <li key={`step-${i}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-4">
              {report.compliance.violations.length > 0 ? (
                <div className="space-y-3">
                  {report.compliance.violations.map((violation, i) => (
                    <div key={`violation-${i}`} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-3">
                        <XMarkIcon className="w-6 h-6 text-red-500 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-red-900 dark:text-red-200">
                            Naruszenie: {violation.category}
                          </h4>
                          <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                            {violation.description}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                            Jak naprawić: {violation.suggestedFix}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                  <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <h4 className="font-bold text-green-900 dark:text-green-200">
                    ✅ Brak naruszeń regulaminu
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    Treść jest zgodna z wytycznymi platformy
                  </p>
                </div>
              )}

              {report.compliance.advertisingCompliance.isAd && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-2">
                    📢 Wymagania dla treści sponsorowanej:
                  </h4>
                  {report.compliance.advertisingCompliance.missingDisclaimers.length > 0 ? (
                    <ul className="space-y-1 text-amber-800 dark:text-amber-300">
                      {report.compliance.advertisingCompliance.missingDisclaimers.map((disclaimer, i) => (
                        <li key={`disclaimer-${i}`}>• {disclaimer}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-amber-700 dark:text-amber-300">
                      Wszystkie wymagane oznaczenia są obecne
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Brand Safety Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-4">
              {report.brandSafety.concerns.length > 0 ? (
                <div className="space-y-3">
                  {report.brandSafety.concerns.map((concern, i) => (
                    <div key={`concern-${i}`} className={`p-4 rounded-xl border ${
                      concern.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' :
                      concern.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200'
                    }`}>
                      <h4 className={`font-bold ${
                        concern.severity === 'high' ? 'text-red-900 dark:text-red-200' :
                        concern.severity === 'medium' ? 'text-amber-900 dark:text-amber-200' :
                        'text-blue-900 dark:text-blue-200'
                      }`}>
                        {concern.severity === 'high' ? '❗' : concern.severity === 'medium' ? '⚠️' : 'ℹ️'} {concern.category}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        concern.severity === 'high' ? 'text-red-800 dark:text-red-300' :
                        concern.severity === 'medium' ? 'text-amber-800 dark:text-amber-300' :
                        'text-blue-800 dark:text-blue-300'
                      }`}>
                        {concern.description}
                      </p>
                      {concern.alternativeSuggestions.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-slate-600">Alternatywy:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {concern.alternativeSuggestions.map((alt, j) => (
                              <span key={j} className="px-2 py-1 bg-white dark:bg-slate-700 text-sm rounded">
                                {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                  <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <h4 className="font-bold text-green-900 dark:text-green-200">
                    ✅ Brak zagrożeń dla marki
                  </h4>
                </div>
              )}

              {report.brandSafety.competitorMentions.mentioned && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                    🏢 Wzmianki o konkurencji:
                  </h4>
                  <p className="text-blue-800 dark:text-blue-300">
                    Wykryto wzmianki o konkurencji - upewnij się że są one zgodne z polityką marki
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Kliknij "Skanuj" aby sprawdzić bezpieczeństwo treści
          </p>
          <p className="text-sm text-slate-400">
            Sprawdzamy: shadowban, regulamin platformy, brand safety
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentSafetyPanel;
