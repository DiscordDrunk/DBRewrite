import { createPublicCommand } from "../../utils/MysticUtils/Commands/commandHelpers";
import {
	StringSelectMenuBuilder,
	ActionRowBuilder,
	ComponentType,
	TextBasedChannel,
} from "discord.js";
import { getShopItems } from "../../components/shop/shoputils";
import { safeReply } from "../../components/SafeInteractions";
import { activeMenus, cleanupActiveMenu } from "../../components/DrinkMenu/cleanupActiveMenu";
import { handleShopPages } from "../../components/shop/handleShopPages";
import type { ShopItem } from "../../types/MysticTypes/shopTypes";

export const command = createPublicCommand({
	name: "shopmenu",
	description: "View shop items or roles in a select menu",
})
	.setCategory("🛒 Shop")
	.setExecutor(async (interaction) => {
		if (!interaction.isCommand() || !interaction.channel) return;

		if (activeMenus.has(interaction.user.id)) {
			await safeReply(interaction, { content: "You already have an active shop menu!", ephemeral: true });
			return;
		}

		const rawItems = await getShopItems();
		if (!rawItems.length) {
			await safeReply(interaction, { content: "The shop is empty right now.", ephemeral: true });
			return;
		}

		const items: ShopItem[] = rawItems.map(i => ({
			...i,
			type: i.type === "role" ? "role" : "item",
		}));

		// Category select menu
		const categoryMenu = new StringSelectMenuBuilder()
			.setCustomId("shop_category")
			.setPlaceholder("Select a category")
			.addOptions([
				{ label: "Items", value: "items", emoji: "🧰" },
				{ label: "Roles", value: "roles", emoji: "🎨" },
			]);

		const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu);

		// Send public category menu
		const categoryMessage = await safeReply(interaction, {
			content: "📋 Select a category:",
			components: [categoryRow],
			ephemeral: false,
		});
		if (!categoryMessage) return;

		activeMenus.set(interaction.user.id, {
			messageId: categoryMessage.id,
			channelId: categoryMessage.channel.id,
			ephemeral: false,
		});

		// Wait for category selection
		const categoryInteraction = await categoryMessage.awaitMessageComponent({
			componentType: ComponentType.StringSelect,
			filter: i => i.user.id === interaction.user.id,
			time: 30_000,
		}).catch(async () => {
			await cleanupActiveMenu(interaction.user.id, interaction.channel as TextBasedChannel);
			return null;
		});

		if (!categoryInteraction || !categoryInteraction.isStringSelectMenu()) {
			await cleanupActiveMenu(interaction.user.id, interaction.channel as TextBasedChannel);
			return;
		}

		await categoryInteraction.deferUpdate();

		// Clean up the public category menu
		await cleanupActiveMenu(interaction.user.id, interaction.channel as TextBasedChannel);

		// Pass selection to handleShopPages (starts the item select → ephemeral buy flow)
		await handleShopPages(
			categoryInteraction,
			categoryInteraction.values[0] as "items" | "roles",
			items,
			interaction.user.id
		);
	});
