import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, User } from 'lucide-react';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('karthik@ignisia.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isSignup ? 'signup' : 'login';
    const body = isSignup ? { name, email, password } : { email, password };

    try {
      const response = await fetch(`http://localhost:5001/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        // Store JWT securely
        localStorage.setItem('ignisia_token', data.token);
        localStorage.setItem('ignisia_user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        window.location.href = '/review';
      } else {
        setError(data.error || `Failed to ${endpoint}`);
      }
    } catch (err) {
      setError('Cannot connect to backend server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-600/10 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white text-xl tracking-widest mb-4 shadow-lg shadow-brand-500/20">
            IG
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            {isSignup ? 'Create an Account' : 'Welcome to Ignisia'}
          </h1>
          <p className="text-slate-400 mt-2 text-center">
            {isSignup ? 'Register to access the AI Grader Dashboard' : 'Sign in to access the AI Grader Dashboard'}
          </p>
        </div>

        <div className="premium-card bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative">
          
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/50 rounded-xl flex items-center space-x-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {isSignup && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    placeholder="Prof. John Doe"
                    required={isSignup}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  placeholder="faculty@university.edu"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Password</label>
                {!isSignup && (
                  <a href="#" className="text-xs text-brand-400 hover:text-brand-300">Forgot password?</a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span>{loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Sign In')}</span>
              {isSignup ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-slate-500 text-sm">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{' '}
            <button 
              onClick={() => {
                setIsSignup(!isSignup);
                setError(null);
              }} 
              className="text-brand-400 hover:underline font-medium focus:outline-none"
            >
              {isSignup ? 'Sign In' : 'Create one'}
            </button>
          </p>
          <p className="text-slate-500 text-sm">
            Need access or help? <a href="#" className="text-brand-400 hover:underline">Contact Administrator</a>
          </p>
        </div>
      </div>
    </div>
  );
}
