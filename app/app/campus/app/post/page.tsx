'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { NEED_CATEGORIES, SELL_CATEGORIES } from '@/lib/constants';
import { distanceKm } from '@/lib/format';

const PinPicker = dynamic(() => import('@/components/PinPicker'), { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-gray-100" /> });

export default function PostPage() {
  const { user, profile, campuses, requireAuth, loading } = useAuth();
  const campus = campuses.find((c) => c.id === profile?.campus_id) ?? campuses[0];
  const [type, setType] = useState<'SELL' | 'NEED'>('SELL');
  const [f, setF] = useState({ title: '', desc: '', price: '', cat: SELL_CATEGORIES[0], area: '' });
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [img, setImg] = useState<File | null>(null);
  const [urgent, setUrgent] = useState(false); const [policy, setPolicy] = useState(false);
  const [msg, setMsg] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) requireAuth(); }, [loading, user]);
  useEffect(() => { setF((x) => ({ ...x, cat: (type === 'SELL' ? SELL_CATEGORIES : NEED_CATEGORIES)[0] })); }, [type]);
  if (!user || !campus) return <p className="p-6 text-center">Log in to post.</p>;
  const center: [number, number] = [campus.lat, campus.lng];
  const at = pin ?? center;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setMsg('');
    if (!f.title.trim() || !f.price.trim()) return setMsg('Title and price are required.');
    if (!img) return setMsg('Add one photo.');
    if (!policy) return setMsg('Agree to the Community Policy to publish.');
    if (distanceKm(at, center) > 10 && !confirm('Your pin is far from this campus, are you sure?')) return;
    setBusy(true);
    const { data: s } = await supabase.auth.getSession();
    const body = new FormData(); body.append('file', img);
    const up = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${s.session?.access_token}` }, body });
    const upj = await up.json();
    if (!up.ok) { setBusy(false); return setMsg(upj.error); }
    const { data, error } = await supabase.rpc('create_post', {
      p_type: type, p_campus: campus.id, p_title: f.title, p_desc: f.desc, p_price: f.price, p_category: f.cat,
      p_area: f.area, p_lat: at[0], p_lng: at[1], p_image: upj.url, p_urgent: type === 'NEED' && urgent,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (data.status === 'auto_deleted') return setMsg(data.message + ' Three removed posts get your account banned.');
    setOk(data.founder ? 'You are live as a Founding Member with a free 7-day boost.' : data.status === 'pending_review' ? 'Submitted. An admin will review it shortly.' : 'Your post is live.');
  };

  if (ok) return (
    <main className="mx-auto max-w-md p-6 text-center">
      <p className="rounded-xl bg-brand-light p-4 font-semibold">{ok}</p>
      <Link href={`/campus/${campus.slug}`} className="btn mt-4 inline-block">See the map</Link>
      <Link href="/my-posts" className="btn-ghost ml-2 mt-4 inline-block">My posts</Link>
    </main>
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-4">
      <h1 className="text-2xl font-extrabold">New post</h1>
      <div className="mt-3 flex gap-2">
        {(['SELL', 'NEED'] as const).map((t) => <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-lg border py-2 font-semibold ${type === t ? 'border-brand bg-brand text-white' : 'bg-white'}`}>{t === 'SELL' ? 'What I sell' : 'What I need'}</button>)}
      </div>
      <label className="label">Title</label><input className="input" maxLength={70} value={f.title} onChange={set('title')} />
      <label className="label">Description</label><textarea className="input" rows={3} value={f.desc} onChange={set('desc')} />
      <label className="label">Price (required)</label><input className="input" placeholder="e.g. N2,500 or Negotiable" value={f.price} onChange={set('price')} />
      <label className="label">Category</label>
      <select className="input" value={f.cat} onChange={set('cat')}>{(type === 'SELL' ? SELL_CATEGORIES : NEED_CATEGORIES).map((c) => <option key={c}>{c}</option>)}</select>
      <label className="label">Area</label><input className="input" placeholder="e.g. Hall 6, Ekosodin" value={f.area} onChange={set('area')} />
      <label className="label">Tap the map to place your pin</label>
      <PinPicker center={center} pin={at} onPick={setPin} />
      <label className="label">Photo</label><input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
      {type === 'NEED' && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />Mark as Urgent 🔥 - Need today (free 2h top)</label>}
      <label className="mt-3 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} />
        <span>I agree: No fraud, no illegal items, no adult content, no spam. All listings must have real photos and real prices. Violators will be removed without refund. <Link href="/policy" className="text-accent underline">Read policy</Link></span></label>
      {msg && <p className="mt-3 rounded-lg bg-orange-100 p-2 text-sm text-orange-800">{msg}</p>}
      <button className="btn mt-4 w-full" disabled={busy} onClick={submit}>{busy ? 'Posting...' : 'Post Now'}</button>
    </main>
  );
}
