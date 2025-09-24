import { createPublicCommand } from "../../utils/MysticUtils/Commands/commandHelpers";
import { db } from "../../database/database";
import { EmbedBuilder } from "discord.js";
import { safeSend } from "../../components/SafeInteractions";

export const command = createPublicCommand({
	name: "inventory",
	description: "View your shop inventory",
})
	.setCategory("🎒 Inventory")
	.setExecutor(async (int) => {
		try {
			const inventory = await db.inventoryItem.findMany({
				where: { userId: int.user.id },
				include: { item: true }, // include ShopItem info
			});

			if (!inventory.length) {
				await safeSend(int, { content: "You don’t have any items in your inventory yet." });
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle(`${int.user.username}'s Inventory`)
				.setColor("#2ecc71")
				.setTimestamp();

			const itemList = inventory.map((inv) => `• ${inv.item.name} x${inv.quantity}`).join("\n");

			embed.setDescription(itemList);

			await safeSend(int, { embeds: [embed] });
		} catch (error) {
			console.error("Error fetching inventory:", error);
			await safeSend(int, { content: "❌ An error occurred while fetching your inventory." });
		}
	});
