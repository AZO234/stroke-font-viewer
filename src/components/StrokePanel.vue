<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../store'
import type { Stroke, Segment } from '../types'

const store   = useEditorStore()
const strokes = computed(() => store.state?.strokes ?? [])
const isEdit  = computed(() => store.isEditMode)

const COLORS = [
  '#b5301e','#1c6434','#1a3a6e','#6b3a8e','#8e6b1a',
  '#1a6b6b','#6b1a3a','#3a6b1a','#1a4a6b','#6b4a1a',
]
const color = (i: number) => COLORS[i % COLORS.length]!

// ── drag & drop ─────────────────────────────────────────────────────────────
const draggingSegId = ref<string | null>(null)
const dropTargetId  = ref<string | null>(null)

function onSegDragStart(e: DragEvent, seg: Segment) {
  draggingSegId.value = seg.id
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() { draggingSegId.value = null; dropTargetId.value = null }
function onDrop(strokeId: string) {
  if (draggingSegId.value) store.moveSegmentToStroke(draggingSegId.value, strokeId)
  draggingSegId.value = null; dropTargetId.value = null
}
function onDropNew(dir: 'new-before' | 'new-after') {
  if (draggingSegId.value) store.moveSegmentToStroke(draggingSegId.value, dir)
  draggingSegId.value = null; dropTargetId.value = null
}

// ── selection ────────────────────────────────────────────────────────────────
function clickStroke(stroke: Stroke) {
  store.setSelection(
    store.selection?.kind === 'stroke' && store.selection.strokeId === stroke.id
      ? null : { kind: 'stroke', strokeId: stroke.id }
  )
}
function clickSeg(e: MouseEvent, stroke: Stroke, seg: Segment) {
  e.stopPropagation()
  store.setSelection(
    store.selection?.kind === 'segment' && store.selection.segId === seg.id
      ? null : { kind: 'segment', strokeId: stroke.id, segId: seg.id }
  )
}
const isStrokeSel = (id: string) =>
  store.selection?.kind === 'stroke' && store.selection.strokeId === id
const isSegSel = (id: string) =>
  store.selection?.kind === 'segment' && store.selection.segId === id

// ── seg label ────────────────────────────────────────────────────────────────
function segLabel(path: string): string {
  const curve = path.includes('C') || path.includes('Q')
  const n     = (path.match(/[-\d.]+/g) ?? []).map(Number).filter(v => !isNaN(v))
  const type  = curve ? '曲' : '直'
  if (n.length >= 4) {
    return `${type} (${n[0]!.toFixed(0)},${n[1]!.toFixed(0)})→(${n[n.length-2]!.toFixed(0)},${n[n.length-1]!.toFixed(0)})`
  }
  return type + ' ' + path.slice(0, 22)
}
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <span class="panel-title">ストローク構成</span>
      <span v-if="isEdit" class="panel-hint">ドラッグ / ↑↓ / ✂ / ⬆</span>
      <span v-else class="view-badge">閲覧</span>
    </div>

    <div class="stroke-list">
      <div
        v-for="(stroke, si) in strokes"
        :key="stroke.id"
        class="stroke-block"
        :class="{
          'sel-stroke': isStrokeSel(stroke.id),
          'is-dragover': isEdit && dropTargetId === stroke.id,
        }"
        @dragover.prevent="isEdit && (dropTargetId = stroke.id)"
        @dragleave="dropTargetId = null"
        @drop.prevent="isEdit && onDrop(stroke.id)"
      >
        <!-- 画ヘッダー -->
        <div class="stroke-hd" @click="clickStroke(stroke)">
          <span class="badge" :style="{ background: color(si) }">{{ si + 1 }}</span>
          <span class="stroke-name">画 <em>({{ stroke.segments.length }})</em></span>
          <div v-if="isEdit" class="stroke-btns">
            <button title="上へ"     :disabled="si===0"               @click.stop="store.moveStroke(stroke.id,'up')">↑</button>
            <button title="下へ"     :disabled="si===strokes.length-1" @click.stop="store.moveStroke(stroke.id,'down')">↓</button>
            <button title="次と結合" :disabled="si===strokes.length-1" class="btn-merge" @click.stop="store.mergeStrokes(stroke.id)">⊕</button>
            <button title="向きを反転" class="btn-rev" @click.stop="store.reverseStroke(stroke.id)">⇄</button>
          </div>
        </div>

        <!-- セグメント一覧 -->
        <div class="seg-list">
          <!-- ドロップ先 (前) -->
          <div
            v-if="isEdit && draggingSegId"
            class="drop-new" :class="{ active: dropTargetId==='nb-'+stroke.id }"
            @dragover.prevent="dropTargetId='nb-'+stroke.id"
            @dragleave="dropTargetId=null"
            @drop.prevent="onDropNew('new-before')"
          >＋ 新しい画（前）</div>

          <div
            v-for="(seg, idx) in stroke.segments"
            :key="seg.id"
            class="seg-row"
            :class="{ 'sel-seg': isSegSel(seg.id), dragging: draggingSegId===seg.id }"
            :draggable="isEdit ? true : false"
            @dragstart="isEdit && onSegDragStart($event, seg)"
            @dragend="onDragEnd"
            @click="clickSeg($event, stroke, seg)"
          >
            <span v-if="isEdit" class="drag-handle">⠿</span>
            <span class="seg-label">{{ segLabel(seg.path) }}</span>

            <!-- 編集ボタン群 -->
            <div v-if="isEdit" class="seg-btns">
              <!-- 画内順序 -->
              <button title="セグを上へ"
                :disabled="idx===0"
                @click.stop="store.moveSegmentWithinStroke(stroke.id, seg.id, 'up')">↑</button>
              <button title="セグを下へ"
                :disabled="idx===stroke.segments.length-1"
                @click.stop="store.moveSegmentWithinStroke(stroke.id, seg.id, 'down')">↓</button>
              <!-- 昇格 (独立した画へ) -->
              <button
                title="このセグメントを独立した画に昇格（前に挿入）"
                class="btn-promote"
                @click.stop="store.promoteSegmentToStroke(stroke.id, seg.id, 'before')"
              >⬆前</button>
              <button
                title="このセグメントを独立した画に昇格（後に挿入）"
                class="btn-promote"
                @click.stop="store.promoteSegmentToStroke(stroke.id, seg.id, 'after')"
              >後⬆</button>
              <!-- 分割 -->
              <button v-if="idx>0" class="btn-split" title="ここで分割"
                @click.stop="store.splitStrokeAt(stroke.id, idx)">✂</button>
              <!-- 反転 -->
              <button class="btn-rev-seg" title="向き反転"
                @click.stop="store.reverseSegment(stroke.id, seg.id)">⇄</button>
            </div>
          </div>

          <!-- ドロップ先 (後) -->
          <div
            v-if="isEdit && draggingSegId"
            class="drop-new" :class="{ active: dropTargetId==='na-'+stroke.id }"
            @dragover.prevent="dropTargetId='na-'+stroke.id"
            @dragleave="dropTargetId=null"
            @drop.prevent="onDropNew('new-after')"
          >＋ 新しい画（後）</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  display: flex; flex-direction: column;
  height: 100%; background: var(--panel-bg);
  border-left: 1px solid var(--border); overflow: hidden;
}
.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px 6px; border-bottom: 1px solid var(--border);
  background: var(--paper2); flex-shrink: 0;
}
.panel-title { font-size: 0.6rem; font-weight: 600; letter-spacing:.05em; }
.panel-hint  { font-size: 0.5rem; color: var(--text-muted); font-family:'Space Mono',monospace; }
.view-badge  {
  font-family:'Space Mono',monospace; font-size: 0.5rem;
  background: var(--paper3); border:1px solid var(--border);
  border-radius:3px; padding:2px 7px; color:var(--text-muted);
}

.stroke-list { overflow-y: auto; flex: 1; padding: 4px 0 20px; }

.stroke-block { border-bottom: 1px solid var(--border); }
.stroke-block.sel-stroke { background: color-mix(in srgb, var(--red) 6%, var(--panel-bg)); }
.stroke-block.is-dragover { background: color-mix(in srgb, var(--green) 10%, var(--panel-bg)); outline: 2px dashed var(--green); outline-offset:-2px; }

.stroke-hd {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 8px 4px; cursor: pointer; user-select: none;
}
.stroke-hd:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }

.badge {
  width: 20px; height: 20px; border-radius: 50%;
  color: white; font-size: 0.5rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stroke-name { font-size: 0.6rem; flex: 1; }
.stroke-name em { color: var(--text-muted); font-style: normal; font-size: 0.5rem; }

.stroke-btns { display: flex; gap: 2px; }
.stroke-btns button {
  padding: 1px 5px; font-size: 0.6rem; background: transparent;
  border: 1px solid var(--border); border-radius: 3px;
  cursor: pointer; color: var(--ink); transition: all .1s;
}
.stroke-btns button:disabled { opacity:.3; cursor:default; }
.stroke-btns button:hover:not(:disabled) { background: var(--paper3); }
.btn-merge { color: var(--green) !important; border-color: var(--green) !important; }
.btn-rev   { color: var(--blue)  !important; border-color: var(--blue)  !important; font-size: 0.7rem !important; }

.seg-list { padding: 0 6px 5px 34px; }

.seg-row {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 4px; border-radius: 4px;
  cursor: pointer; user-select: none;
  transition: background .1s;
}
.seg-row:hover  { background: color-mix(in srgb, var(--ink) 5%, transparent); }
.seg-row.sel-seg { background: var(--seg-sel); outline: 1px solid var(--seg-sel-border); }
.seg-row.dragging { opacity: .4; }

.drag-handle { font-size: 0.7rem; color:var(--text-dim); cursor:grab; flex-shrink:0; }
.drag-handle:active { cursor:grabbing; }

.seg-label {
  flex: 1; font-family:'Space Mono',monospace; font-size: 0.5rem;
  color: var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

.seg-btns { display: flex; gap: 2px; flex-shrink: 0; }
.seg-btns button {
  padding: 1px 4px; font-size: 0.5rem; background: transparent;
  border: 1px solid var(--border); border-radius: 3px;
  cursor: pointer; color: var(--ink); transition: all .1s;
  white-space: nowrap;
}
.seg-btns button:disabled { opacity:.25; cursor:default; }
.seg-btns button:hover:not(:disabled) { background: var(--paper3); }

.btn-promote { color: var(--gold) !important; border-color: var(--gold) !important; font-weight:700; }
.btn-split   { color: var(--red)  !important; border-color: var(--red)  !important; }
.btn-rev-seg { color: var(--blue) !important; border-color: var(--blue) !important; font-size: 0.6rem !important; }

.drop-new {
  margin: 2px 0; padding: 3px 8px; border: 1.5px dashed var(--border);
  border-radius: 4px; font-family:'Space Mono',monospace; font-size: 0.5rem;
  color: var(--text-dim); text-align:center; transition: all .15s;
}
.drop-new.active { border-color:var(--green); color:var(--green); background: color-mix(in srgb, var(--green) 8%, transparent); }
</style>
