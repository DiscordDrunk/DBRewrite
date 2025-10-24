/* eslint-disable linebreak-style */
import { db } from "../../database/database";
import { constants, text } from "../../providers/config";
import { Command } from "../../structures/Command";
import { randRange, sampleArray } from "../../utils/utils";
import pms from "pretty-ms";
import {
	getCooldownTimeRemaining,
	isOnCooldown,
	setCooldown,
} from "../../utils/MysticUtils/Commands/cooldownManager";
import { requireUserProfile } from "../../database/userInfo";
import { EmbedBuilder } from "discord.js";
import { z } from "zod";

// --- Zod validation for drinkroulette config ---
const drinkrouletteSchema = z.object({
	amountRange: z.tuple([z.number(), z.number()]),
	cooldownMs: z.number(),
	dbChance: z.number().min(0).max(1).default(0.5), // configurable DB chance
});

// Validate config
const drinkroulette = drinkrouletteSchema.parse(constants.drinkroulette);

// --- Predefined color palette ---
const embedColors = [
	0xff0000, // red
	0x00ff00, // green
	0x0000ff, // blue
	0xffff00, // yellow
	0xff00ff, // magenta
	0x00ffff, // cyan
	0xffa500, // orange
	0x800080, // purple
];

// --- Command definition ---
export const command = new Command("drinkroulette", "Try your luck with drink roulette!")
	.setCategory("💲economy")
	.setExecutor(async (int) => {
		const userId = int.user.id;

		// --- Cooldown check ---
		if (isOnCooldown(userId, "drinkroulette")) {
			const timeLeft = getCooldownTimeRemaining(userId, "drinkroulette");
			const cooldownMsg = await int.reply({
				content: `⏱ You must wait ${pms(timeLeft, { compact: true, secondsDecimalDigits: 1 })} before spinning again.`,
				fetchReply: true,
			});

			// Auto-delete cooldown message after 7 seconds
			setTimeout(() => cooldownMsg.delete().catch(() => {/*no */ }), 7000);
			return;
		}

		// --- Ensure user profile exists ---
		const profile = await requireUserProfile(userId, int);
		if (!profile) return;

		// --- Determine reward amount ---
		const earned = randRange(...drinkroulette.amountRange);

		// --- Set cooldown ---
		setCooldown(userId, "drinkroulette");

		// --- Fetch DB drinks ---
		const allDbDrinks = await db.drinkImage.findMany();
		const hasDbDrinks = allDbDrinks.length > 0;

		// --- DB vs Text drink based on configurable probability ---
		const useDbDrink = hasDbDrinks && Math.random() < drinkroulette.dbChance;

		let drinkName: string;
		let drinkImageUrl: string | null = null;

		if (useDbDrink) {
			const randomDrink = sampleArray(allDbDrinks);
			drinkName = randomDrink.drinkName;
			drinkImageUrl = randomDrink.url ?? null;
		} else {
			const validDrinks =
				text.commands.drinkingr.drinks?.filter(
					(d: unknown) => typeof d === "string" && d.trim().length > 0
				) ?? [];
			drinkName =
				validDrinks.length > 0 ? sampleArray(validDrinks) : "a mysterious drink";
			drinkImageUrl = null;
		}

		// --- Update balance ---
		await db.userInfo.update({
			where: { id: profile.id },
			data: { balance: { increment: earned } },
		});

		// --- Random embed color ---
		const randomColor = embedColors[Math.floor(Math.random() * embedColors.length)];

		// --- Build embed ---
		const embed = new EmbedBuilder()
			.setTitle("🍸 Drink Roulette Result")
			.setDescription(`🎲 You got **${drinkName}**!\nYou earned \`$${earned}\`.`)
			.setColor(randomColor);

		if (drinkImageUrl) embed.setImage(drinkImageUrl);

		// --- Send spin result ---
		const reply = await int.reply({ embeds: [embed], fetchReply: true });

		// --- Auto-delete spin result after 2 minutes ---
		setTimeout(() => reply.delete().catch(() => {/*no */ }), 2 * 60 * 1000);
	});
