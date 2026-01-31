import { PrismaClient } from "@prisma/client";
import { config } from "../providers/config";
import { getUserLevel } from "../events/MysticEvents/XP/xpUtils";
import { calculateTabLimit } from "../utils/MysticUtils/tab/TabUtils";


const prisma = new PrismaClient();

// -------------------------
// Get or create a tab
// -------------------------
export async function getOrCreateTab(userId: string, guildId: string) {
	let tab = await prisma.tab.findUnique({
		where: { userId_guildId: { userId, guildId } },
	});

	if (!tab) {
		tab = await prisma.tab.create({
			data: {
				userId,
				guildId,
				amount: 0,
				maxLimit: Number(config.tabConfig.maxLimit),
				isBlocked: false,
				lastPaidAt: null,
				isPaid: false,
				status: "active",
				dueDate: null,
				partialPayments: 0.0,
			},
		});
	}

	return tab;
}

// -------------------------
// Add to tab (XP-aware & auto-sync maxLimit)
// -------------------------
export async function addToTab(userId: string, guildId: string, amount: number) {
	const tab = await getOrCreateTab(userId, guildId);

	const level = await getUserLevel(userId, guildId);
	const expectedLimit = Math.min(calculateTabLimit(level), Number(config.tabConfig.maxLimit));

	const newAmount = tab.amount + amount;
	const shouldBlock = newAmount >= expectedLimit;

	return prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: {
			amount: newAmount,
			isBlocked: shouldBlock,
			maxLimit: expectedLimit, // ✅ auto-sync DB limit with XP
		},
	});
}

// -------------------------
// Clear a tab
// -------------------------
export async function clearTab(userId: string, guildId: string) {
	return prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: {
			amount: 0,
			isBlocked: false,
			lastPaidAt: new Date(),
			isPaid: true,
			status: "active",
			partialPayments: 0.0,
			dueDate: null,
		},
	});
}

// -------------------------
// Reevaluate block status (XP-aware & auto-sync maxLimit)
// -------------------------
export async function reevaluateTabBlock(userId: string, guildId: string) {
	const tab = await getOrCreateTab(userId, guildId);

	const level = await getUserLevel(userId, guildId);
	const expectedLimit = Math.min(calculateTabLimit(level), Number(config.tabConfig.maxLimit));

	const shouldBlock = tab.amount >= expectedLimit;

	await prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: {
			isBlocked: shouldBlock,
			maxLimit: expectedLimit, // ✅ auto-sync DB limit with XP
		},
	});

	return shouldBlock;
}

// -------------------------
// Get full tab status
// -------------------------
export async function getTabStatus(userId: string, guildId: string) {
	return prisma.tab.findUnique({
		where: { userId_guildId: { userId, guildId } },
		select: {
			amount: true,
			maxLimit: true,
			isBlocked: true,
			lastPaidAt: true,
			isPaid: true,
			status: true,
			dueDate: true,
			partialPayments: true,
		},
	});
}

// -------------------------
// Has this tab ever been paid?
// -------------------------
export async function hasPaidTab(userId: string, guildId: string) {
	const tab = await prisma.tab.findUnique({
		where: { userId_guildId: { userId, guildId } },
		select: { lastPaidAt: true },
	});
	return !!tab?.lastPaidAt;
}

// -------------------------
// Manually update tab limit (for dev/testing)
// -------------------------
export async function updateTabLimit(userId: string, guildId: string, newLimit: number) {
	return prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: {
			maxLimit: newLimit,
			isBlocked: false,
		},
	});
}

// -------------------------
// Check if tab is blocked
// -------------------------
export async function isTabBlocked(userId: string, guildId: string) {
	const tab = await prisma.tab.findUnique({
		where: { userId_guildId: { userId, guildId } },
		select: { isBlocked: true },
	});
	return tab?.isBlocked ?? false;
}
