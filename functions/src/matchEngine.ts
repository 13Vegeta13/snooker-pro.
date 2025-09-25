import { 
  Match, 
  MatchState, 
  MatchEvent, 
  MatchEventData, 
  Ball,
  FrameScore,
  SetScore 
} from './types';
import { Timestamp } from 'firebase-admin/firestore';

// Valeurs des billes
const BALL_VALUES: Record<Ball, number> = {
  'R': 1,   // Red
  'Y': 2,   // Yellow  
  'G': 3,   // Green
  'Br': 4,  // Brown
  'Bl': 5,  // Blue
  'P': 6,   // Pink
  'Bk': 7   // Black
};

const COLORS_ORDER: Ball[] = ['Y', 'G', 'Br', 'Bl', 'P', 'Bk'];
const INITIAL_REDS = 15;
const MIN_FOUL_POINTS = 4;

const getBallValue = (ball: Ball): number => BALL_VALUES[ball];

const getFoulValue = (ball?: Ball): number => {
  if (!ball) return MIN_FOUL_POINTS;
  const ballValue = getBallValue(ball);
  return Math.max(ballValue, MIN_FOUL_POINTS);
};

const calculatePointsOnTable = (
  redsRemaining: number,
  colorsPhase: boolean,
  colorsOrderIndex: number = 0
): number => {
  if (!colorsPhase) {
    // Phase rouges : rouges + toutes les couleurs
    return redsRemaining + COLORS_ORDER.reduce((sum, color) => sum + getBallValue(color), 0);
  } else {
    // Phase couleurs : somme des couleurs restantes
    return COLORS_ORDER.slice(colorsOrderIndex).reduce((sum, color) => sum + getBallValue(color), 0);
  }
};

const isValidBallSequence = (
  ball: Ball, 
  redsRemaining: number, 
  colorsPhase: boolean,
  colorsOrderIndex: number = 0,
  freeballActive: boolean = false
): boolean => {
  // Free ball permet de jouer n'importe quelle bille
  if (freeballActive) return true;
  
  // Phase des rouges : doit être rouge ou couleur après rouge
  if (!colorsPhase && redsRemaining > 0) {
    return true; // Toutes billes valides pendant phase rouge
  }
  
  // Phase couleurs : doit respecter l'ordre
  if (colorsPhase) {
    const expectedBall = COLORS_ORDER[colorsOrderIndex];
    return ball === expectedBall;
  }
  
  return false;
};

export class MatchEngine {
  constructor(private match: Match) {}

  applyEvent(eventData: MatchEventData): { match: Match; valid: boolean; error?: string } {
    const newMatch = { ...this.match };
    const currentState = { ...newMatch.current };
    
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

      // Ajouter l'événement à l'historique
      const event: MatchEvent = {
        id: this.generateId(),
        timestamp: Timestamp.now(),
        playerId: currentState.activePlayerId,
        action: eventData.action,
        ball: eventData.ball,
        pointsDelta: this.calculatePointsDelta(eventData, newMatch.current),
        note: eventData.note,
        stateSnapshot: { ...currentState }
      };

      newMatch.history.push(event);
      newMatch.current = currentState;
      newMatch.updatedAt = Timestamp.now();

      return { match: newMatch, valid: true };

    } catch (error) {
      return { 
        match: this.match, 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private processPot(match: Match, state: MatchState, ball: Ball): void {
    // Vérifier si la bille est valide
    if (!isValidBallSequence(ball, state.redsRemaining, state.colorsPhase, state.colorsOrderIndex, state.freeballActive)) {
      throw new Error(`Invalid ball sequence: ${ball}`);
    }

    const points = getBallValue(ball);
    this.addPointsToActivePlayer(match, points);
    state.breakPoints += points;

    // Mettre à jour l'état selon la bille empochée
    if (ball === 'R') {
      state.redsRemaining--;
      state.freeballActive = false;
      
      // Si plus de rouges, passer aux couleurs
      if (state.redsRemaining === 0) {
        state.colorsPhase = true;
        state.colorsOrderIndex = 0;
      }
    } else if (state.colorsPhase) {
      // Couleur en phase couleurs : passer à la suivante
      state.colorsOrderIndex = (state.colorsOrderIndex || 0) + 1;
      state.freeballActive = false;
    } else {
      // Couleur en phase rouge : elle revient sur la table
      state.freeballActive = false;
    }

    // Mettre à jour les points sur la table
    state.pointsOnTable = calculatePointsOnTable(state.redsRemaining, state.colorsPhase, state.colorsOrderIndex);

    // Vérifier fin de frame
    if (this.isFrameOver(state)) {
      this.endFrame(match, state);
    }
  }

  private processFoul(match: Match, state: MatchState, ball?: Ball, note?: string): void {
    const foulPoints = getFoulValue(ball);
    
    // Ajouter les points à l'adversaire
    const opponentId = this.getOpponentId(match, state.activePlayerId);
    this.addPointsToPlayer(match, opponentId, foulPoints);
    
    // Fin du break
    state.breakPoints = 0;
    
    // Passer le tour
    state.activePlayerId = opponentId;
    
    // Activer free ball si nécessaire (si snooker)
    if (note?.includes('snooker')) {
      state.freeballActive = true;
    }
  }

  private processFreeBallPot(match: Match, state: MatchState, ball: Ball): void {
    if (!state.freeballActive) {
      throw new Error('Free ball not active');
    }

    // En free ball, empoche vaut 1 point puis bille "on" normale
    this.addPointsToActivePlayer(match, 1);
    state.breakPoints += 1;
    state.freeballActive = false;
    
    // Continuer avec la bille "on" normale
    state.pointsOnTable = calculatePointsOnTable(state.redsRemaining, state.colorsPhase, state.colorsOrderIndex);
  }

  private processEndTurn(match: Match, state: MatchState): void {
    // Fin du break
    state.breakPoints = 0;
    
    // Passer le tour
    state.activePlayerId = this.getOpponentId(match, state.activePlayerId);
  }

  private processMiss(match: Match, state: MatchState): void {
    // Même traitement que end turn pour l'instant
    this.processEndTurn(match, state);
  }

  private processConcede(match: Match, state: MatchState): void {
    // L'adversaire gagne la frame
    const opponentId = this.getOpponentId(match, state.activePlayerId);
    this.endFrame(match, state, opponentId);
  }

  private processEndFrame(match: Match, state: MatchState): void {
    this.endFrame(match, state);
  }

  private processEndMatch(match: Match): void {
    match.status = 'completed';
  }

  private processReRack(match: Match, state: MatchState): void {
    // Remettre la frame à zéro
    this.resetFrame(state);
    
    // Réinitialiser les scores de frame
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

    // Déterminer le vainqueur si pas spécifié
    if (!winnerId) {
      winnerId = currentFrame.p1Points > currentFrame.p2Points 
        ? match.players[0].playerId 
        : match.players[1].playerId;
    }

    currentFrame.winnerPlayerId = winnerId;
    
    // Mettre à jour les scores de set
    this.updateSetScore(match, winnerId);
    
    // Vérifier fin de set/match
    if (this.isSetComplete(match) || this.isMatchComplete(match)) {
      if (this.isMatchComplete(match)) {
        match.status = 'completed';
      }
    } else {
      // Préparer la frame suivante
      this.startNextFrame(match, state);
    }
  }

  private getCurrentFrame(match: Match): FrameScore | undefined {
    const currentSet = match.current.setNumber;
    const currentFrame = match.current.frameNumber;
    
    return match.score.frames.find(f => 
      f.setNo === currentSet && f.frameNo === currentFrame
    );
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
    state.pointsOnTable = calculatePointsOnTable(INITIAL_REDS, false, 0);
  }

  private updateSetScore(match: Match, winnerId: string): void {
    const currentSetNo = match.current.setNumber;
    let currentSet = match.score.sets.find(s => s.setNo === currentSetNo);
    
    if (!currentSet) {
      currentSet = {
        setNo: currentSetNo,
        p1Frames: 0,
        p2Frames: 0
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
    const currentSet = match.score.sets.find(s => s.setNo === match.current.setNumber);
    if (!currentSet) return false;
    
    const framesToWin = Math.ceil(match.format.framesPerSet / 2);
    return Math.max(currentSet.p1Frames, currentSet.p2Frames) >= framesToWin;
  }

  private isMatchComplete(match: Match): boolean {
    if (!match.format.setsEnabled) {
      // Format frames uniquement
      const totalFrames = match.score.frames.length;
      return totalFrames >= match.format.bestOfSets;
    }

    // Format sets
    const p1Sets = match.score.sets.filter(s => s.winnerPlayerId === match.players[0].playerId).length;
    const p2Sets = match.score.sets.filter(s => s.winnerPlayerId === match.players[1].playerId).length;
    const setsToWin = Math.ceil(match.format.bestOfSets / 2);
    
    return Math.max(p1Sets, p2Sets) >= setsToWin;
  }

  private startNextFrame(match: Match, state: MatchState): void {
    if (this.isSetComplete(match) && match.format.setsEnabled) {
      // Nouveau set
      state.setNumber++;
      state.frameNumber = 1;
    } else {
      // Nouvelle frame dans le set
      state.frameNumber++;
    }
    
    this.resetFrame(state);
    
    // Créer la nouvelle frame
    const newFrame: FrameScore = {
      setNo: state.setNumber,
      frameNo: state.frameNumber,
      p1Points: 0,
      p2Points: 0
    };
    match.score.frames.push(newFrame);
  }

  private calculatePointsDelta(eventData: MatchEventData, currentState: MatchState): number {
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

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}