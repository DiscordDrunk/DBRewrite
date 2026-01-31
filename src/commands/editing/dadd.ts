/* eslint-disable indent */
import { ChatInputCommandInteraction } from "discord.js";
import axios from "axios";
import { ExtendedCommand } from "../../structures/extendedCommand";
import { db } from "../../database/database";
import { permissions } from "../../providers/permissions";

export const command = new ExtendedCommand({
    name: "dadd",
    description: "Manage drink images.",
    local: true,
})
    .addPermission(permissions.developer)
    .setCategory("🔐 Editing")

    // ADD
    .addSubCommand(subcommand =>
        subcommand
            .setName("add")
            .setDescription("Add a new drink image.")
            .addStringOption(option =>
                option.setName("name").setDescription("The name of the drink.").setRequired(true)
            )
            .addStringOption(option =>
                option.setName("url").setDescription("The URL of the drink image.").setRequired(true)
            )
            .addStringOption(option =>
                option.setName("category").setDescription("The category of the drink.").setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName("price").setDescription("The price of the drink (optional).").setRequired(false)
            )
    )

    // REMOVE
    .addSubCommand(subcommand =>
        subcommand
            .setName("remove")
            .setDescription("Remove a specific drink image.")
            .addStringOption(option =>
                option.setName("name").setDescription("The name of the drink to remove.").setRequired(true)
            )
    )

    // EDIT
    .addSubCommand(subcommand =>
        subcommand
            .setName("edit")
            .setDescription("Edit an existing drink image.")
            .addStringOption(option =>
                option.setName("name").setDescription("The name of the drink.").setRequired(true)
            )
            .addStringOption(option =>
                option.setName("new_url").setDescription("The new URL of the drink image.").setRequired(true)
            )
            .addStringOption(option =>
                option.setName("category").setDescription("The category of the drink.").setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName("price").setDescription("The new price of the drink (optional).").setRequired(false)
            )
    )

    // PREVIEW
    .addSubCommand(subcommand =>
        subcommand
            .setName("preview")
            .setDescription("Preview a drink image by name.")
            .addStringOption(option =>
                option.setName("name").setDescription("The name of the drink to preview.").setRequired(true)
            )
    )

    // SHOW
    .addSubCommand(subcommand =>
        subcommand
            .setName("show")
            .setDescription("Show all drink images.")
    )

    // BATCH ADD
    .addSubCommand(subcommand =>
        subcommand
            .setName("batchadd")
            .setDescription("Add multiple drink images in batch.")
            .addStringOption(option =>
                option.setName("batch")
                    .setDescription("Format: name | url | category | price (comma separated)")
                    .setRequired(true)
            )
    )

    // VERIFY ⭐
    .addSubCommand(subcommand =>
        subcommand
            .setName("verify")
            .setDescription("Verify all drink image URLs are still valid.")
    )

    .setExecutor(async (interaction: ChatInputCommandInteraction) => {
        try {
            const subCommand = interaction.options.getSubcommand(true);

            switch (subCommand) {

                case "add": {
                    const name = interaction.options.getString("name", true).toLowerCase();
                    const url = interaction.options.getString("url", true);
                    const category = interaction.options.getString("category", true).toLowerCase();
                    const price = interaction.options.getInteger("price") ?? null;

                    const exists = await db.drinkImage.findFirst({
                        where: { drinkName: name, category },
                    });

                    if (exists) {
                        await interaction.reply(`❌ Image already exists for **${name}**.`);
                        return;
                    }

                    await db.drinkImage.create({
                        data: { drinkName: name, url, category, price },
                    });

                    await interaction.reply(`✅ Added image for **${name}**.`);
                    break;
                }

                case "remove": {
                    const name = interaction.options.getString("name", true).toLowerCase();

                    const image = await db.drinkImage.findFirst({ where: { drinkName: name } });

                    if (!image) {
                        await interaction.reply(`❌ No image found for **${name}**.`);
                        return;
                    }

                    await db.drinkImage.delete({ where: { id: image.id } });
                    await interaction.reply(`🗑️ Removed image for **${name}**.`);
                    break;
                }

                case "edit": {
                    const name = interaction.options.getString("name", true).toLowerCase();
                    const newUrl = interaction.options.getString("new_url", true);
                    const category = interaction.options.getString("category", true).toLowerCase();
                    const price = interaction.options.getInteger("price") ?? null;

                    const image = await db.drinkImage.findFirst({
                        where: { drinkName: name, category },
                    });

                    if (!image) {
                        await interaction.reply(`❌ No image found for **${name}**.`);
                        return;
                    }

                    await db.drinkImage.update({
                        where: { id: image.id },
                        data: { url: newUrl, price },
                    });

                    await interaction.reply(`✅ Updated image for **${name}**.`);
                    break;
                }

                case "preview": {
                    const name = interaction.options.getString("name", true).toLowerCase();

                    const image = await db.drinkImage.findFirst({
                        where: { drinkName: name },
                    });

                    if (!image) {
                        await interaction.reply(`❌ No image found for **${name}**.`);
                        return;
                    }

                    await interaction.reply({
                        embeds: [{
                            title: `Preview: ${name}`,
                            description: `Price: ${image.price ? `$${image.price / 100}` : "Not set"}`,
                            image: { url: image.url },
                            color: 0x00bfff,
                        }],
                    });
                    break;
                }

                case "show": {
                    const drinks = await db.drinkImage.findMany();

                    if (!drinks.length) {
                        await interaction.reply("❌ No drinks found.");
                        return;
                    }

                    await interaction.reply({
                        embeds: [{
                            title: "Drink Images",
                            color: 0x00bfff,
                            fields: drinks.map(d => ({
                                name: d.drinkName,
                                value: `Category: ${d.category}\nPrice: ${d.price ? `$${d.price / 100}` : "Not set"}`,
                                inline: true,
                            })),
                        }],
                    });
                    break;
                }

                case "batchadd": {
                    const batch = interaction.options.getString("batch", true);
                    const lines = batch.split(",").map(l => l.trim());

                    const results: string[] = [];

                    for (const line of lines) {
                        const [name, url, category, priceRaw] = line.split("|").map(v => v?.trim());
                        if (!name || !url || !category) {
                            results.push(`❌ Invalid: ${line}`);
                            continue;
                        }

                        await db.drinkImage.create({
                            data: {
                                drinkName: name.toLowerCase(),
                                url,
                                category: category.toLowerCase(),
                                price: priceRaw ? parseInt(priceRaw) : null,
                            },
                        });

                        results.push(`✅ Added **${name}**`);
                    }

                    await interaction.reply(results.join("\n"));
                    break;
                }

                case "verify": {
                    await interaction.reply("🔎 Verifying image URLs…");

                    const images = await db.drinkImage.findMany({
                        select: { drinkName: true, url: true },
                    });

                    const broken: string[] = [];

                    for (const img of images) {
                        try {
                            let res = await axios.head(img.url, {
                                timeout: 5000,
                                validateStatus: () => true,
                            });

                            if (res.status === 403 || res.status === 405) {
                                res = await axios.get(img.url, {
                                    timeout: 5000,
                                    responseType: "stream",
                                    validateStatus: () => true,
                                });
                            }

                            if (
                                res.status < 200 ||
                                res.status >= 300 ||
                                !res.headers["content-type"]?.startsWith("image/")
                            ) {
                                broken.push(`❌ **${img.drinkName}** → ${res.status}`);
                            }
                        } catch {
                            broken.push(`❌ **${img.drinkName}** → unreachable`);
                        }
                    }

                    await interaction.editReply(
                        broken.length
                            ? `⚠️ Broken images:\n\n${broken.join("\n")}`
                            : "✅ All image URLs are valid!"
                    );
                    break;
                }
            }
        } catch (err) {
            console.error(err);
            await interaction.reply("❌ An error occurred.");
        }
    });
