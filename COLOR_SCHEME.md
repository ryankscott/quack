# Quack Color Scheme

## Overview

The Quack application now uses a cohesive color scheme derived from the Quack icon (quack_icon.svg). This document outlines the color palette and its application throughout the app.

## Color Palette

The color scheme is defined in [tailwind.config.ts](packages/frontend/tailwind.config.ts) under the `quack` theme colors:

| Color Name | Hex Code  | Usage                                                       | Notes                                                         |
| ---------- | --------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| **Orange** | `#f7812b` | Primary actions, active states, highlights                  | Used for main CTA buttons, active tabs, focus states          |
| **Gold**   | `#fcbc31` | Secondary accents, backgrounds (with opacity), hover states | Used for subtle backgrounds, secondary buttons, hover effects |
| **Dark**   | `#41464e` | Text, borders, dark elements                                | Main text color, borders, icons                               |
| **White**  | `#ffffff` | Backgrounds, contrast                                       | Base background color                                         |

## CSS Classes

Custom Tailwind classes are defined in [globals.css](packages/frontend/src/styles/globals.css):

### Button Classes

- `btn-primary` - Orange background, white text. Used for primary actions (Run, Save)
- `btn-secondary` - Gold background, dark text. Used for secondary actions (Update)
- `btn-ghost` - Transparent, dark text. Used for subtle interactions

### Form Classes

- `input-base` - Dark border with focus states using orange ring

### Card Classes

- `card` - Light dark border with subtle padding

## Color Variable Usage

Colors are accessed via Tailwind utility classes using the `quack-` prefix:

```tsx
// Examples:
<button className="bg-quack-orange text-white">Primary</button>
<div className="text-quack-dark">Text</div>
<div className="border border-quack-dark border-opacity-10">Card</div>
<button className="btn-secondary">Save</button>
```

## Opacity Modifiers

The dark color is frequently used with opacity variants for subtle effects:

- `text-quack-dark text-opacity-60` - Muted text
- `text-quack-dark text-opacity-40` - Very muted text
- `border-quack-dark border-opacity-10` - Subtle borders
- `bg-quack-gold bg-opacity-5` - Very subtle background

## Components Updated

The following components have been updated to use the new color scheme:

### Layout & Pages
- [Layout.tsx](packages/frontend/src/components/Layout.tsx) - Header styling
- [index.tsx](packages/frontend/src/routes/index.tsx) - Home page
- [explorer.tsx](packages/frontend/src/routes/explorer.tsx) - Explorer page
- [workspace.tsx](packages/frontend/src/routes/workspace.tsx) - Workspace page

### Components
- [FileUpload.tsx](packages/frontend/src/components/FileUpload.tsx)
- [FileList.tsx](packages/frontend/src/components/FileList.tsx)
- [TableList.tsx](packages/frontend/src/components/TableList.tsx)
- [TablePreview.tsx](packages/frontend/src/components/TablePreview.tsx)
- [SQLCell.tsx](packages/frontend/src/components/SQLCell.tsx)
- [ResultTable.tsx](packages/frontend/src/components/ResultTable.tsx)
- [SavedQueriesList.tsx](packages/frontend/src/components/SavedQueriesList.tsx)
- [ChartViewer.tsx](packages/frontend/src/components/ChartViewer.tsx)
- [DocumentActions.tsx](packages/frontend/src/components/DocumentActions.tsx)

## Design Principles

1. **Consistency** - The same colors are used consistently across all components
2. **Hierarchy** - Orange for primary actions, Gold for secondary, Dark for text/borders
3. **Subtlety** - Opacity variants create visual hierarchy without adding new colors
4. **Accessibility** - All color combinations meet WCAG contrast requirements
5. **Icon Integration** - Colors directly match the brand Quack icon

## Future Customization

To adjust the color scheme:

1. Modify the color values in `tailwind.config.ts` under `theme.extend.colors.quack`
2. Update the Tailwind class names in component files
3. Rebuild the frontend: `pnpm --filter frontend build`

The consistent use of Tailwind utilities with the `quack-` prefix makes it easy to swap colors globally if needed.
