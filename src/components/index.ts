// components/DrinkMenu/index.ts
// ======================================================
// 🍹 Drink Menu Public API
// Central export hub for menu interactions, helpers,
// state, and handlers.
// ======================================================


// ------------------------------------------------------
// 🛡️ Safe Interaction Utilities
// Wrapper helpers to prevent double replies, race
// conditions, and Discord interaction errors.
// ------------------------------------------------------
export {
	safeReply,
	safeFollowUp,
	safeSend,
	safeUpdate,
	safeDeferUpdate,
} from "../components/DrinkMenu/other/SafeInteractions";


// ------------------------------------------------------
// 🧹 Menu Lifecycle & Cleanup
// Handles stale menus, disabled components, inactivity,
// and general interaction cleanup.
// ------------------------------------------------------
export {
	cleanupDisabledMessage,
	cleanupActiveMenu,
	sendInactivityNotice,
} from "../components/DrinkMenu/other/CleanupActiveMenu";

export {
	disableAllComponents,
} from "../components/DrinkMenu/other/disableComponents";


// ------------------------------------------------------
// ⏱️ Cooldowns
// Localized cooldowns specifically for menu navigation
// and button spam protection.
// ------------------------------------------------------
export {
	setButtonCooldown,
} from "../components/DrinkMenu/other/ButtonCooldown";


// ------------------------------------------------------
// 🧩 Menu Component Builders
// Reusable Discord component factories used throughout
// the drink menu flow.
// ------------------------------------------------------
export {
	createDrinkSelectMenu,
	createNavigationButtons,
	createConfirmationButtons,
	createCategorySelectMenu,
} from "./DrinkMenu/other/DrinkMenuComp";


// ------------------------------------------------------
// 🔒 Active Menu Guards
// Ensures only one active menu per user and prevents
// overlapping interactions.
// ------------------------------------------------------
export {
	ensureMenuIsActive,
} from "./DrinkMenu/other/ensureMenuIsActive";


// ------------------------------------------------------
// 📦 Menu State
// In-memory tracking for active menus per user.
// ------------------------------------------------------
export {
	activeMenus,
} from "../components/DrinkMenu/state";


// ------------------------------------------------------
// 🧠 Handlers
// High-level logic controllers for menu navigation
// and category selection.
// ------------------------------------------------------
export {
	handleDrinkPages,
} from "../components/DrinkMenu/Handlers/DrinkPageHandler";

export {
	renderCategoryMenu,
} from "../components/DrinkMenu/Handlers/CategoryHandler";

export {
	smartRespond
} from "../components/DrinkMenu/Helpers/smartRespond";