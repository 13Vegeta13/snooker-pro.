import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { MatchEvent, MatchEventData, Match, Player, PlayerStats } from './types';
import { MatchEngine } from './matchEngine';

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configuration pour la région Europe
const functionsConfig = {
  region: 'europe-west1',
  memory: '256MiB' as const,
  timeoutSeconds: 60
};

/**
 * Fonction utilitaire pour s'assurer qu'un match a un vainqueur défini
 */
function ensureMatchWinner(match: Match): Match {
  // Si le vainqueur est déjà défini, retourner le match tel quel
  if (match.score.match.winnerPlayerId) {
    return match;
  }

  // Calculer le vainqueur selon le format
  if (match.format.setsEnabled) {
    // Format par sets
    const p1Sets = match.score.sets.filter(s => s.winnerPlayerId === match.players[0].playerId).length;
    const p2Sets = match.score.sets.filter(s => s.winnerPlayerId === match.players[1].playerId).length;
    
    if (p1Sets > p2Sets) {
      match.score.match.winnerPlayerId = match.players[0].playerId;
      match.score.match.p1Sets = p1Sets;
      match.score.match.p2Sets = p2Sets;
    } else if (p2Sets > p1Sets) {
      match.score.match.winnerPlayerId = match.players[1].playerId;
      match.score.match.p1Sets = p1Sets;
      match.score.match.p2Sets = p2Sets;
    }
    // En cas d'égalité, pas de vainqueur défini
  } else {
    // Format frames uniquement
    const p1Frames = match.score.frames.filter(f => f.winnerPlayerId === match.players[0].playerId).length;
    const p2Frames = match.score.frames.filter(f => f.winnerPlayerId === match.players[1].playerId).length;
    
    if (p1Frames > p2Frames) {
      match.score.match.winnerPlayerId = match.players[0].playerId;
    } else if (p2Frames > p1Frames) {
      match.score.match.winnerPlayerId = match.players[1].playerId;
    }
    // En cas d'égalité, pas de vainqueur défini
  }

  return match;
}

/**
 * Cloud Function HTTPS pour appliquer un événement à un match
 */
export const applyMatchEvent = onCall(
  functionsConfig,
  async (request) => {
    // Vérifier l'authentification
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { matchId, eventData }: { matchId: string; eventData: MatchEventData } = request.data;

    if (!matchId || !eventData) {
      throw new Error('matchId and eventData are required');
    }

    try {
      // Récupérer le match
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        throw new Error('Match not found');
      }

      const match = { id: matchDoc.id, ...matchDoc.data() } as Match;

      // Vérifier les permissions (admin ou scorer)
      const userRef = db.collection('users').doc(request.auth.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const user = userDoc.data();
      if (!user?.roles?.admin && !user?.roles?.scorer) {
        throw new Error('User must have admin or scorer role');
      }

      // Appliquer l'événement avec le moteur de match
      const engine = new MatchEngine(match);
      const result = engine.applyEvent(eventData);

      if (!result.valid) {
        return { success: false, error: result.error };
      }

      // Sauvegarder le match mis à jour
      await matchRef.update({
        ...result.match,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid
      });

      return { success: true };

    } catch (error) {
      console.error('Error applying match event:', error);
      
      throw new Error('Failed to apply match event: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
);

/**
 * Trigger pour mettre à jour les statistiques quand un match change
 */
export const updateAggregatesOnMatchWrite = onDocumentWritten(
  'matches/{matchId}',
  async (event) => {
    const beforeData = event.data?.before?.data() as Match | undefined;
    const afterData = event.data?.after?.data() as Match | undefined;

    // Ignore les créations de nouveaux matchs non terminés
    if (!beforeData && (!afterData || afterData.status !== 'completed')) {
      return;
    }

    // Ignore les mises à jour qui ne changent pas le statut vers terminé
    if (beforeData?.status === 'completed' && afterData?.status === 'completed') {
      return;
    }

    // Le match vient d'être terminé
    if (afterData?.status === 'completed' && beforeData?.status !== 'completed') {
      // S'assurer que le match a un vainqueur défini
      const matchWithWinner = ensureMatchWinner(afterData);
      
      // Si le vainqueur a été ajouté, mettre à jour le document
      if (matchWithWinner.score.match.winnerPlayerId !== afterData.score.match.winnerPlayerId) {
        await admin.firestore().collection('matches').doc(event.params.matchId).update({
          'score.match': matchWithWinner.score.match
        });
      }
      
      await updatePlayerStats(matchWithWinner);
      await updateLeaderboards(matchWithWinner);
    }
  }
);

/**
 * Mettre à jour les statistiques des joueurs
 */
async function updatePlayerStats(match: Match): Promise<void> {
  // S'assurer que le match a un vainqueur défini
  const matchWithWinner = ensureMatchWinner(match);
  
  const batch = db.batch();

  for (const player of matchWithWinner.players) {
    const playerRef = db.collection('players').doc(player.playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) continue;

    const playerData = playerDoc.data() as Player;
    const currentStats = playerData.stats;

    // Calculer les nouvelles statistiques
    const isWinner = matchWithWinner.score.match.winnerPlayerId === player.playerId;
    const playerFrames = matchWithWinner.score.frames.filter(f => f.winnerPlayerId === player.playerId).length;
    const opponentFrames = matchWithWinner.score.frames.length - playerFrames;

    // Points totaux de ce joueur dans le match
    const totalPoints = matchWithWinner.score.frames.reduce((sum, frame) => {
      const isPlayer1 = matchWithWinner.players[0].playerId === player.playerId;
      return sum + (isPlayer1 ? frame.p1Points : frame.p2Points);
    }, 0);

    // Meilleur break de ce joueur dans ce match
    const playerBreaks = matchWithWinner.history
      .filter(h => h.playerId === player.playerId && h.action === 'pot')
      .map(h => h.stateSnapshot?.breakPoints || 0);
    const highestBreakThisMatch = Math.max(...playerBreaks, 0);

    // Compter les breaks 50+ et 100+
    const breaks50plusThisMatch = playerBreaks.filter(b => b >= 50).length;
    const breaks100plusThisMatch = playerBreaks.filter(b => b >= 100).length;

    const newStats: PlayerStats = {
      matchesPlayed: currentStats.matchesPlayed + 1,
      wins: currentStats.wins + (isWinner ? 1 : 0),
      losses: currentStats.losses + (isWinner ? 0 : 1),
      framesWon: currentStats.framesWon + playerFrames,
      framesLost: currentStats.framesLost + opponentFrames,
      highestBreak: Math.max(currentStats.highestBreak, highestBreakThisMatch),
      breaks50plus: currentStats.breaks50plus + breaks50plusThisMatch,
      breaks100plus: currentStats.breaks100plus + breaks100plusThisMatch,
      avgPointsPerFrame: (currentStats.framesWon + playerFrames) > 0 ? ((currentStats.avgPointsPerFrame * currentStats.framesWon) + totalPoints) / (currentStats.framesWon + playerFrames) : 0,
      elo: currentStats.elo // L'ELO sera calculé séparément
    };

    batch.update(playerRef, {
      stats: newStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // Calculer et mettre à jour l'ELO
  await updateEloRatings(matchWithWinner);
  
  await batch.commit();
}

/**
 * Mettre à jour les classements ELO
 */
async function updateEloRatings(match: Match): Promise<void> {
  // S'assurer que le match a un vainqueur défini
  const matchWithWinner = ensureMatchWinner(match);
  
  if (matchWithWinner.players.length !== 2 || !matchWithWinner.score.match.winnerPlayerId) return;

  const K = 24; // Facteur K pour l'ELO
  
  const player1Ref = db.collection('players').doc(matchWithWinner.players[0].playerId);
  const player2Ref = db.collection('players').doc(matchWithWinner.players[1].playerId);
  
  const [player1Doc, player2Doc] = await Promise.all([
    player1Ref.get(),
    player2Ref.get()
  ]);

  if (!player1Doc.exists || !player2Doc.exists) return;

  const player1Data = player1Doc.data() as Player;
  const player2Data = player2Doc.data() as Player;

  const player1Elo = player1Data.stats.elo;
  const player2Elo = player2Data.stats.elo;

  // Calculer les probabilités de victoire
  const expectedScore1 = 1 / (1 + Math.pow(10, (player2Elo - player1Elo) / 400));
  const expectedScore2 = 1 - expectedScore1;

  // Résultat réel (1 pour victoire, 0 pour défaite)
  const actualScore1 = matchWithWinner.score.match.winnerPlayerId === matchWithWinner.players[0].playerId ? 1 : 0;
  const actualScore2 = 1 - actualScore1;

  // Nouveaux ELOs
  const newElo1 = player1Elo + K * (actualScore1 - expectedScore1);
  const newElo2 = player2Elo + K * (actualScore2 - expectedScore2);

  // Mettre à jour les ELOs
  const batch = db.batch();
  
  batch.update(player1Ref, {
    'stats.elo': Math.round(newElo1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  batch.update(player2Ref, {
    'stats.elo': Math.round(newElo2),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
}

/**
 * Mettre à jour les classements saisonniers et mensuels
 */
async function updateLeaderboards(match: Match): Promise<void> {
  const matchDate = match.createdAt.toDate();
  const seasonId = `season-${matchDate.getFullYear()}`;
  const monthKey = `${matchDate.getFullYear()}-${(matchDate.getMonth() + 1).toString().padStart(2, '0')}`;

  // Récupérer ou créer le document de classement
  const leaderboardRef = db.collection('leaderboards').doc(seasonId);
  const leaderboardDoc = await leaderboardRef.get();

  let leaderboardData;
  if (!leaderboardDoc.exists) {
    leaderboardData = {
      seasonName: `Saison ${matchDate.getFullYear()}-${matchDate.getFullYear() + 1}`,
      period: {
        from: admin.firestore.Timestamp.fromDate(new Date(matchDate.getFullYear(), 8, 1)), // 1er septembre
        to: admin.firestore.Timestamp.fromDate(new Date(matchDate.getFullYear() + 1, 7, 31)) // 31 août
      },
      aggregates: { byPlayer: {} },
      monthly: {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
  } else {
    leaderboardData = leaderboardDoc.data();
  }

  // Mettre à jour les agrégats pour chaque joueur
  for (const player of match.players) {
    const playerRef = db.collection('players').doc(player.playerId);
    const playerDoc = await playerRef.get();
    
    if (!playerDoc.exists) continue;
    
    const playerData = playerDoc.data() as Player;

    // Agrégats de saison
    leaderboardData.aggregates.byPlayer[player.playerId] = {
      playerId: player.playerId,
      name: playerData.name,
      ...playerData.stats
    };

    // Agrégats mensuels
    if (!leaderboardData.monthly[monthKey]) {
      leaderboardData.monthly[monthKey] = { byPlayer: {} };
    }
    
    leaderboardData.monthly[monthKey].byPlayer[player.playerId] = {
      playerId: player.playerId,
      name: playerData.name,
      ...playerData.stats
    };
  }

  leaderboardData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  
  await leaderboardRef.set(leaderboardData, { merge: true });
}

/**
 * Cloud Function pour recalculer les statistiques d'un joueur (admin uniquement)
 */
export const recomputePlayerStats = onCall(
  functionsConfig,
  async (request) => {
    // Vérifier l'authentification et les permissions admin
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const userRef = db.collection('users').doc(request.auth.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data()?.roles?.admin) {
      throw new Error('User must have admin role');
    }

    const { playerId }: { playerId: string } = request.data;

    if (!playerId) {
      throw new Error('playerId is required');
    }

    try {
      // Récupérer tous les matchs terminés du joueur
      const matchesQuery = db.collection('matches')
        .where('status', '==', 'completed')
        .where('players', 'array-contains-any', [{ playerId }]);
      
      const matchesSnapshot = await matchesQuery.get();
      
      // Calculer les statistiques depuis zéro
      const stats: PlayerStats = {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        framesWon: 0,
        framesLost: 0,
        highestBreak: 0,
        breaks50plus: 0,
        breaks100plus: 0,
        avgPointsPerFrame: 0,
        elo: 1200 // Reset ELO
      };

      let totalPoints = 0;
      let totalFrames = 0;

      matchesSnapshot.forEach(doc => {
        const match = doc.data() as Match;
        const isWinner = match.score.match.winnerPlayerId === playerId;
        const playerFrames = match.score.frames.filter(f => f.winnerPlayerId === playerId).length;
        const opponentFrames = match.score.frames.length - playerFrames;

        stats.matchesPlayed++;
        if (isWinner) stats.wins++;
        else stats.losses++;
        
        stats.framesWon += playerFrames;
        stats.framesLost += opponentFrames;
        totalFrames += playerFrames;

        // Calculer points et breaks pour ce match
        const framePoints = match.score.frames.reduce((sum, frame) => {
          const isPlayer1 = match.players[0].playerId === playerId;
          return sum + (isPlayer1 ? frame.p1Points : frame.p2Points);
        }, 0);
        totalPoints += framePoints;

        const playerBreaks = match.history
          .filter(h => h.playerId === playerId && h.action === 'pot')
          .map(h => h.stateSnapshot?.breakPoints || 0);
        
        stats.highestBreak = Math.max(stats.highestBreak, ...playerBreaks, 0);
        stats.breaks50plus += playerBreaks.filter(b => b >= 50).length;
        stats.breaks100plus += playerBreaks.filter(b => b >= 100).length;
      });

      stats.avgPointsPerFrame = totalFrames > 0 ? 
        Number((totalPoints / totalFrames).toFixed(1)) : 
        0.0;

      // Mettre à jour le joueur
      const playerRef = db.collection('players').doc(playerId);
      await playerRef.update({
        stats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, stats };

    } catch (error) {
      console.error('Error recomputing player stats:', error);
      throw new Error('Failed to recompute player stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
);