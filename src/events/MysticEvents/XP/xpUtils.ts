import { PrismaClient } from "@prisma/client";
import { client } from "../../../providers/client";
import { TextChannel } from "discord.js";

const prisma = new PrismaClient();

// -------------------------
// Helper: calculate level from total XP (scaling)
// -------------------------
function calculateLevel(exp: number): number {
	let level = 0;
	let remainingExp = exp;

	while (remainingExp >= 100 + level * 20) { // scaling XP: +20 per level
		const xpForNext = 100 + level * 20;
		level++;
		remainingExp -= xpForNext;
	}

	return level + 1; // level 1 is starting point
}

// -------------------------
// Award XP to a user
// -------------------------
export async function awardXP(userId: string, guildId: string) {
	try {
		const serverConfig = await prisma.serverConfig.findUnique({ where: { guildId } });
		if (!serverConfig?.xpEnabled) return;

		// Ensure user exists
		await prisma.userInfo.upsert({
			where: { id: userId },
			update: {},
			create: {
				id: userId,
				balance: 0,
				donuts: 0,
				profileCreated: false
			},
		});

		// Random XP gain
		const xpGain = Math.floor(Math.random() * 20) + 1;

		// Increment XP and fetch updated record
		const updatedXP = await prisma.$transaction(async (tx) => {
			await tx.guildsXP.upsert({
				where: { userId_guildId: { userId, guildId } },
				create: { userId, guildId, level: 1, exp: xpGain },
				update: { exp: { increment: xpGain } },
			});
			return tx.guildsXP.findUnique({
				where: { userId_guildId: { userId, guildId } }
			});
		});

		if (!updatedXP) return;

		const oldLevel = updatedXP.level;
		const newLevel = calculateLevel(updatedXP.exp);

		// Update level if it changed
		if (newLevel > oldLevel) {
			await prisma.guildsXP.update({
				where: { userId_guildId: { userId, guildId } },
				data: { level: newLevel },
			});

			// Send level-up notification
			const notificationChannelId = serverConfig.notificationChannel;
			if (notificationChannelId) {
				const notificationChannel = client.channels.cache.get(notificationChannelId);
				if (notificationChannel instanceof TextChannel) {
					notificationChannel.send(
						`🎉 <@${userId}> has leveled up ${newLevel - oldLevel} level${newLevel - oldLevel > 1 ? "s" : ""}! Now at level **${newLevel}**.`
					);
				}
			}
		}

		const user = await client.users.fetch(userId).catch(() => null);
		const username = user ? user.username : `Unknown(${userId})`;
		/*
		console.log(
			`✅ Awarded ${xpGain} XP to ${username} (${userId}) in guild ${guildId}. Total EXP: ${updatedXP.exp}, Level: ${newLevel}`
		);
*/
	} catch (error) {
		console.error("❌ Error awarding XP:", error);
	}
}

// -------------------------
// Fetch user level
// -------------------------
export async function getUserLevel(userId: string, guildId: string): Promise<number> {
	const record = await prisma.guildsXP.findUnique({
		where: { userId_guildId: { userId, guildId } },
		select: { level: true },
	});
	return record?.level ?? 0;
}
