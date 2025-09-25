import {
  Match,
  MatchState,
  MatchEvent,
  MatchEventData,
  Ball,
  FrameScore,
  SetScore,
} from '@/types';
import {
  getBallValue,
  getFoulValue,
  isColorBall,
  INITIAL_REDS,
  COLORS_ORDER,
  calculatePointsOnTable,
  isSnookerRequired,
  shouldRespotBlack,
  isValidBallSequence,
} from './rules';
import { Timestamp } from 'firebase/firestore';
import { cleanMatchData } from '@/lib/firestore';

export const createNewMatch = (
  player1Id: string,
  player1Name: string,
  player2Id: string,
  player2Name: string,
  format: { setsEnabled: boolean; bestOfSets: number; framesPerSet: number },
  createdBy: string,
  venue?: string,
  referee?: string
): Omit<Match, 'id'> => {
  const initialState: MatchState = {
    activePlayerId: player1Id,
    setNumber: 1,
    frameNumber: 1,
    breakPoints: 0,
    redsRemaining: INITIAL_REDS,
    colorsPhase: false,
    colorsOrderIndex: 0,
    pointsOnTable: calculatePointsOnTable(INITIAL_REDS, false, 0, undefined),
    freeballActive: false,
    snookersRequired: false,
    lastBallPottedInBreak: undefined,
  };

  const initialFrame: FrameScore = {
    setNo: 1,
    frameNo: 1,
    p1Points: 0,
    p2Points: 0,
  };

  return {
    status: 'scheduled',
    format,
    players: [
      { playerId: player1Id, name: player1Name },
      { playerId: player2Id, name: player2Name },
    ],
    current: initialState,
    score: {
      frames: [initialFrame],
      sets: [],
      match: { p1Sets: 0, p2Sets: 0 },
    },
    history: [],
    venue: venue ?? null,
    referee: referee ?? null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy,
    updatedBy: createdBy,
  };
};

export const reconstructMatchState = (originalMatch: Match, eventsToReplay: MatchEvent[]): Match => {
  // Extraire les propriétés statiques du match original
  const { format, players, venue, referee, createdBy, createdAt, id } = originalMatch;
  
  // Créer un nouveau match avec l'état initial
  const initialMatchData = createNewMatch(
    players[0].playerId,
    players[0].name,
    players[1].playerId,
    players[1].name,
    format,
    createdBy,
    venue || undefined,
    referee || undefined
  );
  
  // Créer l'objet match complet avec l'ID original
  const reconstructedMatch: Match = {
    id,
    ...initialMatchData,
    createdAt,
    updatedAt: originalMatch.updatedAt,
    updatedBy: originalMatch.updatedBy
  };
  
  // Si aucun événement à rejouer, retourner l'état initial
  if (eventsToReplay.length === 0) {
    return reconstructedMatch;
  }
  
  // Créer une instance du moteur de match et rejouer tous les événements
  const engine = new MatchEngine(reconstructedMatch);
  
  for (const event of eventsToReplay) {
    const eventData: MatchEventData = {
      action: event.action,
      ball: event.ball,
      note: event.note
    };
    
    const result = engine.applyEvent(eventData);
    if (!result.valid) {
      console.error(`Erreur lors de la reconstruction: ${result.error}`);
      // En cas d'erreur, on continue avec les autres événements
      continue;
    }
    
    // Mettre à jour le match avec le résultat
    Object.assign(reconstructedMatch, result.match);
  }
  
  return reconstructedMatch;
};

export class MatchEngine {
  constructor(private match: Match) {}

  applyEvent(eventData: MatchEventData): { match: Match; valid: boolean; error?: string } {
    const newMatch = { ...this.match };
    const currentState = { ...newMatch.current };
    const currentFrame = this.getCurrentFrame(newMatch);

    try {
      switch (eventData.action) {
        case 'pot':
          if (!eventData.ball) throw new Error('Ball required for pot');
          this.processPot(newMatch, currentState, eventData.ball);
          break;

        case 'foul':
          this.processFoul(newMatch, currentState, eventData.ball, eventData.note);
          break;

        case 'freeBallPot':
          if (!eventData.ball) throw new Error('Ball required for free ball pot');
          this.processFreeBallPot(newMatch, currentState, eventData.ball);
          break;

        case 'endTurn':
          this.processEndTurn(newMatch, currentState);
          break;

        case 'miss':
          this.processMiss(newMatch, currentState);
          break;

        case 'concede':
          this.processConcede(newMatch, currentState);
          break;

        case 'endFrame':
          this.processEndFrame(newMatch, currentState);
          break;

        case 'endMatch':
          this.processEndMatch(newMatch);
          break;

        case 'reRack':
          this.processReRack(newMatch, currentState);
          break;

        default:
          throw new Error(`Unknown action: ${eventData.action}`);
      }

      const event: MatchEvent = {
        id: crypto.randomUUID(),
        timestamp: Timestamp.now(),
        playerId: currentState.activePlayerId,
        action: eventData.action,
        ball: eventData.ball,
        pointsDelta: this.calculatePointsDelta(eventData, newMatch.current),
        note: eventData.note,
        stateSnapshot: { ...currentState },
      };

      newMatch.history.push(event);
      newMatch.current = currentState;
      newMatch.updatedAt = Timestamp.now();

      return { match: cleanMatchData(newMatch), valid: true };
    } catch (error) {
      return {
        match: this.match,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Méthode statique pour la reconstruction
  static reconstructMatchState = reconstructMatchState;

  private processPot(match: Match, state: MatchState, ball: Ball): void {
    // Sécurité: séquence valide
    if (
      !isValidBallSequence(
        ball,
        state.redsRemaining,
        state.colorsPhase,
        state.colorsOrderIndex,
        state.freeballActive,
        state.lastBallPottedInBreak
      )
    ) {
      throw new Error(`Invalid ball sequence: ${ball}`);
    }

    // capturer l'état AVANT le coup (pour corriger finement pointsOnTable)
    const prevPoints = state.pointsOnTable;
    const wasColorsPhase = state.colorsPhase;
    const prevLast = state.lastBallPottedInBreak;

    // scorer
    const points = getBallValue(ball);
    this.addPointsToActivePlayer(match, points);
    state.breakPoints += points;

    // maj d'état selon la bille pottée
    if (ball === 'R') {
      // on devient "sur une couleur"
      state.lastBallPottedInBreak = 'R';
      state.redsRemaining--;
      state.freeballActive = false;

      if (state.redsRemaining === 0) {
        // passage en phase couleurs
        state.colorsPhase = true;
        state.colorsOrderIndex = 0;
        state.lastBallPottedInBreak = undefined;
      }
    } else if (state.colorsPhase) {
      // couleur en phase couleurs : avancer dans l'ordre
      state.lastBallPottedInBreak = undefined;
      state.colorsOrderIndex = (state.colorsOrderIndex || 0) + 1;
      state.freeballActive = false;
    } else {
      // couleur en phase rouge (elle est respottée)
      // on n'est plus "sur" une couleur (prochain coup = rouge)
      state.lastBallPottedInBreak = undefined;
      state.freeballActive = false;
    }

    // calcul standard
    const computed = calculatePointsOnTable(
      state.redsRemaining,
      state.colorsPhase,
      state.colorsOrderIndex,
      state.lastBallPottedInBreak
    );

    // ✅ correction fine des deltas pendant la phase rouge
    if (!wasColorsPhase) {
      if (ball === 'R') {
        // après une ROUGE, on retire 1 (147 -> 146)
        state.pointsOnTable = Math.max(0, prevPoints - 1);
      } else if (isColorBall(ball) && prevLast === 'R') {
        // couleur immédiatement après une rouge : on retire la valeur de la couleur
        // ex: 146 -> 144 pour une jaune (2)
        state.pointsOnTable = Math.max(0, prevPoints - getBallValue(ball));
      } else {
        // autre cas en phase rouge (rare), fallback
        state.pointsOnTable = computed;
      }
    } else {
      // en phase couleurs, le calcul standard suffit
      state.pointsOnTable = computed;
    }

    // fin de frame ?
    if (this.isFrameOver(state)) {
      this.endFrame(match, state);
    }
  }

  private processFoul(match: Match, state: MatchState, ball?: Ball, note?: string): void {
    const foulPoints = getFoulValue(ball);

    // points à l'adversaire
    const opponentId = this.getOpponentId(match, state.activePlayerId);
    this.addPointsToPlayer(match, opponentId, foulPoints);

    // fin de break
    state.breakPoints = 0;
    state.lastBallPottedInBreak = undefined;

    // tour à l'adversaire
    state.activePlayerId = opponentId;

    // éventuelle free ball (selon note/logic métier)
    if (note?.includes('snooker')) {
      state.freeballActive = true;
    }
  }

  private processFreeBallPot(match: Match, state: MatchState, ball: Ball): void {
    if (!state.freeballActive) {
      throw new Error('Free ball not active');
    }

    // free ball = 1 point, puis on revient à la bille "on"
    this.addPointsToActivePlayer(match, 1);
    state.breakPoints += 1;
    state.freeballActive = false;

    // on réinitialise l'info de "dernière bille" (reprise séquence normale)
    state.lastBallPottedInBreak = undefined;

    state.pointsOnTable = calculatePointsOnTable(
      state.redsRemaining,
      state.colorsPhase,
      state.colorsOrderIndex,
      state.lastBallPottedInBreak
    );
  }

  private processEndTurn(match: Match, state: MatchState): void {
    state.breakPoints = 0;
    state.lastBallPottedInBreak = undefined;
    state.activePlayerId = this.getOpponentId(match, state.activePlayerId);
  }

  private processMiss(match: Match, state: MatchState): void {
    state.breakPoints = 0;
    state.lastBallPottedInBreak = undefined;
    state.activePlayerId = this.getOpponentId(match, state.activePlayerId);
  }

  private processConcede(match: Match, state: MatchState): void {
    const opponentId = this.getOpponentId(match, state.activePlayerId);
    this.endFrame(match, state, opponentId);
  }

  private processEndFrame(match: Match, state: MatchState): void {
    this.endFrame(match, state);
  }

  private processEndMatch(match: Match): void {
    // S'assurer que le vainqueur est défini avant de marquer le match comme terminé
    this.setMatchWinner(match);
    match.status = 'completed';
  }

  private processReRack(match: Match, state: MatchState): void {
    this.resetFrame(state);

    const currentFrame = this.getCurrentFrame(match);
    if (currentFrame) {
      currentFrame.p1Points = 0;
      currentFrame.p2Points = 0;
      delete currentFrame.winnerPlayerId;
    }
  }

  private endFrame(match: Match, state: MatchState, winnerId?: string): void {
    const currentFrame = this.getCurrentFrame(match);
    if (!currentFrame) return;

    if (!winnerId) {
      winnerId =
        currentFrame.p1Points > currentFrame.p2Points
          ? match.players[0].playerId
          : match.players[1].playerId;
    }

    currentFrame.winnerPlayerId = winnerId;

    // noire rejouée si égalité ? (placeholder)
    if (
      currentFrame.p1Points === currentFrame.p2Points &&
      shouldRespotBlack(currentFrame.p1Points, currentFrame.p2Points)
    ) {
      currentFrame.decidedOnBlack = true;
      return;
    }

    this.updateSetScore(match, winnerId);

    // Déterminer le vainqueur du match si celui-ci est terminé
    if (this.isMatchComplete(match)) {
      this.setMatchWinner(match);
      match.status = 'completed';
    } else if (this.isSetComplete(match) || this.isMatchComplete(match)) {
      if (this.isMatchComplete(match)) {
        this.setMatchWinner(match);
        match.status = 'completed';
      }
    } else {
      this.startNextFrame(match, state);
    }
  }

  private setMatchWinner(match: Match): void {
    if (match.format.setsEnabled) {
      // Format par sets : comparer le nombre de sets gagnés
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
    } else {
      // Format frames uniquement : comparer le nombre de frames gagnées
      const p1Frames = match.score.frames.filter(f => f.winnerPlayerId === match.players[0].playerId).length;
      const p2Frames = match.score.frames.filter(f => f.winnerPlayerId === match.players[1].playerId).length;
      
      if (p1Frames > p2Frames) {
        match.score.match.winnerPlayerId = match.players[0].playerId;
      } else if (p2Frames > p1Frames) {
        match.score.match.winnerPlayerId = match.players[1].playerId;
      }
    }
  }

  private getCurrentFrame(match: Match): FrameScore | undefined {
    const currentSet = match.current.setNumber;
    const currentFrame = match.current.frameNumber;

    return match.score.frames.find((f) => f.setNo === currentSet && f.frameNo === currentFrame);
  }

  private addPointsToActivePlayer(match: Match, points: number): void {
    this.addPointsToPlayer(match, match.current.activePlayerId, points);
  }

  private addPointsToPlayer(match: Match, playerId: string, points: number): void {
    const currentFrame = this.getCurrentFrame(match);
    if (!currentFrame) return;

    if (playerId === match.players[0].playerId) {
      currentFrame.p1Points += points;
    } else {
      currentFrame.p2Points += points;
    }
  }

  private getOpponentId(match: Match, playerId: string): string {
    return match.players[0].playerId === playerId
      ? match.players[1].playerId
      : match.players[0].playerId;
  }

  private isFrameOver(state: MatchState): boolean {
    return state.colorsPhase && (state.colorsOrderIndex || 0) >= COLORS_ORDER.length;
  }

  private resetFrame(state: MatchState): void {
    state.redsRemaining = INITIAL_REDS;
    state.colorsPhase = false;
    state.colorsOrderIndex = 0;
    state.breakPoints = 0;
    state.freeballActive = false;
    state.lastBallPottedInBreak = undefined;
    state.pointsOnTable = calculatePointsOnTable(INITIAL_REDS, false, 0, undefined);
  }

  private updateSetScore(match: Match, winnerId: string): void {
    const currentSetNo = match.current.setNumber;
    let currentSet = match.score.sets.find((s) => s.setNo === currentSetNo);

    if (!currentSet) {
      currentSet = {
        setNo: currentSetNo,
        p1Frames: 0,
        p2Frames: 0,
      };
      match.score.sets.push(currentSet);
    }

    if (winnerId === match.players[0].playerId) {
      currentSet.p1Frames++;
    } else {
      currentSet.p2Frames++;
    }
  }

  private isSetComplete(match: Match): boolean {
    const currentSet = match.score.sets.find((s) => s.setNo === match.current.setNumber);
    if (!currentSet) return false;

    const framesToWin = Math.ceil(match.format.framesPerSet / 2);
    return Math.max(currentSet.p1Frames, currentSet.p2Frames) >= framesToWin;
  }

  private isMatchComplete(match: Match): boolean {
    if (!match.format.setsEnabled) {
      const totalFrames = match.score.frames.length;
      return totalFrames >= match.format.bestOfSets;
    }

    const p1Sets = match.score.sets.filter((s) => s.winnerPlayerId === match.players[0].playerId)
      .length;
    const p2Sets = match.score.sets.filter((s) => s.winnerPlayerId === match.players[1].playerId)
      .length;
    const setsToWin = Math.ceil(match.format.bestOfSets / 2);

    return Math.max(p1Sets, p2Sets) >= setsToWin;
  }

  private startNextFrame(match: Match, state: MatchState): void {
    if (this.isSetComplete(match) && match.format.setsEnabled) {
      state.setNumber++;
      state.frameNumber = 1;
    } else {
      state.frameNumber++;
    }

    this.resetFrame(state);

    const newFrame: FrameScore = {
      setNo: state.setNumber,
      frameNo: state.frameNumber,
      p1Points: 0,
      p2Points: 0,
    };
    match.score.frames.push(newFrame);
  }

  private calculatePointsDelta(eventData: MatchEventData, _currentState: MatchState): number {
    switch (eventData.action) {
      case 'pot':
        return eventData.ball ? getBallValue(eventData.ball) : 0;
      case 'foul':
        return eventData.ball ? getFoulValue(eventData.ball) : 4;
      case 'freeBallPot':
        return 1;
      default:
        return 0;
    }
  }
}