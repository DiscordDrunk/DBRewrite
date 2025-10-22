import {
	Interaction,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	Message,
	ChatInputCommandInteraction,
	UserContextMenuCommandInteraction,
	MessageContextMenuCommandInteraction,
	MessageComponentInteraction,
	DiscordAPIError,
	MessageFlags,
} from "discord.js";

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

/** Repliable interactions type */
type RepliableInteraction =
	| ChatInputCommandInteraction
	| UserContextMenuCommandInteraction
	| MessageContextMenuCommandInteraction
	| MessageComponentInteraction;

/**
 * ✅ Type guard for interactions that can reply or follow up.
 * (Covers all interaction types that support reply(), followUp(), etc.)
 */
function isRepliable(
	interaction: Interaction
): interaction is Exclude<Interaction, { isRepliable: () => false }> {
	return (
		typeof (interaction as any).isRepliable === "function" &&
		(interaction as any).isRepliable()
	);
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
			// Prevent double updates
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
export async function safeDeferUpdate(interaction: Interaction): Promise<void> {
	try {
		if (interaction.isMessageComponent() && !interaction.deferred && !interaction.replied) {
			await interaction.deferUpdate();
		}
	} catch (error) {
		handleError(error, "safeDeferUpdate");
	}
}

/**
 * Safely defers a reply for repliable interactions.
 * Useful for long-running commands to avoid the "interaction failed" error.
 */
export async function safeDeferReply(
	interaction: Interaction,
	ephemeral = false
): Promise<void> {
	try {
		if (isRepliable(interaction) && interaction.isRepliable()) {
			if (!interaction.replied && !interaction.deferred) {
				await interaction.deferReply({ ephemeral });
			}
		}
	} catch (error) {
		handleError(error, "safeDeferReply");
	}
}

/**
 * Safely replies to a repliable interaction.
 */
export async function safeReply(
	interaction: Interaction,
	data: InteractionReplyOptions
): Promise<Message<boolean> | null> {
	try {
		if (isRepliable(interaction) && interaction.isRepliable()) {
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
			// 🟩 If interaction was never replied/deferred → reply instead
			if (!interaction.replied && !interaction.deferred) {
				return await interaction.reply({
					...data,
					fetchReply: true,
				});
			}

			// 🟦 Otherwise, safe to follow up
			return await interaction.followUp({
				...data,
				fetchReply: true,
			});
		}
	} catch (error) {
		console.error("safeFollowUp error:", error);
	}
	return null;
}
/**
 * Safely sends a reply or followUp depending on interaction state.
 * Auto-pilot: replies if fresh, followUps if already replied/deferred
 */
export async function safeSend(
	interaction: Interaction,
	data: InteractionReplyOptions
): Promise<Message<boolean> | null> {
	if (isRepliable(interaction) && interaction.isRepliable()) {
		if (!interaction.replied && !interaction.deferred) {
			return safeReply(interaction, data);
		} else {
			return safeFollowUp(interaction, data);
		}
	}
	return null;
}

/**
 * Simple safeFollowUp helper.
 * Ensures interaction is replied or deferred before following up.
 */
export async function safeFollowUpSimple(
	interaction: Interaction,
	options: InteractionReplyOptions
): Promise<Message<boolean> | null> {
	try {
		if (isRepliable(interaction) && interaction.isRepliable()) {
			if (interaction.replied || interaction.deferred) {
				// Already replied → followUp
				return await interaction.followUp({ ...options, fetchReply: true });
			} else {
				// Not replied → reply first
				return await interaction.reply({ ...options, fetchReply: true });
			}
		}
	} catch (err) {
		handleError(err, "safeFollowUpSimple");
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
 *   - Example: user picks shop item → send purchase result
 *
 * ✅ safeUpdate:
 *   - Use to UPDATE/REPLACE the original interaction message
 *   - Example: refresh shop menu after a purchase
 *
 * ✅ safeSend:
 *   - Auto-pilot: replies if fresh, followUps if already replied/deferred
 *
 * ✅ safeDeferReply:
 *   - Use to safely defer replies for long-running commands
 *   - Example: run heavy database query before responding
 *
 * ✅ safeDeferUpdate:
 *   - Use to safely defer updates for component interactions
 *
 * ✅ safeFollowUpSimple:
 *   - Lightweight alternative for quick follow-ups
 *
 * TL;DR:
 *   - safeReply → first time
 *   - safeFollowUp → second (or later) time
 *   - safeUpdate → edit/replace message
 *   - safeDeferReply → defer commands
 *   - safeDeferUpdate → defer component updates
 *   - safeSend → auto-pilot for uncertain states
 */
