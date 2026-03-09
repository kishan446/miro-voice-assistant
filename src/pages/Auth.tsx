import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/", { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created! You're signed in.");
        } else {
          toast.success("Check your email for a verification link!", {
            description: "Click the link in your email to activate your account.",
            duration: 8000,
          });
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error.message);
      if (error.message?.includes("Email not confirmed")) {
        toast.error("Email not verified. Please check your inbox.");
      } else if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password.");
      } else if (error.message?.includes("User already registered")) {
        toast.error("Account already exists. Try signing in.");
        setIsLogin(true);
      } else if (error.message?.includes("Failed to fetch")) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        console.error("Google auth error:", error);
        toast.error("Google sign-in failed. Please try again.");
      }
    } catch (err) {
      console.error("Google auth exception:", err);
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        console.error("Apple auth error:", error);
        toast.error("Apple sign-in failed. Please try again.");
      }
    } catch (err) {
      console.error("Apple auth exception:", err);
      toast.error("Apple sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        className="z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-5xl font-bold tracking-wider text-foreground text-center mb-2 text-glow">
          MIRO
        </h1>

        <p className="text-muted-foreground text-center mb-8 font-body">
          {isLogin ? "Sign in to continue" : "Create your account"}
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm transition-colors hover:bg-card/80 disabled:opacity-50 mb-3"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm transition-colors hover:bg-card/80 disabled:opacity-50 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.545 3.027c.78-.957 1.308-2.286 1.163-3.613-1.125.046-2.488.75-3.293 1.695-.723.836-1.355 2.172-1.185 3.455 1.256.098 2.537-.639 3.315-1.537zM14.69 9.27c-.028-2.895 2.364-4.285 2.47-4.35-1.345-1.968-3.44-2.238-4.185-2.27-1.782-.18-3.48 1.05-4.385 1.05-.92 0-2.327-1.023-3.825-.996C2.78 2.73.96 3.903.113 5.697c-1.74 3.016-.446 7.486 1.248 9.934.83 1.198 1.817 2.543 3.115 2.496 1.25-.05 1.722-.808 3.233-.808 1.498 0 1.932.808 3.245.783 1.345-.023 2.197-1.22 3.017-2.425.952-1.39 1.343-2.737 1.365-2.808-.03-.012-2.62-1.005-2.647-3.99z" fill="currentColor"/>
          </svg>
          Continue with Apple
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs font-body">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-body font-semibold rounded-lg px-4 py-3 transition-opacity disabled:opacity-50"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="text-muted-foreground text-center mt-6 text-sm font-body">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-foreground underline hover:text-primary transition-colors"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
