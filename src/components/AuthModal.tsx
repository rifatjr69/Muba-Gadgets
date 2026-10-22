import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAROON = '#7A1F3D';
const MAROON_DARK = '#5E1630';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (signUpError) throw signUpError;
        alert('সফলভাবে একাউন্ট তৈরি হয়েছে! অনুগ্রহ করে ইমেইল কনফার্ম করুন বা লগইন করুন।');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'অথেন্টিকেশন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          
          <div className="text-center space-y-2">
            <div 
              className="w-16 h-16 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-950/20"
              style={{ backgroundColor: MAROON }}
            >
              <ShieldCheck className="w-8 h-8 text-rose-200" />
            </div>
            <h2 className="text-xl font-black text-gray-900">
              {isSignUp ? 'মুবা গ্যাজেটস এ রেজিস্টার করুন' : 'মুবা গ্যাজেটস এ লগইন করুন'}
            </h2>
            <p className="text-xs text-gray-600 font-medium">আপনার অর্ডার ও প্রোফাইল ম্যানেজ করতে লগইন করুন।</p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#7A1F3D]" /> পূর্ণ নাম
                </label>
                <input
                  type="text"
                  required
                  placeholder="আপনার নাম"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#7A1F3D]" /> ইমেইল এড্রেস
              </label>
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#7A1F3D]" /> পাসওয়ার্ড
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7A1F3D] hover:bg-[#5E1630] text-white font-bold py-3.5 px-6 rounded-xl text-xs shadow-lg shadow-rose-950/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSignUp ? 'রেজিস্ট্রেশন করুন' : 'লগইন করুন'}</span>
            </button>

          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-[#7A1F3D] font-bold hover:underline cursor-pointer"
            >
              {isSignUp ? 'ইতিমধ্যে একাউন্ট আছে? লগইন করুন' : 'নতুন একাউন্ট খুলতে রেজিস্টার করুন'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
