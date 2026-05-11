# Fix Menu Responsiveness and Hover Delays

The user reports that menu items hide too fast, making it difficult to interact with them. This is likely caused by the immediate "sticky" behavior in the `MenuBar` and the immediate submenu disposal in `ContextMenu` when neighboring items are hovered.

## User Review Required

> [!IMPORTANT]
> I am proposing a **250ms delay** for hover-based menu switching. This is a standard value used in many IDEs (like VS Code) to provide a balance between responsiveness and accidental trigger prevention.

## Proposed Changes

### UI Library Components

#### [MODIFY] [MenuBar.ts](file:///home/ubuntu/code/war-games/src/client/ui-lib/navigation/MenuBar.ts)
- Add a `hoverTimeout` property to track the pending menu switch.
- Update the `menu-hover` event listener to use `setTimeout`.
- If the mouse leaves a menu item or enters another one before the timeout expires, clear the timeout.

#### [MODIFY] [ContextMenu.ts](file:///home/ubuntu/code/war-games/src/client/ui-lib/overlays/ContextMenu.ts)
- Add a `hoverTimeout` property to the `ContextMenu` class.
- Update `onmouseenter` to delay submenu opening and current submenu disposal.
- Update `onmouseleave` to cancel any pending submenu operations if the mouse leaves the entire menu area.

## Verification Plan

### Manual Verification
- Open the application in the browser.
- Click a top-level menu (e.g., "View").
- Move the mouse horizontally across the menu bar. The menus should only switch after a brief pause (250ms) on each item.
- Right-click to open a context menu with submenus.
- Move the mouse over an item with a submenu, then quickly move to another item. The submenu should not flicker or disappear immediately.
