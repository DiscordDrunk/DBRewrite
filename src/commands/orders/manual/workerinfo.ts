/* eslint-disable quotes */
/* eslint-disable indent */
import { ChatInputCommandInteraction } from "discord.js";
import { permissions } from "../../../providers/permissions";
import { ExtendedCommand } from "../../../structures/extendedCommand";
import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const command = new ExtendedCommand(
    { name: "workerinfo", description: "Tracks the number of orders an employee has prepared and delivered.", local: true }
)
    .addPermission(permissions.employee)
    .setCategory("👊manual")
    .addOption("user", (o) =>
        o.setName("employee")
            .setDescription("The employee whose stats to check.")
            .setRequired(false)
    )
    .setExecutor(async (interaction: ChatInputCommandInteraction) => {
        let employeeId = interaction.user.id; // default to the user running the command

        const employeeOption = interaction.options.getUser("employee");
        if (employeeOption) {
            employeeId = employeeOption.id;
        }

        // Count total prepared orders
        const totalPreparations = await prisma.orders.count({
            where: {
                claimer: employeeId,
                status: { not: OrderStatus.Unprepared },
            },
        });

        // Count total delivered orders
        const totalDeliveries = await prisma.orders.count({
            where: {
                deliverer: employeeId,
                status: OrderStatus.Delivered,
            },
        });

        const username = employeeOption ? employeeOption.username : interaction.user.username;

        await interaction.reply(
            `${username} has prepared ${totalPreparations} orders and delivered ${totalDeliveries} orders.`
        );
    });
