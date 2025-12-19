import { TASK_INITIALIZING } from '../constants';

export type TaskStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped';

export interface ProfileTask {
    handle: string;
    status: TaskStatus;
    message?: string;
}

export interface CurationProgress {
    status: 'idle' | 'running' | 'completed' | 'failed';
    currentProfileIndex: number;
    totalProfiles: number;
    tasks: ProfileTask[];
    curatedCount: number;
    startTime?: number;
    endTime?: number;
    error?: string;
}

let currentProgress: CurationProgress = {
    status: 'idle',
    currentProfileIndex: 0,
    totalProfiles: 0,
    tasks: [],
    curatedCount: 0
};

export const getProgress = () => currentProgress;



export const initProgress = (handles: string[]) => {
    currentProgress = {
        status: 'running',
        currentProfileIndex: 0,
        totalProfiles: handles.length,
        tasks: handles.map(h => ({ 
            handle: h, 
            status: h === TASK_INITIALIZING ? 'processing' : 'pending' 
        })),
        curatedCount: 0,
        startTime: Date.now()
    };
};

export const updateTaskStatus = (handle: string, status: TaskStatus, message?: string) => {
    const task = currentProgress.tasks.find(t => t.handle === handle);
    if (task) {
        task.status = status;
        if (message) task.message = message;
    }
};

export const incrementCuratedCount = (count: number) => {
    currentProgress.curatedCount += count;
};

export const completeProgress = (error?: string) => {
    currentProgress.status = error ? 'failed' : 'completed';
    currentProgress.endTime = Date.now();
    if (error) currentProgress.error = error;
};

export const resetProgress = () => {
    currentProgress = {
        status: 'idle',
        currentProfileIndex: 0,
        totalProfiles: 0,
        tasks: [],
        curatedCount: 0
    };
};
