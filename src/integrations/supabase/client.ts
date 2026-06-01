import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xebxenjmzdrqeexhtbnn.supabase.co";
const supabaseAnonKey = "sb_publishable_33fxC1tZ1nNyDSffnaVGaQ_7cRgHGFD";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock data to ensure the application doesn't crash if database tables are empty or missing
export const mockData = {
  workout_plans: [
    { id: "p1", name: "Full Body Elite", description: "Hypertrophy focused routine", created_at: new Date().toISOString() }
  ],
  workout_sessions: [
    { id: "s1", user_id: "dev-user", plan_name: "Chest Press", duration_seconds: 1800, completed_at: new Date().toISOString() },
    { id: "s2", user_id: "dev-user", plan_name: "Squats", duration_seconds: 2100, completed_at: new Date().toISOString() }
  ],
  profiles: [
    { id: "dev-user", username: "Trainer", full_name: "Fitness Instructor", avatar_url: "" }
  ]
};

console.log("Supabase client initialized with safe production fallback config.");