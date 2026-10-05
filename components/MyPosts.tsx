'use client';
import { useCallback, useEffect, useState } from 'react';
import PostCard from './PostCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Post } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  approved: 'Live', pending_review: 'Waiting for review', hidden: 'Hidden', auto_deleted: 'Removed',
};

export default function MyPosts() {
  const { user, loading, requireAuth } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPosts((data as Post[]) ?? []);
  }, [user]);

  useEffect(() => { if (!loading && !user) requireAuth(); }, [loading, user, requireAuth]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', id).eq('user_id', user!.id);
    load();
  };

  return (
    <main className="mx-auto max-w-3xl px-3 pb-16 pt-4">
      <h1 className="mb-3 text-2xl font-extrabold">My posts</h1>
      {!user && !loading && <p className="text-gray-500">Log in to see your posts.</p>}
      {posts?.length === 0 && <p className="py-8 text-center text-gray-500">You have not posted anything yet.</p>}
      {posts?.map((p) => (
        <PostCard key={p.id} p={p} actions={<>
          <span className="self-center rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{STATUS_LABEL[p.status] ?? p.status}</span>
          <button className="btn-ghost ml-auto" onClick={() => remove(p.id)}>Delete</button>
        </>} />
      ))}
    </main>
  );
}
