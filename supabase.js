import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://aqqyknwgspxnzahrdkbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcXlrbndnc3B4bnphaHJka2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODgyMzksImV4cCI6MjA3ODg2NDIzOX0.NGDR5tKg1tvMHKWG3QD11TkKPzyU0DqPgpLhY5gnArI'
);
