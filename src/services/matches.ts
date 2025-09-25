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
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, functions } from '@/config/firebase';
import { Match, MatchEventData } from '@/types';
import { MatchEngine } from '@/modules/snooker/matchEngine';
import { reconstructMatchState } from '@/modules/snooker/matchEngine';
import { calculatePointsOnTable } from '@/modules/snooker/rules';
import { stripUndefined, cleanMatchData } from '@/lib/firestore';

const COLLECTION = 'matches';

export async function createMatch(opts: {
  p1: { id: string; name: string };
  p2: { id: string; name: string };
  format: { setsEnabled: boolean; bestOfSets: number; framesPerSet: number };
  venue?: string | null;
  referee?: string | null;
  createdBy: string;
}): Promise<string> {
  const now = serverTimestamp();

  const payload = stripUndefined({
    status: "scheduled" as const,
    format: {
      setsEnabled: !!opts.format.setsEnabled,
      bestOfSets: Number(opts.format.bestOfSets || 1),
      framesPerSet: Number(opts.format.framesPerSet || 1),
    },
    players: [
      { playerId: opts.p1.id, name: opts.p1.name, seed: null },
      { playerId: opts.p2.id, name: opts.p2.name, seed: null },
    ],
    current: {
      activePlayerId: opts.p1.id,
      setNumber: 1,
      frameNumber: 1,
      breakPoints: 0,
      redsRemaining: 15,
      colorsPhase: false,
      colorsOrderIndex: null,
      pointsOnTable: calculatePointsOnTable(15, false, 0, undefined),
      freeballActive: false,
      snookersRequired: false,
    },
    score: {
      frames: [
        {
          setNo: 1,
          frameNo: 1,
          p1Points: 0,
          p2Points: 0,
          winnerPlayerId: null,
          highestBreak: null,
          decidedOnBlack: false,
        }
      ],
      sets: [],
      match: {
        p1Sets: 0,
        p2Sets: 0,
        winnerPlayerId: null,
      },
    },
    history: [],
    venue: opts.venue ?? null,
    referee: opts.referee ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: opts.createdBy,
    updatedBy: opts.createdBy,
  });

  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

export async function startMatch(matchId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, matchId), stripUndefined({
    status: "live",
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  }));
}

export const getMatch = async (matchId: string): Promise<Match | null> => {
  const matchDoc = await getDoc(doc(db, COLLECTION, matchId));
  if (!matchDoc.exists()) return null;
  
  return { id: matchDoc.id, ...matchDoc.data() } as Match;
};

export const updateMatch = async (
  matchId: string,
  updates: Partial<Match>
): Promise<void> => {
  const cleanedUpdates = stripUndefined({
    ...cleanMatchData(updates),
    updatedAt: serverTimestamp()
  });
  
  await updateDoc(doc(db, COLLECTION, matchId), cleanedUpdates);
};

export const deleteMatch = async (matchId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, matchId));
};

export const getLiveMatches = async (): Promise<Match[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'live'),
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
};

export const getRecentMatches = async (limit: number = 10): Promise<Match[]> => {
  const q = query(
    collection(db, COLLECTION),
    orderBy('updatedAt', 'desc'),
    firestoreLimit(limit)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
};

export const getMatchesByPlayer = async (playerId: string): Promise<Match[]> => {
  // Note: Requires composite index
  const q = query(
    collection(db, COLLECTION),
    where('players', 'array-contains-any', [
      { playerId },
    ]),
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
};

export const getMatchesBetweenDates = async (
  from: Date, 
  to: Date
): Promise<Match[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(from)),
    where('createdAt', '<=', Timestamp.fromDate(to)),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
};

// Cloud Function pour appliquer un événement de match
export const applyMatchEvent = async (
  matchId: string,
  eventData: MatchEventData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Pour l'instant, on utilise le moteur local au lieu des Cloud Functions
    // car les fonctions ne sont pas encore déployées
    const match = await getMatch(matchId);
    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    const engine = new MatchEngine(match);
    const result = engine.applyEvent(eventData);

    if (!result.valid) {
      return { success: false, error: result.error };
    }

    // Sauvegarder le match mis à jour
    await updateMatch(matchId, result.match);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const undoLastMatchEvent = async (
  matchId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Récupérer le match actuel
    const match = await getMatch(matchId);
    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    // Vérifier s'il y a des événements à annuler
    if (!match.history || match.history.length === 0) {
      return { success: false, error: 'No events to undo' };
    }

    // Créer un nouvel historique sans le dernier événement
    const newHistory = match.history.slice(0, -1);

    // Reconstruire l'état du match avec le nouvel historique
    const reconstructedMatch = reconstructMatchState(match, newHistory);

    // Mettre à jour le match dans Firestore
    await updateMatch(matchId, {
      current: reconstructedMatch.current,
      score: reconstructedMatch.score,
      history: reconstructedMatch.history,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};