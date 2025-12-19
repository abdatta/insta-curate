import { useState, useEffect, useRef } from 'preact/hooks';
import { api } from '../services/api';
import type { Task } from '../types';
import '../styles/components/Settings.css';

interface SettingsProps {
    onRunComplete?: () => void;
}

export function Settings({ onRunComplete }: SettingsProps) {
  const [profiles, setProfiles] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(4);
  const [loading, setLoading] = useState(true);
  
  // Run State
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [tasks, setTasks] = useState<Task[]>([]);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
        try {
            const [pData, sData] = await Promise.all([
                api.getProfiles(),
                api.getSettings()
            ]);
            setProfiles(pData.profiles.map(p => p.handle).join('\n'));
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
      pollIntervalRef.current = window.setInterval(checkProgress, fast ? 1000 : 5000);
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
               if (prevStatusRef.current === 'running' && !completionHandledRef.current) {
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
    setTasks([{ handle: 'Initializing', status: 'processing', message: 'Starting...' }]);
    prevStatusRef.current = 'running';
    completionHandledRef.current = false;
    
    try {
        await api.runCuration();
        startPolling(true);
    } catch (e: any) {
        setRunStatus('failed');
    }
  };

  const saveProfiles = async () => {
    try {
        const handles = profiles.split('\n').map(s => s.trim()).filter(Boolean);
        await api.saveProfiles(handles);
        alert('Profiles saved');
    } catch (e) {
        alert('Error saving profiles');
    }
  };

  const saveSchedule = async (enabled: boolean, interval: number) => {
      try {
          await api.saveSettings({
              schedule_enabled: enabled,
              schedule_interval_hours: interval
          });
          setScheduleEnabled(enabled);
          setScheduleInterval(interval);
      } catch (e) {
          alert('Error saving settings');
      }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div class="settings-container">
       <div class="setting-group">
            <h3>Run Control</h3>
            <button onClick={handleRunNow} disabled={runStatus === 'running'}>
                {runStatus === 'running' ? 'Running...' : 'Run Curation Now'}
            </button>
            
            {(runStatus === 'running' || (runStatus !== 'idle' && tasks.length > 0)) && (
                <div class="task-list">
                    {tasks.map((t, i) => (
                        <div key={i} class="task-item">
                            <div class={`task-status-icon status-${t.status}`}></div>
                            <div class="task-info">
                                <div class="task-handle">{t.handle.startsWith('__') ? t.handle.slice(2) : t.handle}</div>
                                <div class="task-message">{t.message}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
       </div>

       <div class="setting-group">
            <h3>Schedule</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                    type="checkbox" 
                    checked={scheduleEnabled} 
                    onChange={(e) => saveSchedule(e.currentTarget.checked, scheduleInterval)} 
                /> 
                Enable Schedule
            </label>
            <div style={{ marginTop: '0.5rem' }}>
                <select 
                    value={scheduleInterval} 
                    onChange={(e) =>saveSchedule(scheduleEnabled, parseInt(e.currentTarget.value))}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                >
                    <option value="2">Every 2 hours</option>
                    <option value="4">Every 4 hours</option>
                    <option value="6">Every 6 hours</option>
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours</option>
                </select>
            </div>
        </div>

        <div class="setting-group">
            <h3>Profiles</h3>
            <p>Enter Instagram handles (one per line):</p>
            <textarea 
                rows={10} 
                value={profiles} 
                onInput={(e) => setProfiles(e.currentTarget.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', fontFamily: 'monospace' }}
            />
            <button onClick={saveProfiles} style={{ marginTop: '0.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                Save Profiles
            </button>
        </div>
        

    </div>
  );
}
