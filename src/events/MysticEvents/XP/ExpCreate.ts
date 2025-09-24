/* eslint-disable no-mixed-spaces-and-tabs */
import { PrismaClient } from "@prisma/client";
import { client } from "../../../providers/client";
import { awardXP } from "./xpUtils"; // ✅ Import helper

const prisma = new PrismaClient();
const cooldowns = new Map<string, Set<string>>();

client.on("messageCreate", async (message) => {
	if (message.author.bot || !message.guild) return;

	const guildId = message.guild.id;
	const userId = message.author.id;
	const channelId = message.channel.id;

	// Check cooldown
	if (!cooldowns.has(guildId)) cooldowns.set(guildId, new Set<string>());
	if (cooldowns.get(guildId)?.has(userId)) return;

	cooldowns.get(guildId)?.add(userId);
	setTimeout(() => cooldowns.get(guildId)?.delete(userId), 60000); //1 minute chat cooldown

	try {
		const serverConfig = await prisma.serverConfig.findUnique({ where: { guildId } });

		const isChannelXPEnabled = serverConfig?.xpEnabledChannels.includes(channelId);
		const xpAllowed =
			serverConfig?.xpEnabled &&
			(
				!serverConfig?.xpEnabledChannels.length ||
				isChannelXPEnabled
			);

		if (!xpAllowed) return;

		// ✅ Use helper instead of duplicating XP logic
		await awardXP(userId, guildId);

	} catch (error) {
		console.error("❌ Error handling XP:", error);
	}
});

process.on("beforeExit", () => {
	prisma.$disconnect();
});
