import { Ball } from '@/types';

export const BALL_VALUES: Record<Ball, number> = {
  'R': 1,   // Red
  'Y': 2,   // Yellow  
  'G': 3,   // Green
  'Br': 4,  // Brown
  'Bl': 5,  // Blue
  'P': 6,   // Pink
  'Bk': 7   // Black
};

export const COLORS_ORDER: Ball[] = ['Y', 'G', 'Br', 'Bl', 'P', 'Bk'];

export const INITIAL_REDS = 15;
export const MIN_FOUL_POINTS = 4;

export const getBallValue = (ball: Ball): number => {
  return BALL_VALUES[ball];
};

export const getFoulValue = (ball?: Ball): number => {
  if (!ball) return MIN_FOUL_POINTS;
  const ballValue = getBallValue(ball);
  return Math.max(ballValue, MIN_FOUL_POINTS);
};

export const isColorBall = (ball: Ball): boolean => {
  return ball !== 'R';
};

export const isRedBall = (ball: Ball): boolean => {
  return ball === 'R';
};

export const getNextColorInOrder = (currentIndex: number): Ball | null => {
  if (currentIndex < 0 || currentIndex >= COLORS_ORDER.length - 1) {
    return null;
  }
  return COLORS_ORDER[currentIndex + 1];
};

export const isValidBallSequence = (
  ball: Ball, 
  redsRemaining: number, 
  colorsPhase: boolean,
  colorsOrderIndex: number = 0,
  freeballActive: boolean = false,
  lastBallPottedInBreak?: Ball
): boolean => {
  // Free ball permet de jouer n'importe quelle bille
  if (freeballActive) return true;
  
  // Phase des rouges : doit être rouge ou couleur après rouge
  if (!colorsPhase && redsRemaining > 0) {
    // Si la dernière bille du break était une rouge, on doit jouer une couleur
    if (lastBallPottedInBreak === 'R') {
      return isColorBall(ball); // Seulement les couleurs après une rouge
    }
    // Si la dernière bille du break était une couleur (ou pas de bille), on doit jouer une rouge
    if (!lastBallPottedInBreak || isColorBall(lastBallPottedInBreak)) {
      return ball === 'R'; // Seulement rouge après une couleur
    }
    // Premier coup du break : doit commencer par une rouge
    return ball === 'R';
  }
  
  // Phase couleurs : doit respecter l'ordre
  if (colorsPhase) {
    const expectedBall = COLORS_ORDER[colorsOrderIndex];
    return ball === expectedBall;
  }
  
  return false;
};

export const calculatePointsOnTable = (
  redsRemaining: number,
  colorsPhase: boolean,
  colorsOrderIndex: number = 0,
  lastBallPottedInBreak?: Ball
): number => {
  if (!colorsPhase) {
    // Phase rouges : calcul du potentiel maximum
    const maxFromReds = redsRemaining * 8; // Chaque rouge (1) + noire (7) = 8 points
    const colorsPoints = COLORS_ORDER.reduce((sum, color) => sum + getBallValue(color), 0); // 27 points
    
    // Si la dernière bille empochée était une rouge, le joueur est "sur" une couleur
    // On ajoute 7 points (noire) car c'est la couleur la plus élevée disponible
    if (lastBallPottedInBreak === 'R') {
      return maxFromReds + colorsPoints + getBallValue('Bk'); // +7 points pour la noire jouable
    }
    
    return maxFromReds + colorsPoints;
  } else {
    // Phase couleurs : somme des couleurs restantes
    return COLORS_ORDER.slice(colorsOrderIndex).reduce((sum, color) => sum + getBallValue(color), 0);
  }
};

export const isSnookerRequired = (
  playerPoints: number,
  opponentPoints: number,
  pointsOnTable: number
): boolean => {
  const maxPossiblePoints = playerPoints + pointsOnTable;
  return maxPossiblePoints <= opponentPoints;
};

export const shouldRespotBlack = (p1Points: number, p2Points: number): boolean => {
  return p1Points === p2Points;
};

export const getHighestValueOnTable = (
  redsRemaining: number,
  colorsPhase: boolean,
  colorsOrderIndex: number = 0
): number => {
  if (!colorsPhase && redsRemaining > 0) {
    return BALL_VALUES['Bk']; // Noire disponible pendant phase rouge
  }
  
  if (colorsPhase && colorsOrderIndex < COLORS_ORDER.length) {
    // Valeur de la dernière couleur dans l'ordre
    const lastColorIndex = COLORS_ORDER.length - 1;
    return BALL_VALUES[COLORS_ORDER[lastColorIndex]];
  }
  
  return 0;
};