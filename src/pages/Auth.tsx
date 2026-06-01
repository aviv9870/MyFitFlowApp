import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage("בדוק את האימייל שלך לאישור ההרשמה");
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold neon-text mb-2">MyFitFlow</h1>
          <p className="text-muted-foreground text-sm">אפליקציית כושר חכמה</p>
        </div>

        <div className="glass-card neon-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">
            {isLogin ? "התחברות" : "הרשמה"}
          </h2>

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-secondary text-foreground py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-4 hover:bg-secondary/80 transition-colors"
          >
            <MaterialIcon icon="g_mobiledata" className="text-[20px]" />
            המשך עם Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">או</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />

            {error && <p className="text-destructive text-xs">{error}</p>}
            {message && <p className="text-primary text-xs">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm neon-glow-box disabled:opacity-50"
            >
              {loading ? "..." : isLogin ? "התחבר" : "הרשם"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {isLogin ? "אין לך חשבון?" : "יש לך חשבון?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold mr-1"
            >
              {isLogin ? "הרשם" : "התחבר"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
