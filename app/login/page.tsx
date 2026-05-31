'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Success! Redirecting...');
      window.location.href = '/'; // Send back to dashboard on success
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email for a confirmation link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CalorieCore Secure Access</h1>
          <p className="text-sm text-slate-500">Sign up or enter your credentials to log into your dashboard</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-800 transition"
            />
          </div>

          {message && (
            <div className="p-3 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border border-slate-200">
              {message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-bold shadow hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}