import { redirect } from 'next/navigation';
import { DEFAULT_CAMPUS } from '@/lib/constants';

export default function Home() { redirect(`/campus/${DEFAULT_CAMPUS}`); }
