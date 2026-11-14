<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## DigiWallet styling conventions

- Use CSS Modules (`*.module.css`) for component-specific and feature-specific styles. Keep a module beside its component or feature folder, and import it from the component that uses it.
- Keep `app/globals.css` limited to the Tailwind import, design tokens/custom properties, reset rules, document/body defaults, typography, and styles that truly apply across the whole app.
- Put reusable visual patterns in the shared component that owns them. Avoid duplicating component styles or adding new feature selectors to `globals.css`.
- Use CSS custom properties from the global theme for shared colors, spacing, radii, and typography. Use `:global(...)` in modules only when an intentional global selector is needed.
- When editing an existing component, move the relevant old global rules into its CSS Module as part of that change when practical; migrate incrementally instead of rewriting all styles at once.
- Keep markup and classes readable, preserve the mobile-first layout, and check changed screens at narrow and desktop widths. Do not introduce a second styling convention for the same component.
