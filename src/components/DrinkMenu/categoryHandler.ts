import type { Interaction, StringSelectMenuInteraction } from "discord.js";
import { ComponentType } from "discord.js";
import { createCategorySelectMenu, safeReply, safeDeferUpdate, safeUpdate } from ".";
import { activeMenus } from "../DrinkMenu/state";
import { handleDrinkPages } from "../DrinkMenu/drinkPageHandler";
import { db } from "../../database/database";
import { OrderStatus } from "@prisma/client";
import { cleanupActiveMenu } from "./cleanupActiveMenu";

export async function handleCategorySelection(
	i: Interaction,
	categories: string[],
	userId: string
) {
	if (!i.isRepliable() || !i.channel) return;

	// ✅ Remove any stale menu immediately
	if (activeMenus.has(userId)) await cleanupActiveMenu(userId, i.channel);

	// Remove stale menu if user has only delivered orders
	const activeOrder = await db.orders.findFirst({
		where: { user: userId, status: { not: OrderStatus.Delivered } },
	});
	if (!activeOrder && activeMenus.has(userId)) {
		await cleanupActiveMenu(userId, i.channel);
	}

	const categoryMenu = createCategorySelectMenu(categories);

	let categoryMessage = null;
	if (i.isButton() || i.isStringSelectMenu()) {
		categoryMessage = await safeUpdate(i, {
			content: "📋 Select a drink category:",
			components: [categoryMenu],
		});
	} else if (i.isCommand()) {
		categoryMessage = await safeReply(i, {
			content: "📋 Select a drink category:",
			components: [categoryMenu],
		});
	} else return;

	if (!categoryMessage) return;

	// ✅ Set active menu
	activeMenus.set(userId, {
		messageId: categoryMessage.id,
		channelId: categoryMessage.channelId,
		ephemeral: categoryMessage.flags?.has(64) ?? false,
	});

	// Wait for selection with timeout
	const catInt = await categoryMessage.awaitMessageComponent({
		componentType: ComponentType.StringSelect,
		time: 15000,
		filter: (intComp: StringSelectMenuInteraction) => intComp.user.id === userId,
	}).catch(() => null);

	if (!catInt || !catInt.isStringSelectMenu()) {
		await cleanupActiveMenu(userId, categoryMessage.channel);
		return;
	}

	await safeDeferUpdate(catInt);
	await handleDrinkPages(catInt, catInt.values[0], categories, userId);
}
