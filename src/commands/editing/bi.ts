import { createPublicCommand } from "../../utils/MysticUtils/Commands/commandHelpers";

export const command = createPublicCommand({ name: "ping", description: "Pong!" })
	.setCategory("🛠 Utility")
	.setExecutor(async (int) => {
		await int.reply("🏓 Pong!");
	});
