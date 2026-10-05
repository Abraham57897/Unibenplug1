'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PostCard from './PostCard';
import ReportModal from './ReportModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { NEED_CATEGORIES, SELL_CATEGORIES } from '@/lib/constants';
import type { Campus, Post } from '@/lib/types';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <div className="h-60 rounded-2xl bg-gray-100" /> });

export default function Feed({ campus, initial }: { campus: Campus; initial: Post[] }) {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [posts, setPosts] = useState<Post[]>(initial);
  const [q, setQ] = useState(''); const [type, setType] = useState<'ALL' | 'SELL' | 'NEED'>('ALL');
  const [cat, setCat] = useState(''); const [ver, setVer] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => { setPosts(initial); }, [initial]);
  useEffect(() => {
    supabase.from('feed_posts').select('*').eq('campus_id', campus.id).eq('status', 'approved')
      .gt('expires_at', new Date().toISOString()).limit(300).then(({ data }) => data && setPosts(data as Post[]));
  }, [campus.id]);

  const cats = type === 'SELL' ? SELL_CATEGORIES : type === 'NEED' ? NEED_CATEGORIES : [...SELL_CATEGORIES, ...NEED_CATEGORIES];
  const shown = useMemo(() => {
    const s = q.toLowerCase();
    return posts
      .filter((p) => (type === 'ALL' || p.post_type === type) && (!cat || p.category === cat) && (!ver || p.seller_verified)
        && (!s || `${p.title} ${p.description ?? ''} ${p.area ?? ''}`.toLowerCase().includes(s)))
      .sort((a, b) => Number(!!b.urgent_now) - Number(!!a.urgent_now) || +new Date(b.created_at) - +new Date(a.created_at));
  }, [posts, q, type, cat, ver]);

  return (
    <main className="mx-auto max-w-3xl px-3 pb-24 pt-3">
      <input className="input" type="search" placeholder="Search food, braids, laptops, rooms..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 flex gap-2">
        {(['ALL', 'SELL', 'NEED'] as const).map((t) => (
          <button key={t} onClick={() => { setType(t); setCat(''); }} className={`flex-1 rounded-lg border py-2 font-semibold ${type === t ? 'border-brand bg-brand text-white' : 'bg-white'}`}>
            {t === 'ALL' ? 'All' : t === 'SELL' ? 'Sell' : 'Need'}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <select className="input flex-1" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm"><input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />Verified only</label>
      </div>
      <div className="my-3 flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
        {(['list', 'map'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`flex-1 rounded-md py-1.5 text-sm font-semibold ${view === v ? 'bg-white shadow' : 'text-gray-600'}`}>
            {v === 'list' ? `List (${shown.length})` : 'Map'}
          </button>
        ))}
      </div>
      {view === 'map' ? <MapView campus={campus} posts={shown} height={480} /> : (<>
        {shown.length === 0 && <p className="py-8 text-center text-gray-500">No posts match yet. Be the first to post here.</p>}
        {shown.map((p) => <PostCard key={p.id} p={p} onReport={(id) => requireAuth(() => setReporting(id))} />)}
      </>)}
      <button className="btn fixed bottom-4 right-4 z-[1100] rounded-full px-5 py-3 shadow-lg" onClick={() => requireAuth(() => router.push('/post'))}>+ Post Now</button>
      {reporting && <ReportModal postId={reporting} onClose={() => setReporting(null)} />}
    </main>
  );
}
