import { create } from 'zustand';

const cloneLogs = (logs = []) => logs.slice(-200);

export const useExportQueueStore = create((set) => ({
  jobs: [],
  paused: false,
  activeJobId: null,

  addJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, job],
    })),

  updateJob: (id, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) => {
        if (job.id !== id) return job;
        const nextUpdates =
          typeof updates === 'function' ? updates(job) || {} : updates || {};
        const mergedLogs =
          nextUpdates.logs && Array.isArray(nextUpdates.logs)
            ? cloneLogs(nextUpdates.logs)
            : nextUpdates.logs;
        return {
          ...job,
          ...nextUpdates,
          ...(mergedLogs ? { logs: mergedLogs } : {}),
        };
      }),
    })),

  appendJobLog: (id, entry) =>
    set((state) => ({
      jobs: state.jobs.map((job) => {
        if (job.id !== id) return job;
        const nextLogs = cloneLogs([...(job.logs || []), entry]);
        return { ...job, logs: nextLogs };
      }),
    })),

  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      activeJobId: state.activeJobId === id ? null : state.activeJobId,
    })),

  setActiveJob: (id) => set({ activeJobId: id }),

  setPaused: (paused) => set({ paused: !!paused }),

  clearCompleted: () =>
    set((state) => ({
      jobs: state.jobs.filter((job) => !['completed', 'cancelled'].includes(job.status)),
      activeJobId: state.jobs.some((job) => job.id === state.activeJobId && !['completed', 'cancelled'].includes(job.status))
        ? state.activeJobId
        : null,
    })),
}));

export const getJobById = (id) => {
  const state = useExportQueueStore.getState();
  return state.jobs.find((job) => job.id === id) || null;
};

