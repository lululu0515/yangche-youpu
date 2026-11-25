# Dock rendering reference

Earlier versions of the Dock adapted the optical profile and spring behavior of Kyant0/AndroidLiquidGlass (Backdrop).

- Upstream: https://github.com/Kyant0/AndroidLiquidGlass
- Revision: eb4a0ea2e17542ea28c2e71088f7dd9acf77aad5
- Copyright 2025 Kyant
- License: Apache License 2.0, reproduced in `licenses/AndroidLiquidGlass.txt`.
- Reference files: `backdrop/src/commonMain/kotlin/com/kyant/backdrop/internal/Shaders.kt`, `app/src/commonMain/kotlin/com/kyant/backdrop/catalog/components/LiquidBottomTabs.kt`, and `app/src/commonMain/kotlin/com/kyant/backdrop/catalog/utils/DampedDragAnimation.kt`.

Version 1.5 adapts the supplied coolapk_liquid_glass_dock (5).html demo's default stadium geometry, icon silhouettes, centered swell and lens springs, six-band refraction, and bevel lighting. The adaptation samples live WebView content with SVG backdrop filters. Renderers without SVG backdrop support use translucent blur and highlights.

Version 1.6 retains the demo-inspired geometry and spring motion and uses one precomputed displacement map for the moving lens. Its generator is included in scripts/generate-dock-map.py.

Version 1.7 adapts the user-supplied (5).html demo's six spectral offsets and channel weights for the ink inside the moving lens. Its stadium displacement and directional highlights are precomputed by scripts/generate-dock-map.py.
