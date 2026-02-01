# PWA Icons

This directory contains icons for the MyVocab PWA.

## Required Icon Sizes

The following PNG icons are needed for full PWA support:

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png` (required for Chrome)
- `icon-384x384.png`
- `icon-512x512.png` (required for Chrome)

## Generating Icons

You can use the `icon-placeholder.svg` as a base and generate PNG icons using:

1. **Online tools**: [RealFaviconGenerator](https://realfavicongenerator.net/) or [PWA Asset Generator](https://pwa-asset-generator.nicholasbraun.dev/)

2. **CLI tools**:
   ```bash
   # Using ImageMagick
   for size in 72 96 128 144 152 192 384 512; do
     convert icon-placeholder.svg -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

3. **Node.js**: Use packages like `sharp` or `pwa-asset-generator`

## Icon Requirements

- **Maskable icons**: Should have safe zone padding (at least 10% on each side)
- **Any purpose icons**: Can use full canvas
- **Transparent background**: Recommended for non-maskable icons
- **Solid background**: Required for maskable icons

## Current Status

- [x] Placeholder SVG created
- [ ] PNG icons generated (pending)
