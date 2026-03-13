// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Image,
  Video,
  FileText,
  TrendingUp,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PricingModal } from './PricingModal';

interface UsageStats {
  totalCreditsUsed: number;
  byAction: Record<string, number>;
  byDay: Record<string, number>;
}

export function UsageMonitor() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/payments/usage?days=30', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  const creditsRemaining = user?.credits || 0;
  const creditsUsed = stats?.totalCreditsUsed || 0;
  const planLimits = getPlanLimits(user?.plan || 'free');
  const usagePercent = planLimits.maxCredits
    ? (creditsUsed / planLimits.maxCredits) * 100
    : 0;

  const isLowCredits = creditsRemaining < 100;
  const isCriticalCredits = creditsRemaining < 50;

  return (
    <>
      <Card className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Credit Usage</h3>
            <p className="text-sm text-muted-foreground">
              Current billing period
            </p>
          </div>
          <Badge variant={user?.plan === 'free' ? 'secondary' : 'default'}>
            {user?.plan?.toUpperCase()} Plan
          </Badge>
        </div>

        {/* Credits Remaining */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${isCriticalCredits ? 'text-red-500' :
                  isLowCredits ? 'text-yellow-500' :
                    'text-primary'
                }`} />
              <span className="font-medium">Credits Remaining</span>
            </div>
            <span className="text-2xl font-bold">{creditsRemaining}</span>
          </div>

          {planLimits.maxCredits && (
            <>
              <Progress
                value={100 - usagePercent}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-right">
                {creditsUsed} of {planLimits.maxCredits} used this month
              </p>
            </>
          )}

          {isLowCredits && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {isCriticalCredits
                    ? 'You\'re running very low on credits!'
                    : 'Your credits are running low'}
                </p>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowPricing(true)}
                  className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Buy More Credits
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Usage Breakdown */}
        {stats && Object.keys(stats.byAction).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Usage This Month
            </h4>

            <div className="space-y-2">
              {Object.entries(stats.byAction)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([action, credits]) => {
                  const Icon = getActionIcon(action);
                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">
                          {action.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <span className="font-medium text-muted-foreground">
                        {credits} credits
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPricing(true)}
            className="flex-1"
          >
            View Plans
          </Button>
          {user?.plan !== 'free' && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch('/api/payments/portal', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                  });
                  const data = await response.json();
                  if (data.url) {
                    window.open(data.url, '_blank');
                  }
                } catch (error) {
                  console.error('Portal error:', error);
                }
              }}
              className="flex-1"
            >
              Manage Billing
            </Button>
          )}
        </div>
      </Card>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        defaultTab="credits"
      />
    </>
  );
}

function getPlanLimits(plan: string) {
  const limits = {
    free: { maxCredits: 100 },
    pro: { maxCredits: 1000 },
    business: { maxCredits: 5000 },
    enterprise: { maxCredits: null }, // unlimited
  };
  return limits[plan as keyof typeof limits] || limits.free;
}

function getActionIcon(action: string) {
  if (action.includes('image') || action.includes('Image')) return Image;
  if (action.includes('video') || action.includes('Video')) return Video;
  if (action.includes('post') || action.includes('Post')) return FileText;
  return Zap;
}
