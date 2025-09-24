import { MessageFlags } from "discord.js";
import { createLocalCommand } from "../../utils/MysticUtils/Commands/commandHelpers";

export const command = createLocalCommand({
	name: "devonly",
	description: "Only usable in dev server.",
	executor: async (int) => {
		await int.reply({ content: "This is a local command.", flags: MessageFlags.Ephemeral, });
	},
});
