import { permissions } from "./../../providers/permissions";
import { createLocalCommand, createPublicCommand } from "../../utils/MysticUtils/Commands/commandHelpers";

export const command = createPublicCommand({ name: "ping1", description: "Pong!" })
	.setCategory("🛠 Utility")
	.addPermission(permissions.developer)
	.setExecutor(async (int) => {
		await int.reply("🏓 Pong!");
	});
 