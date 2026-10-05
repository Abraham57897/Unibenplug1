import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Feed from '@/components/Feed';
import SetupNotice from '@/components/SetupNotice';
import type { Campus, Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CampusPage({ params }: { params: { slug: string } }) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: campus, error } = await db.from('campuses').select('*').eq('slug', params.slug).maybeSingle();
  if (error) return <SetupNotice detail={error.message} />;
  if (!campus) notFound();

  const { data: posts } = await db
    .from('feed_posts')
    .select('*')
    .eq('campus_id', campus.id)
    .eq('status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(300);

  return <Feed campus={campus as Campus} initial={(posts as Post[]) ?? []} />;
}
