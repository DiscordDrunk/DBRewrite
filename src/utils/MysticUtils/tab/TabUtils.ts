/**
 * Calculates the maximum tab limit a user should have based on their XP level.
 *
 * @param level - The user's current XP level (integer, starting at 1)
 * @returns The dollar amount representing the maximum tab limit for this user
 *
 * Logic:
 * 1. BASE_LIMIT: The starting tab limit for a brand-new user (level 0). Currently $50.
 * 2. PER_LEVEL: How much the tab limit increases per level. Currently $10 per level.
 * 3. Total limit = BASE_LIMIT + (level * PER_LEVEL)
 *
 * Example:
 *  - Level 0: 50 + 0*10 = $50
 *  - Level 1: 50 + 1*10 = $60  <-- this is your current "$60" cap
 *  - Level 2: 50 + 2*10 = $70
 *  - Level 5: 50 + 5*10 = $100
 *
 * So as the user levels up, their max tab increases linearly by $10 per level.
 */
export function calculateTabLimit(level: number): number {
	const BASE_LIMIT = 50;   // Starting cap for new users
	const PER_LEVEL = 10;    // How much each level adds

	return BASE_LIMIT + level * PER_LEVEL;
}
