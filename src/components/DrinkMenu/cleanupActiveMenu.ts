import type { TextBasedChannel } from "discord.js";

export interface ActiveMenu {
	messageId: string;
	channelId: string;
	ephemeral: boolean;
}

export const activeMenus = new Map<string, ActiveMenu>();

export async function cleanupActiveMenu(userId: string, channel?: TextBasedChannel | null) {
	const active = activeMenus.get(userId);
	if (!active) return;

	activeMenus.delete(userId);

	// Ephemeral messages cannot be deleted
	if (active.ephemeral || !channel) return;

	try {
		const oldMessage = await channel.messages.fetch(active.messageId).catch(() => null);
		if (oldMessage) await oldMessage.delete().catch(() => {/* noop */ });
	} catch {
		// noop
	}
}
