// tab.ts
import { PrismaClient } from "@prisma/client";
import { config } from "../providers/config"; // Access your tab settings

const prisma = new PrismaClient();

// Config values
const partialPaymentTimeout = Number(config.tabConfig.partialPaymentTimeout); // 24h in ms
const paymentWarningTimeout = Number(config.tabConfig.paymentWarningTimeout); // 1h in ms
const maxTabLimit = Number(config.tabConfig.maxLimit); // Max tab limit

/**
 * Get an existing tab, or create a fresh one if none exists.
 */
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
				maxLimit: maxTabLimit,
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

/**
 * Add an amount to a user's tab. Automatically blocks if over limit.
 */
export async function addToTab(userId: string, guildId: string, amount: number) {
	const tab = await getOrCreateTab(userId, guildId); // guaranteed tab
	const newAmount = tab.amount + amount;
	const shouldBlock = newAmount >= tab.maxLimit;

	return prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: {
			amount: newAmount,
			isBlocked: shouldBlock,
		},
	});
}

/**
 * Clear a tab (sets amount to 0, marks paid, unblocks).
 */
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

/**
 * Update a tab's maximum limit and unblock it.
 */
export async function updateTabLimit(userId: string, guildId: string, newLimit: number) {
	return prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: {
			maxLimit: newLimit,
			isBlocked: false,
		},
	});
}

/**
 * Check if a tab is blocked.
 */
export async function isTabBlocked(userId: string, guildId: string) {
	const tab = await prisma.tab.findUnique({
		where: { userId_guildId: { userId, guildId } },
		select: { isBlocked: true },
	});
	return tab?.isBlocked ?? false;
}

/**
 * Returns full tab status.
 */
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

/**
 * Returns true if the tab has ever been paid.
 */
export async function hasPaidTab(userId: string, guildId: string) {
	const tab = await prisma.tab.findUnique({
		where: { userId_guildId: { userId, guildId } },
		select: { lastPaidAt: true },
	});
	return !!tab?.lastPaidAt;
}

/**
 * Recalculates and updates block status manually.
 */
export async function reevaluateTabBlock(userId: string, guildId: string) {
	const tab = await getOrCreateTab(userId, guildId);
	const shouldBlock = tab.amount >= tab.maxLimit;

	await prisma.tab.update({
		where: { userId_guildId: { userId, guildId } },
		data: { isBlocked: shouldBlock },
	});

	return shouldBlock;
}
