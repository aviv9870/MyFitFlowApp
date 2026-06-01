/**
 * Very simple mock Supabase client.
 * Exported as `any` to bypass strict typings.
 * Provides only the methods used in the app.
 */
export const supabase: any = {
  // Auth mock – always signed in as dev user
  auth: {
    onAuthStateChange: (_event: any, callback: (event: any, session: any) => void) => {
      const mockSession = {
        user: {
          id: "dev-user",
          email: "dev@example.com",
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
          user_metadata: { full_name: "Developer Test User" },
        },
        access_token: "",
        refresh_token: "",
        expires_in: 0,
        token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000),
      };
      callback("SIGNED_IN", mockSession);
      return { subscription: { unsubscribe: () => {} } };
    },
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => Promise.resolve(),
  },

  // Generic query builder – returns static data based on table name
  from: (table: string) => {
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const dataMap: Record<string, any[]> = {
      workout_sessions: [
        { id: "s1", user_id: "dev-user", plan_name: "Chest Press", duration_seconds: 1800, completed_at: now.toISOString() },
        { id: "s2", user_id: "dev-user", plan_name: "Squats", duration_seconds: 2100, completed_at: sevenAgo.toISOString() },
      ],
    };

    return {
      select: (_fields: string) => ({
        order: (_field: string, _options: any) => ({
          eq: (_field: string, _value: any) => ({
            then: () => Promise.resolve({ data: dataMap[table] || [], error: null }),
          }),
        }),
      }),
    };
  },
};