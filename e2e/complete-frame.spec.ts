import { test, expect } from '@playwright/test';

test.describe('Complete Frame Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    
    // Assuming we have a test user logged in
    // In a real scenario, you'd set up proper test authentication
  });

  test('should complete a full frame with proper scoring', async ({ page }) => {
    // Navigate to new match creation
    await page.click('[data-testid="new-match-button"]');
    
    // Select players
    await page.selectOption('[data-testid="player1-select"]', 'player1');
    await page.selectOption('[data-testid="player2-select"]', 'player2');
    
    // Set match format
    await page.fill('[data-testid="best-of-input"]', '1');
    
    // Create match
    await page.click('[data-testid="create-match-button"]');
    
    // Should navigate to scoring page
    await expect(page).toHaveURL(/\/scoring\/.+/);
    
    // Verify initial state
    await expect(page.locator('[data-testid="reds-remaining"]')).toContainText('15');
    await expect(page.locator('[data-testid="current-break"]')).toContainText('0');
    
    // Pot a red ball
    await page.click('[data-testid="ball-R"]');
    
    // Verify state update
    await expect(page.locator('[data-testid="reds-remaining"]')).toContainText('14');
    await expect(page.locator('[data-testid="current-break"]')).toContainText('1');
    await expect(page.locator('[data-testid="p1-score"]')).toContainText('1');
    
    // Pot a black ball
    await page.click('[data-testid="ball-Bk"]');
    
    // Verify break continues
    await expect(page.locator('[data-testid="current-break"]')).toContainText('8');
    await expect(page.locator('[data-testid="p1-score"]')).toContainText('8');
    
    // Pot another red
    await page.click('[data-testid="ball-R"]');
    
    // Verify state
    await expect(page.locator('[data-testid="reds-remaining"]')).toContainText('13');
    await expect(page.locator('[data-testid="current-break"]')).toContainText('9');
    
    // Miss (end turn)
    await page.click('[data-testid="miss-button"]');
    
    // Verify turn switch
    await expect(page.locator('[data-testid="current-break"]')).toContainText('0');
    await expect(page.locator('[data-testid="active-player"]')).toContainText('Player 2');
    
    // Player 2 commits a foul
    await page.click('[data-testid="foul-4-button"]');
    
    // Verify foul handling
    await expect(page.locator('[data-testid="p1-score"]')).toContainText('13'); // 9 + 4 foul points
    await expect(page.locator('[data-testid="active-player"]')).toContainText('Player 1');
    
    // Continue playing until all reds are potted
    for (let i = 0; i < 13; i++) {
      await page.click('[data-testid="ball-R"]');
      await page.click('[data-testid="end-turn-button"]');
    }
    
    // Verify transition to colors phase
    await expect(page.locator('[data-testid="phase-indicator"]')).toContainText('Phase couleurs');
    await expect(page.locator('[data-testid="next-ball"]')).toContainText('Jaune');
    
    // Pot colors in order
    const colorOrder = ['Y', 'G', 'Br', 'Bl', 'P', 'Bk'];
    for (const color of colorOrder) {
      await page.click(`[data-testid="ball-${color}"]`);
    }
    
    // Frame should be completed
    await expect(page.locator('[data-testid="frame-complete"]')).toBeVisible();
    
    // Verify final scores and winner
    const p1FinalScore = await page.locator('[data-testid="p1-final-score"]').textContent();
    const p2FinalScore = await page.locator('[data-testid="p2-final-score"]').textContent();
    
    expect(parseInt(p1FinalScore || '0')).toBeGreaterThan(parseInt(p2FinalScore || '0'));
    
    // Verify match completion
    await expect(page.locator('[data-testid="match-winner"]')).toContainText('Player 1');
  });

  test('should handle free ball scenario correctly', async ({ page }) => {
    // Set up a match in progress
    await page.goto('/scoring/test-match');
    
    // Simulate a snooker situation
    await page.click('[data-testid="foul-4-button"]');
    
    // Should show free ball option
    await expect(page.locator('[data-testid="free-ball-indicator"]')).toBeVisible();
    
    // Activate free ball
    await page.click('[data-testid="free-ball-button"]');
    
    // All balls should be available
    await expect(page.locator('[data-testid="ball-Bk"]')).not.toBeDisabled();
    await expect(page.locator('[data-testid="ball-Y"]')).not.toBeDisabled();
    
    // Pot a free ball
    await page.click('[data-testid="ball-Bk"]');
    
    // Should score 1 point for free ball
    await expect(page.locator('[data-testid="current-break"]')).toContainText('1');
    
    // Free ball indicator should disappear
    await expect(page.locator('[data-testid="free-ball-indicator"]')).not.toBeVisible();
  });

  test('should handle century break correctly', async ({ page }) => {
    // Set up match
    await page.goto('/scoring/test-match');
    
    // Simulate a century break (15 reds + 15 blacks + colors)
    for (let i = 0; i < 15; i++) {
      await page.click('[data-testid="ball-R"]');
      await page.click('[data-testid="ball-Bk"]');
    }
    
    // Should show century indicator
    await expect(page.locator('[data-testid="century-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-break"]')).toContainText('120');
    
    // Continue with colors
    const colorOrder = ['Y', 'G', 'Br', 'Bl', 'P', 'Bk'];
    for (const color of colorOrder) {
      await page.click(`[data-testid="ball-${color}"]`);
    }
    
    // Final break should be 147 (maximum)
    await expect(page.locator('[data-testid="highest-break"]')).toContainText('147');
    await expect(page.locator('[data-testid="maximum-badge"]')).toBeVisible();
  });

  test('should handle re-rack correctly', async ({ page }) => {
    await page.goto('/scoring/test-match');
    
    // Pot some balls
    await page.click('[data-testid="ball-R"]');
    await page.click('[data-testid="ball-Bk"]');
    
    // Verify scores
    await expect(page.locator('[data-testid="p1-score"]')).toContainText('8');
    
    // Re-rack the frame
    await page.click('[data-testid="re-rack-button"]');
    
    // Confirm re-rack
    await page.click('[data-testid="confirm-re-rack"]');
    
    // Verify frame is reset
    await expect(page.locator('[data-testid="p1-score"]')).toContainText('0');
    await expect(page.locator('[data-testid="p2-score"]')).toContainText('0');
    await expect(page.locator('[data-testid="reds-remaining"]')).toContainText('15');
    await expect(page.locator('[data-testid="current-break"]')).toContainText('0');
  });

  test('should handle match with sets correctly', async ({ page }) => {
    // Create a match with sets enabled
    await page.goto('/new-match');
    
    await page.selectOption('[data-testid="player1-select"]', 'player1');
    await page.selectOption('[data-testid="player2-select"]', 'player2');
    
    // Enable sets
    await page.check('[data-testid="sets-enabled"]');
    await page.fill('[data-testid="best-of-sets"]', '3');
    await page.fill('[data-testid="frames-per-set"]', '3');
    
    await page.click('[data-testid="create-match-button"]');
    
    // Should show set information
    await expect(page.locator('[data-testid="current-set"]')).toContainText('Set 1');
    await expect(page.locator('[data-testid="current-frame"]')).toContainText('Frame 1');
    
    // Complete first frame
    await page.click('[data-testid="concede-button"]');
    await page.click('[data-testid="confirm-concede"]');
    
    // Should advance to next frame
    await expect(page.locator('[data-testid="current-frame"]')).toContainText('Frame 2');
    
    // Complete set
    await page.click('[data-testid="concede-button"]');
    await page.click('[data-testid="confirm-concede"]');
    
    await page.click('[data-testid="concede-button"]');
    await page.click('[data-testid="confirm-concede"]');
    
    // Should advance to next set
    await expect(page.locator('[data-testid="current-set"]')).toContainText('Set 2');
    await expect(page.locator('[data-testid="current-frame"]')).toContainText('Frame 1');
  });
});