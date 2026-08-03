import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/lib/theme";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsOnboarding: boolean | null; // null = not yet known
  markOnboarded: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  needsOnboarding: null,
  markOnboarded: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  // Development mode: bypass Supabase auth with mock user
  const DEV_MODE = false;
  const MOCK_USER = {
    id: "dev-user",
    email: "dev@example.com",
    user_metadata: { full_name: "Developer Test User" },
  } as unknown as User;
  const MOCK_SESSION = {
    user: MOCK_USER,
    expires_at: Math.floor(Date.now() / 1000),
  } as unknown as Session;

  useEffect(() => {
    if (DEV_MODE) {
      setUser(MOCK_USER);
      setSession(MOCK_SESSION);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNeedsOnboarding(null);
      return;
    }
    supabase.from("user_settings").select("theme_color, onboarded").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.theme_color) applyTheme(data.theme_color);
        setNeedsOnboarding(data ? !data.onboarded : false);
      });
  }, [user?.id]);

  const markOnboarded = () => setNeedsOnboarding(false);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, needsOnboarding, markOnboarded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};