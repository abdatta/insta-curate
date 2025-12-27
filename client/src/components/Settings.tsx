import { useState, useEffect, useRef } from 'preact/hooks';

import type { Task, Profile } from '../types';
import { api } from '../services/api';
import { TASK_INITIALIZING, TASK_DONE } from '@shared/constants';
import '../styles/components/Settings.css';

interface SettingsProps {
  onRunComplete?: () => void;
}

export function Settings({ onRunComplete }: SettingsProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfile, setNewProfile] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(4);
  const [loading, setLoading] = useState(true);

  // Run State
  const [runStatus, setRunStatus] = useState<
    'idle' | 'running' | 'completed' | 'failed'
  >('idle');
  const [tasks, setTasks] = useState<Task[]>([]);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pData, sData] = await Promise.all([
          api.getProfiles(),
          api.getSettings(),
        ]);
        setProfiles(pData.profiles);
        setScheduleEnabled(sData.schedule_enabled);
        setScheduleInterval(sData.schedule_interval_hours);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Check if run is already in progress on mount
    checkProgress();

    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (fast = false) => {
    stopPolling();
    pollIntervalRef.current = window.setInterval(
      checkProgress,
      fast ? 1000 : 5000
    );
  };

  // Keep track of previous status to detect completion transition
  const prevStatusRef = useRef<string>('idle');
  // Track if we have already handled the completion for the current run
  const completionHandledRef = useRef<boolean>(false);

  const checkProgress = async () => {
    try {
      const progress = await api.getProgress();
      const currentStatus = progress.status;

      if (currentStatus === 'running') {
        setRunStatus('running');
        setTasks(progress.tasks);
        completionHandledRef.current = false;
        if (!pollIntervalRef.current) startPolling(true);
      } else if (currentStatus === 'completed' || currentStatus === 'failed') {
        // Only show completion if we were previously running in this session and haven't handled it yet.
        if (
          prevStatusRef.current === 'running' &&
          !completionHandledRef.current
        ) {
          setRunStatus(currentStatus as any);
          setTasks(progress.tasks);
          completionHandledRef.current = true;

          if (currentStatus === 'completed') {
            if (onRunComplete) {
              setTimeout(() => {
                setRunStatus('idle');
                setTasks([]);
                onRunComplete();
              }, 1500);
            } else {
              // If no callback, just hide after delay
              setTimeout(() => {
                setRunStatus('idle');
                setTasks([]);
              }, 3000);
            }
          }
        } else {
          // If we just loaded and it's already done, stay idle
          if (runStatus === 'running') {
            setRunStatus('idle');
          }
          stopPolling();
        }
      }
      prevStatusRef.current = currentStatus;
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunNow = async () => {
    setRunStatus('running');

    const profileTasks = profiles
      .filter((p) => !!p.is_enabled)
      .map((p) => ({
        handle: p.handle,
        status: 'pending' as const,
        message: 'Waiting...',
      }));

    const initialTasks: Task[] = [
      {
        handle: TASK_INITIALIZING,
        status: 'processing',
        message: 'Starting...',
      },
      ...profileTasks,
      { handle: TASK_DONE, status: 'pending', message: 'Waiting...' },
    ];

    setTasks(initialTasks);

    prevStatusRef.current = 'running';
    completionHandledRef.current = false;

    try {
      await api.runCuration();
      startPolling(true);
    } catch (e: any) {
      setRunStatus('failed');
    }
  };

  const handleAddProfile = async (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const handle = newProfile.trim();
      if (!handle) return;

      try {
        await api.addProfile(handle);
        const pData = await api.getProfiles(); // Refresh list to get ID/State
        setProfiles(pData.profiles);
        setNewProfile('');
      } catch (e) {
        alert('Error adding profile');
      }
    }
  };

  const handleDeleteProfile = async (handle: string) => {
    if (!confirm(`Are you sure you want to delete @${handle}?`)) return;
    try {
      await api.deleteProfile(handle);
      setProfiles(profiles.filter((p) => p.handle !== handle));
    } catch (e) {
      alert('Error deleting profile');
    }
  };

  const handleToggleProfile = async (profile: Profile) => {
    try {
      const newState = !profile.is_enabled;
      await api.toggleProfile(profile.handle, newState);
      setProfiles(
        profiles.map((p) =>
          p.handle === profile.handle
            ? { ...p, is_enabled: newState ? 1 : 0 }
            : p
        )
      );
    } catch (e) {
      alert('Error updating profile');
    }
  };

  const saveSchedule = async (enabled: boolean, interval: number) => {
    try {
      await api.saveSettings({
        schedule_enabled: enabled,
        schedule_interval_hours: interval,
      });
      setScheduleEnabled(enabled);
      setScheduleInterval(interval);
    } catch (e) {
      alert('Error saving settings');
    }
  };

  if (loading)
    return (
      <div class="settings-container">
        <div
          class="setting-group"
          style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}
        >
          Loading settings...
        </div>
      </div>
    );

  return (
    <div class="settings-container">
      <div class="setting-group">
        <h3>Run Control</h3>
        <button onClick={handleRunNow} disabled={runStatus === 'running'}>
          {runStatus === 'running' ? 'Running...' : 'Run Curation Now'}
        </button>

        {(runStatus === 'running' ||
          (runStatus !== 'idle' && tasks.length > 0)) && (
          <div class="task-list">
            {tasks.map((t, i) => (
              <div key={i} class="task-item">
                <div class={`task-status-icon status-${t.status}`}></div>
                <div class="task-info">
                  <div class="task-handle">
                    {t.handle.startsWith('__') ? t.handle.slice(2) : t.handle}
                  </div>
                  <div class="task-message">{t.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="setting-group">
        <h3>Schedule</h3>
        <div class="schedule-container">
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) =>
                saveSchedule(e.currentTarget.checked, scheduleInterval)
              }
            />
            Enable Schedule
          </label>
          <div class="select-wrapper">
            <select
              value={scheduleInterval}
              onChange={(e) =>
                saveSchedule(scheduleEnabled, parseInt(e.currentTarget.value))
              }
              class="schedule-select"
            >
              <option value="2">Every 2 hours</option>
              <option value="4">Every 4 hours</option>
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Every 24 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Profiles</h3>
        <p>Manage curated accounts. Toggle to pause/resume curation.</p>

        <input
          type="text"
          placeholder="Add Instagram handle (Press Enter)"
          value={newProfile}
          onInput={(e) => setNewProfile(e.currentTarget.value)}
          onKeyDown={handleAddProfile}
          class="profile-input"
        />

        <div class="profile-list">
          {profiles.map((profile) => (
            <div
              key={profile.handle}
              class={`profile-item ${!profile.is_enabled ? 'disabled' : ''}`}
            >
              <span class="profile-handle">@{profile.handle}</span>
              <div class="profile-actions">
                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    checked={!!profile.is_enabled}
                    onChange={() => handleToggleProfile(profile)}
                  />
                  <span class="slider"></span>
                </label>

                <button
                  class="btn-delete"
                  onClick={() => handleDeleteProfile(profile.handle)}
                  title="Delete Profile"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
