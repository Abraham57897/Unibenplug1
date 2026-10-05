'use client';
import { useState } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';
import { REPORT_REASONS } from '@/lib/constants';

export default function ReportModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [msg, setMsg] = useState('');
  const send = async () => {
    const { error } = await supabase.rpc('report_post', { p_post: postId, p_reason: reason });
    setMsg(error ? error.message : 'Thanks. We will review this post.');
  };
  return (
    <Modal title="Report this post" onClose={onClose}>
      <select className="input mt-3" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      {msg ? <p className="mt-3 rounded-lg bg-brand-light p-2 text-sm">{msg}</p> : <button className="btn mt-4 w-full" onClick={send}>Send report</button>}
    </Modal>
  );
}
