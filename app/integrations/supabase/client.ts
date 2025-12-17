
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

console.log('🔧 ========== SUPABASE CLIENT INIT ==========');
console.log('🔧 Platform:', Platform.OS);

// PHASE 2 — ENV PARITY CHECK (CRITICAL)
// Hardcoded values as fallback (from your project)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://uzsiydgppjhoezgnvolo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6c2l5ZGdwcGpob2V6Z252b2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc2NTgsImV4cCI6MjA4MTIxMzY1OH0.Uf8aNcpfGYksaz2t7t9ejvTLot_6EBNrZD4Q4E2sMnc";

console.log('🔧 ENV CHECK - process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ UNDEFINED');
console.log('🔧 ENV CHECK - process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ UNDEFINED');
console.log('🔧 FINAL - SUPABASE_URL:', SUPABASE_URL ? '✅ SET' : '❌ UNDEFINED');
console.log('🔧 FINAL - SUPABASE_KEY:', SUPABASE_PUBLISHABLE_KEY ? '✅ SET' : '❌ UNDEFINED');

if (SUPABASE_URL) {
  console.log('🔧 URL value:', SUPABASE_URL);
}
if (SUPABASE_PUBLISHABLE_KEY) {
  console.log('🔧 KEY value (first 30 chars):', SUPABASE_PUBLISHABLE_KEY.substring(0, 30) + '...');
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ CRITICAL: Supabase credentials missing!');
  console.error('❌ URL:', SUPABASE_URL);
  console.error('❌ KEY:', SUPABASE_PUBLISHABLE_KEY ? 'present' : 'missing');
  throw new Error('Supabase credentials are required but missing');
}

// Platform-specific storage configuration
let storageAdapter;
if (Platform.OS === 'web') {
  console.log('🌐 Using localStorage for web');
  storageAdapter = {
    getItem: async (key: string) => {
      try {
        const value = localStorage.getItem(key);
        console.log('🌐 localStorage.getItem:', key, value ? 'found' : 'not found');
        return value;
      } catch (error) {
        console.error('❌ localStorage.getItem error:', error);
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
        console.log('🌐 localStorage.setItem:', key, 'success');
      } catch (error) {
        console.error('❌ localStorage.setItem error:', error);
      }
    },
    removeItem: async (key: string) => {
      try {
        localStorage.removeItem(key);
        console.log('🌐 localStorage.removeItem:', key, 'success');
      } catch (error) {
        console.error('❌ localStorage.removeItem error:', error);
      }
    },
  };
} else {
  console.log('📱 Using AsyncStorage for native');
  storageAdapter = AsyncStorage;
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

console.log('✅ Supabase client initialized for platform:', Platform.OS);
console.log('🔧 ==========================================');
