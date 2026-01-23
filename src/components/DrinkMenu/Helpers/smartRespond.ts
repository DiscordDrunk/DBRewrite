import type {
	Interaction,
	CommandInteraction,
	MessageComponentInteraction,
	InteractionReplyOptions,
	InteractionUpdateOptions,
} from "discord.js";
import { safeFollowUp, safeUpdate, safeReply } from "../../index";

// Only interactions that can reply or update
type RepliableInteraction = CommandInteraction | MessageComponentInteraction;

/**
 * Handles Discord interactions safely depending on their state:
 * - deferred/replied → followUp
 * - button/select → update
 * - new command → reply
 */
export async function smartRespond(
	interaction: Interaction,
	payload: InteractionReplyOptions | InteractionUpdateOptions
) {
	const repliable = interaction as RepliableInteraction;

	if (
		"deferred" in repliable &&
        "replied" in repliable &&
        (repliable.deferred || repliable.replied || repliable.isCommand())
	) {
		// Cast to base Interaction to satisfy TypeScript
		return safeFollowUp(repliable as Interaction, payload as InteractionReplyOptions);
	} else if (
		"isButton" in repliable &&
        "isStringSelectMenu" in repliable &&
        (repliable.isButton() || repliable.isStringSelectMenu())
	) {
		const { flags, ...updatePayload } = payload as InteractionUpdateOptions;
		return safeUpdate(repliable as Interaction, updatePayload);
	} else if ("isCommand" in repliable && repliable.isCommand()) {
		return safeReply(repliable as Interaction, payload as InteractionReplyOptions);
	}
}
