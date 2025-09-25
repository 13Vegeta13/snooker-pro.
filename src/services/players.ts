import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Player, PlayerStats } from '@/types';
import { stripUndefined } from '@/lib/firestore';

const COLLECTION = 'players';

export const createPlayer = async (
  playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'stats'>,
  createdBy: string
): Promise<string> => {
  const initialStats: PlayerStats = {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    framesWon: 0,
    framesLost: 0,
    highestBreak: 0,
    breaks50plus: 0,
    breaks100plus: 0,
    avgPointsPerFrame: 0.0,
    elo: 1200 // ELO initial
  };

  const cleanedData = stripUndefined({
    ...playerData,
    club: playerData.club ?? null,
    hand: playerData.hand ?? null,
    avatarUrl: playerData.avatarUrl ?? null,
    stats: initialStats,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
    updatedBy: createdBy
  });

  const docRef = await addDoc(collection(db, COLLECTION), cleanedData);

  return docRef.id;
};

export const updatePlayer = async (
  playerId: string,
  updates: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'stats'>>,
  updatedBy: string
): Promise<void> => {
  const cleanedUpdates = stripUndefined({
    ...updates,
    club: updates.club ?? null,
    hand: updates.hand ?? null,
    avatarUrl: updates.avatarUrl ?? null,
    updatedAt: serverTimestamp(),
    updatedBy
  });

  await updateDoc(doc(db, COLLECTION, playerId), cleanedUpdates);
};

export const deletePlayer = async (playerId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, playerId));
};

export const getPlayer = async (playerId: string): Promise<Player | null> => {
  const playerDoc = await getDoc(doc(db, COLLECTION, playerId));
  if (!playerDoc.exists()) return null;
  
  return { id: playerDoc.id, ...playerDoc.data() } as Player;
};

export const getAllPlayers = async (): Promise<Player[]> => {
  const q = query(collection(db, COLLECTION), orderBy('name'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
};

export const searchPlayers = async (searchTerm: string): Promise<Player[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('name', '>=', searchTerm),
    where('name', '<=', searchTerm + '\uf8ff'),
    orderBy('name')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
};

export const getTopPlayersByElo = async (limit: number = 10): Promise<Player[]> => {
  const q = query(
    collection(db, COLLECTION),
    orderBy('stats.elo', 'desc'),
    orderBy('name')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
};

export const getTopPlayersByHighestBreak = async (limit: number = 10): Promise<Player[]> => {
  const q = query(
    collection(db, COLLECTION),
    orderBy('stats.highestBreak', 'desc'),
    orderBy('name')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
};

// ✅ bien en dehors de la fonction ci-dessus
export const getLinkedPlayerForUser = async (linkedPlayerId?: string) => {
  if (!linkedPlayerId) return null;
  return await getPlayer(linkedPlayerId);
};
