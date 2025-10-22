import {  activeMenus } from "../../components/DrinkMenu/state";
import { db } from "../../database/database";
import { OrderStatus } from "@prisma/client";
import type { Interaction } from "discord.js";
import { cleanupActiveMenu } from "./cleanupActiveMenu";

/**
 * Ensures the user can safely open a menu:
 * - Removes stale menu if all orders are delivered
 */
export async function ensureMenuIsActive(interaction: Interaction, userId: string) {
	// Only proceed if channel exists (needed for message deletion)
	const channel = interaction.channel ?? null;

	// Check if user has any unfinished orders
	const activeOrder = await db.orders.findFirst({
		where: {
			user: userId,
			status: { not: OrderStatus.Delivered },
		},
	});

	// If no unfinished order, clean up any old menu
	if (!activeOrder && activeMenus.has(userId)) {
		await cleanupActiveMenu(userId, channel);
	}
}
