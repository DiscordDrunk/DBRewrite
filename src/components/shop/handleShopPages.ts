import type { StringSelectMenuInteraction, TextChannel } from "discord.js";
import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
} from "discord.js";
import { db } from "../../database/database";
import { buyItem, getOwnershipInfo } from "../../components/shop/shoputils";
import { activeMenus, cleanupActiveMenu, sendInactivityNotice } from "../index";
import { getUserLevel } from "../../events/MysticEvents/XP/xpUtils";
import type { ShopItem } from "../../types/MysticTypes/shopTypes";
export async function handleShopPages(
	interaction: StringSelectMenuInteraction,
	category: "items" | "roles",
	items: ShopItem[],
	userId: string
) {
	const guild = interaction.guild;
	if (!guild) return;
	const channel = interaction.channel;
	if (!channel || !("send" in channel)) return;
	const textChannel = channel as TextChannel;

	const filteredItems = items.filter(i =>
		category === "roles" ? i.type === "role" : i.type === "item"
	);

	if (!filteredItems.length) {
		await interaction.followUp({ content: "No items available in this category.", ephemeral: true });
		return;
	}

	let selectedItemIndex: number | null = null;

	const buildSelectMenu = async () => {
		const options = [];
		const member = await guild.members.fetch(userId);

		for (const i of filteredItems) {
			const ownership = await getOwnershipInfo(userId, i, member);
			const { remaining, canBuy } = ownership;

			let labelDesc = i.type === "role"
				? `${i.description ?? "Grants a special role!"} — Price: ${i.price} coins`
				: `Price: ${i.price} coins${i.limit != null ? ` — Remaining: ${remaining}` : " — Unlimited"}`;

			if (i.minLevel) labelDesc += ` — Requires Level ${i.minLevel}`;

			options.push({
				label: i.name,
				description: labelDesc,
				value: i.id,
				disabled: !canBuy,
				default: false
			});
		}

		return new StringSelectMenuBuilder()
			.setCustomId("shop_item_select")
			.setPlaceholder(`Select a ${category === "roles" ? "role" : "item"}`)
			.addOptions(options);
	};

	// Public select menu for items/roles
	const menuMessage = await interaction.followUp({
		content: `📋 Select a ${category === "roles" ? "role" : "shop item"}:`,
		components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(await buildSelectMenu())],
		ephemeral: false,
	});
	if (!menuMessage) return;

	activeMenus.set(userId, {
		messageId: menuMessage.id,
		channelId: menuMessage.channel.id,
		ephemeral: false,
	});

	// -----------------------------
	// Wait for item selection (10s timeout)
	// -----------------------------
	const itemInteraction = await menuMessage.awaitMessageComponent({
		componentType: ComponentType.StringSelect,
		filter: i => i.user.id === userId,
		time: 10_000, // adjustable
	}).catch(() => null);

	if (!itemInteraction || !itemInteraction.isStringSelectMenu() || itemInteraction.values[0] === "none") {
		await cleanupActiveMenu(userId, textChannel);
		await sendInactivityNotice(userId, textChannel, "⏳ Menu closed due to inactivity.");
		return;
	}

	await itemInteraction.deferUpdate();
	await cleanupActiveMenu(userId, textChannel);

	selectedItemIndex = filteredItems.findIndex(i => i.id === itemInteraction.values[0]);
	const selectedItem = filteredItems[selectedItemIndex];
	if (!selectedItem) {
		await sendInactivityNotice(userId, textChannel, "⏳ Menu closed due to inactivity.");
		return;
	}

	const member = await guild.members.fetch(userId);
	const userLevel = await getUserLevel(userId, guild.id);
	const meetsLevel = !selectedItem.minLevel || userLevel >= selectedItem.minLevel;

	const ownership = await getOwnershipInfo(userId, selectedItem, member);
	const { remaining, canBuy } = ownership;

	// Buy button & embed
	const buyButton = new ButtonBuilder()
		.setCustomId(`buy_${selectedItem.id}`)
		.setLabel(canBuy ? `Buy ${selectedItem.name}` : "Already Owned")
		.setStyle(canBuy && meetsLevel ? ButtonStyle.Primary : ButtonStyle.Secondary)
		.setDisabled(!canBuy || !meetsLevel);

	const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(buyButton);

	const confirmEmbed = new EmbedBuilder()
		.setTitle("🛒 Confirm Purchase")
		.setDescription(
			`**${selectedItem.name}** — Price: ${selectedItem.price} coins
${selectedItem.type === "role" ? selectedItem.description ?? "" : ""}
${selectedItem.type === "item" && selectedItem.limit != null ? `\nRemaining you can buy: ${remaining}` : ""}
${selectedItem.minLevel ? `\nRequirement: ${meetsLevel ? "✅" : "❌"} Level ${selectedItem.minLevel} (You are Level ${userLevel})` : ""}`
		)
		.setColor(meetsLevel ? 0x00ff00 : 0xff0000);

	const ephemeralMessage = await itemInteraction.followUp({
		embeds: [confirmEmbed],
		components: [buttonRow],
		ephemeral: true,
	});

	activeMenus.set(userId, {
		messageId: ephemeralMessage.id,
		channelId: ephemeralMessage.channel.id,
		ephemeral: true,
	});

	// -----------------------------
	// Wait for purchase button (10s timeout)
	// -----------------------------
	const buttonInteraction = await itemInteraction.channel?.awaitMessageComponent({
		componentType: ComponentType.Button,
		filter: i => i.user.id === userId,
		time: 10_000, // adjustable
	}).catch(() => null);

	if (!buttonInteraction || !buttonInteraction.isButton()) {
		await cleanupActiveMenu(userId, textChannel);
		await sendInactivityNotice(userId, textChannel, "⏳ Purchase canceled due to inactivity.");
		return;
	}

	await buttonInteraction.deferUpdate();

	// Purchase logic
	if (buttonInteraction.customId.startsWith("buy_")) {
		if (!meetsLevel) {
			await buttonInteraction.followUp({ content: "❌ You do not meet the level requirement.", ephemeral: true });
		} else if (selectedItem.type === "role" && selectedItem.roleId) {
			const user = await db.userInfo.findUnique({ where: { id: userId } });
			const role = guild.roles.cache.get(selectedItem.roleId);
			if (user && role && user.balance >= selectedItem.price) {
				await db.userInfo.update({ where: { id: userId }, data: { balance: user.balance - selectedItem.price } });
				await member.roles.add(role);
				await buttonInteraction.followUp({ content: `✅ Bought role <@&${role.id}>!`, ephemeral: true });
			} else {
				await buttonInteraction.followUp({ content: "❌ Cannot buy role.", ephemeral: true });
			}
		} else {
			const result = await buyItem(userId, selectedItem.id, guild);
			const user = await db.userInfo.findUnique({ where: { id: userId } });
			const balanceText = user ? ` (Balance: ${user.balance} coins)` : "";
			await buttonInteraction.followUp({ content: `${result.message}${balanceText}`, ephemeral: true });
		}

		buyButton.setLabel("Already Owned").setDisabled(true).setStyle(ButtonStyle.Secondary);
		await buttonInteraction.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buyButton)] });
	}

	await cleanupActiveMenu(userId, textChannel);
}
