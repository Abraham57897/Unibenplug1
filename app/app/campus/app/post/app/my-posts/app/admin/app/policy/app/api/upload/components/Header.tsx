'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { campuses, profile, user, requireAuth, signOut } = useAuth();
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  const [slots, setSlots] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('free_slots').select('free_boost_slots_left').single()
      .then(({ data }) => setSlots(data?.free_boost_slots_left ?? null));
  }, []);

  return (
    <header className="sticky top-0 z-[1100] border-b bg-white">
      {slots !== null && slots > 0 && (
        <div className="bg-brand px-2 py-1.5 text-center text-sm font-semibold text-white">
          {slots} of 100 Free Boost Slots Remaining - Post now to claim!
        </div>
      )}
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-2">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand">UnibenPlug</Link>
        <div className="flex items-center gap-2">
          {slug && (
            <select className="rounded-lg border px-2 py-1.5 text-sm" value={slug} onChange={(e) => router.push(`/campus/${e.target.value}`)} aria-label="Campus">
              {campuses.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          )}
          {user ? (<>
            <Link href="/my-posts" className="btn-ghost">My posts</Link>
            {profile?.is_admin && <Link href="/admin" className="btn-ghost">Admin</Link>}
            <button className="text-sm underline" onClick={signOut}>Log out</button>
          </>) : (
            <button className="btn" onClick={() => requireAuth()}>Login</button>
          )}
        </div>
      </div>
    </header>
  );
}
