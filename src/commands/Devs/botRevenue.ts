import type {
	ChatInputCommandInteraction} from "discord.js";
import {
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { db } from "../../database/database";
import { OrderStatus, PaymentType } from "@prisma/client";
import { ExtendedCommand } from "../../structures/extendedCommand";
import { permissions } from "../../providers/permissions";

// Format month like: "July 2025"
const formatMonth = (date: Date) =>
	date.toLocaleString("en-US", { month: "long", year: "numeric" });

export const command = new ExtendedCommand(
	new SlashCommandBuilder()
		.setName("bot-revenue")
		.setDescription("View the total money received by the bot (Developer only)")
)
	.addPermission(permissions.developer)
	.setCategory("👑admin")
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		const orders = await db.orders.findMany({
			where: {
				status: OrderStatus.Delivered,
				price: { not: null },
			},
		});

		if (!orders.length) {
			await interaction.reply({
				content: "There is no revenue data to show yet.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let total = 0;
		let fromBalance = 0;
		let fromTab = 0;

		// Monthly grouping
		const monthly: Record<string, number> = {};

		for (const order of orders) {
			const price = order.price ?? 0;
			const monthKey = formatMonth(order.createdAt);

			total += price;
			monthly[monthKey] = (monthly[monthKey] || 0) + price;

			if (order.paymentType === PaymentType.BALANCE) {
				fromBalance += price;
			} else if (order.paymentType === PaymentType.TAB) {
				fromTab += price;
			}
		}

		const embed = new EmbedBuilder()
			.setTitle("📊 Bot Revenue Summary")
			.setColor(0x00b894)
			.addFields(
				{ name: "💰 Total Earned", value: `$${total.toFixed(2)}`, inline: true },
				{ name: "🔹 From Balance", value: `$${fromBalance.toFixed(2)}`, inline: true },
				{ name: "🔸 From Tab", value: `$${fromTab.toFixed(2)}`, inline: true }
			)
			.setFooter({ text: `Pulled from ${orders.length} completed orders.` })
			.setTimestamp();

		// Add monthly summary (limit to top 6 for Discord embed sanity)
		const sortedMonths = Object.keys(monthly).sort((a, b) => {
			const [am, ay] = a.split(" ");
			const [bm, by] = b.split(" ");
			return new Date(`${bm} 1, ${by}`).getTime() - new Date(`${am} 1, ${ay}`).getTime();
		});

		const monthSummary = sortedMonths
			.map(month => `📅 ${month}: $${monthly[month].toFixed(2)}`)
			.slice(-6) // last 6 months
			.join("\n");

		embed.addFields({ name: "📆 Monthly Revenue (Last 6)", value: monthSummary });

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, });
	});
