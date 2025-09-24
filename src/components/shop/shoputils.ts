import { db } from "../../database/database";
import { Guild, GuildMember } from "discord.js";
import type { ShopItem } from "../../types/MysticTypes/shopTypes";

/** Fetch all shop items */
export async function getShopItems() {
	return db.shopItem.findMany();
}

/** Buy an item or role */
export async function buyItem(userId: string, itemId: string, guild?: Guild) {
	const item = await db.shopItem.findUnique({ where: { id: itemId } });
	if (!item) return { success: false, message: "Item not found." };

	// Role purchase
	if (item.type === "role" && item.roleId) {
		if (!guild) return { success: false, message: "Guild not provided for role assignment." };

		const member = await guild.members.fetch(userId).catch(() => null);
		const role = guild.roles.cache.get(item.roleId);
		if (!member || !role) return { success: false, message: "Member or role not found." };

		if (member.roles.cache.has(role.id)) return { success: false, message: `You already have the **${role.name}** role.` };

		await member.roles.add(role).catch(() => null);
		return { success: true, message: `✅ You have received the **${role.name}** role!` };
	}

	// Normal item purchase
	const user = await db.userInfo.findUnique({ where: { id: userId } });
	if (!user || user.balance < item.price) return { success: false, message: "Not enough credits." };

	const inventory = await db.inventoryItem.findFirst({ where: { userId, itemId } });
	if (item.limit != null && inventory && inventory.quantity >= item.limit) {
		return { success: false, message: `You can only buy a maximum of ${item.limit} of this item.` };
	}

	await db.userInfo.update({
		where: { id: userId },
		data: { balance: user.balance - item.price },
	});

	await db.inventoryItem.upsert({
		where: { userId_itemId: { userId, itemId } },
		update: { quantity: { increment: 1 } },
		create: { userId, itemId, quantity: 1 },
	});

	return { success: true, message: `✅ Bought ${item.name} for ${item.price} credits!` };
}

/** 
 * Get ownership and remaining quantity for a user and a shop item
 */
export async function getOwnershipInfo(
	userId: string,
	item: ShopItem,
	member?: GuildMember
) {
	let ownedQuantity = 0;

	if (item.type === "role" && item.roleId) {
		if (member) {
			ownedQuantity = member.roles.cache.has(item.roleId) ? 1 : 0;
		} else {
			ownedQuantity = 0;
		}
	} else {
		const inventoryItems = await db.inventoryItem.findMany({ where: { userId, itemId: item.id } });
		ownedQuantity = inventoryItems.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0);
	}

	const remaining = item.type === "role"
		? ownedQuantity ? 0 : 1
		: item.limit != null
			? Math.max(item.limit - ownedQuantity, 0)
			: Infinity;

	const canBuy = remaining > 0;

	return { ownedQuantity, remaining, canBuy };
}
