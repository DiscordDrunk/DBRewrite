// components/index.ts
// ============================
// Barrel file for DrinkMenu components & safe interaction utilities
// ============================

// ---------------------------
// 1️⃣ Drink Menu Components
// ---------------------------
export * from "../DrinkMenuComp"; // All DrinkMenu-related components

// ---------------------------
// 2️⃣ Safe Interaction Utilities
// ---------------------------
// Only export safeSend from SafeInteractions to avoid conflicts
export { safeSend } from "../SafeInteractions";

// ---------------------------
// 3️⃣ Other DrinkMenu Utilities
// ---------------------------
// Export the rest of your utility functions, including the ones that conflict
export {
	safeFollowUp,
	safeDeferUpdate,
	safeUpdate,
	safeReply,
	setCooldown
} from "./drinkMenuUtils";
