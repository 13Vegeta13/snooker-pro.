import { describe, it, expect } from 'vitest';
import {
  getBallValue,
  getFoulValue,
  isValidBallSequence,
  calculatePointsOnTable,
  isSnookerRequired,
  shouldRespotBlack,
  BALL_VALUES,
  COLORS_ORDER,
  INITIAL_REDS
} from '@/modules/snooker/rules';

describe('Snooker Rules', () => {
  describe('getBallValue', () => {
    it('should return correct values for all balls', () => {
      expect(getBallValue('R')).toBe(1);
      expect(getBallValue('Y')).toBe(2);
      expect(getBallValue('G')).toBe(3);
      expect(getBallValue('Br')).toBe(4);
      expect(getBallValue('Bl')).toBe(5);
      expect(getBallValue('P')).toBe(6);
      expect(getBallValue('Bk')).toBe(7);
    });
  });

  describe('getFoulValue', () => {
    it('should return minimum 4 points for any foul', () => {
      expect(getFoulValue()).toBe(4);
      expect(getFoulValue('R')).toBe(4);
      expect(getFoulValue('Y')).toBe(4);
      expect(getFoulValue('G')).toBe(4);
    });

    it('should return ball value for high-value balls', () => {
      expect(getFoulValue('Br')).toBe(4);
      expect(getFoulValue('Bl')).toBe(5);
      expect(getFoulValue('P')).toBe(6);
      expect(getFoulValue('Bk')).toBe(7);
    });
  });

  describe('isValidBallSequence', () => {
    it('should allow any ball during red phase with free ball', () => {
      expect(isValidBallSequence('Bk', 15, false, 0, true)).toBe(true);
      expect(isValidBallSequence('Y', 15, false, 0, true)).toBe(true);
    });

    it('should allow any ball during red phase without free ball', () => {
      expect(isValidBallSequence('R', 15, false, 0, false)).toBe(true);
      expect(isValidBallSequence('Bk', 15, false, 0, false)).toBe(true);
    });

    it('should enforce color order during colors phase', () => {
      expect(isValidBallSequence('Y', 0, true, 0, false)).toBe(true);
      expect(isValidBallSequence('G', 0, true, 0, false)).toBe(false);
      expect(isValidBallSequence('G', 0, true, 1, false)).toBe(true);
    });

    it('should allow any ball during colors phase with free ball', () => {
      expect(isValidBallSequence('Bk', 0, true, 0, true)).toBe(true);
      expect(isValidBallSequence('G', 0, true, 0, true)).toBe(true);
    });
  });

  describe('calculatePointsOnTable', () => {
    it('should calculate correct points during red phase', () => {
      const expectedColorPoints = COLORS_ORDER.reduce((sum, color) => sum + BALL_VALUES[color], 0);
      expect(calculatePointsOnTable(15, false, 0)).toBe(15 + expectedColorPoints);
      expect(calculatePointsOnTable(10, false, 0)).toBe(10 + expectedColorPoints);
      expect(calculatePointsOnTable(1, false, 0)).toBe(1 + expectedColorPoints);
    });

    it('should calculate correct points during colors phase', () => {
      // All colors remaining
      expect(calculatePointsOnTable(0, true, 0)).toBe(2 + 3 + 4 + 5 + 6 + 7); // 27
      
      // Only black remaining
      expect(calculatePointsOnTable(0, true, 5)).toBe(7);
      
      // No colors remaining
      expect(calculatePointsOnTable(0, true, 6)).toBe(0);
    });
  });

  describe('isSnookerRequired', () => {
    it('should detect when snooker is required', () => {
      expect(isSnookerRequired(50, 60, 8)).toBe(true); // 50 + 8 = 58 < 60
      expect(isSnookerRequired(50, 58, 8)).toBe(true); // 50 + 8 = 58 = 58
      expect(isSnookerRequired(50, 57, 8)).toBe(false); // 50 + 8 = 58 > 57
    });

    it('should handle edge cases', () => {
      expect(isSnookerRequired(0, 1, 0)).toBe(true);
      expect(isSnookerRequired(100, 0, 50)).toBe(false);
    });
  });

  describe('shouldRespotBlack', () => {
    it('should detect when black should be respotted', () => {
      expect(shouldRespotBlack(67, 67)).toBe(true);
      expect(shouldRespotBlack(50, 50)).toBe(true);
      expect(shouldRespotBlack(67, 60)).toBe(false);
      expect(shouldRespotBlack(60, 67)).toBe(false);
    });
  });

  describe('Game constants', () => {
    it('should have correct initial values', () => {
      expect(INITIAL_REDS).toBe(15);
      expect(COLORS_ORDER).toEqual(['Y', 'G', 'Br', 'Bl', 'P', 'Bk']);
    });

    it('should have all ball values defined', () => {
      expect(Object.keys(BALL_VALUES)).toEqual(['R', 'Y', 'G', 'Br', 'Bl', 'P', 'Bk']);
    });
  });
});