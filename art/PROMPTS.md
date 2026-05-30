# 🎨 Art guide & AI prompts

Read this before generating any artwork, so every picture matches. The game works fine with
placeholder art until you do this — there's no rush.

## The style (keep it identical for every asset)

- **Look:** cozy anime / storybook, soft cel-shading, warm pastel palette, rounded shapes, gentle
  outlines, friendly faces. A sunny, inviting bakery.
- **Perspective:** consistent 3/4 "cozy sim" view for objects/characters; flat front-on for UI.
- **Palette (stick to these):** cream `#FFF6E9`, frosting pink `#FF8FB1`, butter yellow `#FFD66B`,
  mint `#8FE0C2`, chocolate brown `#7A4A26`.
- **Background:** plain white or transparent, for clean cutouts.
- **Mood:** calm, happy. Nothing scary or sad — the audience is children 6–8.

## The prompt template

Replace `{SUBJECT}` and keep everything else the same. Use the **same fixed seed** every time.

```
A {SUBJECT}, cozy anime storybook style, soft cel shading, warm pastel palette
(cream, frosting pink, butter yellow, mint, chocolate brown), rounded friendly shapes,
gentle dark outline, clean flat lighting, 3/4 cozy-sim view, centered, plain white
background, no text, no watermark, kid-friendly, high detail, consistent style.
--seed {FIXED_SEED}
```

Generate 3–4 variants per asset, pick the most on-style.

## Free tools

- **Generate:** Stable Diffusion via ComfyUI or Automatic1111 (free, most consistent with a GPU);
  or Bing Image Creator (free); or Leonardo.ai (free daily credits).
- **Consistency:** fixed seed + one style reference image; advanced: a small LoRA / IP-Adapter in
  ComfyUI trained on your first approved assets.
- **Remove backgrounds:** rembg (free CLI), or GIMP / Krita.
- **Pack into a sprite sheet:** free-tex-packer, or TexturePacker (free mode) → PNG atlas + JSON.
- **Edit/clean up:** GIMP or Krita.

## What to generate (and the name to give each)

The name in **bold** is the logical key — it must match the name used in
`public/assets/manifest.json`.

### Treats

- **treat_cookie**, **treat_cupcake**, **treat_pie**, **treat_cake**

### Ingredients

- **ingredient_flour**, **ingredient_sugar**, **ingredient_milk**, **ingredient_egg**,
  **ingredient_butter**, **ingredient_fruit**, **ingredient_chocolate**

### Characters (each needs a neutral AND a happy/eating face)

- **baker_avatar**
- **customer_child** / **customer_child_happy**
- **customer_parent** / **customer_parent_happy**
- **customer_grandparent** / **customer_grandparent_happy**
- **customer_cat** / **customer_cat_happy**
- **customer_bunny** / **customer_bunny_happy**
- **customer_bear** / **customer_bear_happy**

### Environment

- **env_background**, **env_counter**, **env_display**, **env_oven**, **env_register**,
  **env_shelf**, **env_door**, **env_window**

### UI

- **ui_coin**, **ui_button**, **ui_panel**, **ui_speech**, **ui_day_banner**, **ui_speedy**,
  **ui_sign**, **ui_decorations**

## Technical spec

- PNG, transparent background, sRGB.
- Sprites up to ~512×512 (shown around 128–256). Atlas pages power-of-two (e.g. 2048×2048).
- Deliver as an atlas PNG + JSON in `public/assets/atlas/`, then list each key in
  `public/assets/manifest.json`.
