import type { TextBasedChannel } from "discord.js";
import { activeMenus, type ActiveMenu } from "./state";
import { db } from "../../database/database";
import { OrderStatus } from "@prisma/client";
import { activeOrderStatus } from "../../database/orders";

export async function cleanupActiveMenu(userId: string, channel?: TextBasedChannel | null) {
	const active = activeMenus.get(userId);
	if (!active) return;

	// Check if the user has any unfinished orders
	const activeOrder = await db.orders.findFirst({
		where: {
			user: userId,
			status: { in: activeOrderStatus },
		},
	});

	// Delete the menu only if the user has no active orders
	if (!activeOrder) {
		activeMenus.delete(userId);

		if (!active.ephemeral && channel && "messages" in channel) {
			try {
				const oldMessage = await channel.messages.fetch(active.messageId).catch(() => null);
				if (oldMessage) await oldMessage.delete().catch(() => void 0);
			} catch {
				// noop
			}
		}
	}
}

/**
 * Send temporary ephemeral inactivity notice
 */
const inactivityNotifiedUsers = new Set<string>();
export async function sendInactivityNotice(
	userId: string,
	channel: TextBasedChannel,
	content = "⏳ Menu closed due to inactivity.",
	displayTimeMs = 5000
) {
	if (!("send" in channel)) return;
	if (inactivityNotifiedUsers.has(userId)) return;
	inactivityNotifiedUsers.add(userId);

	const msg = await channel.send({ content });
	setTimeout(() => msg.delete().catch(() => null), displayTimeMs);
	setTimeout(() => inactivityNotifiedUsers.delete(userId), displayTimeMs);
}
export { activeMenus };

