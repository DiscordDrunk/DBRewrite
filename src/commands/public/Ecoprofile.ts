/* eslint-disable indent */
import { Command } from "../../structures/Command";
import { getUserInfo, requireUserProfile, formatDate } from "../../database/userInfo";
import { PrismaClient } from "@prisma/client";
import { EmbedBuilder, MessageFlags } from "discord.js";

const prisma = new PrismaClient();

// XP scaling formula
function xpForNextLevel(level: number): number {
    return 100 + (level - 1) * 20;
}

export const command = new Command("ecoprofile", "Shows your economy + XP profile.")
    .setCategory("💲economy")
    .setExecutor(async (int) => {
        const userId = int.user.id;
        const guildId = int.guild?.id;
        if (!guildId) return;

        // Acknowledge right away to prevent interaction expiration
        await int.deferReply({ flags: MessageFlags.Ephemeral });

        // --- Economy Profile ---
        const info = await requireUserProfile(userId, int);
        if (!info) return;

        // --- XP Profile ---
        const userXP = await prisma.guildsXP.findUnique({
            where: { userId_guildId: { userId, guildId } }
        });

        let xpFields: any[] = [];

        if (userXP) {
            const leaderboard = await prisma.guildsXP.findMany({
                where: { guildId },
                orderBy: { exp: "desc" },
                select: { userId: true }
            });

            const rank = leaderboard.findIndex(u => u.userId === userId) + 1;

            const currentLevel = userXP.level;
            const currentXP = userXP.exp;
            const nextLevelXP = xpForNextLevel(currentLevel);
            const prevLevelXPTotal = currentLevel === 1 ? 0 : xpForNextLevel(currentLevel - 1);
            const xpIntoCurrentLevel = currentXP - prevLevelXPTotal;
            const xpNeeded = nextLevelXP - prevLevelXPTotal;

            const progressBarLength = 10;
            const filled = Math.round((xpIntoCurrentLevel / xpNeeded) * progressBarLength);
            const progressBar = "▰".repeat(filled) + "▱".repeat(progressBarLength - filled);

            xpFields = [
                { name: "🏆 Level", value: `${currentLevel}`, inline: true },
                { name: "⭐ XP", value: `${currentXP} / ${nextLevelXP}`, inline: true },
                { name: "🥇 Rank", value: `#${rank}`, inline: true },
                { name: "📊 Progress", value: progressBar, inline: false },
            ];
        } else {
            xpFields = [{ name: "📈 XP", value: "No XP data yet.", inline: false }];
        }

        // --- Combined Embed ---
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${int.user.username}'s Profile`)
            .setColor(0x00b7ff)
            .setThumbnail(int.user.displayAvatarURL())
            .addFields(
                { name: "🪙 Balance", value: `$${info.balance.toLocaleString()}`, inline: true },
                // { name: "🍩 Donuts", value: `${info.donuts ?? 0}`, inline: true },
                { name: "📅 Created", value: info.profileCreationDate ? formatDate(info.profileCreationDate) : "Unknown", inline: false },
                { name: "\u200B", value: "__**XP Stats**__", inline: false },
                ...xpFields
            )
            .setFooter({ text: `ID: ${userId}` });

        // Send the response
        await int.editReply({ embeds: [embed] });
    });
