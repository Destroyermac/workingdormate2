
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAllowedCampusEmail, getCampusFromEmail } from '@/constants/campus';

export type AuthGuardStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'invalid_campus';

export function useAuthGuard() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [status, setStatus] = useState<AuthGuardStatus>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔐 Auth Guard - Checking status...');
      console.log('🔐 isLoading:', isLoading);
      console.log('🔐 isAuthenticated:', isAuthenticated);
      console.log('🔐 user:', user ? `${user.email}` : 'null');

      if (isLoading) {
        setStatus('loading');
        return;
      }

      if (!isAuthenticated || !user) {
        console.log('❌ Not authenticated');
        setStatus('unauthenticated');
        return;
      }

      // Check if user email is from allowed campus (async)
      const isAllowed = await isAllowedCampusEmail(user.email);
      if (!isAllowed) {
        console.log('❌ Invalid campus - user email not from supported college');
        setStatus('invalid_campus');
        return;
      }

      const campus = await getCampusFromEmail(user.email);
      console.log('✅ Auth guard passed -', campus?.name, 'user authenticated');
      setStatus('authenticated');
    };

    checkAuth();
  }, [isLoading, isAuthenticated, user]);

  return {
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isInvalidCampus: status === 'invalid_campus',
    user,
  };
}
