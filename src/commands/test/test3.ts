import {
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} from "discord.js";
import { createLocalCommand } from "../../utils/MysticUtils/Commands/commandHelpers";

export const command = createLocalCommand({
	name: "testmodal",
	description: "Opens a simple modal (stable-compatible).",
	executor: async (int) => {
		const modal = new ModalBuilder()
			.setCustomId("testModal")
			.setTitle("Stable Modal Demo");

		const textInput = new TextInputBuilder()
			.setCustomId("cool_input")
			.setLabel("Tell me something cool!") // required on stable
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder("Type here...")
			.setRequired(true);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);

		modal.addComponents(row);

		await int.showModal(modal).catch(() => {
			int.reply({
				content: "⚠️ Could not open modal.",
				flags: MessageFlags.Ephemeral,
			});
		});
	},
});
