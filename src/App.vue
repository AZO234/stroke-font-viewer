<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useEditorStore } from './store'
import type { StrokeDB } from './types'
import { FONT_SIZE_PX } from './types'
import type { FontSource } from './types'
import { buildExportSVG } from './pathUtils'
import CharSelector  from './components/CharSelector.vue'
import StrokeCanvas  from './components/StrokeCanvas.vue'
import StrokePanel   from './components/StrokePanel.vue'
import AnimPreview   from './components/AnimPreview.vue'
import KvgPanel      from './components/KvgPanel.vue'
import ThemeToggle    from './components/ThemeToggle.vue'
import FileLoader     from './components/FileLoader.vue'
import TextRenderer   from './components/TextRenderer.vue'

const store   = useEditorStore()
const isDark        = ref(false)
const sidebarOpen   = ref(false)
const showRenderer  = ref(false)

// ── テーマ ──────────────────────────────────────────────────────────────────
watch(isDark, v => document.documentElement.classList.toggle('dark', v), { immediate: true })

// ページ全体の文字サイズを html の font-size に適用
watch(() => store.fontSize, sz => {
  document.documentElement.style.fontSize = FONT_SIZE_PX[sz] + 'px'
}, { immediate: true })

// ── 初期化 ──────────────────────────────────────────────────────────────────
const kst32bLoaded = ref(false)

onMounted(async () => {
  store.initMode()
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) isDark.value = true
  const { default: mplusRaw }  = await import('./assets/strokes.json')
  store.loadMplus(mplusRaw as unknown as StrokeDB)
  store.selectChar('日')
})

async function ensureKst32b() {
  if (kst32bLoaded.value) return
  const { default: kstRaw } = await import('./assets/kst32b_strokes.json')
  store.loadKst32b(kstRaw as unknown as StrokeDB)
  kst32bLoaded.value = true
}

const iso3098Loaded  = ref(false)
const iso3098iLoaded = ref(false)

async function ensureIso3098() {
  if (iso3098Loaded.value) return
  const { default: raw } = await import('./assets/iso3098_strokes.json')
  store.loadIso3098(raw as unknown as StrokeDB)
  iso3098Loaded.value = true
}

async function ensureIso3098i() {
  if (iso3098iLoaded.value) return
  const { default: raw } = await import('./assets/iso3098i_strokes.json')
  store.loadIso3098i(raw as unknown as StrokeDB)
  iso3098iLoaded.value = true
}

async function switchFont(src: FontSource) {
  if (src === 'kst32b')   await ensureKst32b()
  if (src === 'iso3098')  await ensureIso3098()
  if (src === 'iso3098i') await ensureIso3098i()
  store.switchFont(src)
}

const isEdit   = computed(() => store.isEditMode)
const charInfo = computed(() => {
  const c = store.currentChar; if (!c) return ''
  return `${c}  U+${store.db[c]?.u ?? ''}  ${store.state?.strokes.length ?? 0}画`
})
const currentVerified = computed(() => store.isVerified)

// ── フォントサイズ ──────────────────────────────────────────────────────────
const SIZES = (['sm', 'md', 'lg'] as const)
const SIZE_LABEL: Record<string, string> = { sm: '小', md: '中', lg: '大' }

// ── エクスポート ────────────────────────────────────────────────────────────
function dl(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}
function exportDiff() {
  store.commitCurrent()
  const d = store.exportModified()
  if (!Object.keys(d).length) { alert('変更はありません'); return }
  dl(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }), 'stroke_corrections.json')
}
function exportFull() {
  const db = store.exportFullDB()
  dl(new Blob([JSON.stringify(db)], { type: 'application/json' }), 'strokes_corrected.json')
}
function exportSVG() {
  const db = store.exportFullDB()
  const svg = buildExportSVG(db as Record<string, { u: string; s: string[]; n: number }>)
  dl(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'mplus_stroke_corrected.svg')
}

// ── キーボード ───────────────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo() }
  if (mod && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); store.redo() }
  if (mod && e.key === 's' && isEdit.value) { e.preventDefault(); exportDiff() }
}
</script>

<template>
  <div class="app" @keydown="onKeydown" tabindex="-1">

    <!-- ── ヘッダー ── -->
    <header class="header">
      <div class="header-left">
        <button class="hamburger" @click="sidebarOpen = !sidebarOpen" aria-label="文字リスト">
          <span/><span/><span/>
        </button>
        <span class="app-title">Stroke Font Viewer</span>
        <span class="char-info">{{ charInfo }}</span>
        <!-- 校正済みタグ（常時表示） -->
        <span v-if="currentVerified" class="verified-tag">✓ 校正済み</span>
        <span v-if="isEdit && store.isModified" class="modified-dot" title="未保存の変更あり">●</span>
        <span class="mode-badge" :class="isEdit ? 'mode-edit' : 'mode-view'">
          {{ isEdit ? 'EDIT' : 'VIEW' }}
        </span>
      </div>

      <div class="header-right">
        <div class="sns-bar">
          <a href="https://twitter.com/share?ref_src=twsrc%5Etfw" class="twitter-share-button" data-show-count="false">ポスト</a>
          <iframe src="https://www.facebook.com/plugins/share_button.php?href=https%3A%2F%2FAZO234.github.io%2Fjapanese-character-viewer&layout&size&width=93&height=20&appId" width="93" height="20" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
          <div class="line-it-button" data-lang="ja" data-type="share-a" data-env="REAL" data-url="https://azo234.github.io/japanese-character-viewer/" data-color="default" data-size="small" data-count="false" data-ver="3" style="display: none;"></div>
          <a href="https://buymeacoffee.com/azo234" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee">
          </a>
          <a href="https://github.com/sponsors/azo234" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/static/v1?label=Sponsor&message=❤️&logo=github-sponsors&color=lightgrey&style=for-the-badge" alt="Sponsor ❤️">
          </a>
        </div>

        <!-- 編集モードの操作 -->
        <template v-if="isEdit">
          <button @click="store.undo()" :disabled="!store.past.length"   class="btn">⟵ Undo</button>
          <button @click="store.redo()" :disabled="!store.future.length" class="btn">Redo ⟶</button>
          <!-- 校正済みトグル -->
          <button
            class="btn btn-verify"
            :class="{ 'btn-verified': currentVerified }"
            @click="store.toggleVerified()"
            :title="currentVerified ? '校正済みを解除' : '校正済みにする'"
          >{{ currentVerified ? '✓ 校正済み' : '校正する' }}</button>
          <div class="sep"/>
          <button @click="exportDiff" class="btn btn-diff"  title="変更分のみ保存">差分 JSON</button>
          <button @click="exportFull" class="btn btn-full"  title="全件保存">全件 JSON</button>
          <button @click="exportSVG"  class="btn btn-svg"   title="SVG形式で保存">SVG</button>
          <div class="sep"/>
        </template>

        <!-- フォントサイズ切り替え -->
        <div class="font-size-group" role="group" aria-label="文字サイズ">
          <button
            v-for="sz in SIZES"
            :key="sz"
            class="sz-btn"
            :class="{ active: store.fontSize === sz }"
            @click="store.fontSize = sz"
            :title="`文字サイズ: ${FONT_SIZE_PX[sz]}px`"
          >{{ SIZE_LABEL[sz] }}</button>
        </div>

        <div class="sep"/>
        <ThemeToggle v-model="isDark" />
      </div>
    </header>

    <!-- ── レイアウト ── -->
    <div class="layout">
      <div class="sidebar-overlay" :class="{ open: sidebarOpen }" @click="sidebarOpen=false"/>

      <!-- 左: 文字選択 -->
      <div class="sidebar-wrap" :class="{ 'sidebar-open': sidebarOpen }">
        <CharSelector @select="sidebarOpen=false" @switch-font="switchFont" @open-renderer="showRenderer=true" />
      </div>

      <!-- 中央: キャンバス + プレビュー -->
      <div class="center">
        <!-- 校正済みバナー (閲覧モード) -->
        <div v-if="!isEdit && currentVerified" class="verified-banner">
          ✓ この文字は校正済みです
        </div>
        <StrokeCanvas />
        <AnimPreview />
      </div>

      <!-- 右: ストロークパネル + KVG + ファイルロード -->
      <div class="right-col">
        <div class="stroke-panel-wrap">
          <StrokePanel />
        </div>
        <KvgPanel />
        <FileLoader v-if="isEdit" />
      </div>
    </div>

    <!-- テキストレンダラー -->
    <TextRenderer v-if="showRenderer" @close="showRenderer=false" />

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400&family=Space+Mono&display=swap');
</style>

<style scoped>
.app {
  height: 100vh; display: flex; flex-direction: column;
  outline: none; background: var(--paper); color: var(--ink);
  transition: background .3s, color .3s;
}

/* ── Header ── */
.header {
  height: 50px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px 0 10px;
  background: var(--header-bg); border-bottom: 1px solid var(--border);
  gap: 6px; transition: background .3s;
}
.header-left  { display: flex; align-items: center; gap: 7px; min-width: 0; overflow: hidden; }
.header-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.hamburger {
  display: none; flex-direction: column; gap: 4px; justify-content: center;
  width: 30px; height: 30px; background: transparent; border: none;
  cursor: pointer; padding: 4px;
}
.hamburger span { display: block; height: 2px; border-radius: 1px; background: var(--ink); }

.app-title {
  font-family: 'Space Mono', monospace; font-size: 0.6rem;
  letter-spacing: .04em; font-weight: 400; white-space: nowrap;
}
.char-info {
  font-family: 'Space Mono', monospace; font-size: 0.6rem; color: var(--gold);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* 校正済みタグ */
.verified-tag {
  font-family: 'Space Mono', monospace; font-size: 0.5rem; font-weight: 700;
  background: var(--green); color: white;
  padding: 2px 7px; border-radius: 10px; flex-shrink: 0;
}
.modified-dot { font-size: 0.5rem; color: var(--red); }
.mode-badge {
  font-family: 'Space Mono', monospace; font-size: 0.5rem; font-weight: 700;
  letter-spacing: .1em; padding: 2px 6px; border-radius: 3px; flex-shrink: 0;
}
.mode-view { background: var(--paper3); color: var(--text-muted); border: 1px solid var(--border); }
.mode-edit { background: var(--red); color: white; }

.sep { width: 1px; height: 18px; background: var(--border); margin: 0 2px; }

.btn {
  font-family: 'Space Mono', monospace; font-size: 0.5rem; letter-spacing: .04em;
  padding: 4px 9px; border: 1.5px solid var(--border);
  background: transparent; cursor: pointer; color: var(--ink);
  border-radius: 2px; transition: all .12s; white-space: nowrap;
}
.btn:hover:not(:disabled) { background: var(--paper3); }
.btn:disabled { opacity: .4; cursor: default; }

.btn-verify  { border-color: var(--green); color: var(--green); }
.btn-verify:hover { background: color-mix(in srgb, var(--green) 12%, transparent) !important; }
.btn-verified { background: var(--green) !important; color: white !important; }

.btn-diff { border-color: var(--gold); color: var(--gold); }
.btn-diff:hover { background: var(--gold) !important; color: var(--paper) !important; }
.btn-full { border-color: var(--ink); color: var(--ink); font-weight: 700; }
.btn-full:hover { background: var(--ink) !important; color: var(--paper) !important; }
.btn-svg  { border-color: var(--blue); color: var(--blue); font-weight: 700; }
.btn-svg:hover  { background: var(--blue) !important; color: var(--paper) !important; }

.sns-bar {
  display: flex; flex-wrap: wrap; align-items: center;
  justify-content: center; gap: 0.5rem;
  padding: 0.4rem 0.5rem; margin-bottom: 0.4rem;
}
.sns-bar img { display: block; }

/* フォントサイズグループ */
.font-size-group {
  display: flex; border: 1.5px solid var(--border); border-radius: 3px; overflow: hidden;
}
.sz-btn {
  font-family: 'Noto Serif JP', serif; font-size: 0.6rem;
  padding: 3px 8px; background: transparent; border: none;
  border-left: 1px solid var(--border); cursor: pointer;
  color: var(--ink); transition: all .1s;
}
.sz-btn:first-child { border-left: none; }
.sz-btn:hover { background: var(--paper3); }
.sz-btn.active { background: var(--ink); color: var(--paper); }



/* ── Layout ── */
.layout {
  flex: 1; display: grid; grid-template-columns: 200px 1fr 435px;
  overflow: hidden; position: relative;
}

.sidebar-overlay {
  display: none; position: fixed; inset: 0; z-index: 20;
  background: rgba(0,0,0,.45); opacity: 0; pointer-events: none;
  transition: opacity .25s;
}
.sidebar-overlay.open { opacity: 1; pointer-events: auto; }

.sidebar-wrap {
  overflow: hidden; display: flex; flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--sidebar-bg); transition: background .3s; z-index: 10;
}

.center {
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  gap: 16px; padding: 16px 20px 20px;
  overflow-y: auto; background: var(--paper);
  transition: background .3s; position: relative;
}
/* 和紙グリッド */
.center::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 29px, color-mix(in srgb, var(--ink) 3%, transparent) 29px, color-mix(in srgb, var(--ink) 3%, transparent) 30px),
    repeating-linear-gradient(90deg, transparent, transparent 29px, color-mix(in srgb, var(--ink) 3%, transparent) 29px, color-mix(in srgb, var(--ink) 3%, transparent) 30px);
}

/* 校正済みバナー */
.verified-banner {
  position: relative; z-index: 1;
  align-self: stretch;
  background: color-mix(in srgb, var(--green) 12%, var(--paper));
  border: 1px solid var(--green); border-radius: 4px;
  padding: 5px 12px;
  font-family: 'Space Mono', monospace; font-size: 0.6rem; font-weight: 700;
  color: var(--green); text-align: center;
}

.right-col {
  display: flex; flex-direction: column;
  overflow: hidden; border-left: 1px solid var(--border);
}
.stroke-panel-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

/* ── Mobile (≤768px) ── */
@media (max-width: 768px) {
  .hamburger { display: flex; }
  .char-info  { display: none; }
  .app-title  { font-size: 0.6rem; letter-spacing: 0; }
  .sep        { display: none; }
  .btn        { padding: 3px 7px; font-size: 0.5rem; }
  .sz-btn     { padding: 3px 6px; }

  .layout { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }

  .sidebar-overlay { display: block; }
  .sidebar-wrap {
    position: fixed; top: 50px; left: 0; bottom: 0; width: 220px;
    transform: translateX(-100%); transition: transform .25s ease;
    box-shadow: 2px 0 16px rgba(0,0,0,.2);
  }
  .sidebar-wrap.sidebar-open { transform: translateX(0); }

  .right-col {
    border-left: none; border-top: 1px solid var(--border);
    max-height: 44vh; flex-direction: row;
  }
  .stroke-panel-wrap { min-width: 54vw; }

  .center { padding: 10px 10px 14px; gap: 10px; justify-content: flex-start; }
  .verified-banner { font-size: 0.5rem; padding: 4px 8px; }
}

@media (max-width: 480px) {
  .mode-badge    { display: none; }
  .verified-tag  { display: none; }
  .right-col     { max-height: 40vh; }
  .btn           { padding: 3px 5px; font-size: 0.5rem; }
}
</style>
