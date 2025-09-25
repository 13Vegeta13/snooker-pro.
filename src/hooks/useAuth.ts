import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getCurrentUserData } from '@/services/auth';
import { User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  hasRole: (role: 'admin' | 'scorer' | 'viewer') => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userData = await getCurrentUserData(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const hasRole = (role: 'admin' | 'scorer' | 'viewer'): boolean => {
    return user?.roles[role] ?? false;
  };

  return {
    user,
    firebaseUser,
    loading,
    hasRole
  };
};