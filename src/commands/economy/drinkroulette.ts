/* eslint-disable linebreak-style */
// commands/economy/drinkroulette.ts
import { db } from "../../database/database";
import { constants, text } from "../../providers/config";
import { Command } from "../../structures/Command";
import { randRange, sampleArray } from "../../utils/utils";
import pms from "pretty-ms";
import { getCooldownTimeRemaining, isOnCooldown, setCooldown } from "../../utils/MysticUtils/Commands/cooldownManager";
import { requireUserProfile } from "../../database/userInfo";

export const command = new Command("drinkroulette", "Try your luck with drink roulette!")
	.setCategory("💲economy")
	.setExecutor(async (int) => {
		const userId = int.user.id;

		// Check cooldown using the same pattern as daily
		if (isOnCooldown(userId, "drinkroulette")) {
			const timeLeft = getCooldownTimeRemaining(userId, "drinkroulette");
			await int.reply(
				`⏱ You must wait ${pms(timeLeft, { compact: true, secondsDecimalDigits: 1 })} before spinning again.`
			);
			return;
		}

		// Ensure user profile exists
		const profile = await requireUserProfile(userId, int);
		if (!profile) return;

		// Generate random reward from tuple in config
		const earned = randRange(...constants.drinkroulette.amountRange);

		// Set cooldown using config
		setCooldown(userId, "drinkroulette");

		// Update user balance
		await db.userInfo.update({
			where: { id: profile.id },
			data: { balance: { increment: earned } },
		});

		// Pick random drink from config list
		const drink = sampleArray(text.commands.drinkingr.drinks);

		// Reply with result
		await int.reply(`🎲 You spun the drink roulette and got **${drink}**! You earned \`$${earned}\`.`);
	});
