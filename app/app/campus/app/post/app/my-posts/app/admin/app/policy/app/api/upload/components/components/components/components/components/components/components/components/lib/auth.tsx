'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import type { Campus, Profile } from './types';
import Modal from '@/components/Modal';

type Ctx = {
  user: { id: string } | null; profile: Profile | null; loading: boolean; campuses: Campus[];
  requireAuth: (then?: () => void) => boolean; signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

// Supabase phone login needs an SMS provider. We use the phone number as the login id instead.
const emailFor = (phone: string) => `${phone.replace(/\D/g, '')}@unibenplug.app`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [open, setOpen] = useState(false);
  const pending = useRef<null | (() => void)>(null);

  const load = useCallback(async (id: string | null) => {
    if (!id) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    setProfile(data as Profile);
  }, []);

  useEffect(() => {
    supabase.from('campuses').select('*').eq('is_active', true).order('name').then(({ data }) => setCampuses((data as Campus[]) ?? []));
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      setUser(id ? { id } : null);
      load(id).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const id = s?.user.id ?? null;
      setUser(id ? { id } : null);
      setTimeout(() => load(id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const requireAuth = (then?: () => void) => {
    if (user) { then?.(); return true; }
    pending.current = then ?? null;
    setOpen(true);
    return false;
  };
  const signOut = async () => { await supabase.auth.signOut(); };
  const done = async (id: string) => {
    await load(id);
    setOpen(false);
    const fn = pending.current; pending.current = null; fn?.();
  };

  return (
    <AuthCtx.Provider value={{ user, profile, loading, campuses, requireAuth, signOut }}>
      {children}
      {open && <AuthModal campuses={campuses} onClose={() => setOpen(false)} onDone={done} />}
    </AuthCtx.Provider>
  );
}

function AuthModal({ campuses, onClose, onDone }: { campuses: Campus[]; onClose: () => void; onDone: (id: string) => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [f, setF] = useState({ name: '', phone: '', password: '', whatsapp: '', campus: campuses[0]?.id ?? '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setErr('');
    if (!f.phone || f.password.length < 6) return setErr('Enter your phone and a password of at least 6 characters.');
    if (mode === 'signup' && (!f.name || !f.whatsapp)) return setErr('Fill in every field.');
    setBusy(true);
    const email = emailFor(f.phone);
    const res = mode === 'signup'
      ? await supabase.auth.signUp({ email, password: f.password, options: { data: { full_name: f.name, phone: f.phone, whatsapp_number: f.whatsapp, campus_id: String(f.campus) } } })
      : await supabase.auth.signInWithPassword({ email, password: f.password });
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    const id = res.data.user?.id;
    if (!res.data.session || !id) return setErr('Account created but not signed in. Turn off "Confirm email" in Supabase Auth settings.');
    onDone(id);
  };

  return (
    <Modal onClose={onClose} title={mode === 'signup' ? 'Create your account' : 'Login'}>
      {mode === 'signup' && (<>
        <label className="label">Full name</label><input className="input" value={f.name} onChange={set('name')} />
      </>)}
      <label className="label">Phone</label><input className="input" type="tel" value={f.phone} onChange={set('phone')} />
      <label className="label">Password</label><input className="input" type="password" value={f.password} onChange={set('password')} />
      {mode === 'signup' && (<>
        <label className="label">WhatsApp number</label><input className="input" type="tel" placeholder="08012345678" value={f.whatsapp} onChange={set('whatsapp')} />
        <label className="label">Campus</label>
        <select className="input" value={f.campus} onChange={set('campus')}>{campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </>)}
      {err && <p className="mt-3 rounded-lg bg-orange-100 p-2 text-sm text-orange-800">{err}</p>}
      <button className="btn mt-4 w-full" disabled={busy} onClick={submit}>{mode === 'signup' ? 'Sign up' : 'Login'}</button>
      <button className="mt-3 w-full text-sm text-accent underline" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
        {mode === 'signup' ? 'I already have an account' : 'Create a new account'}
      </button>
    </Modal>
  );
}
