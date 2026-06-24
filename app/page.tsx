import { redirect } from 'next/navigation';

// Root: arahkan ke dashboard. Middleware akan redirect ke /login bila belum auth.
export default function Home() {
  redirect('/dashboard');
}
