<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../store'
import type { Stroke, Segment } from '../types'

const store = useEditorStore()

const COLORS = [
  '#b5301e','#1c6434','#1a3a6e','#6b3a8e','#8e6b1a',
  '#1a6b6b','#6b1a3a','#3a6b1a','#1a4a6b','#6b4a1a',
]
function strokeColor(idx: number) { return COLORS[idx % COLORS.length] }

function isStrokeSel(id: string) {
  return store.selection?.kind === 'stroke' && store.selection.strokeId === id
}
function isSegSel(id: string) {
  return store.selection?.kind === 'segment' && store.selection.segId === id
}

function clickStroke(stroke: Stroke) {
  store.setSelection(
    isStrokeSel(stroke.id) ? null : { kind: 'stroke', strokeId: stroke.id }
  )
}
function clickSeg(e: MouseEvent, stroke: Stroke, seg: Segment) {
  e.stopPropagation()
  store.setSelection(
    isSegSel(seg.id) ? null : { kind: 'segment', strokeId: stroke.id, segId: seg.id }
  )
}

// Extract start/end points from a path string
function parseStartEnd(path: string): { sx: number; sy: number; ex: number; ey: number } | null {
  const nums = (path.match(/[-\d.]+/g) ?? []).map(Number).filter(n => !isNaN(n))
  if (nums.length < 4) return null
  // M sx sy ... -> last two numbers are end point
  const sx = nums[0]!, sy = nums[1]!
  const ex = nums[nums.length - 2]!, ey = nums[nums.length - 1]!
  return { sx, sy, ex, ey }
}

// Arrow head at endpoint
function arrowHead(ex: number, ey: number, prevX: number, prevY: number, size = 3): string {
  const dx = ex - prevX, dy = ey - prevY
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len, uy = dy / len
  const px = -uy, py = ux // perpendicular
  const bx = ex - ux * size, by = ey - uy * size
  return `M${ex.toFixed(2)},${ey.toFixed(2)} L${(bx + px * size * 0.5).toFixed(2)},${(by + py * size * 0.5).toFixed(2)} L${(bx - px * size * 0.5).toFixed(2)},${(by - py * size * 0.5).toFixed(2)} Z`
}

// Get second-to-last point for arrow direction
function prevPoint(path: string): { x: number; y: number } | null {
  const nums = (path.match(/[-\d.]+/g) ?? []).map(Number).filter(n => !isNaN(n))
  if (nums.length < 6) {
    // short path: use start point
    return nums.length >= 2 ? { x: nums[0]!, y: nums[1]! } : null
  }
  return { x: nums[nums.length - 4]!, y: nums[nums.length - 3]! }
}

const strokes = computed(() => store.state?.strokes ?? [])
const showArrows = computed(() => store.selection !== null)
</script>

<template>
  <div class="canvas-wrap">
    <svg class="svg-layer grid-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <!-- 升目 -->
      <rect x="0" y="0" width="100" height="100" fill="var(--canvas-bg)"/>
      <line x1="0"  y1="0"  x2="100" y2="0"   stroke="rgba(0,0,0,.07)" stroke-width=".3"/>
      <line x1="0"  y1="0"  x2="0"   y2="100" stroke="rgba(0,0,0,.07)" stroke-width=".3"/>
      <line x1="100" y1="0" x2="100" y2="100" stroke="rgba(0,0,0,.07)" stroke-width=".3"/>
      <line x1="0"  y1="100" x2="100" y2="100" stroke="rgba(0,0,0,.07)" stroke-width=".3"/>
      <!-- 4分割 -->
      <line x1="50" y1="0"  x2="50"  y2="100" stroke="rgba(0,0,0,.07)" stroke-width=".3" stroke-dasharray="2 2"/>
      <line x1="0"  y1="50" x2="100" y2="50"  stroke="rgba(0,0,0,.07)" stroke-width=".3" stroke-dasharray="2 2"/>
      <!-- 中心十字（金色） -->
      <line x1="50" y1="0"  x2="50"  y2="100" stroke="rgba(158,124,53,.22)" stroke-width=".5"/>
      <line x1="0"  y1="50" x2="100" y2="50"  stroke="rgba(158,124,53,.22)" stroke-width=".5"/>
    </svg>

    <svg class="svg-layer strokes-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g v-for="(stroke, si) in strokes" :key="stroke.id">

        <!-- セグメントパス -->
        <path
          v-for="seg in stroke.segments"
          :key="seg.id + '-path'"
          :d="seg.path"
          fill="none"
          :stroke="isSegSel(seg.id) ? '#ff6600' : strokeColor(si)"
          :stroke-width="isSegSel(seg.id) ? 5
            : isStrokeSel(stroke.id) ? 4.2
            : 3.2"
          :stroke-opacity="isSegSel(seg.id) ? 1
            : isStrokeSel(stroke.id) ? 1
            : 0.55"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="cursor:pointer"
          @click="clickSeg($event, stroke, seg)"
        />

        <!-- 矢印（方向表示, 選択時） -->
        <template v-if="showArrows">
          <g v-for="seg in stroke.segments" :key="seg.id + '-arrow'">
            <template v-if="parseStartEnd(seg.path)">
              <path
                :d="arrowHead(
                  parseStartEnd(seg.path)!.ex,
                  parseStartEnd(seg.path)!.ey,
                  prevPoint(seg.path)?.x ?? parseStartEnd(seg.path)!.sx,
                  prevPoint(seg.path)?.y ?? parseStartEnd(seg.path)!.sy,
                  2.5
                )"
                :fill="isSegSel(seg.id) ? '#ff6600' : strokeColor(si)"
                :fill-opacity="isSegSel(seg.id) || isStrokeSel(stroke.id) ? 0.9 : 0.4"
                stroke="none"
                style="pointer-events:none"
              />
            </template>
          </g>
        </template>

        <!-- 始点番号バッジ -->
        <g
          v-if="stroke.segments.length > 0"
          style="cursor:pointer"
          @click="clickStroke(stroke)"
        >
          <!-- 始点座標を取得 -->
          <template v-if="parseStartEnd(stroke.segments[0].path)">
            <circle
              :cx="parseStartEnd(stroke.segments[0].path)!.sx"
              :cy="parseStartEnd(stroke.segments[0].path)!.sy"
              r="4.5"
              :fill="isStrokeSel(stroke.id) ? strokeColor(si) : 'white'"
              :stroke="strokeColor(si)"
              stroke-width="1.3"
            />
            <text
              :x="parseStartEnd(stroke.segments[0].path)!.sx"
              :y="parseStartEnd(stroke.segments[0].path)!.sy + 1.6"
              text-anchor="middle"
              dominant-baseline="middle"
              :fill="isStrokeSel(stroke.id) ? 'white' : strokeColor(si)"
              font-size="4.8"
              font-family="monospace"
              font-weight="bold"
              style="pointer-events:none"
            >{{ si + 1 }}</text>
          </template>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  width: min(400px, 70vw);
  height: min(400px, 70vw);
  box-shadow: 0 2px 20px rgba(0,0,0,.09), 0 0 0 1px rgba(0,0,0,.08);
  flex-shrink: 0;
}

.svg-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.grid-svg { pointer-events: none; }
</style>
