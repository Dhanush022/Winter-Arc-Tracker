"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-teal text-xl">Loading...</div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      const { error } = await signUpWithEmail(email, password, name);
      if (error) setError(error.message);
      else {
        setSuccess("Account created. Check your email for a confirmation link before signing in.");
        setEmail("");
        setPassword("");
        setName("");
        setIsSignUp(false);
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center">
            <span className="text-accent-teal text-sm">❄</span>
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">WINTER ARC</span>
            <span className="text-[10px] text-muted-dark font-mono ml-2 tracking-widest">EARN THE SPRING</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center grid-bg">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-orange/30 text-accent-orange text-xs font-medium tracking-widest mb-6">
              <span>❄</span>
              THE SEASON OF DISCIPLINE
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-6">
              <span className="text-white">DISCIPLINE</span>
              <br />
              <span className="teal-gradient italic font-serif font-normal">IN THE DARK.</span>
            </h1>

            <p className="text-muted text-lg mb-8 max-w-md">
              Keep every promise you make to yourself. Build streaks, protect them with limited freezes, and climb with your crew.
            </p>

            <div className="flex gap-8 mb-8">
              <div>
                <div className="text-2xl font-bold text-white">1</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">MEMBERS</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0d</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">TOP STREAK</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">POINTS EARNED</div>
              </div>
            </div>

            {/* Auth Form */}
            <div className="max-w-sm">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-all mb-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-muted-dark text-xs">or</span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {isSignUp && (
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input-field w-full"
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field w-full"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field w-full"
                />

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                {success && (
                  <p className="text-green-400 text-sm">{success}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent-teal text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all"
                >
                  {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
                </button>
              </form>

              <p className="text-center text-muted-dark text-sm mt-3">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
                  className="text-accent-teal hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>

          {/* 3D Crystal */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-80 h-80 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 to-transparent rounded-full blur-3xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-surface-light to-surface border border-surface-border rounded-2xl transform rotate-12 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 rounded-xl transform -rotate-6 flex items-center justify-center">
                    <span className="text-6xl opacity-50">❄</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-surface-border flex items-center justify-center gap-2 text-muted-dark text-xs tracking-widest">
        <span>❄</span>
        WINTER ARC · BUILT FOR THE SEASON NOBODY SEES
      </footer>
    </div>
  );
}
