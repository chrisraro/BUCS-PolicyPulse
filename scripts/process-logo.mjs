// One-off asset pipeline for the BUCS seal. The source is the full scalloped
// emblem on a white background; for a clean, theme-agnostic app mark we detect
// the blue ring and circular-mask everything outside it (dropping the exterior
// AND the white scalloped petals in one pass, while keeping the interior whites
// inside the three sub-circles). Sharpen to counter JPEG softness; emit icons.
// Run: node scripts/process-logo.mjs <source.jpg>
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SRC = process.argv[2] ?? 'C:/Users/raroc/Downloads/BUCS-LOGO.jpg'

const base = sharp(SRC).ensureAlpha()
const { width, height } = await base.metadata()
const { data } = await base.raw().toBuffer({ resolveWithObject: true })

// Detect the blue ring: its bounding box gives the seal's center + outer radius.
let minX = width,
  minY = height,
  maxX = 0,
  maxY = 0
const isBlue = (r, g, b) => b > 95 && b - r > 24 && b - g > 12
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    if (isBlue(data[i], data[i + 1], data[i + 2])) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
const cx = (minX + maxX) / 2
const cy = (minY + maxY) / 2
const outerR = Math.max(maxX - minX, maxY - minY) / 2 + 3 // include the thin dark rim
console.log(`blue ring: center (${cx.toFixed(0)},${cy.toFixed(0)}) radius ${outerR.toFixed(0)}`)

// Circular mask with a 1.5px feathered edge for clean anti-aliasing.
const feather = 1.5
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    const d = Math.hypot(x - cx, y - cy)
    if (d > outerR) {
      data[i + 3] = 0
    } else if (d > outerR - feather) {
      data[i + 3] = Math.round(data[i + 3] * (outerR - d) / feather)
    }
  }
}

await mkdir('public', { recursive: true })
const cleaned = sharp(data, { raw: { width, height, channels: 4 } })
  .extract({
    left: Math.max(0, Math.floor(cx - outerR - 2)),
    top: Math.max(0, Math.floor(cy - outerR - 2)),
    width: Math.min(width, Math.ceil(2 * outerR + 4)),
    height: Math.min(height, Math.ceil(2 * outerR + 4)),
  })
  .sharpen({ sigma: 0.7 })
  .png({ compressionLevel: 9 })
const buf = await cleaned.toBuffer()

const pad = (px) => Math.round(px * 0.06)
const square = (size, file, extra) => {
  let img = sharp(buf).resize(size - 2 * pad(size), size - 2 * pad(size), {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  img = img.extend({ top: pad(size), bottom: pad(size), left: pad(size), right: pad(size), background: { r: 0, g: 0, b: 0, alpha: 0 } })
  return (extra ? extra(img) : img).png({ compressionLevel: 9 }).toFile(file)
}

await square(512, 'public/bucs-logo.png') // master transparent logo (retina-ready)
await square(256, 'src/app/icon.png') // Next serves this as the browser-tab icon
// Apple touch icon — iOS ignores transparency; composite on a white tile.
await square(180, 'src/app/apple-icon.png', (img) => img.flatten({ background: '#ffffff' }))

console.log('OK — circular seal → public/bucs-logo.png, src/app/icon.png, apple-icon.png')
