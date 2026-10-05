'use client';
import { useCallback, useEffect, useState } from 'react';
import PostCard from './PostCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Post, Profile } from '@/lib/types';

type Tab = 'review' | 'reported' | 'users';
type AdminUser = Profile & { phone: string | null };

export default function AdminPanel() {
  const { profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('review');
  const [posts, setPosts] = useState<(Post & { reports_count?: number })[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!profile?.is_admin) return;
    if (tab === 'users') {
      let query = supabase.from('profiles').select('id, full_name, phone, whatsapp_number, campus_id, is_admin, is_banned, is_verified, avg_rating').order('created_at', { ascending: false }).limit(100);
      if (q.trim()) query = query.or(`full_name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`);
      const { data } = await query;
      setUsers((data as AdminUser[]) ?? []);
    } else {
      const base = supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
      const { data } = tab === 'review' ? await base.eq('status', 'pending_review') : await base.or('status.eq.hidden,reports_count.gt.0');
      setPosts((data as Post[]) ?? []);
    }
  }, [profile, tab, q]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: string, args: Record<string, unknown>) => {
    setErr('');
    const { error } = await supabase.rpc(fn, args);
    if (error) setErr(error.message);
    load();
  };

  if (loading) return <main className="mx-auto max-w-3xl px-3 pt-6 text-gray-500">Loading...</main>;
  if (!profile?.is_admin) return <main className="mx-auto max-w-3xl px-3 pt-6"><p className="text-gray-600">Admins only.</p></main>;

  return (
    <main className="mx-auto max-w-3xl px-3 pb-16 pt-4">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <div className="my-3 flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
        {(['review', 'reported', 'users'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-semibold capitalize ${tab === t ? 'bg-white shadow' : 'text-gray-600'}`}>
            {t === 'review' ? 'To review' : t}
          </button>
        ))}
      </div>
      {err && <p className="mb-3 rounded-lg bg-orange-100 p-2 text-sm text-orange-800">{err}</p>}

      {tab === 'users' ? (<>
        <input className="input mb-3" type="search" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id} className="card flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{u.full_name ?? 'No name'} {u.is_admin && <span className="text-xs text-accent">(admin)</span>}</p>
                <p className="text-xs text-gray-500">{u.phone} · WA {u.whatsapp_number} · rating {u.avg_rating}</p>
              </div>
              <button className="btn-ghost" onClick={() => act('admin_set_verified', { p_user: u.id, p_val: !u.is_verified })}>{u.is_verified ? 'Unverify' : 'Verify'}</button>
              <button className={u.is_banned ? 'btn-ghost' : 'btn'} onClick={() => act('admin_set_ban', { p_user: u.id, p_ban: !u.is_banned })}>{u.is_banned ? 'Unban' : 'Ban'}</button>
            </li>
          ))}
        </ul>
      </>) : (<>
        {posts.length === 0 && <p className="py-8 text-center text-gray-500">Nothing here.</p>}
        {posts.map((p) => (
          <PostCard key={p.id} p={p} actions={<>
            {!!p.reports_count && <span className="self-center text-xs font-semibold text-orange-700">{p.reports_count} reports</span>}
            <button className="btn" onClick={() => act('admin_review_post', { p_post: p.id, p_action: 'approve' })}>Approve</button>
            <button className="btn-ghost" onClick={() => act('admin_review_post', { p_post: p.id, p_action: 'hide' })}>Hide</button>
            <button className="btn-ghost" onClick={() => confirm('Delete this post?') && act('admin_review_post', { p_post: p.id, p_action: 'delete' })}>Delete</button>
          </>} />
        ))}
      </>)}
    </main>
  );
}
