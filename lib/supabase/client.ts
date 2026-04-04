"use client";

import { createBrowserClient } from "@supabase/ssr";

// Singleton instance for client-side usage
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(url, anonKey);
  }
  return supabaseInstance;
}

// Lazy getter for backward compatibility - only creates client when accessed at runtime
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop) {
    return Reflect.get(getSupabaseClient(), prop);
  }
});
