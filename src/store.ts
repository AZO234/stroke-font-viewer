import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StrokeDB, CharData, CharState, Stroke, Segment, SelectionTarget, FontSize, FontSource } from './types'
import { reverseSegmentPath } from './pathUtils'

// ── id generators ─────────────────────────────────────────────────────────
let _sid = 0, _stid = 0
const newSegId    = () => `seg-${_sid++}`
const newStrokeId = () => `str-${_stid++}`

// ── helpers ───────────────────────────────────────────────────────────────
function splitPath(combined: string): string[] {
  return combined.split(/(?=\bM)/).map(s => s.trim()).filter(Boolean)
}

function charStateFromDB(char: string, unicode: string, rawStrokes: string[]): CharState {
  return {
    char, unicode,
    strokes: rawStrokes.map(combined => ({
      id: newStrokeId(),
      segments: splitPath(combined).map(p => ({ id: newSegId(), path: p })),
    })),
  }
}

export function serializeState(state: CharState): string[] {
  return state.strokes.map(st => st.segments.map(s => s.path).join(' '))
}

// ── store ─────────────────────────────────────────────────────────────────
export const useEditorStore = defineStore('editor', () => {

  // ── font databases ────────────────────────────────────────────────────────
  const mplusDB   = ref<StrokeDB>({})
  const kst32bDB  = ref<StrokeDB>({})
  const iso3098DB  = ref<StrokeDB>({})
  const iso3098iDB = ref<StrokeDB>({})

  // 現在選択中のフォントソース
  const fontSource  = ref<FontSource>('mplus')

  // アクティブなDB（fontSource に応じて切り替え）
  const db = computed<StrokeDB>(() => {
    switch (fontSource.value) {
      case 'kst32b':  return kst32bDB.value
      case 'iso3098':  return iso3098DB.value
      case 'iso3098i': return iso3098iDB.value
      default:         return mplusDB.value
    }
  })

  // ── editor state ──────────────────────────────────────────────────────────
  const currentChar = ref<string>('')
  const state       = ref<CharState | null>(null)
  const selection   = ref<SelectionTarget>(null)
  const past        = ref<CharState[]>([])
  const future      = ref<CharState[]>([])

  // ── mode ──────────────────────────────────────────────────────────────────
  const isEditMode = ref(false)
  function initMode() {
    isEditMode.value = new URLSearchParams(window.location.search).get('mode') === 'edit'
  }

  // ── UI state ──────────────────────────────────────────────────────────────
  const fontSize = ref<FontSize>('md')

  // ── derived ───────────────────────────────────────────────────────────────
  // フォントごとに修正・校正済みを管理
  const modifiedCharsMap  = ref<Record<FontSource, Set<string>>>({ mplus: new Set(), kst32b: new Set(), iso3098: new Set(), iso3098i: new Set() })
  const verifiedCharsMap  = ref<Record<FontSource, Set<string>>>({ mplus: new Set(), kst32b: new Set(), iso3098: new Set(), iso3098i: new Set() })

  const modifiedChars = computed(() => modifiedCharsMap.value[fontSource.value])
  const verifiedChars = computed(() => verifiedCharsMap.value[fontSource.value])
  const isModified    = computed(() => modifiedChars.value.has(currentChar.value))
  const isVerified    = computed(() => verifiedChars.value.has(currentChar.value))

  const allSegments = computed<Segment[]>(() =>
    state.value?.strokes.flatMap(st => st.segments) ?? []
  )

  // ── load ──────────────────────────────────────────────────────────────────
  function loadMplus(data: StrokeDB) {
    mplusDB.value = data
    for (const [char, entry] of Object.entries(data)) {
      if (entry.verified) verifiedCharsMap.value.mplus.add(char)
    }
  }

  function loadKst32b(data: StrokeDB) {
    kst32bDB.value = data
    for (const [char, entry] of Object.entries(data)) {
      if (entry.verified) verifiedCharsMap.value.kst32b.add(char)
    }
  }

  function loadIso3098(data: StrokeDB)  {
    iso3098DB.value = data
    for (const [char, entry] of Object.entries(data)) {
      if (entry.verified) verifiedCharsMap.value.iso3098.add(char)
    }
  }

  function loadIso3098i(data: StrokeDB) {
    iso3098iDB.value = data
    for (const [char, entry] of Object.entries(data)) {
      if (entry.verified) verifiedCharsMap.value.iso3098i.add(char)
    }
  }

  function mergeDB(data: StrokeDB) {
    const target = fontSource.value === 'kst32b'  ? kst32bDB
                    : fontSource.value === 'iso3098'  ? iso3098DB
                    : fontSource.value === 'iso3098i' ? iso3098iDB
                    : mplusDB
    for (const [char, entry] of Object.entries(data)) {
      target.value[char] = entry
      modifiedCharsMap.value[fontSource.value].add(char)
      if (entry.verified) verifiedCharsMap.value[fontSource.value].add(char)
    }
    if (currentChar.value && db.value[currentChar.value]) {
      selectChar(currentChar.value)
    }
  }

  // ── font source 切り替え ──────────────────────────────────────────────────
  function switchFont(src: FontSource) {
    if (src === fontSource.value) return
    if (isModified.value) commitCurrent()
    fontSource.value = src
    const newDB = db.value
    if (currentChar.value && newDB[currentChar.value]) {
      selectChar(currentChar.value)
    } else {
      const first = Object.keys(newDB)[0]
      if (first) selectChar(first)
    }
  }

  // ── select char ───────────────────────────────────────────────────────────
  function selectChar(char: string) {
    const entry = db.value[char]
    if (!entry) return
    currentChar.value = char
    state.value = charStateFromDB(char, entry.u, entry.s)
    selection.value = null
    past.value = []
    future.value = []
  }

  // ── history ───────────────────────────────────────────────────────────────
  function snapshot() {
    if (!state.value) return
    past.value.push(JSON.parse(JSON.stringify(state.value)))
    if (past.value.length > 50) past.value.shift()
    future.value = []
    modifiedCharsMap.value[fontSource.value].add(currentChar.value)
  }

  function undo() {
    if (!past.value.length || !state.value) return
    future.value.push(JSON.parse(JSON.stringify(state.value)))
    state.value = past.value.pop()!
    selection.value = null
  }

  function redo() {
    if (!future.value.length || !state.value) return
    past.value.push(JSON.parse(JSON.stringify(state.value)))
    state.value = future.value.pop()!
    selection.value = null
  }

  // ── verified flag ─────────────────────────────────────────────────────────
  function toggleVerified(char?: string) {
    const c = char ?? currentChar.value
    if (!c) return
    const src = fontSource.value
    const target = fontSource.value === 'kst32b'  ? kst32bDB
                    : fontSource.value === 'iso3098'  ? iso3098DB
                    : fontSource.value === 'iso3098i' ? iso3098iDB
                    : mplusDB
    if (verifiedCharsMap.value[src].has(c)) {
      verifiedCharsMap.value[src].delete(c)
      if (target.value[c]) target.value[c]!.verified = false
    } else {
      verifiedCharsMap.value[src].add(c)
      if (target.value[c]) target.value[c]!.verified = true
    }
    modifiedCharsMap.value[src].add(c)
  }

  // ── stroke ops ────────────────────────────────────────────────────────────
  function moveStroke(strokeId: string, dir: 'up' | 'down') {
    if (!state.value) return
    const arr = state.value.strokes
    const i = arr.findIndex(s => s.id === strokeId)
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= arr.length) return
    snapshot()
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }

  function moveSegmentToStroke(segId: string, target: string | 'new-before' | 'new-after') {
    if (!state.value) return
    snapshot()
    const strokes = state.value.strokes
    let srcStroke: Stroke | undefined, seg: Segment | undefined
    for (const st of strokes) {
      const idx = st.segments.findIndex(s => s.id === segId)
      if (idx >= 0) { srcStroke = st; seg = st.segments.splice(idx, 1)[0]; break }
    }
    if (!seg) return
    if (target === 'new-before' || target === 'new-after') {
      const ns: Stroke = { id: newStrokeId(), segments: [seg] }
      const si = srcStroke ? strokes.indexOf(srcStroke) : strokes.length
      strokes.splice(target === 'new-before' ? si : si + 1, 0, ns)
    } else {
      strokes.find(s => s.id === target)?.segments.push(seg)
    }
    state.value.strokes = strokes.filter(st => st.segments.length > 0)
  }

  function promoteSegmentToStroke(strokeId: string, segId: string, pos: 'before' | 'after') {
    moveSegmentToStroke(segId, pos === 'before' ? 'new-before' : 'new-after')
  }

  function moveSegmentWithinStroke(strokeId: string, segId: string, dir: 'up' | 'down') {
    if (!state.value) return
    const st = state.value.strokes.find(s => s.id === strokeId)
    if (!st) return
    const i = st.segments.findIndex(s => s.id === segId)
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= st.segments.length) return
    snapshot()
    ;[st.segments[i], st.segments[j]] = [st.segments[j]!, st.segments[i]!]
  }

  function splitStrokeAt(strokeId: string, segIdx: number) {
    if (!state.value) return
    const st = state.value.strokes.find(s => s.id === strokeId)
    if (!st || segIdx <= 0 || segIdx >= st.segments.length) return
    snapshot()
    const ns: Stroke = { id: newStrokeId(), segments: st.segments.splice(segIdx) }
    state.value.strokes.splice(state.value.strokes.indexOf(st) + 1, 0, ns)
  }

  function mergeStrokes(strokeId: string) {
    if (!state.value) return
    const arr = state.value.strokes
    const i = arr.findIndex(s => s.id === strokeId)
    if (i < 0 || i >= arr.length - 1) return
    snapshot()
    arr[i]!.segments.push(...arr[i + 1]!.segments)
    arr.splice(i + 1, 1)
  }

  function reverseSegment(strokeId: string, segId: string) {
    if (!state.value) return
    for (const st of state.value.strokes) {
      if (st.id !== strokeId) continue
      const seg = st.segments.find(s => s.id === segId)
      if (seg) { snapshot(); seg.path = reverseSegmentPath(seg.path) }
    }
  }

  function reverseStroke(strokeId: string) {
    if (!state.value) return
    const st = state.value.strokes.find(s => s.id === strokeId)
    if (!st) return
    snapshot()
    st.segments = st.segments.reverse().map(seg => ({
      ...seg, path: reverseSegmentPath(seg.path),
    }))
  }

  // ── selection ─────────────────────────────────────────────────────────────
  function setSelection(sel: SelectionTarget) { selection.value = sel }

  // ── export / commit ───────────────────────────────────────────────────────
  function commitCurrent() {
    if (!state.value || !currentChar.value) return
    const serialized = serializeState(state.value)
    const target = fontSource.value === 'kst32b'  ? kst32bDB
                    : fontSource.value === 'iso3098'  ? iso3098DB
                    : fontSource.value === 'iso3098i' ? iso3098iDB
                    : mplusDB
    target.value[currentChar.value] = {
      ...target.value[currentChar.value]!,
      s: serialized,
      n: serialized.length,
    }
  }

  function exportModified(): Record<string, CharData> {
    const result: Record<string, CharData> = {}
    const target = fontSource.value === 'kst32b'  ? kst32bDB
                    : fontSource.value === 'iso3098'  ? iso3098DB
                    : fontSource.value === 'iso3098i' ? iso3098iDB
                    : mplusDB
    for (const char of modifiedChars.value) {
      if (!target.value[char]) continue
      if (char === currentChar.value && state.value) {
        const s = serializeState(state.value)
        result[char] = { ...target.value[char]!, s, n: s.length }
      } else {
        result[char] = target.value[char]!
      }
    }
    return result
  }

  function exportFullDB(): StrokeDB {
    commitCurrent()
    const target = fontSource.value === 'kst32b'  ? kst32bDB
                    : fontSource.value === 'iso3098'  ? iso3098DB
                    : fontSource.value === 'iso3098i' ? iso3098iDB
                    : mplusDB
    return { ...target.value }
  }

  return {
    // dbs
    mplusDB, kst32bDB, iso3098DB, iso3098iDB, db,
    fontSource, switchFont,
    // state
    currentChar, state, selection, past, future,
    modifiedChars, verifiedChars, isModified, isVerified, allSegments,
    // mode
    isEditMode, initMode,
    // UI
    fontSize,
    // data ops
    loadMplus, loadKst32b, loadIso3098, loadIso3098i, mergeDB, selectChar,
    // history
    undo, redo,
    // verified
    toggleVerified,
    // stroke ops
    moveStroke, mergeStrokes, splitStrokeAt, reverseStroke,
    // segment ops
    moveSegmentToStroke, promoteSegmentToStroke,
    moveSegmentWithinStroke, reverseSegment,
    // selection
    setSelection,
    // export
    commitCurrent, exportModified, exportFullDB,
  }
})
