import { permissions } from "../../providers/permissions";
import { db } from "../../database/database";
import { ExtendedCommand } from "../../structures/extendedCommand";
import { config } from "../../providers/config";
import { safeSend } from "../../components/index";


export const command = new ExtendedCommand({
	name: "shopadmin",
	description: "Admin: manage shop items.",
	servers: [config.servers.local],
	local: true,
})
	.addPermission(permissions.developer)
	.setCategory("🛒 Shop")
	.addSubCommand((sub) =>
		sub
			.setName("add")
			.setDescription("Add a new item to the shop.")
			.addStringOption((option) =>
				option.setName("name").setDescription("Name of the item").setRequired(true)
			)
			.addIntegerOption((option) =>
				option.setName("price").setDescription("Price of the item").setRequired(true)
			)
			.addIntegerOption((option) =>
				option.setName("limit").setDescription("Maximum number a single user can buy (optional)")
			)
			.addStringOption((option) =>
				option.setName("roleid").setDescription("Optional: Discord Role ID to assign if this item grants a role")
			)
			.addIntegerOption((option) =>
				option.setName("minlevel").setDescription("Optional: Minimum level required to buy this role")
			)
			.addStringOption((option) =>
				option.setName("description").setDescription("Optional: Description for this role/item")
			)
	)
	.addSubCommand((sub) =>
		sub
			.setName("remove")
			.setDescription("Remove an item from the shop.")
			.addStringOption((option) =>
				option.setName("name").setDescription("Name of the item to remove").setRequired(true)
			)
	)
	.addSubCommand((sub) =>
		sub
			.setName("edit")
			.setDescription("Edit an existing shop item.")
			.addStringOption((option) =>
				option.setName("name").setDescription("Name of the item to edit").setRequired(true)
			)
			.addIntegerOption((option) =>
				option.setName("price").setDescription("New price of the item (optional)")
			)
			.addIntegerOption((option) =>
				option.setName("limit").setDescription("Maximum number a single user can buy (optional)")
			)
			.addStringOption((option) =>
				option.setName("roleid").setDescription("Discord Role ID to assign if this item grants a role (optional)")
			)
			.addIntegerOption((option) =>
				option.setName("minlevel").setDescription("Minimum level required to buy this role (optional)")
			)
			.addStringOption((option) =>
				option.setName("description").setDescription("Optional: Description for this role/item")
			)
	)
	.setExecutor(async (int) => {
		const subcommand = int.options.getSubcommand(true);
		const name = int.options.getString("name", true);
		const price = int.options.getInteger("price");
		const limit = int.options.getInteger("limit");
		const roleId = int.options.getString("roleid");
		const minLevel = int.options.getInteger("minlevel");
		const description = int.options.getString("description");

		try {
			if (subcommand === "add") {
				await db.shopItem.create({
					data: {
						name,
						price: price!,
						description: description ?? (roleId ? "Grants a Discord role" : "Test item"),
						type: roleId ? "role" : "item",
						roleId: roleId ?? null,
						limit: limit ?? null,
						minLevel: roleId ? minLevel ?? null : null,
					},
				});
				await safeSend(int, {
					content: `✅ Added item **${name}** for ${price} credits${limit ? ` with limit ${limit}` : ""
					}${roleId ? ` (assigns role <@&${roleId}>)` : ""}${minLevel ? ` — Requires Level ${minLevel}` : ""
					}${description ? ` — "${description}"` : ""}.`,
				});
			} else if (subcommand === "remove") {
				await db.shopItem.deleteMany({ where: { name } });
				await safeSend(int, { content: `❌ Removed item **${name}**.` });
			} else if (subcommand === "edit") {
				const updateData: Record<string, any> = {};
				if (price !== null) updateData.price = price;
				if (limit !== null) updateData.limit = limit;
				if (roleId !== null) updateData.roleId = roleId;
				if (description !== null) updateData.description = description;
				if (minLevel !== null) updateData.minLevel = minLevel;

				if (!Object.keys(updateData).length) {
					await safeSend(int, {
						content: "You must provide a new price, limit, role ID, description, or minimum level to edit an item.",
					});
					return;
				}

				await db.shopItem.updateMany({ where: { name }, data: updateData });
				await safeSend(int, {
					content: `✏️ Updated item **${name}**${price ? ` to ${price} credits` : ""
					}${limit ? ` with limit ${limit}` : ""}${roleId ? ` (assigns role <@&${roleId}>)` : ""
					}${minLevel ? ` — Requires Level ${minLevel}` : ""}${description ? ` — "${description}"` : ""}.`,
				});
			} else {
				await safeSend(int, { content: "This subcommand is not implemented." });
			}
		} catch (error) {
			console.error("Error managing shop item:", error);
			await safeSend(int, {
				content: "❌ An error occurred while managing the shop item.",
			});
		}
	});
