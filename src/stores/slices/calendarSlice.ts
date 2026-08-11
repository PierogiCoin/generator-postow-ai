import { StateCreator } from 'zustand';
import type { IntelligentCalendarPlanItem, CalendarSlotContext } from '../../types';

export interface CalendarSlice {
  pendingCalendarSlot: CalendarSlotContext | null;
  calendarBatchQueue: IntelligentCalendarPlanItem[];
  calendarBatchTotal: number;
  setPendingCalendarSlot: (slot: CalendarSlotContext | null) => void;
  clearPendingCalendarSlot: () => void;
  setCalendarBatchQueue: (items: IntelligentCalendarPlanItem[], total?: number) => void;
  clearCalendarBatch: () => void;
}

export const createCalendarSlice: StateCreator<CalendarSlice, [], [], CalendarSlice> = (set) => ({
  pendingCalendarSlot: null,
  calendarBatchQueue: [],
  calendarBatchTotal: 0,
  
  setPendingCalendarSlot: (slot) => set({ pendingCalendarSlot: slot }),
  clearPendingCalendarSlot: () => set({ pendingCalendarSlot: null }),
  setCalendarBatchQueue: (items, total) =>
    set((state) => ({
      calendarBatchQueue: items,
      calendarBatchTotal: total !== undefined ? total : state.calendarBatchTotal,
    })),
  clearCalendarBatch: () => set({ calendarBatchQueue: [], calendarBatchTotal: 0 }),
});
