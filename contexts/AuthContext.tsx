
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { User, AuthState } from '@/types';
import { supabase } from '@/app/integrations/supabase/client';
import { supabaseApi } from '@/services/supabaseApi';

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🔐 ========== AUTH PROVIDER INIT ==========');
  console.log('🔐 Platform:', Platform.OS);
  
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    isAuthenticated: false,
  });
  
  // PHASE 2 — GLOBAL READINESS GATE
  // Start with loading true to prevent premature routing
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingSession = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    try {
      console.log('🔐 AuthProvider mounted, checking session...');
      
      // PHASE 2 — GLOBAL READINESS GATE
      // Check for existing session on mount
      checkSession();

      // PHASE 1 — AUTH FAILURE FORENSICS (MANDATORY)
      // Listen for auth state changes with explicit logging
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          console.log('🔐 ========== AUTH STATE CHANGE ==========');
          console.log('🔐 Event:', event);
          console.log('🔐 Platform:', Platform.OS);
          console.log('🔐 Session present:', session ? 'YES' : 'NO');
          
          if (session) {
            console.log('AUTH RESPONSE - Session:', JSON.stringify({
              access_token: session.access_token ? `present (${session.access_token.substring(0, 20)}...)` : 'missing',
              refresh_token: session.refresh_token ? 'present' : 'missing',
              expires_at: session.expires_at,
              user: session.user ? {
                id: session.user.id,
                email: session.user.email,
                email_confirmed_at: session.user.email_confirmed_at,
              } : 'missing',
            }, null, 2));
          }
          
          if (event === 'SIGNED_IN' && session) {
            try {
              console.log('🔐 User signed in, loading profile...');
              
              const user = await supabaseApi.getCurrentUser();
              if (user) {
                console.log('✅ User profile loaded successfully');
                console.log('AUTH RESPONSE - User:', JSON.stringify({
                  id: user.id,
                  username: user.username,
                  email: user.email,
                  campus_slug: user.campus_slug,
                  payoutsEnabled: user.payoutsEnabled,
                }, null, 2));
                
                setAuthState({
                  token: session.access_token,
                  user,
                  isAuthenticated: true,
                });
                retryCount.current = 0;
              } else {
                console.error('❌ No user profile found after sign in');
                console.log('AUTH ERROR: No user profile returned from getCurrentUser()');
              }
            } catch (error: any) {
              console.error('❌ Error loading user profile:', error);
              console.log('AUTH ERROR:', JSON.stringify({
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
              }, null, 2));
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🔐 User signed out');
            setAuthState({
              token: null,
              user: null,
              isAuthenticated: false,
            });
            retryCount.current = 0;
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔐 Token refreshed');
            setAuthState(prev => ({
              ...prev,
              token: session.access_token,
            }));
          } else if (event === 'USER_UPDATED' && session) {
            console.log('🔐 User updated');
            // Refresh user profile
            try {
              const user = await supabaseApi.getCurrentUser();
              if (user) {
                setAuthState(prev => ({
                  ...prev,
                  user,
                }));
              }
            } catch (error) {
              console.error('❌ Error refreshing user after update:', error);
            }
          }
          
          console.log('🔐 ========================================');
        } catch (error: any) {
          console.error('❌ Error in auth state change handler:', error);
          console.log('AUTH ERROR:', JSON.stringify({
            message: error?.message,
            stack: error?.stack,
          }, null, 2));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error: any) {
      console.error('❌ Error setting up auth listener:', error);
      console.log('AUTH ERROR:', JSON.stringify({
        message: error?.message,
        stack: error?.stack,
      }, null, 2));
      setIsLoading(false);
    }
  }, []);

  const checkSession = async () => {
    if (isCheckingSession.current) {
      console.log('⏳ Already checking session, skipping...');
      return;
    }

    isCheckingSession.current = true;

    try {
      console.log('🔍 ========== CHECKING SESSION ==========');
      console.log('🔍 Platform:', Platform.OS);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('AUTH RESPONSE - getSession:', JSON.stringify({
        session: session ? 'present' : 'null',
        error: error ? error.message : 'none',
      }, null, 2));
      
      if (error) {
        console.error('❌ Error checking session:', error);
        console.log('AUTH ERROR:', JSON.stringify({
          message: error.message,
          name: error.name,
          status: error.status,
        }, null, 2));
        setIsLoading(false);
        isCheckingSession.current = false;
        return;
      }

      if (session) {
        console.log('✅ Session found');
        console.log('AUTH RESPONSE - Session details:', JSON.stringify({
          access_token: session.access_token ? `present (${session.access_token.substring(0, 20)}...)` : 'missing',
          user_id: session.user?.id,
          user_email: session.user?.email,
          expires_at: session.expires_at,
        }, null, 2));
        
        try {
          const user = await supabaseApi.getCurrentUser();
          if (user) {
            console.log('✅ User profile loaded successfully');
            console.log('AUTH RESPONSE - User:', JSON.stringify({
              id: user.id,
              username: user.username,
              email: user.email,
              campus_slug: user.campus_slug,
            }, null, 2));
            
            setAuthState({
              token: session.access_token,
              user,
              isAuthenticated: true,
            });
            retryCount.current = 0;
          } else {
            console.error('❌ No user profile found after session check');
            console.log('AUTH ERROR: getCurrentUser() returned null');
            
            if (retryCount.current >= MAX_RETRIES) {
              console.error('❌ Max retries reached, signing out');
              await supabase.auth.signOut();
            } else {
              retryCount.current++;
              console.log(`⚠️ Retry ${retryCount.current}/${MAX_RETRIES}`);
            }
          }
        } catch (userError: any) {
          console.error('❌ Error loading user profile:', userError);
          console.log('AUTH ERROR:', JSON.stringify({
            message: userError?.message,
            code: userError?.code,
            details: userError?.details,
            hint: userError?.hint,
          }, null, 2));
          
          if (retryCount.current >= MAX_RETRIES) {
            console.error('❌ Max retries reached, signing out');
            await supabase.auth.signOut();
          } else {
            retryCount.current++;
            console.log(`⚠️ Retry ${retryCount.current}/${MAX_RETRIES}`);
          }
        }
      } else {
        console.log('ℹ️ No session found');
      }
      
      console.log('🔍 ========================================');
    } catch (error: any) {
      console.error('❌ Error checking session:', error);
      console.log('AUTH ERROR:', JSON.stringify({
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      }, null, 2));
    } finally {
      // PHASE 2 — GLOBAL READINESS GATE
      // Always set loading to false after checking session
      console.log('✅ Auth check complete, setting isLoading to false');
      setIsLoading(false);
      isCheckingSession.current = false;
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user profile...');
      const user = await supabaseApi.getCurrentUser();
      if (user) {
        console.log('✅ User profile refreshed');
        console.log('AUTH RESPONSE - Refreshed User:', JSON.stringify(user, null, 2));
        setAuthState(prev => ({
          ...prev,
          user,
        }));
        retryCount.current = 0;
      }
    } catch (error: any) {
      console.error('❌ Error refreshing user:', error);
      console.log('AUTH ERROR:', JSON.stringify({
        message: error?.message,
        code: error?.code,
      }, null, 2));
    }
  };

  const login = (token: string, user: User) => {
    try {
      console.log('✅ Login called');
      console.log('AUTH RESPONSE - Login:', JSON.stringify({
        token: token.substring(0, 20) + '...',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          campus_slug: user.campus_slug,
        },
      }, null, 2));
      
      setAuthState({
        token,
        user,
        isAuthenticated: true,
      });
      retryCount.current = 0;
    } catch (error: any) {
      console.error('❌ Error in login:', error);
      console.log('AUTH ERROR:', JSON.stringify({
        message: error?.message,
      }, null, 2));
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logout called');
      try {
        await supabase.auth.signOut();
        console.log('✅ Signed out from Supabase');
      } catch (error: any) {
        console.error('❌ Error signing out:', error);
        console.log('AUTH ERROR:', JSON.stringify({
          message: error?.message,
        }, null, 2));
      }
      setAuthState({
        token: null,
        user: null,
        isAuthenticated: false,
      });
      retryCount.current = 0;
    } catch (error: any) {
      console.error('❌ Error in logout:', error);
      console.log('AUTH ERROR:', JSON.stringify({
        message: error?.message,
      }, null, 2));
    }
  };

  const updateUser = (user: User) => {
    try {
      console.log('🔄 Update user called');
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error: any) {
      console.error('❌ Error in updateUser:', error);
      console.log('AUTH ERROR:', JSON.stringify({
        message: error?.message,
      }, null, 2));
    }
  };

  console.log('🔐 Auth state:', { isAuthenticated: authState.isAuthenticated, isLoading, hasUser: !!authState.user });

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, updateUser, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
