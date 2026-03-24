// ─── Raw data (strokes.json) ───────────────────────────────────────────────
export interface CharData {
  u: string       // unicode hex, e.g. "65E5"
  s: string[]     // strokes: each entry is one or more M-segments joined by space
  n: number       // stroke count
  verified?: boolean  // 校正済みフラグ
}

export type StrokeDB = Record<string, CharData>

// ─── Editor state ──────────────────────────────────────────────────────────

export interface Segment {
  id: string
  path: string    // raw SVG path fragment starting with M
}

export interface Stroke {
  id: string
  segments: Segment[]
}

export interface CharState {
  char: string
  unicode: string
  strokes: Stroke[]
}

export type SelectionTarget =
  | { kind: 'stroke';  strokeId: string }
  | { kind: 'segment'; strokeId: string; segId: string }
  | null

// ─── UI state ─────────────────────────────────────────────────────────────
export type FontSize   = 'sm' | 'md' | 'lg'
export const FONT_SIZE_PX: Record<FontSize, number> = { sm: 20, md: 24, lg: 28 }

// ─── Font source ───────────────────────────────────────────────────────────
export type FontSource = 'mplus' | 'kst32b' | 'iso3098' | 'iso3098i'
export const FONT_LABEL: Record<FontSource, string> = {
  mplus:   'M+ OUTLINE',
  kst32b:  'KST32B',
  iso3098: 'ISO 3098',
  iso3098i:'ISO 3098 Italic',
}
