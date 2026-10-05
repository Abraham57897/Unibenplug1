'use client';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const DAY = 24 * 3600 * 1000;
const read = () => JSON.parse(localStorage.getItem('ap_wa') || '[]') as { id: string; title: string; at: number }[];

// 24h after a WhatsApp tap, ask the buyer to rate the seller. Tap times are kept on the device.
export default function RatingPrompt() {
  const { user } = useAuth();
  const [item, setItem] = useState<{ id: string; title: string } | null>(null);
  const [stars, setStars] = useState(5);

  useEffect(() => {
    if (!user) return;
    const due = read().find((x) => Date.now() - x.at > DAY);
    if (due) setItem(due);
  }, [user]);

  const finish = () => { localStorage.setItem('ap_wa', JSON.stringify(read().filter((x) => x.id !== item!.id))); setItem(null); };
  const submit = async () => { await supabase.rpc('rate_seller', { p_post: item!.id, p_stars: stars, p_comment: null }); finish(); };

  if (!item) return null;
  return (
    <Modal title="Did the seller deliver?" onClose={finish}>
      <p className="mt-2 text-sm text-gray-600">{item.title}</p>
      <div className="my-4 flex justify-center gap-2 text-3xl">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${n} stars`} onClick={() => setStars(n)}>{n <= stars ? '⭐' : '☆'}</button>)}
      </div>
      <button className="btn w-full" onClick={submit}>Submit rating</button>
    </Modal>
  );
}
