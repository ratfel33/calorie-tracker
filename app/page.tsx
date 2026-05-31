'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
// Remove the global import if it's causing the worker crash:
// import { supabase } from '@/utils/supabase'; 
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter(); // Import this from 'next/navigation' at the very top of the file

  // Create a safe runtime instance inside the component
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!email || !password) {
    setMessage('Please enter both an email and password.');
    return;
  }
  setLoading(true);
  setMessage('');

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Success! Setting name and redirecting...');
      
      // Keep this here for this run to lock in your "Rafael" display name!
      await supabase.auth.updateUser({
        data: { display_name: 'Rafael' }
      });

      router.push('/dashboard'); 
    }
  } catch (err) {
    console.error(err);
    setMessage('An unexpected error occurred.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CalorieCore Secure Access</h1>
          <p className="text-sm text-slate-500">Sign up or enter your credentials to log into your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-800 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-800 transition"
            />
          </div>

          {message && (
            <div className="p-3 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border border-slate-200">
              {message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit"
              disabled={loading}
              className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-bold shadow hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}