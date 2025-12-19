import type { CuratedResponse, ProgressResponse, Settings, ProfilesResponse } from '../types';

export const api = {
  async getLatestCurated(): Promise<CuratedResponse> {
    const res = await fetch('/api/curated/latest');
    if (!res.ok) throw new Error('Failed to fetch curated posts');
    return res.json();
  },

  async runCuration(): Promise<void> {
    const res = await fetch('/api/admin/run', { method: 'POST' });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.message || 'Failed to start run');
    }
  },

  async getProgress(): Promise<ProgressResponse> {
    const res = await fetch('/api/admin/progress');
    return res.json();
  },

  async getStatus(): Promise<{ lastRun?: any }> {
    const res = await fetch('/api/admin/status');
    return res.json();
  },

  async getProfiles(): Promise<ProfilesResponse> {
    const res = await fetch('/api/admin/profiles');
    return res.json();
  },

  async saveProfiles(handles: string[]): Promise<void> {
    await fetch('/api/admin/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles }),
    });
  },

  async addProfile(handle: string): Promise<void> {
    const res = await fetch('/api/admin/profiles/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
    });
    if (!res.ok) throw new Error('Failed to add profile');
  },

  async deleteProfile(handle: string): Promise<void> {
    const res = await fetch(`/api/admin/profiles/${handle}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete profile');
  },

  async toggleProfile(handle: string, enabled: boolean): Promise<void> {
      const res = await fetch(`/api/admin/profiles/${handle}/toggle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Failed to toggle profile');
  },

  async getSettings(): Promise<Settings> {
    const res = await fetch('/api/admin/settings');
    return res.json();
  },

  async saveSettings(settings: Settings): Promise<void> {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  async postComment(shortcode: string, comment: string): Promise<void> {
    const res = await fetch(`/api/posts/${shortcode}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (!res.ok) throw new Error('Failed to save comment');
  }
};
