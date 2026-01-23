import { Command } from "../../structures/Command";
import { db } from "../../database/database";
import { renderCategoryMenu } from "../../components/index";

export const command = new Command("order", "Order via menu interface.")
	.setCategory("📮order")
	.setExecutor(async (int) => {
		const allDrinks = await db.drinkImage.findMany();
		const categories = [...new Set(allDrinks.map(d => d.category))];

		await renderCategoryMenu(int, categories, int.user.id);
	});
