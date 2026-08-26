/* Supabase project connection. The anon/public key below is safe to expose
   client-side by design (Supabase docs: "safe to use in a browser if you
   have RLS enabled") — real access control lives in the RLS policies set
   up in the SQL editor, not in keeping this key secret. */
const SUPABASE_URL = "https://vafkjsetlrpaczsmqvqs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZmtqc2V0bHJwYWN6c21xdnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTkwMjAsImV4cCI6MjEwMzMzNTAyMH0.DNYdVBg05E2zZVmA0-SChoXGQ6_gHyBta0nJC4exzxk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
