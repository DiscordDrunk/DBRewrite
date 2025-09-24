import type {
	ButtonInteraction,
	Interaction,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	Message,
	MessageComponentInteraction,
} from "discord.js";
import { DiscordAPIError, MessageFlags } from "discord.js";

/**
 * Logs only unexpected errors to console.
 */
function handleError(error: unknown, context: string) {
	if (error instanceof DiscordAPIError) {
		// Ignore harmless API errors
		if (error.code === 10062 || error.code === 40060) return; // Unknown interaction, Interaction already acknowledged
	}
	console.error(`Unexpected error in ${context}:`, error);
}

/**
 * Safely updates a component interaction message.
 */
export async function safeUpdate(
	interaction: Interaction,
	data: InteractionUpdateOptions
): Promise<Message<boolean> | null> {
	try {
		if (interaction.isMessageComponent()) {
			// ✅ Prevent double updates
			if (interaction.replied || interaction.deferred) {
				return interaction.message ?? null;
			}

			await interaction.update(data);
			return interaction.message ?? null;
		}
	} catch (error) {
		handleError(error, "safeUpdate");
	}
	return null;
}

/**
 * Safely defers a component interaction update.
 */
export async function safeDeferUpdate(
	interaction: Interaction
): Promise<void> {
	try {
		if (interaction.isMessageComponent() && !interaction.deferred && !interaction.replied) {
			await interaction.deferUpdate();
		}
	} catch (error) {
		handleError(error, "safeDeferUpdate");
	}
}

/**
 * Safely replies to any repliable interaction.
 */
export async function safeReply(
	interaction: Interaction,
	data: InteractionReplyOptions
): Promise<Message<boolean> | null> {
	try {
		if ("isRepliable" in interaction && interaction.isRepliable()) {
			return await interaction.reply({ ...data, fetchReply: true });
		}
	} catch (error) {
		handleError(error, "safeReply");
	}
	return null;
}

/**
 * Safely follows up to a repliable interaction.
 */
export async function safeFollowUp(
	interaction: Interaction,
	data: InteractionReplyOptions
): Promise<Message<boolean> | null> {
	try {
		if ("isRepliable" in interaction && interaction.isRepliable()) {
			if (!interaction.replied && !interaction.deferred) {
				return await interaction.followUp({ ...data, fetchReply: true });
			} else {
				// Already replied/deferred → ephemeral followUp
				return await interaction.followUp({
					...data,
					flags: MessageFlags.Ephemeral,
					fetchReply: true,
				});
			}
		}
	} catch (error) {
		handleError(error, "safeFollowUp");
	}
	return null;
}

/**
 * Safely sends a reply or followUp depending on interaction state.
 * Useful for commands where you want a single helper.
 */
export async function safeSend(
	interaction: Interaction,
	data: InteractionReplyOptions
): Promise<Message<boolean> | null> {
	if ("isRepliable" in interaction && interaction.isRepliable()) {
		if (!interaction.replied && !interaction.deferred) {
			return safeReply(interaction, data);
		} else {
			return safeFollowUp(interaction, data);
		}
	}
	return null;
}


/**
 * 🛡️ Safe Interaction Helpers — Quick Reference
 *
 * ✅ safeReply:
 *   - Use for the FIRST reply to an interaction (slash command, modal, etc.)
 *   - Example: /inventory shows your items
 *
 * ✅ safeFollowUp:
 *   - Use AFTER you’ve already replied or deferred
 *   - Great for collectors (buttons, menus)
 *   - Example: user picks shop item → send purchase result
 *
 * ✅ safeUpdate:
 *   - Use to UPDATE/REPLACE the original interaction message
 *   - Example: refresh shop menu after a purchase
 *
 * ✅ safeSend:
 *   - Auto-pilot: replies if fresh, followUps if already replied/deferred
 *   - Good for error handlers, admin commands, or uncertain states
 *
 * TL;DR:
 *   - safeReply → first time
 *   - safeFollowUp → second (or later) time
 *   - safeUpdate → edit/replace message
 *   - safeSend → “don’t make me think”
 */
