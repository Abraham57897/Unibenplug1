import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Checks the caller is logged in, blocks nude images, then stores the photo with the service role.
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: u } = await anon.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const file = (await req.formData()).get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) return NextResponse.json({ error: 'Send an image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });

  if (process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET) {
    const body = new FormData();
    body.append('media', file);
    body.append('models', 'nudity-2.1');
    body.append('api_user', process.env.SIGHTENGINE_USER);
    body.append('api_secret', process.env.SIGHTENGINE_SECRET);
    const r = await (await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body })).json();
    const n = r?.nudity;
    if (!n) return NextResponse.json({ error: 'Image check failed. Try again.' }, { status: 502 });
    if (n.sexual_activity > 0.5 || n.sexual_display > 0.5 || n.erotica > 0.5)
      return NextResponse.json({ error: 'This image breaks the Community Policy.' }, { status: 422 });
  }

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const path = `${u.user.id}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
  const up = await admin.storage.from('post-images').upload(path, file, { contentType: file.type });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  return NextResponse.json({ url: admin.storage.from('post-images').getPublicUrl(path).data.publicUrl });
}
