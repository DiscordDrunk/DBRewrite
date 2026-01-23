import type { TextBasedChannel, ButtonInteraction } from "discord.js";
import { activeMenus } from "../state";
import { db } from "../../../database/database";
import { activeOrderStatus } from "../../../database/orders";

/**
 * Deletes an active menu for a user.
 * If `force` is true, deletes even if the user has active orders.
 */
export async function cleanupActiveMenu(
	userId: string,
	channel?: TextBasedChannel | null,
	force = false
) {
	const active = activeMenus.get(userId);
	if (!active) return;

	const activeOrder = await db.orders.findFirst({
		where: { user: userId, status: { in: activeOrderStatus } },
	});

	if (force || !activeOrder) {
		activeMenus.delete(userId);

		if (!active.ephemeral && channel && "messages" in channel) {
			try {
				const oldMessage = await channel.messages.fetch(active.messageId).catch(() => null);
				if (oldMessage) await oldMessage.delete().catch(() => void 0);
			} catch { /* noop */ }
		}
	}
}

/**
 * Deletes a button interaction message (greyed-out buttons) after a delay.
 * Optionally deletes the main active menu message too.
 */
export async function cleanupDisabledMessage(
	interaction: ButtonInteraction | null,
	delayMs = 4000,
	status?: "complete" | "cancelled",
	removeActiveMenuMessage = true
) {
	if (!interaction || !interaction.message) return;
	const msg = interaction.message;
	if (!msg.deletable) return;

	setTimeout(async () => {
		try {
			await msg.delete().catch(() => null);

			if (removeActiveMenuMessage && activeMenus.has(interaction.user.id)) {
				const active = activeMenus.get(interaction.user.id)!;
				if (!active.ephemeral && "messages" in interaction.channel!) {
					const oldMsg = await interaction.channel!.messages.fetch(active.messageId).catch(() => null);
					if (oldMsg) await oldMsg.delete().catch(() => null);
				}
				activeMenus.delete(interaction.user.id);
			}
		} catch { /* noop */ }
	}, delayMs);
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