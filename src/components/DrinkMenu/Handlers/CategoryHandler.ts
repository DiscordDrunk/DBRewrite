import type {
	Interaction,
	StringSelectMenuInteraction,
	TextChannel,
} from "discord.js";
import { ComponentType } from "discord.js";
import { createCategorySelectMenu, smartRespond } from "../../index";
import { activeMenus } from "../../DrinkMenu/state";
import { handleDrinkPages } from "../Handlers/DrinkPageHandler";
import { db } from "../../../database/database";
import { OrderStatus } from "@prisma/client";
import { cleanupActiveMenu } from "../../DrinkMenu/other/CleanupActiveMenu";

export async function renderCategoryMenu(
	i: Interaction,
	categories: string[],
	userId: string
) {
	if (!i.isRepliable() || !i.channel) return;

	// 🔹 Remove any stale menu immediately
	if (activeMenus.has(userId)) {
		await cleanupActiveMenu(userId, i.channel as TextChannel);
	}

	// 🔹 Remove stale menu if user has only delivered orders
	const activeOrder = await db.orders.findFirst({
		where: { user: userId, status: { not: OrderStatus.Delivered } },
	});

	if (!activeOrder && activeMenus.has(userId)) {
		await cleanupActiveMenu(userId, i.channel as TextChannel);
	}

	const categoryMenu = createCategorySelectMenu(categories);

	const payload = {
		content: "📋 Select a drink category:",
		components: [categoryMenu],
	};

	// 🧠 SMART RESPONSE HANDLING
	const categoryMessage = await smartRespond(i, payload);
	if (!categoryMessage) return;

	// 🔹 Track active menu
	activeMenus.set(userId, {
		messageId: categoryMessage.id,
		channelId: categoryMessage.channelId,
		ephemeral: categoryMessage.flags?.has(64) ?? false,
	});

	// 🔹 Await category selection
	const catInt = await categoryMessage
		.awaitMessageComponent({
			componentType: ComponentType.StringSelect,
			time: 15_000,
			filter: (intComp: StringSelectMenuInteraction) =>
				intComp.user.id === userId,
		})
		.catch(() => null);

	if (!catInt || !catInt.isStringSelectMenu()) {
		await cleanupActiveMenu(userId, categoryMessage.channel as TextChannel);
		return;
	}

	// Acknowledge selection
	await catInt.deferUpdate();

	// 🔹 Enter drink menu flow
	await handleDrinkPages(catInt, catInt.values[0], categories, userId);
}
