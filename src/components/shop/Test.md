
# Mystic Shop Menu System

This document explains the **Mystic Shop menu system**, including timeouts, cleanup logic, and inactivity notices.

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Timeout Reference Table](#timeout-reference-table)
4. [Usage Examples](#usage-examples)
5. [Tips](#tips)
6. [Quick Reference](#quick-reference)

---

## Overview

The shop system handles:

- Tracking active shop menus per user (`activeMenus`)
- Cleaning up messages when menus are closed (`cleanupActiveMenu`)
- Sending ephemeral inactivity notices (`sendInactivityNotice`)

All menus (category select, item/role select, and purchase confirmation) use this system for consistency.

---

## How It Works

- Each user’s active menu is stored in `activeMenus`:

| Key        | Value                                   |
| ---------- | --------------------------------------- |
| `userId` | `{ messageId, channelId, ephemeral }` |

- When a menu times out (no interaction after X ms):

  1. `cleanupActiveMenu(userId, channel)` removes the menu from memory and deletes public messages.
  2. `sendInactivityNotice(userId, channel, message?, displayTimeMs?)` shows a short ephemeral message notifying the user.

---

## Timeout Reference Table

| Menu Type               | Default Timeout | File / Location                     |
| ----------------------- | --------------- | ----------------------------------- |
| Category Select Menu    | 10,000 ms       | /commands/shopmenu.ts               |
| Item / Role Select Menu | 10,000 ms       | /components/shop/handleShopPages.ts |
| Buy Confirmation Menu   | 10,000 ms       | /components/shop/handleShopPages.ts |

**Notes:**

- Timeouts are in milliseconds.
- To increase reading time for users:
  - `10_000 → 15_000` (15 seconds)
  - `10_000 → 20_000` (20 seconds)
- Ephemeral inactivity notices use `sendInactivityNotice(userId, channel, message?, displayTimeMs?)`
  - Default `displayTimeMs = 5,000` ms (5 seconds)

---

## Usage Examples

```ts
// Clean up a menu and notify the user
await cleanupActiveMenu(userId, textChannel);
await sendInactivityNotice(userId, textChannel, "⏳ Menu closed due to inactivity.", 5000);
```
