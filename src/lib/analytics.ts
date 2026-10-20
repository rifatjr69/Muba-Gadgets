// src/lib/analytics.ts
// Storefront-এর visitor, funnel ও traffic source ট্র্যাক করে (site_events টেবিলে)।
// কিছু ফেইল করলেও সাইট কখনো আটকাবে না।
import { supabase } from './supabase';

export type TrackType = 'visit' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase';
type Source = 'direct' | 'organic' | 'social' | 'referral' | 'email';

const get = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } };

function sessionId(): string {
  let s = get('muba_sid');
  if (!s) {
    s = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    set('muba_sid', s);
  }
  return s;
}

function detectSource(): Source {
  const cached = get('muba_src') as Source | null;
  if (cached) return cached;
  let src: Source = 'direct';
  try {
    const q = new URLSearchParams(window.location.search);
    const utmSource = (q.get('utm_source') || '').toLowerCase();
    const utmMedium = (q.get('utm_medium') || '').toLowerCase();
    const ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
    if (utmMedium === 'email' || utmSource.includes('mail')) src = 'email';
    else if (/facebook|fb\.|instagram|twitter|t\.co|x\.com|youtube|tiktok|whatsapp|messenger|linkedin|pinterest/.test(utmSource + ' ' + ref)) src = 'social';
    else if (/google|bing|yahoo|duckduckgo|yandex|baidu/.test(utmSource + ' ' + ref)) src = 'organic';
    else if (ref && ref !== window.location.hostname) src = 'referral';
  } catch { /* ignore */ }
  set('muba_src', src);
  return src;
}

async function detectCountry(): Promise<string> {
  const cached = get('muba_country');
  if (cached) return cached;
  let country = 'Unknown';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) { const j = await res.json(); country = j.country_name || 'Unknown'; }
  } catch { /* ignore */ }
  set('muba_country', country);
  return country;
}

export async function trackEvent(type: TrackType): Promise<void> {
  try {
    if (type === 'visit') { if (get('muba_visit')) return; set('muba_visit', '1'); }
    if (type === 'purchase') { /* প্রতিটি অর্ডারেই পাঠানো হবে */ }
    const [country] = await Promise.all([detectCountry()]);
    await supabase.from('site_events').insert({ event_type: type, session_id: sessionId(), country, source: detectSource() });
  } catch { /* tracking কখনো সাইট ভাঙবে না */ }
}

/** App চালু হওয়ার সময় একবার কল করুন */
export const initTracking = () => { void trackEvent('visit'); };