// components/DrinkMenu/Handlers/DrinkPageHandler.ts
import type { ButtonInteraction, StringSelectMenuInteraction, TextChannel } from "discord.js";
import { ComponentType, MessageFlags, Message } from "discord.js";
import { PaymentType } from "@prisma/client";
import { db } from "../../../database/database";
import { getUserBalance, updateBalance } from "../../../database/userInfo";
import { addToTab, isTabBlocked } from "../../../database/tab";
import { dismissEphemeral } from "../../../utils/MysticUtils/Menu/ephemeralUtils";
import { cleanupActiveMenu, cleanupDisabledMessage, renderCategoryMenu } from "../../index";
import { activeMenus } from "../state";
import {
	createDrinkSelectMenu,
	createNavigationButtons,
	createConfirmationButtons,
	safeDeferUpdate,
	safeFollowUp,
	safeUpdate,
	safeSend,
	disableAllComponents,
	setButtonCooldown,
} from "../../index";
import { createAndSendOrderEmbed } from "../orderEmbeds";
import { activeOrderStatus } from "../../../database/orders";

const ITEMS_PER_PAGE = 4;
const NAV_BUTTON_COOLDOWN_MS = 1000;

export async function handleDrinkPages(
	selectInteraction: StringSelectMenuInteraction | ButtonInteraction,
	category: string,
	categories: string[],
	userId: string
) {
	const activeOrder = await db.orders.findFirst({
		where: { user: userId, status: { in: activeOrderStatus } },
	});

	// Clean up stale menu
	if (!activeOrder && activeMenus.has(userId)) {
		await cleanupActiveMenu(userId, selectInteraction.channel as TextChannel);
	}

	if (activeOrder) {
		await safeFollowUp(selectInteraction, {
			content: "❌ You already have an active order.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	let currentPage = 0;
	const allDrinks = await db.drinkImage.findMany();
	const drinks = allDrinks.filter(d => d.category === category);
	const totalPages = Math.max(1, Math.ceil(drinks.length / ITEMS_PER_PAGE));
	const buttonCooldown = new Set<string>();
	let lastPageMsg: Message<boolean> | null = null;

	const sendDrinkPage = async (interaction: StringSelectMenuInteraction | ButtonInteraction) => {
		if (!interaction.isRepliable()) return;

		if (lastPageMsg && lastPageMsg.deletable) {
			await lastPageMsg.delete().catch(() => null);
		}

		const pageDrinks = drinks
			.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
			.map(d => ({ id: d.id, drinkName: d.drinkName, price: d.price ?? undefined }));

		if (pageDrinks.length === 0) {
			await safeUpdate(interaction, { content: "No drinks available in this category.", components: [] });
			return;
		}

		const drinkRow = createDrinkSelectMenu(pageDrinks);
		const navRow = createNavigationButtons(currentPage, totalPages);

		const msg = await safeSend(interaction, {
			content: `🍹 Category: **${category}** — Page ${currentPage + 1}/${totalPages}`,
			components: [drinkRow, navRow],
		});

		if (msg) {
			lastPageMsg = msg;
			activeMenus.set(userId, {
				messageId: msg.id,
				channelId: msg.channelId,
				ephemeral: msg.flags?.has(64) ?? false,
			});
		}
	};

	setButtonCooldown(buttonCooldown, userId, NAV_BUTTON_COOLDOWN_MS);
	await sendDrinkPage(selectInteraction);

	const collector = selectInteraction.channel?.createMessageComponentCollector({
		filter: i => (i.isButton() || i.isStringSelectMenu()) && i.user.id === userId,
		time: 300_000,
		idle: 180_000,
	});

	collector?.on("collect", async i => {
		if (i.isButton() && buttonCooldown.has(i.user.id)) {
			await safeDeferUpdate(i);
			return;
		}
		if (i.isButton()) setButtonCooldown(buttonCooldown, i.user.id, NAV_BUTTON_COOLDOWN_MS);

		if (i.isButton()) {
			switch (i.customId) {
				case "prev_page":
					currentPage = Math.max(0, currentPage - 1);
					await sendDrinkPage(i);
					break;

				case "next_page":
					currentPage = Math.min(totalPages - 1, currentPage + 1);
					await sendDrinkPage(i);
					break;

				case "menu_back": {
					// Stop the current collector
					collector.stop();

					// Acknowledge the button
					await safeDeferUpdate(i);

					// Clean up old menu
					await cleanupActiveMenu(userId, i.channel);

					// 🔹 Spawn a fresh category menu using the central handler
					await renderCategoryMenu(i, categories, userId);

					return;
				}
			}
			return;
		}

		if (i.isStringSelectMenu() && i.customId === "select_drink") {
			const drinkId = parseInt(i.values[0]);
			const drink = drinks.find(d => d.id === drinkId);
			if (!drink) return;

			if (i.message.editable) {
				const disabled = disableAllComponents(i.message.components);
				await i.message.edit({ components: disabled.map(r => r.toJSON()) });
			}

			const confirmRow = createConfirmationButtons(!!drink.price);

			const msg = await safeSend(i, {
				content: `**${drink.drinkName}** selected. ${drink.price ? `Price: $${drink.price}` : ""}`,
				components: [confirmRow],
			});
			if (!msg) return;

			const confirmCollector = i.channel?.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter: btnInt => btnInt.user.id === userId,
				time: 30_000,
			});

			confirmCollector?.on("collect", async buttonInt => {
				await safeDeferUpdate(buttonInt);

				if (buttonInt.message.editable) {
					const disabled = disableAllComponents(buttonInt.message.components);
					await buttonInt.message.edit({ components: disabled.map(r => r.toJSON()) });
				}

				if (buttonInt.customId === "cancel_order") {
					await cleanupDisabledMessage(buttonInt, 4000, "cancelled");
					await cleanupActiveMenu(userId, buttonInt.channel);
					confirmCollector.stop();
					return;
				}

				if (buttonInt.customId === "confirm_order" || buttonInt.customId === "put_on_tab") {
					const existingOrder = await db.orders.findFirst({
						where: { user: buttonInt.user.id, status: { in: activeOrderStatus } },
					});
					if (existingOrder) {
						await safeFollowUp(buttonInt, {
							content: "❌ You already have an active order in progress.",
							flags: MessageFlags.Ephemeral,
						});
						return;
					}

					if (buttonInt.customId === "confirm_order" && drink.price) {
						const { balance } = await getUserBalance(buttonInt.user.id);
						if (balance < drink.price) {
							await safeFollowUp(buttonInt, {
								content: `❌ Insufficient funds. You only have $${balance}.`,
								flags: MessageFlags.Ephemeral,
							});
							return;
						}
						await updateBalance(buttonInt.user.id, balance - drink.price);
					} else if (buttonInt.customId === "put_on_tab") {
						const blocked = await isTabBlocked(buttonInt.user.id, buttonInt.guildId!);
						if (blocked) {
							if (buttonInt.message.editable) {
								const disabled = disableAllComponents(buttonInt.message.components);
								await buttonInt.message.edit({ components: disabled.map(r => r.toJSON()) });
							}

							await safeFollowUp(buttonInt, {
								content: "❌ Your tab is blocked.",
								flags: MessageFlags.Ephemeral,
							});

							await cleanupDisabledMessage(buttonInt, 4000, "cancelled");
							await cleanupActiveMenu(userId, buttonInt.channel);

							confirmCollector.stop();
							collector.stop();
							return;
						}

						await addToTab(buttonInt.user.id, buttonInt.guildId!, drink.price!);
						await dismissEphemeral(buttonInt);
					}

					await createAndSendOrderEmbed({
						interaction: buttonInt,
						drink,
						manualMode: false,
						paymentType:
							buttonInt.customId === "put_on_tab"
								? PaymentType.TAB
								: PaymentType.BALANCE,
					});

					await safeFollowUp(buttonInt, {
						content:
							buttonInt.customId === "put_on_tab"
								? "✅ Order placed on your tab!"
								: `✅ Order placed successfully!${drink.price ? `\n💸 You have $${(await getUserBalance(buttonInt.user.id)).balance} left.` : ""}`,
						flags: MessageFlags.Ephemeral,
					});

					await cleanupDisabledMessage(buttonInt, 4000, "complete");
					await cleanupActiveMenu(userId, buttonInt.channel);

					confirmCollector.stop();
					collector.stop();
				}
			});
		}
	});

	collector?.on("end", async () => {
		await cleanupActiveMenu(userId, selectInteraction.channel as TextChannel);
	});
}
