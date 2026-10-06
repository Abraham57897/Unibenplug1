'use client';
import { supabase } from '@/lib/supabase';
import { timeLeft } from '@/lib/format';
import type { Post } from '@/lib/types';

export default function PostCard({ p, onReport, actions }: { p: Post; onReport?: (id: string) => void; actions?: React.ReactNode }) {
  const wa = `${p.whatsapp_link}?text=${encodeURIComponent('Hi I saw your post on UnibenPlug: ' + p.title)}`;
  const seen = () => { supabase.rpc('record_view', { p_post: p.id }); };
  const contact = () => {
    seen();
    const list = JSON.parse(localStorage.getItem('ap_wa') || '[]');
    list.push({ id: p.id, title: p.title, at: Date.now() });
    localStorage.setItem('ap_wa', JSON.stringify(list.slice(-20)));
  };
  return (
    <article onClick={seen} className={`card mb-3 p-3 ${p.boosted_now ? 'border-yellow-500' : ''}`}>
      <div className="flex gap-3">
        {p.image_url ? <img src={p.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-lg bg-brand-light text-3xl">{p.post_type === 'NEED' ? '🙋' : '🛍️'}</div>}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight">{p.title}</h3>
          <div className="font-extrabold text-brand-dark">{p.price}</div>
          <div className="my-1 flex flex-wrap gap-1 text-xs font-semibold">
            {p.is_founder && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800">Founding Member</span>}
            {p.boosted_now && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800">Boosted</span>}
            {p.urgent_now && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">🔥 URGENT</span>}
            {p.seller_verified && <span className="rounded bg-brand-light px-1.5 py-0.5 text-brand-dark">✅ Verified</span>}
            <span className="rounded bg-gray-100 px-1.5 py-0.5">{p.post_type === 'NEED' ? 'Need' : 'Sell'}</span>
          </div>
          <div className="text-xs text-gray-500">
            {p.area} · 👁️ {p.views_count} views
            {!!p.seller_rating_count && ` · ⭐ ${p.seller_rating} (${p.seller_rating_count})`} · {timeLeft(p.expires_at)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {p.whatsapp_link && <a className="btn flex-1 text-center" href={wa} target="_blank" rel="noopener noreferrer" onClick={contact}>WhatsApp</a>}
        {onReport && <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); onReport(p.id); }}>Report</button>}
        {actions}
      </div>
    </article>
  );
}
