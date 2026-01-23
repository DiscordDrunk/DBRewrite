import { Command } from "../../structures/Command";
import { MessageFlags, EmbedBuilder } from "discord.js";

export const command = new Command("tos", "Gives you a link to our tos.")
	.setExecutor(async int => {

		const embed = new EmbedBuilder()
			.setTitle("Terms of Service")
			.setDescription("You can view our TOS here:\nhttps://drunk-bartender.com/terms.html")
			.setColor("White");
		await int.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral
		});
	});
