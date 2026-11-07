import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const supabase = createClient(
  'https://aqqyknwgspxnzahrdkbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcXlrbndnc3B4bnphaHJka2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODgyMzksImV4cCI6MjA3ODg2NDIzOX0.NGDR5tKg1tvMHKWG3QD11TkKPzyU0DqPgpLhY5gnArI',
  {
    auth: {
      // On iOS and Android the session is kept in AsyncStorage so it survives a
      // cold start. On web the client already stores it in localStorage, so no
      // adapter is passed there. That also keeps the static web export working,
      // because AsyncStorage's web build reads window during prerender.
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    },
  }
);
