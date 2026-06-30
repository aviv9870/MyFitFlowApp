import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = "https://xebxenjmzdrqeexhtbnn.supabase.co";
const supabaseAnonKey = "sb_publishable_33fxC1tZ1nNyDSffnaVGaQ_7cRgHGFD";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
