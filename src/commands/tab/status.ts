import { ExtendedCommand } from "../../structures/extendedCommand";
import { getTabStatus, reevaluateTabBlock } from "../../database/tab";
import { EmbedBuilder } from "discord.js";

export const command = new ExtendedCommand({
	name: "status",
	description: "Check your current bar tab.",
	local: true,
})
	.setCategory("🍻tab")
	.setExecutor(async (int) => {
		const userId = int.user.id;
		const guildId = int.guildId!;

		// ✅ Defer immediately to avoid Unknown Interaction
		await int.deferReply({ ephemeral: true });

		// ✅ Force block status recalculation
		await reevaluateTabBlock(userId, guildId);

		const tab = await getTabStatus(userId, guildId);

		if (!tab) {
			await int.editReply({
				content: "You don't have a tab yet. Order something first!",
			});
			return;
		}

		const enforcedLimit = tab.maxLimit;
		const overLimit = tab.amount >= enforcedLimit;
		const progressBar = renderBar(tab.amount, enforcedLimit);

		const embed = new EmbedBuilder()
			.setTitle("📊 Your Tab Status")
			.setColor(overLimit ? 0xe74c3c : 0xf39c12) // 🔴 red if over limit
			.addFields(
				{
					name: "Amount Owed",
					value: `$${tab.amount.toFixed(2)}`,
					inline: true,
				},
				{
					name: "Enforced Limit",
					value: `$${enforcedLimit.toFixed(2)}`,
					inline: true,
				},
				{
					name: "Blocked",
					value: tab.isBlocked ? "🚫 Yes" : "✅ No",
					inline: true,
				},
				{
					name: "Progress",
					value: `${progressBar} (${tab.amount.toFixed(2)}/$${enforcedLimit.toFixed(2)})`,
				},
				{
					name: "Last Paid",
					value: tab.lastPaidAt
						? `<t:${Math.floor(new Date(tab.lastPaidAt).getTime() / 1000)}:R>`
						: "Never",
				}
			);

		await int.editReply({ embeds: [embed] });
	});

/* =========================
   Helper: Progress Bar
   ========================= */
function renderBar(amount: number, limit: number, length = 10) {
	const safeLimit = Math.max(limit, 1);
	const percent = Math.min(amount / safeLimit, 1);

	const filled = Math.round(percent * length);
	const empty = length - filled;

	let emoji = "🟩";
	if (percent >= 0.8 && percent < 1) emoji = "🟧";
	if (percent >= 1) emoji = "🟥";

	return emoji.repeat(filled) + "⬛".repeat(empty);
}
