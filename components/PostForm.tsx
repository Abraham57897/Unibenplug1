'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { NEED_CATEGORIES, SELL_CATEGORIES } from '@/lib/constants';

const PinPicker = dynamic(() => import('./PinPicker'), { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-gray-100" /> });

export default function PostForm() {
  const router = useRouter();
  const { user, profile, loading, campuses, requireAuth } = useAuth();
  const [type, setType] = useState<'SELL' | 'NEED'>('SELL');
  const [f, setF] = useState({ title: '', description: '', price: '', category: SELL_CATEGORIES[0], area: '' });
  const [campusId, setCampusId] = useState<number | null>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (!loading && !user) requireAuth(); }, [loading, user, requireAuth]);
  useEffect(() => {
    const id = profile?.campus_id ?? campuses[0]?.id ?? null;
    if (campusId === null && id !== null) setCampusId(id);
  }, [profile, campuses, campusId]);

  const campus = campuses.find((c) => c.id === campusId);
  const center: [number, number] = campus ? [campus.lat, campus.lng] : [6.4, 5.6];
  const cats = type === 'SELL' ? SELL_CATEGORIES : NEED_CATEGORIES;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const switchType = (t: 'SELL' | 'NEED') => {
    setType(t);
    setF({ ...f, category: (t === 'SELL' ? SELL_CATEGORIES : NEED_CATEGORIES)[0] });
    if (t === 'SELL') setUrgent(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    setMsg(null);
    if (!f.title.trim() || !f.price.trim()) return setMsg({ ok: false, text: 'Title and price are required.' });
    if (!campusId) return setMsg({ ok: false, text: 'Pick a campus.' });
    setBusy(true);
    try {
      let image: string | null = null;
      if (file) {
        const { data } = await supabase.auth.getSession();
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body, headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` } });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        image = json.url;
      }
      const { data, error } = await supabase.rpc('create_post', {
        p_type: type, p_campus: campusId, p_title: f.title.trim(), p_desc: f.description.trim() || null, p_price: f.price.trim(),
        p_category: f.category, p_area: f.area.trim() || null, p_lat: pin?.[0] ?? null, p_lng: pin?.[1] ?? null,
        p_image: image, p_urgent: urgent,
      });
      if (error) throw new Error(error.message);
      const r = data as { status: string; message?: string };
      if (r.status === 'auto_deleted') return setMsg({ ok: false, text: r.message ?? 'This post was removed.' });
      if (r.status === 'pending_review') return setMsg({ ok: true, text: 'Posted. Your first 2 posts are checked by an admin before they appear.' });
      router.push(campus ? `/campus/${campus.slug}` : '/');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-3 pb-16 pt-4">
      <h1 className="text-2xl font-extrabold">New post</h1>
      <p className="text-sm text-gray-500">Posts stay up for 24 hours.</p>
      <form onSubmit={submit} className="card mt-4 p-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Post type">
          {(['SELL', 'NEED'] as const).map((t) => (
            <button type="button" key={t} role="radio" aria-checked={type === t} onClick={() => switchType(t)}
              className={`flex-1 rounded-lg border py-2 font-semibold ${type === t ? 'border-brand bg-brand text-white' : 'bg-white'}`}>
              {t === 'SELL' ? 'I am selling' : 'I need something'}
            </button>
          ))}
        </div>

        <label className="label" htmlFor="category">Category</label>
        <select id="category" className="input" value={f.category} onChange={set('category')}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label className="label" htmlFor="title">Title</label>
        <input id="title" className="input" maxLength={80} value={f.title} onChange={set('title')} placeholder={type === 'SELL' ? 'Jollof rice and chicken' : 'Need someone to make braids'} />

        <label className="label" htmlFor="desc">Description</label>
        <textarea id="desc" className="input min-h-24" maxLength={600} value={f.description} onChange={set('description')} />

        <label className="label" htmlFor="price">{type === 'SELL' ? 'Price' : 'Budget'}</label>
        <input id="price" className="input" value={f.price} onChange={set('price')} placeholder="N2,500 or Negotiable" />

        <label className="label" htmlFor="campus">Campus</label>
        <select id="campus" className="input" value={campusId ?? ''} onChange={(e) => { setCampusId(Number(e.target.value)); setPin(null); }}>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="label" htmlFor="area">Area / hostel</label>
        <input id="area" className="input" value={f.area} onChange={set('area')} placeholder="Hall 3, Ekosodin, BDPA..." />

        <span className="label">Pin location (optional, tap the map)</span>
        <PinPicker key={campusId ?? 0} center={center} pin={pin ?? center} onPick={setPin} />

        <label className="label" htmlFor="photo">Photo (optional, under 5MB)</label>
        <input id="photo" type="file" accept="image/*" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        {type === 'NEED' && (
          <label className="mt-4 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            Urgent (shown at the top for 2 hours)
          </label>
        )}

        {msg && <p className={`mt-4 rounded-lg p-2 text-sm ${msg.ok ? 'bg-brand-light text-brand-dark' : 'bg-orange-100 text-orange-800'}`} role="status">{msg.text}</p>}
        <button className="btn mt-4 w-full" disabled={busy}>{busy ? 'Posting...' : 'Post now'}</button>
      </form>
    </main>
  );
}
