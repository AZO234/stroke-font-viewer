/**
 * SVG path utilities for M+ stroke editor
 */

/** Parse a single segment path into tokens */
type PathToken =
  | { cmd: 'M'; x: number; y: number }
  | { cmd: 'L'; x: number; y: number }
  | { cmd: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { cmd: 'Q'; x1: number; y1: number; x: number; y: number }

function parseSegment(path: string): PathToken[] {
  const tokens: PathToken[] = []
  // Tokenise: split on command letters
  const parts = path.trim().match(/[MLCQ][^MLCQ]*/gi) ?? []
  for (const part of parts) {
    const cmd = part[0]!.toUpperCase()
    const nums = (part.slice(1).match(/[-\d.]+/g) ?? []).map(Number)
    if (cmd === 'M' || cmd === 'L') {
      tokens.push({ cmd: cmd as 'M' | 'L', x: nums[0] ?? 0, y: nums[1] ?? 0 })
    } else if (cmd === 'C') {
      tokens.push({ cmd: 'C', x1: nums[0] ?? 0, y1: nums[1] ?? 0, x2: nums[2] ?? 0, y2: nums[3] ?? 0, x: nums[4] ?? 0, y: nums[5] ?? 0 })
    } else if (cmd === 'Q') {
      tokens.push({ cmd: 'Q', x1: nums[0] ?? 0, y1: nums[1] ?? 0, x: nums[2] ?? 0, y: nums[3] ?? 0 })
    }
  }
  return tokens
}

function fmt(n: number): string { return n.toFixed(4) }

function serializeToken(t: PathToken): string {
  if (t.cmd === 'M' || t.cmd === 'L') return `${t.cmd}${fmt(t.x)} ${fmt(t.y)}`
  if (t.cmd === 'C') return `C${fmt(t.x1)} ${fmt(t.y1)} ${fmt(t.x2)} ${fmt(t.y2)} ${fmt(t.x)} ${fmt(t.y)}`
  if (t.cmd === 'Q') return `Q${fmt(t.x1)} ${fmt(t.y1)} ${fmt(t.x)} ${fmt(t.y)}`
  return ''
}

/**
 * Reverse a single M-segment path so start becomes end and vice versa.
 * M A … L B  →  M B … L A
 */
export function reverseSegmentPath(path: string): string {
  const tokens = parseSegment(path)
  if (tokens.length < 2) return path

  // Collect all anchor points in order: start, ...intermediates..., end
  // Then rebuild the path in reverse
  // Strategy: collect list of (point, incoming_control_info) then reverse

  // Simplified: rebuild by reversing the drawing direction
  // New start = old end, new end = old start
  // For Bezier curves, control points need to be swapped

  const reversed: PathToken[] = []

  // Walk backwards through tokens
  for (let i = tokens.length - 1; i >= 0; i--) {
    const cur = tokens[i]!
    const prev = tokens[i - 1]

    if (i === tokens.length - 1) {
      // New start point = old endpoint
      reversed.push({ cmd: 'M', x: cur.x, y: cur.y })
    }

    if (!prev) break

    // prev → cur reversed = cur → prev
    if (cur.cmd === 'L') {
      reversed.push({ cmd: 'L', x: prev.x, y: prev.y })
    } else if (cur.cmd === 'C') {
      // Bezier C: control1, control2, end → reversed: control2, control1, prev_point
      reversed.push({ cmd: 'C', x1: cur.x2, y1: cur.y2, x2: cur.x1, y2: cur.y1, x: prev.x, y: prev.y })
    } else if (cur.cmd === 'Q') {
      reversed.push({ cmd: 'Q', x1: cur.x1, y1: cur.y1, x: prev.x, y: prev.y })
    } else {
      // M or unknown: just add as L
      reversed.push({ cmd: 'L', x: prev.x, y: prev.y })
    }
  }

  return reversed.map(serializeToken).join(' ')
}

/**
 * Reverse all segments within a stroke path string (multi-segment "M… M… M…")
 * Reverses the order of segments AND reverses direction of each segment.
 */
export function reverseStrokePath(combinedPath: string): string {
  const segs = combinedPath.split(/(?=\bM)/).map(s => s.trim()).filter(Boolean)
  return segs.reverse().map(reverseSegmentPath).join(' ')
}

/**
 * Export all characters as mplus_stroke.svg compatible format.
 * Layout: 50 chars per row, 100x100 per cell.
 */
export function buildExportSVG(db: Record<string, { u: string; s: string[]; n: number }>): string {
  const COLS = 50
  const CELL = 100

  const chars = Object.keys(db)
  const rows  = Math.ceil(chars.length / COLS)
  const W = COLS * CELL
  const H = rows  * CELL

  const PATH_STYLE = 'fill:none;stroke:#000000; stroke-width:1; stroke-linecap:butt; stroke-linejoin:miter; stroke-dasharray:none;'

  const lines: string[] = []
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  lines.push(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}pt" height="${H}pt" viewBox="0 0 ${W} ${H}">`)

  chars.forEach((char, idx) => {
    const col = idx % COLS
    const row = Math.floor(idx / COLS)
    const tx  = col * CELL
    const ty  = row * CELL
    const entry = db[char]!
    const code  = entry.u
    const utf8  = encodeURIComponent(char).replace(/%/g, '').toLowerCase()
    const totalSegs = entry.s.reduce((acc, s) => acc + (s.split(/(?=\bM)/).filter(Boolean).length), 0)

    // Combined path = all strokes joined
    const d = entry.s.join(' ')

    lines.push(`<!-- UTF16:${code} UTF8:${utf8} item:${totalSegs} -->`)
    lines.push(`<path style="${PATH_STYLE}" d="${d} " transform="translate(${tx}, ${ty})"/>`)
  })

  lines.push(`</svg>`)
  return lines.join('\n')
}
