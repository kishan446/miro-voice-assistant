import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse hash fragment from URL (Supabase puts tokens in the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const errorDesc = hashParams.get("error_description");

        // Also check query params (some flows use these)
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get("code");
        const queryError = queryParams.get("error");
        const queryErrorDesc = queryParams.get("error_description");

        // Handle explicit errors
        if (errorDesc || queryError) {
          const errMsg = errorDesc || queryErrorDesc || "Verification failed";
          setStatus("error");
          setMessage(errMsg);
          toast.error(errMsg);
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
          return;
        }

        // Handle OAuth / PKCE code flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus("error");
            setMessage(error.message);
            toast.error(error.message);
            setTimeout(() => navigate("/auth", { replace: true }), 3000);
          } else {
            setStatus("success");
            setMessage("Email verified! Signing you in...");
            toast.success("Email verified successfully!");
            setTimeout(() => navigate("/", { replace: true }), 1500);
          }
          return;
        }

        // Handle implicit / token flow (access_token in hash)
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setStatus("error");
            setMessage(error.message);
            toast.error(error.message);
            setTimeout(() => navigate("/auth", { replace: true }), 3000);
          } else {
            const isSignup = type === "signup";
            setStatus("success");
            setMessage(isSignup ? "Email verified! Welcome to MIRO!" : "Authenticated successfully!");
            toast.success(isSignup ? "Email verified! Welcome to MIRO!" : "Signed in successfully!");
            setTimeout(() => navigate("/", { replace: true }), 1500);
          }
          return;
        }

        // No recognizable tokens — check if there's already a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/", { replace: true });
        } else {
          setStatus("error");
          setMessage("Invalid verification link. Please try signing up again.");
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Something went wrong.");
        setTimeout(() => navigate("/auth", { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

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
        className="z-10 flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-5xl font-bold tracking-wider text-foreground text-glow">
          MIRO
        </h1>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-body">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-foreground font-body font-medium">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-muted-foreground font-body text-center max-w-xs">{message}</p>
            <p className="text-muted-foreground text-sm font-body">Redirecting to sign in...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallback;
