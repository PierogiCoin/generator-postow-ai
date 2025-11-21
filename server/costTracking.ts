import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from './logger.js';

// Cost tracking service
export class CostTracker {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Track an API cost
   */
  async trackCost(params: {
    userId: string;
    operation: string;
    provider: string;
    cost: number;
    durationMs?: number;
    success?: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('api_costs')
        .insert({
          user_id: params.userId,
          operation: params.operation,
          provider: params.provider,
          cost: params.cost,
          duration_ms: params.durationMs,
          success: params.success ?? true,
          metadata: params.metadata || {}
        });

      if (error) {
        logger.error('[CostTracker] Failed to track cost', {
          error: error.message,
          userId: params.userId,
          operation: params.operation
        });
      }
    } catch (error: any) {
      logger.error('[CostTracker] Exception tracking cost', {
        error: error.message,
        userId: params.userId
      });
    }
  }

  /**
   * Get user's total costs
   */
  async getUserCosts(userId: string, days: number = 30): Promise<{
    totalCost: number;
    requestCount: number;
    breakdown: Array<{ provider: string; operation: string; cost: number; count: number }>;
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_costs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        return { totalCost: 0, requestCount: 0, breakdown: [] };
      }

      const totalCost = data.reduce((sum, row) => sum + parseFloat(row.cost), 0);
      const requestCount = data.length;

      // Breakdown by provider and operation
      const breakdownMap = new Map<string, { cost: number; count: number }>();
      
      data.forEach(row => {
        const key = `${row.provider}:${row.operation}`;
        const existing = breakdownMap.get(key) || { cost: 0, count: 0 };
        existing.cost += parseFloat(row.cost);
        existing.count += 1;
        breakdownMap.set(key, existing);
      });

      const breakdown = Array.from(breakdownMap.entries()).map(([key, value]) => {
        const [provider, operation] = key.split(':');
        return { provider, operation, cost: value.cost, count: value.count };
      });

      return { totalCost, requestCount, breakdown };
    } catch (error: any) {
      logger.error('[CostTracker] Failed to get user costs', {
        error: error.message,
        userId
      });
      return { totalCost: 0, requestCount: 0, breakdown: [] };
    }
  }

  /**
   * Get daily costs for all users
   */
  async getDailyCosts(days: number = 7): Promise<Array<{
    date: string;
    provider: string;
    operation: string;
    cost: number;
    count: number;
  }>> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_costs')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Group by date, provider, operation
      const groupMap = new Map<string, { cost: number; count: number }>();

      data.forEach(row => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const key = `${date}:${row.provider}:${row.operation}`;
        const existing = groupMap.get(key) || { cost: 0, count: 0 };
        existing.cost += parseFloat(row.cost);
        existing.count += 1;
        groupMap.set(key, existing);
      });

      return Array.from(groupMap.entries()).map(([key, value]) => {
        const [date, provider, operation] = key.split(':');
        return { date, provider, operation, cost: value.cost, count: value.count };
      });
    } catch (error: any) {
      logger.error('[CostTracker] Failed to get daily costs', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get top spenders
   */
  async getTopSpenders(limit: number = 10, days: number = 30): Promise<Array<{
    userId: string;
    totalCost: number;
    requestCount: number;
  }>> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_costs')
        .select('user_id, cost')
        .gte('created_at', since.toISOString());

      if (error) throw error;
      if (!data) return [];

      // Group by user
      const userMap = new Map<string, { totalCost: number; requestCount: number }>();

      data.forEach(row => {
        const existing = userMap.get(row.user_id) || { totalCost: 0, requestCount: 0 };
        existing.totalCost += parseFloat(row.cost);
        existing.requestCount += 1;
        userMap.set(row.user_id, existing);
      });

      // Sort and limit
      return Array.from(userMap.entries())
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, limit);
    } catch (error: any) {
      logger.error('[CostTracker] Failed to get top spenders', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check if user exceeded budget
   */
  async checkBudget(userId: string, dailyBudget: number): Promise<{
    exceeded: boolean;
    spent: number;
    remaining: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await this.supabase
        .from('api_costs')
        .select('cost')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const spent = (data || []).reduce((sum, row) => sum + parseFloat(row.cost), 0);
      const remaining = dailyBudget - spent;
      const exceeded = spent >= dailyBudget;

      return { exceeded, spent, remaining };
    } catch (error: any) {
      logger.error('[CostTracker] Failed to check budget', {
        error: error.message,
        userId
      });
      return { exceeded: false, spent: 0, remaining: dailyBudget };
    }
  }
}

// Cost estimates (approximate)
export const COST_ESTIMATES = {
  'gemini-text': 0.0001,        // ~$0.0001 per 1k tokens
  'dalle-standard': 0.04,        // $0.04 per image
  'dalle-hd': 0.08,              // $0.08 per HD image
  'luma-video': 0.40,            // ~$0.40 per video
  'replicate-video': 0.02,       // ~$0.02 per video
};

// Export singleton instance (initialized in index.ts)
export let costTracker: CostTracker | null = null;

export function initCostTracker(supabaseUrl: string, supabaseKey: string) {
  costTracker = new CostTracker(supabaseUrl, supabaseKey);
  logger.info('💰 Cost tracker initialized');
}
