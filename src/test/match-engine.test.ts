import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEngine, createNewMatch } from '@/modules/snooker/matchEngine';
import { Match } from '@/types';

describe('MatchEngine', () => {
  let match: Match;
  let engine: MatchEngine;

  beforeEach(() => {
    const matchData = createNewMatch(
      'player1',
      'Player 1',
      'player2', 
      'Player 2',
      { setsEnabled: false, bestOfSets: 1, framesPerSet: 1 },
      'creator'
    );
    match = { id: 'test-match', ...matchData } as Match;
    engine = new MatchEngine(match);
  });

  describe('Ball potting', () => {
    it('should pot a red ball correctly', () => {
      const result = engine.applyEvent({ action: 'pot', ball: 'R' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.redsRemaining).toBe(14);
      expect(result.match.current.breakPoints).toBe(1);
      
      // Points should be added to active player
      const currentFrame = result.match.score.frames[0];
      expect(currentFrame.p1Points).toBe(1);
      expect(currentFrame.p2Points).toBe(0);
    });

    it('should pot a color ball during red phase', () => {
      const result = engine.applyEvent({ action: 'pot', ball: 'Bk' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.redsRemaining).toBe(15); // Unchanged
      expect(result.match.current.breakPoints).toBe(7);
      expect(result.match.current.colorsPhase).toBe(false);
      
      const currentFrame = result.match.score.frames[0];
      expect(currentFrame.p1Points).toBe(7);
    });

    it('should transition to colors phase when all reds are potted', () => {
      // Pot all 15 reds
      let currentMatch = match;
      for (let i = 0; i < 15; i++) {
        const testEngine = new MatchEngine(currentMatch);
        const result = testEngine.applyEvent({ action: 'pot', ball: 'R' });
        expect(result.valid).toBe(true);
        currentMatch = result.match;
      }
      
      expect(currentMatch.current.redsRemaining).toBe(0);
      expect(currentMatch.current.colorsPhase).toBe(true);
      expect(currentMatch.current.colorsOrderIndex).toBe(0);
    });

    it('should enforce color order during colors phase', () => {
      // Set up colors phase
      match.current.redsRemaining = 0;
      match.current.colorsPhase = true;
      match.current.colorsOrderIndex = 0;
      
      const engine = new MatchEngine(match);
      
      // Should allow yellow (first in order)
      const validResult = engine.applyEvent({ action: 'pot', ball: 'Y' });
      expect(validResult.valid).toBe(true);
      expect(validResult.match.current.colorsOrderIndex).toBe(1);
      
      // Should reject green when yellow is expected
      const invalidEngine = new MatchEngine(match);
      const invalidResult = invalidEngine.applyEvent({ action: 'pot', ball: 'G' });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('Invalid ball sequence');
    });
  });

  describe('Fouls', () => {
    it('should apply foul correctly', () => {
      const result = engine.applyEvent({ action: 'foul', ball: 'Bk' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.breakPoints).toBe(0);
      expect(result.match.current.activePlayerId).toBe('player2'); // Switched
      
      // Points should go to opponent
      const currentFrame = result.match.score.frames[0];
      expect(currentFrame.p1Points).toBe(0);
      expect(currentFrame.p2Points).toBe(7); // Black = 7 points
    });

    it('should apply minimum 4 points for low-value ball fouls', () => {
      const result = engine.applyEvent({ action: 'foul', ball: 'R' });
      
      expect(result.valid).toBe(true);
      
      const currentFrame = result.match.score.frames[0];
      expect(currentFrame.p2Points).toBe(4); // Minimum foul
    });

    it('should activate free ball on snooker foul', () => {
      const result = engine.applyEvent({ 
        action: 'foul', 
        ball: 'Bk', 
        note: 'snooker foul' 
      });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.freeballActive).toBe(true);
    });
  });

  describe('Free ball', () => {
    it('should handle free ball pot correctly', () => {
      // Set up free ball scenario
      match.current.freeballActive = true;
      const engine = new MatchEngine(match);
      
      const result = engine.applyEvent({ action: 'freeBallPot', ball: 'Bk' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.breakPoints).toBe(1); // Free ball = 1 point
      expect(result.match.current.freeballActive).toBe(false);
    });

    it('should reject free ball when not active', () => {
      const result = engine.applyEvent({ action: 'freeBallPot', ball: 'Bk' });
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Free ball not active');
    });
  });

  describe('Turn management', () => {
    it('should end turn correctly', () => {
      // Build up some break first
      const potResult = engine.applyEvent({ action: 'pot', ball: 'R' });
      expect(potResult.match.current.breakPoints).toBe(1);
      
      const endTurnEngine = new MatchEngine(potResult.match);
      const result = endTurnEngine.applyEvent({ action: 'endTurn' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.breakPoints).toBe(0);
      expect(result.match.current.activePlayerId).toBe('player2');
    });

    it('should handle miss like end turn', () => {
      const result = engine.applyEvent({ action: 'miss' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.breakPoints).toBe(0);
      expect(result.match.current.activePlayerId).toBe('player2');
    });
  });

  describe('Frame management', () => {
    it('should handle concede correctly', () => {
      const result = engine.applyEvent({ action: 'concede' });
      
      expect(result.valid).toBe(true);
      
      const currentFrame = result.match.score.frames[0];
      expect(currentFrame.winnerPlayerId).toBe('player2'); // Opponent wins
    });

    it('should handle re-rack correctly', () => {
      // Pot some balls first
      const potResult = engine.applyEvent({ action: 'pot', ball: 'R' });
      expect(potResult.match.current.redsRemaining).toBe(14);
      
      const reRackEngine = new MatchEngine(potResult.match);
      const result = reRackEngine.applyEvent({ action: 'reRack' });
      
      expect(result.valid).toBe(true);
      expect(result.match.current.redsRemaining).toBe(15); // Reset
      expect(result.match.current.colorsPhase).toBe(false);
      expect(result.match.current.breakPoints).toBe(0);
      
      // Frame scores should be reset
      const currentFrame = result.match.score.frames[0];
      expect(currentFrame.p1Points).toBe(0);
      expect(currentFrame.p2Points).toBe(0);
      expect(currentFrame.winnerPlayerId).toBeUndefined();
    });
  });

  describe('Match completion', () => {
    it('should complete match when requested', () => {
      const result = engine.applyEvent({ action: 'endMatch' });
      
      expect(result.valid).toBe(true);
      expect(result.match.status).toBe('completed');
    });
  });

  describe('Event history', () => {
    it('should record events in history', () => {
      const initialHistoryLength = match.history.length;
      
      const result = engine.applyEvent({ action: 'pot', ball: 'R' });
      
      expect(result.valid).toBe(true);
      expect(result.match.history.length).toBe(initialHistoryLength + 1);
      
      const lastEvent = result.match.history[result.match.history.length - 1];
      expect(lastEvent.action).toBe('pot');
      expect(lastEvent.ball).toBe('R');
      expect(lastEvent.pointsDelta).toBe(1);
      expect(lastEvent.playerId).toBe('player1');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid actions', () => {
      const result = engine.applyEvent({ action: 'invalid' as any });
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should handle missing ball for pot action', () => {
      const result = engine.applyEvent({ action: 'pot' });
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Ball required for pot');
    });
  });
});