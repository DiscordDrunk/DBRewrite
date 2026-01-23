/* eslint-disable linebreak-style */
import { requireUserProfile } from "../../database/userInfo";
import { text } from "../../providers/config";
import { Command } from "../../structures/Command";
import { format } from "../../utils/string";
import { MessageFlags } from "discord.js";

export const command = new Command("balance", "Check your current balance.")
	.setCategory("💲economy")
	.setExecutor(async (int) => {
		const userId = int.user.id;
		const profile = await requireUserProfile(userId, int);
		if (!profile) return;

		await int.reply({
			content: format(text.commands.balance.success, profile.balance),
			flags: MessageFlags.Ephemeral,
		});
	});
