/**
 * src/pages/Auth.jsx
 * Sign In & Sign Up Auth Page
 * Styled with PARAKH Warm Natural & Earthy Sage Palette
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, User, ArrowRight } from 'lucide-react';

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email.trim(), password, fullName.trim());
        if (error) throw error;
        alert('Account created successfully! Please sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-[#E8E4D9]">
        
        {/* BRAND HEADER */}
        <div className="text-center">
          <div className="w-12 h-12 bg-[#E9EFF0] text-[#4A6B6C] border border-[#D5E1E2] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="mt-3 text-2xl font-black text-[#2D3234] tracking-tight">PARAKH</h2>
          <p className="mt-0.5 text-xs text-[#687074]">Online Examination & Assessment Portal</p>
        </div>

        {/* TAB SWITCH */}
        <div className="flex border-b border-[#E8E4D9]">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              !isSignUp 
                ? 'border-[#4A6B6C] text-[#4A6B6C]' 
                : 'border-transparent text-[#9AA1A6] hover:text-[#687074]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              isSignUp 
                ? 'border-[#4A6B6C] text-[#4A6B6C]' 
                : 'border-transparent text-[#9AA1A6] hover:text-[#687074]'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#F9EDED] border border-[#F2D1D1] text-[#A63B3B] text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-[#2D3234] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9AA1A6] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-[#E8E4D9] rounded-xl text-xs text-[#2D3234] placeholder-[#9AA1A6] focus:outline-none focus:border-[#4A6B6C] focus:bg-white transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#2D3234] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9AA1A6] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@university.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-[#E8E4D9] rounded-xl text-xs text-[#2D3234] placeholder-[#9AA1A6] focus:outline-none focus:border-[#4A6B6C] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D3234] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9AA1A6] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-[#E8E4D9] rounded-xl text-xs text-[#2D3234] placeholder-[#9AA1A6] focus:outline-none focus:border-[#4A6B6C] focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#4A6B6C] hover:bg-[#3B5758] text-[#F8F6F0] rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              'Processing...'
            ) : isSignUp ? (
              <>Create Account <ArrowRight className="w-3.5 h-3.5" /></>
            ) : (
              <>Sign In to Portal <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;