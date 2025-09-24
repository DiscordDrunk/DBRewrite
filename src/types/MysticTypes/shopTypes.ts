// components/shop/shopTypes.ts
export interface ShopItem {
	id: string;                   // Unique ID of the item/role
	name: string;                 // Name of the item/role
	price: number;                // Cost in coins/credits
	description: string;          // Description or role info
	type: "item" | "role";        // Type of the shop entry
	roleId: string | null;        // Discord role ID if type is "role", otherwise null
	limit: number | null;         // Max quantity user can buy, null = unlimited
	minLevel?: number | null;     // Minimum user level required to buy, optional
}
