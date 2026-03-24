<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useEditorStore } from '../store'

const store  = useEditorStore()
const strokes = computed(() => store.state?.strokes ?? [])

// animation state
const phase   = ref<'idle' | 'playing' | 'done'>('idle')
const curIdx  = ref(-1)
let   timer: ReturnType<typeof setTimeout> | null = null

function stopAll() {
  if (timer) { clearTimeout(timer); timer = null }
  phase.value = 'idle'
  curIdx.value = -1
}

function reset() { stopAll() }

function play() {
  stopAll()
  phase.value = 'playing'
  curIdx.value = -1
  next()
}

function next() {
  if (phase.value !== 'playing') return
  curIdx.value++
  if (curIdx.value >= strokes.value.length) {
    phase.value = 'done'
    return
  }
  const path = strokes.value[curIdx.value]!.segments.map(s => s.path).join(' ')
  const pts   = (path.match(/[\d.]+/g) ?? []).length
  const dur   = Math.max(350, pts * 25)
  timer = setTimeout(next, dur + 150)
}

watch(() => store.currentChar, stopAll)
onUnmounted(stopAll)

// rendering helpers
function getPath(si: number) {
  return strokes.value[si]?.segments.map(s => s.path).join(' ') ?? ''
}

function strokeOpacity(si: number): number {
  if (phase.value === 'idle') return 0.18
  if (si < curIdx.value)      return 1
  if (si === curIdx.value)     return 1
  return 0.18
}

function strokeColor(si: number): string {
  if (si === curIdx.value) return '#b5301e'
  return 'var(--ink)'
}

const COLORS = ['#b5301e','#1c6434','#1a3a6e','#6b3a8e','#8e6b1a','#1a6b6b']
function dotColor(i: number) { return COLORS[i % COLORS.length] }
</script>

<template>
  <div class="preview">
    <div class="preview-label">アニメーション確認</div>

    <!-- Mini canvas -->
    <div class="mini-canvas">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- grid -->
        <rect x="0" y="0" width="100" height="100" fill="var(--canvas-bg)"/>
        <line x1="50" y1="0"  x2="50"  y2="100" stroke="rgba(158,124,53,.2)" stroke-width=".5"/>
        <line x1="0"  y1="50" x2="100" y2="50"  stroke="rgba(158,124,53,.2)" stroke-width=".5"/>
        <!-- strokes -->
        <path
          v-for="(stroke, si) in strokes"
          :key="stroke.id"
          :d="getPath(si)"
          fill="none"
          :stroke="strokeColor(si)"
          stroke-width="3.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :opacity="strokeOpacity(si)"
          :class="{ 'anim-stroke': si === curIdx && phase === 'playing' }"
        />
      </svg>
    </div>

    <!-- Stroke dots -->
    <div class="dots">
      <div
        v-for="(stroke, si) in strokes"
        :key="stroke.id"
        class="dot"
        :class="{
          done:    phase !== 'idle' && si < curIdx,
          active:  si === curIdx,
          pending: phase === 'idle' || si > curIdx
        }"
        :style="si < curIdx || si === curIdx ? { background: dotColor(si), borderColor: dotColor(si) } : {}"
      >{{ si + 1 }}</div>
    </div>

    <!-- Controls -->
    <div class="ctrls">
      <button class="btn-play" :disabled="phase === 'playing'" @click="play">
        {{ phase === 'done' ? '↺ 再生' : '▶ 再生' }}
      </button>
      <button class="btn-reset" @click="reset">リセット</button>
    </div>

    <div class="status" v-if="phase !== 'idle'">
      {{ phase === 'done' ? `完成 (${strokes.length}画)` : `${curIdx + 1} / ${strokes.length} 画目` }}
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.preview-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  letter-spacing: .1em;
  color: #bbb;
  align-self: flex-start;
  padding: 0 4px;
}

.mini-canvas {
  width: 190px;
  height: 190px;
  box-shadow: 0 1px 10px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.07);
}
.mini-canvas svg { width: 100%; height: 100%; display: block; }

.anim-stroke {
  animation: flash .35s ease-out;
}
@keyframes flash {
  0%   { opacity: 0.3; stroke-width: 5; }
  100% { opacity: 1;   stroke-width: 3.2; }
}

.dots {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 190px;
}
.dot {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  font-weight: 700;
  border: 1.5px solid #ddd;
  color: #ccc;
  transition: all .2s ease;
}
.dot.active {
  color: white !important;
  transform: scale(1.2);
  box-shadow: 0 2px 6px rgba(0,0,0,.2);
}
.dot.done {
  color: white !important;
}
.dot.pending { background: var(--canvas-bg); }

.ctrls {
  display: flex;
  gap: 8px;
}

button {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  letter-spacing: .08em;
  padding: 6px 14px;
  border-radius: 2px;
  cursor: pointer;
  transition: all .12s;
}
button:disabled { opacity: .4; cursor: default; }

.btn-play {
  border: 1.5px solid #b5301e;
  background: transparent;
  color: #b5301e;
}
.btn-play:hover:not(:disabled) { background: #b5301e; color: white; }

.btn-reset {
  border: 1.5px solid rgba(0,0,0,.2);
  background: transparent;
  color: var(--ink);
}
.btn-reset:hover { background: rgba(0,0,0,.07); }

.status {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  color: var(--text-muted);
}
</style>
