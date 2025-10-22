import type { TextBasedChannel } from "discord.js";

/**
 * Represents a menu currently active for a user
 */
export interface ActiveMenu {
    messageId: string;
    channelId: string;
    ephemeral: boolean;
}

export const activeMenus = new Map<string, ActiveMenu>();
