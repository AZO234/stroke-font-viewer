<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '../store'
import type { FontSource } from '../types'
import { FONT_LABEL } from '../types'

const store = useEditorStore()
const emit  = defineEmits<{ select: []; switchFont: [FontSource]; openRenderer: [] }>()

// ── 区分定義（フォントソース別） ──────────────────────────────────────────

interface Category { label: string; chars: () => string[] }

function unicodeBlock(chars: string[], lo: number, hi: number) {
  return chars.filter(c => { const cp = ord(c); return cp >= lo && cp <= hi })
}
const ord = (c: string) => c.codePointAt(0) ?? 0

// DB全文字をブロック別に取得するヘルパー
function dbCharsInRange(lo: number, hi: number) {
  return Object.keys(store.db).filter(c => { const cp = ord(c); return cp >= lo && cp <= hi }).sort((a,b) => ord(a)-ord(b))
}
function dbAll() {
  return Object.keys(store.db).sort((a,b) => ord(a)-ord(b))
}

const CATS_MPLUS = computed<Category[]>(() => [
  { label: '— 全文字 —',       chars: dbAll },
  { label: 'ひらがな',          chars: () => dbCharsInRange(0x3041, 0x3096) },
  { label: 'カタカナ',          chars: () => dbCharsInRange(0x30A1, 0x30F6) },
  { label: '半角カナ',          chars: () => dbCharsInRange(0xFF65, 0xFF9F) },
  { label: '漢字 4E00-4FFF',    chars: () => dbCharsInRange(0x4E00, 0x4FFF) },
  { label: '漢字 5000-5FFF',    chars: () => dbCharsInRange(0x5000, 0x5FFF) },
  { label: '漢字 6000-6FFF',    chars: () => dbCharsInRange(0x6000, 0x6FFF) },
  { label: '漢字 7000-7FFF',    chars: () => dbCharsInRange(0x7000, 0x7FFF) },
  { label: '漢字 8000-8FFF',    chars: () => dbCharsInRange(0x8000, 0x8FFF) },
  { label: '漢字 9000-9FFF',    chars: () => dbCharsInRange(0x9000, 0x9FFF) },
  { label: 'CJK記号・その他',   chars: () => dbCharsInRange(0x3000, 0x303F).concat(dbCharsInRange(0x2E00, 0x2FFF)) },
])

const CATS_KST32B = computed<Category[]>(() => [
  { label: '— 全文字 —',       chars: dbAll },
  { label: 'ASCII',             chars: () => dbCharsInRange(0x0020, 0x007E) },
  { label: 'Latin拡張',         chars: () => dbCharsInRange(0x00A0, 0x024F) },
  { label: 'ギリシャ語',        chars: () => dbCharsInRange(0x0391, 0x03C9) },
  { label: 'キリル文字',        chars: () => dbCharsInRange(0x0400, 0x04FF) },
  { label: 'ひらがな',          chars: () => dbCharsInRange(0x3041, 0x3096) },
  { label: 'カタカナ',          chars: () => dbCharsInRange(0x30A1, 0x30F6) },
  { label: '漢字 4E-5F',        chars: () => dbCharsInRange(0x4E00, 0x5FFF) },
  { label: '漢字 60-6F',        chars: () => dbCharsInRange(0x6000, 0x6FFF) },
  { label: '漢字 70-7F',        chars: () => dbCharsInRange(0x7000, 0x7FFF) },
  { label: '漢字 80-8F',        chars: () => dbCharsInRange(0x8000, 0x8FFF) },
  { label: '漢字 90-9F',        chars: () => dbCharsInRange(0x9000, 0x9FFF) },
  { label: '記号・その他',      chars: () => dbCharsInRange(0x2000, 0x33FF) },
])

const CATS_ISO3098 = computed<Category[]>(() => [
  { label: '— 全文字 —',       chars: dbAll },
  { label: 'ASCII 大文字',      chars: () => dbCharsInRange(0x0041, 0x005A) },
  { label: 'ASCII 小文字',      chars: () => dbCharsInRange(0x0061, 0x007A) },
  { label: '数字・記号',        chars: () => dbCharsInRange(0x0020, 0x0040).concat(dbCharsInRange(0x005B, 0x0060)).concat(dbCharsInRange(0x007B, 0x007E)) },
  { label: 'ギリシャ語 大文字', chars: () => dbCharsInRange(0x0391, 0x03A9) },
  { label: 'ギリシャ語 小文字', chars: () => dbCharsInRange(0x03B1, 0x03C9) },
  { label: 'Latin 拡張',        chars: () => dbCharsInRange(0x00C0, 0x024F) },
  { label: '数学・記号',        chars: () => dbCharsInRange(0x2200, 0x22FF).concat(dbCharsInRange(0x2100, 0x21FF)) },
])

const CATEGORIES = computed<Category[]>(() => {
  switch (store.fontSource) {
    case 'kst32b':   return CATS_KST32B.value
    case 'iso3098':
    case 'iso3098i': return CATS_ISO3098.value
    default:         return CATS_MPLUS.value
  }
})

// ── 選択中の区分 ──────────────────────────────────────────────────────────
const selectedCatLabel = ref('')

// フォント切り替え時に先頭区分にリセット
watch(() => store.fontSource, () => {
  selectedCatLabel.value = ''
})

const selectedCat = computed<Category>(() =>
  CATEGORIES.value.find(c => c.label === selectedCatLabel.value)
  ?? CATEGORIES.value[0]!
)

const displayChars = computed<string[]>(() => {
  const q = search.value.trim()
  const base = selectedCat.value.chars()
  if (!q) return base
  return base.filter(c => c.includes(q))
})

// ── 検索 ─────────────────────────────────────────────────────────────────
const search = ref('')

// ── 文字選択 ─────────────────────────────────────────────────────────────
function select(char: string) {
  if (store.currentChar === char) return
  if (store.isModified) store.commitCurrent()
  store.selectChar(char)
  emit('select')
}
</script>

<template>
  <aside class="sidebar">
    <!-- フォント選択＋区分コンボボックス -->
    <div class="sidebar-head">
      <div class="font-row">
        <select
          class="font-select"
          :value="store.fontSource"
          @change="emit('switchFont', ($event.target as HTMLSelectElement).value as FontSource)"
        >
          <option v-for="(label, src) in FONT_LABEL" :key="src" :value="src">
            {{ label }}
          </option>
        </select>
        <button class="render-btn" @click="emit('openRenderer')" title="テキストをレンダリングしてPNG保存">
          画像
        </button>
      </div>
      <select
        v-model="selectedCatLabel"
        class="cat-select"
        :title="`${displayChars.length}文字`"
      >
        <option v-for="cat in CATEGORIES" :key="cat.label" :value="cat.label">
          {{ cat.label }}
        </option>
      </select>
      <input
        v-model="search"
        class="search"
        placeholder="絞り込み"
        type="search"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <!-- 文字グリッド -->
    <div class="sidebar-body">
      <div class="char-count">{{ displayChars.length }}文字</div>
      <div class="char-grid">
        <button
          v-for="c in displayChars"
          :key="c"
          class="char-btn"
          :class="{
            active:    store.currentChar === c,
            modified:  store.modifiedChars.has(c),
            verified:  store.verifiedChars.has(c),
          }"
          @click="select(c)"
          :title="`U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4,'0')}  ${store.db[c]?.n ?? 0}画`"
        >{{ c }}</button>
      </div>
      <div v-if="search && !displayChars.length" class="no-result">
        「{{ search }}」は見つかりません
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--sidebar-bg);
  overflow: hidden;
}

.sidebar-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 6px 5px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.font-row {
  display: flex; gap: 4px; align-items: center;
}

.render-btn {
  flex-shrink: 0;
  padding: 4px 7px;
  border: 1px solid var(--green); border-radius: 3px;
  background: transparent; color: var(--green);
  font-family: 'Space Mono', monospace; font-size: 0.45rem;
  font-weight: 700; cursor: pointer; transition: all .1s;
  white-space: nowrap;
}
.render-btn:hover { background: var(--green); color: var(--paper); }

.font-select {
  flex: 1; min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--ink);
  color: var(--paper);
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  font-weight: 700;
  outline: none;
  cursor: pointer;
}
.font-select:focus { border-color: var(--gold); }

.cat-select {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--canvas-bg);
  color: var(--ink);
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  outline: none;
  cursor: pointer;
  transition: border-color .15s;
}
.cat-select:focus { border-color: var(--gold); }

.search {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--canvas-bg);
  color: var(--ink);
  font-size: 0.5rem;
  outline: none;
  transition: border-color .15s;
}
.search:focus { border-color: var(--gold); }

.sidebar-body {
  overflow-y: auto;
  flex: 1;
  padding: 4px 6px 20px;
}

.char-count {
  font-family: 'Space Mono', monospace;
  font-size: 0.45rem;
  color: var(--text-dim);
  padding: 2px 2px 4px;
  text-align: right;
}

.char-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
}

.char-btn {
  width: 28px; height: 28px;
  font-size: 0.9rem;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: 2px;
  color: var(--ink);
  font-family: 'Noto Serif JP', serif;
  font-weight: 300;
  transition: background .08s;
  position: relative;
  flex-shrink: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.char-btn:hover  { background: var(--paper3); border-color: var(--border); }
.char-btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }

/* 変更ドット */
.char-btn.modified::after {
  content: '';
  position: absolute;
  top: 1px; right: 1px;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--red);
  pointer-events: none;
}

/* 校正済みバッジ */
.char-btn.verified::before {
  content: '✓';
  position: absolute;
  bottom: 0; right: 1px;
  font-size: 0.35rem;
  line-height: 1;
  color: var(--green);
  font-family: monospace;
  pointer-events: none;
}

.no-result {
  padding: 12px 4px;
  font-size: 0.5rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
