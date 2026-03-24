<script setup lang="ts">
/**
 * FileLoader.vue
 * ローカルの JSON または SVG（mplus_stroke互換）を読み込んでDBにマージする
 * edit モード専用コンポーネント
 */
import { ref } from 'vue'
import { useEditorStore } from '../store'
import type { StrokeDB } from '../types'

const store   = useEditorStore()
const status  = ref<'idle' | 'loading' | 'ok' | 'err'>('idle')
const message = ref('')
const fileRef = ref<HTMLInputElement | null>(null)

// ── JSON ロード ──────────────────────────────────────────────────────────────
async function loadJSON(file: File) {
  try {
    const text = await file.text()
    const data = JSON.parse(text) as StrokeDB
    // 形式チェック: 各エントリに s (string[]) が必要
    const entries = Object.entries(data)
    if (!entries.length) throw new Error('空のJSONです')
    const [, first] = entries[0]!
    if (!first || !Array.isArray((first as {s?: unknown}).s)) {
      throw new Error('ストロークデータ (s: string[]) が見つかりません')
    }
    store.mergeDB(data)
    message.value = `✓ ${entries.length}文字をロードしました`
    status.value = 'ok'
  } catch(e) {
    message.value = `✗ JSON読み込みエラー: ${(e as Error).message}`
    status.value = 'err'
  }
}

// ── SVG ロード (mplus_stroke.svg互換) ───────────────────────────────────────
async function loadSVG(file: File) {
  try {
    const text = await file.text()
    // コメント + path を解析
    const blockRe = /<!-- UTF16:([0-9A-Fa-f]+)[^>]*item:(\d+) -->\s*<path[^>]+d="([^"]+)"[^>]*transform="translate\((\d+),\s*(\d+)\)"/g
    const parsed: StrokeDB = {}
    let match, count = 0
    while ((match = blockRe.exec(text)) !== null) {
      const [, codeHex, , d] = match
      const char = String.fromCodePoint(parseInt(codeHex!, 16))
      const segs  = d!.split(/(?=\bM)/).map(s => s.trim()).filter(Boolean)
      if (segs.length) {
        parsed[char] = { u: codeHex!.toUpperCase(), s: segs, n: segs.length }
        count++
      }
    }
    if (!count) throw new Error('ストロークデータが見つかりません（形式を確認してください）')
    store.mergeDB(parsed)
    message.value = `✓ ${count}文字をロードしました`
    status.value = 'ok'
  } catch(e) {
    message.value = `✗ SVG読み込みエラー: ${(e as Error).message}`
    status.value = 'err'
  }
}

// ── ファイル選択ハンドラ ──────────────────────────────────────────────────────
async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  status.value = 'loading'
  message.value = ''
  if (file.name.endsWith('.json'))      await loadJSON(file)
  else if (file.name.endsWith('.svg'))  await loadSVG(file)
  else { status.value = 'err'; message.value = '✗ .json または .svg ファイルを選択してください' }
  // inputをリセット（同じファイルを再度選べるように）
  if (fileRef.value) fileRef.value.value = ''
}

// ── ドラッグ＆ドロップ ────────────────────────────────────────────────────────
const dragOver = ref(false)

async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  status.value = 'loading'
  message.value = ''
  if (file.name.endsWith('.json'))     await loadJSON(file)
  else if (file.name.endsWith('.svg')) await loadSVG(file)
  else { status.value = 'err'; message.value = '✗ .json または .svg ファイルを選択してください' }
}
</script>

<template>
  <div class="file-loader">
    <div class="loader-head">
      <span class="loader-title">ファイルを読み込む</span>
      <span class="loader-hint">.json / .svg</span>
    </div>

    <!-- ドロップゾーン -->
    <div
      class="drop-zone"
      :class="{ over: dragOver, ok: status==='ok', err: status==='err', loading: status==='loading' }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop="onDrop"
      @click="fileRef?.click()"
    >
      <span v-if="status === 'loading'" class="dz-icon">⟳</span>
      <span v-else-if="status === 'ok'"  class="dz-icon ok-icon">✓</span>
      <span v-else-if="status === 'err'" class="dz-icon err-icon">✗</span>
      <span v-else class="dz-icon">↑</span>

      <span class="dz-text">
        <template v-if="status === 'idle'">
          クリックまたはドロップ
        </template>
        <template v-else>{{ message }}</template>
      </span>
    </div>

    <input
      ref="fileRef"
      type="file"
      accept=".json,.svg"
      style="display:none"
      @change="onFileChange"
    />
  </div>
</template>

<style scoped>
.file-loader {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--border);
  background: var(--paper2);
  flex-shrink: 0;
}

.loader-head {
  display: flex; align-items: baseline; gap: 8px;
  margin-bottom: 6px;
}
.loader-title { font-size: 0.6rem; font-weight: 600; letter-spacing: .04em; }
.loader-hint  { font-size: 0.5rem; color: var(--text-muted); font-family: 'Space Mono', monospace; }

.drop-zone {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border: 1.5px dashed var(--border);
  border-radius: 5px;
  cursor: pointer;
  transition: all .15s;
  background: var(--panel-bg);
  user-select: none;
}
.drop-zone:hover, .drop-zone.over {
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 8%, var(--panel-bg));
}
.drop-zone.ok  { border-color: var(--green); background: color-mix(in srgb, var(--green) 8%, var(--panel-bg)); }
.drop-zone.err { border-color: var(--red);   background: color-mix(in srgb, var(--red)   8%, var(--panel-bg)); }
.drop-zone.loading { opacity: .6; cursor: wait; }

.dz-icon {
  font-size: 0.9rem; flex-shrink: 0; line-height: 1;
  color: var(--text-muted);
}
.ok-icon  { color: var(--green); }
.err-icon { color: var(--red); }

.dz-text {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem; color: var(--text-muted);
  word-break: break-all; line-height: 1.4;
}
</style>
