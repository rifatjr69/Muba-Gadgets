import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface TrackingSettings {
  fb_pixel_id?: string; fb_pixel_code?: string; fb_access_token?: string; fb_enabled?: boolean;
  gtm_id?: string; gtm_head_code?: string; gtm_body_code?: string; gtm_enabled?: boolean;
  tiktok_pixel_id?: string; tiktok_pixel_code?: string; tiktok_enabled?: boolean;
  custom_head_code?: string; custom_body_code?: string;
}

export const TrackingTab: React.FC = () => {
  const [settings, setSettings] = useState<TrackingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('tracking_settings').select('*').eq('id', 1).maybeSingle();
      if (data) setSettings(data);
    } catch (e) {
      const saved = localStorage.getItem('tracking_settings');
      if (saved) setSettings(JSON.parse(saved));
    } finally { setLoading(false); }
  };

  const saveSettings = async (newSettings?: TrackingSettings) => {
    const s = newSettings || settings;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('tracking_settings').upsert({ id: 1, ...s });
      if (error) throw error;
      localStorage.setItem('tracking_settings', JSON.stringify(s));
      setMessage({ text: 'Tracking settings saved', ok: true });
    } catch (e) {
      setMessage({ text: 'Failed to save settings', ok: false });
    } finally { setSaving(false); setTimeout(() => setMessage(null), 3000); }
  };

  const update = (key: keyof TrackingSettings, val: any) => setSettings({ ...settings, [key]: val });

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tracking Settings</h2>
        <button onClick={() => saveSettings()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-xl flex items-center gap-2">
          {saving && <Loader2 className="animate-spin w-4 h-4" />} Save All
        </button>
      </div>
      {message && <div className={`p-3 rounded-lg text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{message.text}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Pixel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold">Meta (Facebook) Pixel</h3>
            <input type="checkbox" checked={!!settings.fb_enabled} onChange={(e) => update('fb_enabled', e.target.checked)} className="h-5 w-5 text-blue-600 rounded" /></div>
          <input placeholder="Pixel ID (e.g., 123456789012345)" value={settings.fb_pixel_id || ''} onChange={(e) => update('fb_pixel_id', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
          <textarea spellCheck={false} rows={5} placeholder="Pixel Code / Base Script" value={settings.fb_pixel_code || ''} onChange={(e) => update('fb_pixel_code', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono" />
          <input placeholder="Conversions API Access Token" value={settings.fb_access_token || ''} onChange={(e) => update('fb_access_token', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
          <button onClick={() => saveSettings()} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-4 py-2 rounded-xl">Save</button>
        </div>

        {/* GTM */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold">Google Tag Manager</h3>
            <input type="checkbox" checked={!!settings.gtm_enabled} onChange={(e) => update('gtm_enabled', e.target.checked)} className="h-5 w-5 text-blue-600 rounded" /></div>
          <input placeholder="Container ID (e.g., GTM-XXXXXXX)" value={settings.gtm_id || ''} onChange={(e) => update('gtm_id', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
          <textarea spellCheck={false} rows={3} placeholder="Head Script" value={settings.gtm_head_code || ''} onChange={(e) => update('gtm_head_code', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono" />
          <textarea spellCheck={false} rows={3} placeholder="Body (noscript) Script" value={settings.gtm_body_code || ''} onChange={(e) => update('gtm_body_code', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono" />
          <button onClick={() => saveSettings()} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-4 py-2 rounded-xl">Save</button>
        </div>
      </div>
    </div>
  );
};
