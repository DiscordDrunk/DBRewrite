// components/DrinkMenu/other/buttonCooldown.ts
export function setButtonCooldown(
	cooldownSet: Set<string>,
	userId: string,
	durationMs: number
) {
	cooldownSet.add(userId);
	setTimeout(() => cooldownSet.delete(userId), durationMs);
}
