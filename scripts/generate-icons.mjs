/**
 * Generates the PWA icon set into public/icons/ (plus public/apple-touch-icon.png).
 *
 * Dependency-free on purpose: it rasterises a simple sprout mark with signed
 * distance functions and encodes the result as PNG using node's zlib. Run with
 * `npm run icons` — the output is committed, so you only need this if you want
 * to tweak the mark or colours.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CREAM = [247, 243, 238]
const LEAF = [91, 140, 90]
const LEAF_DARK = [72, 115, 72]

/** Capsule (rounded line) distance: <=0 means inside. */
function capsule(px, py, ax, ay, bx, by, r) {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const len2 = abx * abx + aby * aby || 1
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / len2))
  const dx = apx - abx * t
  const dy = apy - aby * t
  return Math.hypot(dx, dy) - r
}

/** Rotated ellipse distance (approximate, good enough for a 512px mark). */
function ellipse(px, py, cx, cy, rx, ry, angle) {
  const c = Math.cos(-angle)
  const s = Math.sin(-angle)
  const dx = px - cx
  const dy = py - cy
  const x = (dx * c - dy * s) / rx
  const y = (dx * s + dy * c) / ry
  return (Math.hypot(x, y) - 1) * Math.min(rx, ry)
}

/**
 * Colour for one sample point in a unit-ish icon space (0..size).
 * `inset` shrinks the mark for maskable icons, whose outer 10% may be cropped.
 */
function sample(x, y, size, inset) {
  const s = size
  const cx = s / 2
  const cy = s / 2
  const k = inset // scale factor applied to every mark dimension

  const stem = capsule(x, y, cx, cy + 0.28 * s * k, cx, cy - 0.16 * s * k, 0.026 * s * k)
  const leafL = ellipse(x, y, cx - 0.11 * s * k, cy - 0.01 * s * k, 0.135 * s * k, 0.058 * s * k, -0.72)
  const leafR = ellipse(x, y, cx + 0.11 * s * k, cy - 0.07 * s * k, 0.125 * s * k, 0.054 * s * k, 0.72)
  const bud = ellipse(x, y, cx, cy - 0.2 * s * k, 0.042 * s * k, 0.05 * s * k, 0)

  if (stem <= 0 || bud <= 0) return LEAF_DARK
  if (leafL <= 0 || leafR <= 0) return LEAF
  return CREAM
}

function renderRGBA(size, { inset = 1, round = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const SS = 3 // 3x3 supersampling for smooth edges
  const radius = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS

          // Rounded-square clip for the standard (non-maskable) icons.
          if (round) {
            // Rounded-box SDF: q = |p| - halfExtent + r; d = min(max(q),0) + |max(q,0)| - r
            const qx = Math.abs(fx - size / 2) - size / 2 + radius
            const qy = Math.abs(fy - size / 2) - size / 2 + radius
            const d =
              Math.min(Math.max(qx, qy), 0) +
              Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
              radius
            if (d > 0) continue
          }

          const c = sample(fx, fy, size, inset)
          r += c[0]
          g += c[1]
          b += c[2]
          a += 255
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      if (a === 0) {
        px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0
      } else {
        // Un-premultiply the covered samples, then use coverage as alpha.
        const covered = a / 255
        px[i] = Math.round(r / covered)
        px[i + 1] = Math.round(g / covered)
        px[i + 2] = Math.round(b / covered)
        px[i + 3] = Math.round(a / n)
      }
    }
  }
  return px
}

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12 = compression / filter / interlace, all 0

  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, opts: { round: true, inset: 1 } },
  { file: 'public/icons/icon-512.png', size: 512, opts: { round: true, inset: 1 } },
  // Maskable: full bleed background, mark inset so a circular crop can't clip it.
  { file: 'public/icons/icon-maskable-512.png', size: 512, opts: { round: false, inset: 0.72 } },
  { file: 'public/apple-touch-icon.png', size: 180, opts: { round: false, inset: 0.86 } },
]

for (const { file, size, opts } of targets) {
  const out = resolve(ROOT, file)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, encodePNG(size, renderRGBA(size, opts)))
  console.log(`wrote ${file} (${size}x${size})`)
}
