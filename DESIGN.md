# Design System Documentation: Civic Nexus

## 1. Overview & Creative North Star
The design system is anchored by a Creative North Star titled **"The Institutional Curator."** 

Moving away from the sterile, "template-heavy" look of traditional administrative portals, this system treats digital space as a high-end editorial gallery. It balances the authority of the state with the transparency of modern governance. We achieve this through **Organic Brutalism**: a marriage of rigid, institutional Maroon (`#811B5A`) with soft, parchment-like backgrounds (`#fdf9f1`) and generous, asymmetric whitespace. The interface does not "contain" information in boxes; it "presents" it on layered planes.

---

## 2. Colors & Atmospheric Tone
The palette is rooted in a heritage Maroon and a refreshing Sage, balanced by a sophisticated range of "Sand" neutrals.

### The Palette
- **Primary Anchor:** `primary` (#620041) and `primary_container` (#811B5A). These are the colors of authority and must be used with surgical precision—reserved for key actions and navigational anchors.
- **The Civic Breath:** `secondary_container` (#d0e8b5). Used to highlight growth, community, and positive feedback.
- **The Foundation:** `surface` (#fdf9f1) and `surface_container` series. These are the "paper" of our digital experience.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to define sections. Boundaries must be defined solely through background color shifts.
*   *Example:* A `surface_container_low` (#f7f3eb) section sitting on a `surface` (#fdf9f1) background provides enough contrast to signify a new area without the "clutter" of a structural line.

### Signature Textures & Gradients
To avoid a "flat" government feel, use subtle gradients for Hero backgrounds or primary CTAs. Transition from `primary` (#620041) to `primary_container` (#811B5A) at a 135-degree angle. This adds a "silk-like" depth that suggests premium quality.

---

## 3. Typography: The Editorial Voice
Our typography pairing reflects a dialogue between the modern citizen and the established institution.

- **Display & Headlines (Plus Jakarta Sans):** These are your "Signature" elements. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an authoritative, editorial impact.
- **Body & Labels (Inter):** Inter provides the functional clarity required for administrative tasks. Use `body-md` (0.875rem) as your workhorse for all data-heavy sections.

**The Hierarchy Rule:** Always lead with a large `headline-lg` in Plus Jakarta Sans. Ensure there is at least a `12` (3rem) spacing gap between major headlines and body text to let the layout "breathe."

---

## 4. Elevation & Depth: Tonal Layering
In this design system, "Elevation" is not about shadows—it is about **Tonal Stacking**.

### The Layering Principle
Depth is achieved by stacking `surface-container` tiers from "Lowest" to "Highest."
1.  **Level 0 (Base):** `surface` (#fdf9f1).
2.  **Level 1 (Sections):** `surface_container_low` (#f7f3eb).
3.  **Level 2 (Cards/Interaction):** `surface_container_lowest` (#ffffff).

### Ambient Shadows
When an element must "float" (e.g., a modal or a primary action button), use a **Civic Shadow**:
- **Color:** A tinted version of `on_surface` (#1c1c17) at 6% opacity.
- **Blur:** 24px to 40px.
- **Offset:** Y: 8px.
This creates a soft, ambient lift rather than a harsh, artificial drop shadow.

### Glassmorphism (The Transparency Rule)
For top navigation bars or floating action menus, use `surface_container_lowest` with a **60% opacity** and a `backdrop-blur` of 20px. This allows the institutional colors to bleed through, making the UI feel integrated and modern.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` text, and a `DEFAULT` (0.25rem) corner radius. No border.
- **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` (#811B5A) text.
- **Tertiary:** No background. Text-only using `primary` (#620041) with a `label-md` weight.

### Cards & Lists
**Forbid divider lines.** Use vertical white space (`spacing.8` or `spacing.10`) to separate list items. 
- **The "Nested" Card:** A `surface_container_lowest` card should sit inside a `surface_container_low` section. Use `xl` (0.75rem) roundedness for cards to soften the administrative tone.

### Input Fields
- **Surface:** `surface_container_highest` (#e6e2da).
- **Border:** Use the **Ghost Border** fallback—`outline_variant` (#d9c0c9) at 20% opacity.
- **State:** On focus, the border shifts to `primary` (#620041) at 100% opacity with a 2px thickness.

### Civic Progress Indicators
Use `secondary` (#50643d) for progress bars or success states. It creates a "Nexus" between the maroon authority and the green of growth/resolution.

---

## 6. Do's and Don'ts

### Do:
- **Do** use intentional asymmetry. Place a headline on the left and a small "label-sm" metadata tag far to the right.
- **Do** use `plusJakartaSans` for all numbers in data visualizations; it feels more bespoke.
- **Do** maximize the use of `surface_container_low` (#f7f3eb) for large background areas to reduce eye strain.

### Don't:
- **Don't** use 100% black (#000000). Always use `on_surface` (#1c1c17) for text to maintain a premium, soft-contrast look.
- **Don't** use "Default" shadows from Figma or CSS. Always use the Ambient Shadow rules defined in Section 4.
- **Don't** use more than one `primary` gradient CTA per screen. It creates visual noise and diminishes the "Curator" aesthetic.
- **Don't** use borders to separate header, body, and footer. Use the tonal shifts from `surface_dim` to `surface_bright`.