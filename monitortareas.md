# Design System Specification: Institutional Elegance & Spatial Depth

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves away from the rigid, boxed-in aesthetics of traditional SaaS. Our Creative North Star is **"The Digital Curator."** We treat every dashboard as an editorial spread—authoritative, airy, and premium. By leaning into the institutional weight of deep burgundy and the warmth of sand-toned neutrals, we create an environment that feels less like a "utility" and more like a high-end command center.

The hallmark of this system is **intentional asymmetry and tonal layering**. We reject the "flat grid" in favor of stacked physical layers. We use extreme white space to separate thoughts and subtle background shifts to define zones, creating a 2026-standard interface that breathes and adapts.

---

## 2. Color Palette & Surface Philosophy
The palette is built on a foundation of high-contrast "Institutional Maroon" and "Warm Sand."

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections or cards. 
Structure must be achieved through:
- **Tonal Shifts:** Placing a `surface-container-low` component on a `background` (#fef8f9) floor.
- **Negative Space:** Using the `Spacing Scale` (12 or 16) to create conceptual boundaries.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper.
- **Level 0 (Floor):** `surface` (#fef8f9) - The primary canvas.
- **Level 1 (Sections):** `surface-container-low` (#f8f2f3) - Softly recessed areas.
- **Level 2 (Active Cards):** `surface-container-lowest` (#ffffff) - Bright, elevated elements that "pop" forward.
- **Level 3 (Overlays):** `surface-bright` (#fef8f9) - High-visibility floating elements.

### Glass & Gradients
To avoid a "flat" look, CTAs and primary Hero sections should utilize a **Signature Texture**:
- **Gradient:** Linear `primary` (#620b27) to `primary_container` (#80243d).
- **Glassmorphism:** For floating navigation or tooltips, use `surface_container_lowest` at 80% opacity with a `24px` backdrop-blur.

---

## 3. Typography: Editorial Authority
We use **Inter** exclusively, relying on dramatic weight shifts and spacing to communicate hierarchy.

| Token | Size | Weight | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `display-lg` | 3.5rem | 700 | -0.04em | High-impact metrics / Hero titles |
| `headline-md` | 1.75rem | 600 | -0.02em | Section headers |
| `title-sm` | 1.0rem | 600 | 0.01em | Card titles / Navigation |
| `body-md` | 0.875rem | 400 | 0 | General content |
| `label-md` | 0.75rem | 600 | 0.05em | Uppercase status labels / Small caps |

**Signature Stylization:** For "Institutional" sections (like "MONITOR DE TAREAS"), use `title-sm` in bold with the `on_surface_variant` (#554245) to convey a sense of archival permanence.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too heavy for a 2026 aesthetic. We use **Ambient Depth**.

*   **The Layering Principle:** Rather than adding a shadow to every card, use a `surface-container-lowest` (#ffffff) card nested within a `surface-container` (#f2eced) background. The contrast in value creates the illusion of lift.
*   **Ambient Shadows:** For floating Modals or Popovers, use a shadow with a 40px blur, 0px offset, and 6% opacity using a tint of the brand color (`on_primary_fixed_variant`).
*   **The Ghost Border:** If a boundary is strictly required for accessibility (e.g., input fields), use `outline-variant` (#dbc0c3) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components & Interaction Patterns

### Buttons (The "Jewel" CTAs)
- **Primary:** Gradient from `#620b27` to `#80243d`. Rounded-xl (16px). White text. No border.
- **Secondary:** Surface-container-highest (#e7e1e2) with `primary` text. Use for secondary actions.
- **Tertiary:** Text-only in `primary`. No container unless hovered.

### Status Badges (Semantic Clarity)
Following the "GeoNav" screenshot's need for status tracking:
- **Pending:** `surface-container-low` background, `on_surface_variant` text.
- **In Progress:** Subtle `secondary_container` (#fed795) fill with `on_secondary_container` (#795c26) text.
- **Completed:** Mint-tinted container (calculated as a tertiary shift) with green-toned text.
*Note: All badges use `rounded-full` (9999px) and `label-md` typography.*

### Cards & Lists
- **Rule:** Forbid divider lines (`<hr>`). 
- **Pattern:** Use a `1.5rem` (Spacing 6) vertical gap between list items. Use a `surface-container-low` background on hover to indicate interactivity.
- **Corner Radius:** All cards must use `rounded-xl` (16px) or `rounded-lg` (12px).

### Input Fields
- **Default:** `surface-container-lowest` fill, no border. `rounded-md` (0.75rem).
- **Focus:** Add the "Ghost Border" (outline-variant at 20%) and a soft `primary` glow.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical spacing. A wider left margin than right margin can make a dashboard feel like a high-end magazine.
*   **Do** use `primary_fixed_dim` for non-critical accents to maintain brand presence without visual noise.
*   **Do** prioritize `body-lg` for readability in data-heavy views.

### Don't:
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#1d1b1c) to maintain the "ink on sand" feel.
*   **Don't** use standard "Drop Shadows." They clutter the clean 2026 layout. Use background color steps instead.
*   **Don't** use sharp corners. Everything—from checkboxes to main containers—must adhere to the `rounded-lg` or `rounded-xl` scale to maintain a soft, premium feel.