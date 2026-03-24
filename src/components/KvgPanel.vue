<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useEditorStore } from '../store'

// ── KanjiVG を遅延ロード ──────────────────────────────────────────────────

interface KvgStroke { n: number; type: string; d: string }
interface KvgEntry  { u: string; strokes: KvgStroke[] }
type KvgDB = Record<string, KvgEntry>

const kvgDB  = ref<KvgDB>({})
onMounted(async () => {
  const { default: raw } = await import('../assets/kanjivg.json')
  kvgDB.value = raw as unknown as KvgDB
})
const store  = useEditorStore()
const entry  = computed<KvgEntry | null>(() => kvgDB.value[store.currentChar] ?? null)
const hovIdx = ref<number>(-1)

// KanjiVG viewBox 0 0 109 109 → 表示用 0 0 100 100
const SCALE = 100 / 109

// kvg:type の説明
const TYPE_NAMES: Record<string, string> = {
  '㇑': '縦画', '㇐': '横画', '㇒': '左払い', '㇏': '右払い',
  '㇕': '折れ',  '㇆': '鉤',   '㇄': '折払い', '㇓': '湾縦',
  '㇚': '湾曲',  '㇇': '湾左', '㇟': '複合',   '㇛': '交差払い',
  '㇁': '弧',    '㇖': '角折',
}
function typeLabel(t: string): string {
  const base = t.replace(/[a-z/].*$/, '')
  return TYPE_NAMES[base] ? `${t} ${TYPE_NAMES[base]}` : (t || '—')
}

// KVGパスを 0-100 座標にスケール変換
function scalePath(d: string): string {
  return d.replace(/[-\d.]+/g, m => {
    const n = parseFloat(m)
    return isNaN(n) ? m : (n * SCALE).toFixed(2)
  })
}

// ストロークの始点を取得
function startPt(d: string): { x: number; y: number } | null {
  const m = d.match(/M([\d.]+),([\d.]+)/)
  return m ? { x: parseFloat(m[1]!) * SCALE, y: parseFloat(m[2]!) * SCALE } : null
}

const COLORS = ['#b5301e','#1c6434','#1a3a6e','#6b3a8e','#8e6b1a','#1a6b6b','#6b1a3a','#3a6b1a']
function color(i: number) { return COLORS[i % COLORS.length]! }
</script>

<template>
  <div class="kvg-panel">
    <div class="kvg-head">
      <span class="kvg-title">KanjiVG 参照</span>
      <a href="https://kanjivg.tagaini.net" target="_blank" class="kvg-link">
        kanjivg.tagaini.net ↗
      </a>
    </div>

    <!-- KVGデータなし -->
    <div v-if="!entry" class="kvg-empty">
      <div class="ref-char">{{ store.currentChar }}</div>
      <small>KanjiVG データなし</small>
    </div>

    <template v-else>
      <div class="kvg-body">

        <!-- ── 左: SVGプレビュー ── -->
        <div class="kvg-left">
          <div class="preview-wrap">
            <!-- BIZ UD明朝 の文字（参照用シルエット） -->
            <div class="ref-char-bg">{{ store.currentChar }}</div>

            <!-- KVG ストロークオーバーレイ -->
            <svg class="kvg-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path
                v-for="(st, i) in entry.strokes"
                :key="st.n"
                :d="scalePath(st.d)"
                fill="none"
                :stroke="color(i)"
                :stroke-width="hovIdx === i ? 3.8 : 2.4"
                :stroke-opacity="hovIdx === -1 || hovIdx === i ? 1 : 0.25"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="cursor:pointer; transition: all .15s"
                @mouseenter="hovIdx = i"
                @mouseleave="hovIdx = -1"
              />
              <!-- 始点バッジ -->
              <template v-for="(st, i) in entry.strokes" :key="'b'+st.n">
                <g v-if="startPt(st.d)">
                  <circle
                    :cx="startPt(st.d)!.x"
                    :cy="startPt(st.d)!.y"
                    r="4"
                    :fill="hovIdx === i ? color(i) : 'color-mix(in srgb, var(--canvas-bg, #fff) 90%, transparent)'"
                    :stroke="color(i)"
                    stroke-width="1.2"
                    style="pointer-events:none"
                  />
                  <text
                    :x="startPt(st.d)!.x"
                    :y="startPt(st.d)!.y + 1.5"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    :fill="hovIdx === i ? 'white' : color(i)"
                    font-size="4.2"
                    font-family="monospace"
                    font-weight="bold"
                    style="pointer-events:none"
                  >{{ st.n }}</text>
                </g>
              </template>
            </svg>
          </div>

          <div class="kvg-meta">
            <span class="kvg-count">{{ entry.strokes.length }}画</span>
            <span class="kvg-license">CC BY-SA 3.0</span>
          </div>
        </div>

        <!-- ── 右: ストロークリスト ── -->
        <div class="kvg-right">
          <div
            v-for="(st, i) in entry.strokes"
            :key="st.n"
            class="kvg-row"
            :class="{ hov: hovIdx === i }"
            @mouseenter="hovIdx = i"
            @mouseleave="hovIdx = -1"
          >
            <span class="kvg-badge" :style="{ background: color(i) }">{{ st.n }}</span>
            <span class="kvg-type">{{ typeLabel(st.type) }}</span>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<style scoped>
/* BIZ UD明朝 を Google Fonts から読み込み */
@import url('https://fonts.googleapis.com/css2?family=BIZ+UDMincho&display=swap');

.kvg-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  background: var(--panel-bg);
  flex-shrink: 0;
  min-height: 0;
}

.kvg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px 6px;
  background: var(--paper2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.kvg-title { font-size: 0.6rem; font-weight: 600; letter-spacing: .05em; }
.kvg-link  {
  font-size: 0.5rem; color: var(--gold);
  text-decoration: none;
  font-family: 'Space Mono', monospace;
}
.kvg-link:hover { text-decoration: underline; }

/* データなし */
.kvg-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.6rem;
  line-height: 2;
}
.kvg-empty .ref-char {
  font-family: 'BIZ UDMincho', 'BIZ UDP明朝', serif;
  font-size: 2.4rem;
  color: color-mix(in srgb, var(--ink) 14%, transparent);
  line-height: 1.2;
}

/* メインボディ */
.kvg-body {
  display: flex;
  gap: 0;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

/* ── 左カラム: プレビュー ── */
.kvg-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px 8px;
  flex-shrink: 0;
  gap: 6px;
}

.preview-wrap {
  position: relative;
  width: 130px;
  height: 130px;
  background: var(--canvas-bg);
  box-shadow: 0 1px 8px var(--shadow), 0 0 0 1px var(--border);
}

/* BIZ UD明朝の文字を薄く背景に */
.ref-char-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'BIZ UDMincho', 'BIZ UDP明朝', 'UD デジタル教科書体', serif;
  font-size: 5rem;
  /* 文字をグリッドに合わせるための微調整 */
  line-height: 1;
  padding-top: 4px;
  color: color-mix(in srgb, var(--ink) 12%, transparent);
  user-select: none;
  pointer-events: none;
}

/* KVGオーバーレイ */
.kvg-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.kvg-meta {
  display: flex;
  justify-content: space-between;
  width: 130px;
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  color: var(--text-muted);
}
.kvg-count { color: var(--text-muted); font-weight: 600; }

/* ── 右カラム: ストロークリスト ── */
.kvg-right {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 8px 4px;
  border-left: 1px solid var(--border);
  min-width: 0;
}

.kvg-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 5px;
  border-radius: 3px;
  cursor: default;
  transition: background .1s;
}
.kvg-row.hov { background: color-mix(in srgb, var(--ink) 7%, transparent); }

.kvg-badge {
  width: 18px; height: 18px;
  border-radius: 50%;
  color: white;
  font-size: 0.5rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.kvg-type {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
