import { useCallback } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useAuth } from '../contexts/AuthContext';
import type { GenerationResult, FormData, ScheduledPost } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const usePostScheduler = () => {
    const { user } = useAuth();
    const { addOrUpdateScheduledPost, deleteScheduledPost, scheduledPosts } = useDataStore();

    const schedulePost = useCallback(async (
        result: GenerationResult,
        formData: FormData,
        scheduleTimestamp: number
    ): Promise<ScheduledPost | null> => {
        if (!user) return null;

        const post: ScheduledPost = {
            id: uuidv4(),
            formData,
            result,
            scheduleTimestamp,
            createdAt: Date.now(),
            userId: user.id,
            teamId: user.currentTeamId || null,
            status: 'scheduled',
            approvalStatus: 'draft',
            comments: [],
        };

        await addOrUpdateScheduledPost(post);
        return post;
    }, [user, addOrUpdateScheduledPost]);

    const cancelScheduledPost = useCallback(async (id: string): Promise<void> => {
        await deleteScheduledPost(id);
    }, [deleteScheduledPost]);

    const getDueNow = useCallback((): ScheduledPost[] => {
        const now = Date.now();
        return scheduledPosts.filter(p => p.status === 'scheduled' && p.scheduleTimestamp <= now);
    }, [scheduledPosts]);

    return { schedulePost, cancelScheduledPost, getDueNow, scheduledPosts };
};
