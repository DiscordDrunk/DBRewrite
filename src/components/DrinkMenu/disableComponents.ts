import type {
	AnyComponentBuilder} from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	StringSelectMenuBuilder
} from "discord.js";

export function disableAllComponents(
	components: (ActionRowBuilder<AnyComponentBuilder> | any)[]
): ActionRowBuilder<AnyComponentBuilder>[] {
	return components.map(row => {
		// Ensure row is an ActionRowBuilder
		const newRow = row instanceof ActionRowBuilder ? row : ActionRowBuilder.from(row);

		// Use setComponents to replace the row's components
		newRow.setComponents(
			newRow.components.map(comp => {
				if (comp instanceof ButtonBuilder || comp instanceof StringSelectMenuBuilder) {
					comp.setDisabled(true);
				}
				return comp;
			})
		);

		return newRow;
	});
}
