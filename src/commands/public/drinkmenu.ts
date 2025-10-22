import { Command } from "../../structures/Command";
import { hasActiveOrder } from "../../database/orders";
import { db } from "../../database/database";
import { handleCategorySelection } from "../../components/DrinkMenu/categoryHandler";
import { ensureMenuIsActive } from "../../components/DrinkMenu/ensureMenuIsActive";
import { activeMenus } from "../../components/DrinkMenu/state";
import { cleanupActiveMenu } from "../../components/DrinkMenu/cleanupActiveMenu";

export const command = new Command("menuorder", "Order via menu interface.")
	.setCategory("📮order")
	.setExecutor(async (int) => {
		await ensureMenuIsActive(int, int.user.id);

		if (await hasActiveOrder(int.user)) {
			await int.reply({ content: "❌ You already have an active order.", flags: 64 });
			return;
		}

		const allDrinks = await db.drinkImage.findMany();
		const categories = [...new Set(allDrinks.map(d => d.category))];

		const activeOrder = await db.orders.findFirst({
			where: { user: int.user.id, status: { not: "Delivered" } },
		});
		if (!activeOrder && activeMenus.has(int.user.id)) {
			await cleanupActiveMenu(int.user.id, int.channel);
		}

		await handleCategorySelection(int, categories, int.user.id);
	});
