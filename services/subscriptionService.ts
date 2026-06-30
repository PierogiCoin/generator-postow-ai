import { User, UserPlan } from '../types';
import { getSupabase } from './supabaseClient';

class SubscriptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SubscriptionError';
    }
}

/**
 * Subscribes a user to a new plan by updating their profile in Supabase.
 * @param {string} userId - The ID of the user changing the plan.
 * @param {UserPlan} newPlan - The new plan to subscribe to.
 * @returns {Promise<User>} A promise that resolves to the updated user object.
 */
export const subscribeToPlan = async (userId: string, newPlan: UserPlan): Promise<User> => {
    const supabase = getSupabase();
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                plan: newPlan,
                // Reset usage on plan change
                usage: { text: 0, image: 0, video: 0, campaign: 0, learnStyle: 0 }
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw new SubscriptionError(error.message);
        }

        // We need to return the full User object which includes email from auth.users
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if(!authUser) throw new SubscriptionError('User not found after subscription.');
        
        return {
            id: data.id,
            name: data.name,
            email: authUser.email || '',
            plan: data.plan,
            teams: [], // mock for now
            currentTeamId: data.current_team_id
        };

    } catch (error) {
        if (error instanceof SubscriptionError) {
            throw error;
        }
        throw new SubscriptionError('An unexpected error occurred while trying to subscribe.');
    }
};