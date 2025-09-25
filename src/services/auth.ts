import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { createPlayer } from '@/services/players';
import { User as AppUser } from '@/types';
import { stripUndefined } from '@/lib/firestore';

export const signUp = async (email: string, password: string, displayName: string): Promise<User> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  
  await updateProfile(user, { displayName });
  
  // Créer un joueur automatiquement pour cet utilisateur
  const playerId = await createPlayer({
    name: displayName,
    club: null,
    hand: null,
  }, user.uid);
  
  // Créer le document utilisateur dans Firestore avec le lien vers le joueur
  const userData: Omit<AppUser, 'uid'> = {
    displayName,
    email,
    roles: { admin: false, scorer: true, viewer: true },
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
    linkedPlayerId: playerId ?? null
  };
  
  await setDoc(doc(db, 'users', user.uid), stripUndefined(userData));
  
  return user;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const getCurrentUserData = async (uid: string): Promise<AppUser | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  
  return { uid, ...userDoc.data() } as AppUser;
};