/* eslint-disable indent */
import { Command } from "../../structures/Command";
import { PrismaClient } from "@prisma/client";
import { EmbedBuilder, MessageFlags } from "discord.js";

const prisma = new PrismaClient();

// Calculate XP required for next level (matches your scaling formula)
function xpForNextLevel(level: number): number {
    return 100 + (level - 1) * 20;
}

export const command = new Command("expprofile", "Shows your XP, level, and rank.")
    .setCategory("📈XP")
    .setExecutor(async (int) => {
        const userId = int.user.id;
        const guildId = int.guild?.id;
        if (!guildId) return;

        // Fetch user's XP record
        const userXP = await prisma.guildsXP.findUnique({
            where: { userId_guildId: { userId, guildId } }
        });

        if (!userXP) {
            await int.reply({ content: "You don't have any XP yet.", flags: MessageFlags.Ephemeral });
            return;
        }

        // Fetch leaderboard position
        const leaderboard = await prisma.guildsXP.findMany({
            where: { guildId },
            orderBy: { exp: "desc" },
            select: { userId: true }
        });

        const rank = leaderboard.findIndex(u => u.userId === userId) + 1;

        // XP progress
        const currentLevel = userXP.level;
        const currentXP = userXP.exp;
        const nextLevelXP = xpForNextLevel(currentLevel);
        const prevLevelXPTotal = currentLevel === 1 ? 0 : xpForNextLevel(currentLevel - 1);
        const xpIntoCurrentLevel = currentXP - prevLevelXPTotal;
        const xpNeeded = nextLevelXP - prevLevelXPTotal;

        // Optional: text progress bar (10 segments)
        const progressBarLength = 10;
        const filled = Math.round((xpIntoCurrentLevel / xpNeeded) * progressBarLength);
        const progressBar = "▰".repeat(filled) + "▱".repeat(progressBarLength - filled);

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${int.user.username}'s XP Profile`)
            .setColor(0x00b7ff)
            .setThumbnail(int.user.displayAvatarURL())
            .addFields(
                { name: "🏆 Level", value: `${currentLevel}`, inline: true },
                { name: "⭐ XP", value: `${currentXP} / ${nextLevelXP} (${xpIntoCurrentLevel}/${xpNeeded})`, inline: true },
                { name: "📊 Progress", value: progressBar, inline: false },
                { name: "🥇 Rank", value: `#${rank}`, inline: true }
            )
            .setFooter({ text: `ID: ${userId}` });

        await int.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    });
