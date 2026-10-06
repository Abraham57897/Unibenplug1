'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PostCard from '@/components/PostCard';
import BoostModal from '@/components/BoostModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Post } from '@/lib/types';

const STATUS: Record<string, string> = { approved: 'Live', pending_review: 'Pending review', hidden: 'Hidden', auto_deleted: 'Removed' };

export default function MyPosts() {
  const { user, loading, requireAuth } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boosting, setBoosting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('feed_posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPosts((data as Post[]) ?? []);
  }, [user]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('paid');
    if (!ref || !user) return;
    (async () => {
      setMsg('Confirming your payment...');
      const { data: s } = await supabase.auth.getSession();
      for (let i = 0; i < 5; i++) {
        const r = await fetch('/api/boost/verify?reference=' + ref, { headers: { Authorization: `Bearer ${s.session?.access_token}` } });
        const j = await r.json();
        if (j.status === 'success') { setMsg('Payment received. Your post is boosted!'); load(); history.replaceState(null, '', '/my-posts'); return; }
        await new Promise((res) => setTimeout(res, 2000));
      }
      setMsg('Payment not confirmed yet. Your boost starts automatically once your bank confirms it.');
    })();
  }, [user]);
  useEffect(() => { if (!loading && !user) requireAuth(); }, [loading, user]);

  const del = async (id: string) => { if (confirm('Delete this post?')) { await supabase.from('posts').delete().eq('id', id); load(); } };
  const repost = async (p: Post) => {
    const { data, error } = await supabase.rpc('create_post', { p_type: p.post_type, p_campus: p.campus_id, p_title: p.title, p_desc: p.description, p_price: p.price, p_category: p.category, p_area: p.area, p_lat: p.lat, p_lng: p.lng, p_image: p.image_url, p_urgent: false });
    setMsg(error ? error.message : data.status === 'pending_review' ? 'Reposted. Waiting for review.' : data.status === 'approved' ? 'Reposted and live.' : data.message);
    load();
  };
  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from('posts').update({ title: editing.title, description: editing.description, price: editing.price }).eq('id', editing.id);
    setMsg(error ? error.message : 'Saved.'); setEditing(null); load();
  };

  if (!user) return <p className="p-6 text-center">Log in to see your posts.</p>;
  return (
    <main className="mx-auto max-w-3xl px-3 pb-20 pt-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">My posts</h1><Link href="/post" className="btn">+ Post Now</Link></div>
      {msg && <p className="mt-3 rounded-lg bg-brand-light p-2 text-sm">{msg}</p>}
      {posts.length === 0 && <p className="py-10 text-center text-gray-500">You have no posts yet.</p>}
      {posts.map((p) => (
        <div key={p.id} className="mt-3">
          <div className="mb-1 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded bg-gray-100 px-2 py-1">{STATUS[p.status] ?? p.status}</span>
            <span className="rounded bg-gray-100 px-2 py-1">👁️ {p.views_count} views</span>
            {!!p.seller_rating_count && <span className="rounded bg-gray-100 px-2 py-1">⭐ {p.seller_rating} ({p.seller_rating_count})</span>}
          </div>
          {editing?.id === p.id ? (
            <div className="rounded-2xl border bg-white p-3">
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <textarea className="input mt-2" rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <input className="input mt-2" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
              <div className="mt-2 flex gap-2"><button className="btn flex-1" onClick={save}>Save</button><button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
            </div>
          ) : (
            <PostCard p={p} actions={<>
              <button className="btn-ghost" onClick={() => setEditing(p)}>Edit</button>
              <button className="btn-ghost" onClick={() => repost(p)}>Repost</button>
              <button className="btn-ghost" onClick={() => del(p.id)}>Delete</button>
              {p.status === 'approved' && <button className="btn" onClick={() => setBoosting(p.id)}>Boost</button>}
            </>} />
          )}
        </div>
      ))}
      {boosting && <BoostModal postId={boosting} onClose={() => { setBoosting(null); load(); }} />}
    </main>
  );
}
