// Utilitaire pour nettoyer les objets avant envoi à Firestore
// Supprime seulement les valeurs undefined sans toucher aux objets spéciaux Firestore

export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || obj.constructor !== Object) {
    return obj;
  }

  // Vérifier si c'est un objet spécial Firestore (Timestamp, FieldValue, etc.)
  if (obj.constructor.name === 'Timestamp' || 
      obj.constructor.name === 'FieldValue' ||
      obj.constructor.name === 'DocumentReference' ||
      obj.constructor.name === 'GeoPoint' ||
      typeof obj.isEqual === 'function' || // Timestamp a une méthode isEqual
      typeof obj.toDate === 'function') {   // Timestamp a une méthode toDate
    return obj;
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.map(item => 
          item && typeof item === 'object' && item.constructor === Object 
            ? stripUndefined(item) 
            : item
        ).filter(item => item !== undefined);
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        result[key] = stripUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result as T;
}

// Ancienne fonction pour compatibilité - à supprimer progressivement
export function stripUndefinedOld<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)).filter(v => v !== undefined) as unknown as T;
  }
  
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: any = {};
    Object.entries(value as any).forEach(([k, v]) => {
      const cleaned = stripUndefined(v as any);
      if (cleaned !== undefined) {
        out[k] = cleaned;
      }
    });
    return out as T;
  }
  
  return (value === undefined ? (undefined as any) : value);
}

// Utilitaire pour nettoyer les données de match avant sauvegarde
export function cleanMatchData(match: any): any {
  return {
    ...match,
    // État actuel avec valeurs par défaut
    current: {
      ...match.current,
      colorsOrderIndex: match.current.colorsOrderIndex ?? 0,
      freeballActive: match.current.freeballActive ?? false,
      snookersRequired: match.current.snookersRequired ?? false,
      lastBallPottedInBreak: match.current.lastBallPottedInBreak ?? undefined
    },
    
    // Historique nettoyé
    history: match.history.map((event: any) => ({
      ...event,
      ball: event.ball ?? null,
      note: event.note ?? null,
      stateSnapshot: event.stateSnapshot ? {
        ...event.stateSnapshot,
        colorsOrderIndex: event.stateSnapshot.colorsOrderIndex ?? 0,
        freeballActive: event.stateSnapshot.freeballActive ?? false,
        snookersRequired: event.stateSnapshot.snookersRequired ?? false,
        lastBallPottedInBreak: event.stateSnapshot.lastBallPottedInBreak ?? undefined
      } : null
    })),
    
    // Scores nettoyés
    score: {
      ...match.score,
      frames: match.score.frames.map((frame: any) => ({
        ...frame,
        winnerPlayerId: frame.winnerPlayerId ?? null,
        highestBreak: frame.highestBreak ?? null,
        decidedOnBlack: frame.decidedOnBlack ?? false
      })),
      sets: match.score.sets.map((set: any) => ({
        ...set,
        winnerPlayerId: set.winnerPlayerId ?? null
      })),
      match: {
        ...match.score.match,
        winnerPlayerId: match.score.match.winnerPlayerId ?? null
      }
    },
    
    // Champs optionnels
    venue: match.venue ?? null,
    referee: match.referee ?? null
  };
}