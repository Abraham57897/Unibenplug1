'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const TABS = ['Pending', 'Auto-Deleted', 'Reported', 'Boost Payments', 'Users'] as const;
type Tab = (typeof TABS)[number];

export default function Admin() {
  const { profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('Pending');
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!profile?.is_admin) return;
    const count = async (q: any) => (await q).count ?? 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [posts, users, del, pend, slots] = await Promise.all([
      count(supabase.from('posts').select('*', { count: 'exact', head: true })),
      count(supabase.from('profiles').select('*', { count: 'exact', head: true })),
      count(supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'auto_deleted').gte('created_at', today.toISOString())),
      count(supabase.from('boost_payments').select('*', { count: 'exact', head: true }).eq('status', 'approved')),
      supabase.from('settings').select('free_boost_slots_left').single(),
    ]);
    setStats({ 'Total posts': posts, Users: users, 'Free slots': slots.data?.free_boost_slots_left ?? 0, 'Auto-deleted today': del, 'Paid boosts': pend });

    let data: any[] = [];
    if (tab === 'Pending') data = (await supabase.from('posts').select('*, profiles(full_name)').eq('status', 'pending_review').order('created_at')).data ?? [];
    if (tab === 'Auto-Deleted') data = (await supabase.from('posts').select('*, profiles(full_name)').eq('status', 'auto_deleted').order('created_at', { ascending: false }).limit(100)).data ?? [];
    if (tab === 'Reported') data = (await supabase.from('posts').select('*, profiles(full_name)').gt('reports_count', 0).neq('status', 'auto_deleted').order('reports_count', { ascending: false })).data ?? [];
    if (tab === 'Users') data = (await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)).data ?? [];
    if (tab === 'Boost Payments') {
      const { data: pays } = await supabase.from('boost_payments').select('*, boost_plans(name, days), posts(title)').order('created_at', { ascending: false }).limit(50);
      data = await Promise.all((pays ?? []).map(async (p: any) => ({ ...p, receipt_signed: p.receipt_image_url ? (await supabase.storage.from('receipts').createSignedUrl(p.receipt_image_url, 3600)).data?.signedUrl : null })));
    }
    setRows(data);
  }, [profile, tab]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: string, args: any) => { setErr(''); const { error } = await supabase.rpc(fn, args); if (error) setErr(error.message); load(); };

  if (loading) return null;
  if (!profile?.is_admin) return <p className="p-6 text-center">Not authorized.</p>;
  return (
    <main className="mx-auto max-w-3xl px-3 pb-20 pt-4">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Object.entries(stats).map(([k, v]) => <div key={k} className="rounded-xl border bg-white p-2 text-center"><div className="text-xl font-extrabold text-brand-dark">{v}</div><div className="text-xs text-gray-500">{k}</div></div>)}
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-semibold ${tab === t ? 'border-brand bg-brand text-white' : 'bg-white'}`}>{t}</button>)}
      </div>
      {err && <p className="mt-3 rounded-lg bg-orange-100 p-2 text-sm text-orange-800">{err}</p>}
      {rows.length === 0 && <p className="py-8 text-center text-gray-500">Nothing here.</p>}
      <div className="mt-3 space-y-2">
        {tab === 'Boost Payments' && rows.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-3">
            <div className="font-bold">{r.posts?.title}</div>
            <div className="text-sm">{r.boost_plans?.name} · N{r.amount.toLocaleString()} · {r.status === 'approved' ? 'Paid (auto)' : r.status === 'pending' ? 'Waiting for payment' : 'Rejected'}</div>
            {r.receipt_signed && <a href={r.receipt_signed} target="_blank" rel="noreferrer"><img src={r.receipt_signed} alt="Receipt" className="my-2 max-h-56 rounded-lg" /></a>}
            {r.status === 'pending' && <div className="flex gap-2"><button className="btn flex-1" onClick={() => run('approve_boost', { p_payment: r.id })}>Approve (only if Paystack shows it paid)</button><button className="btn-ghost" onClick={() => run('reject_boost', { p_payment: r.id })}>Reject</button></div>}
          </div>
        ))}
        {tab === 'Users' && rows.map((u) => (
          <div key={u.id} className="rounded-xl border bg-white p-3">
            <div className="font-bold">{u.full_name} {u.is_verified && '✅'} {u.is_banned && '🚫'}</div>
            <div className="text-sm text-gray-600">{u.phone} · {u.total_approved_posts} approved posts · ⭐ {u.avg_rating}</div>
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost" onClick={() => run('admin_set_verified', { p_user: u.id, p_val: !u.is_verified })}>{u.is_verified ? 'Remove verified' : 'Mark Verified'}</button>
              <button className="btn-ghost" onClick={() => run('admin_set_ban', { p_user: u.id, p_ban: !u.is_banned })}>{u.is_banned ? 'Unban' : 'Ban'}</button>
            </div>
          </div>
        ))}
        {!['Boost Payments', 'Users'].includes(tab) && rows.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-3">
            <div className="font-bold">{p.title} · {p.price}</div>
            <div className="text-sm text-gray-600">{p.profiles?.full_name} · {p.category}{p.reports_count > 0 && ` · ${p.reports_count} reports`}</div>
            {p.description && <p className="mt-1 text-sm">{p.description}</p>}
            {p.auto_delete_reason && <p className="mt-1 text-sm text-orange-700">{p.auto_delete_reason}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {tab !== 'Auto-Deleted' && <button className="btn" onClick={() => run('admin_review_post', { p_post: p.id, p_action: 'approve' })}>Approve</button>}
              {tab === 'Reported' && <button className="btn-ghost" onClick={() => run('admin_review_post', { p_post: p.id, p_action: 'hide' })}>Hide</button>}
              <button className="btn-ghost" onClick={() => run('admin_review_post', { p_post: p.id, p_action: 'delete' })}>Delete</button>
              <button className="btn-ghost" onClick={() => run('admin_set_ban', { p_user: p.user_id, p_ban: true })}>Ban user</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
