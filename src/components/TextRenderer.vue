<script setup lang="ts">
/**
 * TextRenderer.vue
 * テキスト文字列を指定フォントのストロークでキャンバスにレンダリングしPNG保存
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useEditorStore } from '../store'

const store = useEditorStore()
const emit  = defineEmits<{ close: [] }>()

// ── パラメータ ─────────────────────────────────────────────────────────────
const text        = ref('日本語\nABC 123')
const fontSize    = ref(48)           // px/文字サイズ（100単位→この値にスケール）
const strokeWidth = ref(1.5)          // px
const strokeColor = ref('#000000')
const bgColor     = ref('#ffffff')
const bgTransparent = ref(false)
const charSpacing = ref(0)            // 追加字間 px
const lineSpacing = ref(1.2)          // 行間倍率
const padding     = ref(16)           // 外周余白 px

// ── Canvas ref ────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)

// ── レンダリング ───────────────────────────────────────────────────────────
const ADVANCE = 100   // 1文字 = 100単位グリッド

function renderToCanvas(canvas: HTMLCanvasElement) {
  const db    = store.db
  const lines = text.value.split('\n')
  const scale = fontSize.value / ADVANCE   // 100単位 → px変換係数

  const cellW  = fontSize.value + charSpacing.value
  const cellH  = fontSize.value * lineSpacing.value

  // キャンバスサイズ計算
  const maxLen  = Math.max(...lines.map(l => [...l].length), 1)
  const canvasW = Math.ceil(maxLen * cellW + padding.value * 2)
  const canvasH = Math.ceil(lines.length * cellH + padding.value * 2)

  canvas.width  = canvasW
  canvas.height = canvasH

  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvasW, canvasH)

  // 背景
  if (!bgTransparent.value) {
    ctx.fillStyle = bgColor.value
    ctx.fillRect(0, 0, canvasW, canvasH)
  }

  // ストローク設定
  ctx.strokeStyle = strokeColor.value
  ctx.lineWidth   = strokeWidth.value
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  lines.forEach((line, lineIdx) => {
    const chars = [...line]   // Unicode対応 (サロゲートペア)
    chars.forEach((char, charIdx) => {
      const entry = db[char]
      if (!entry) return

      const ox = padding.value + charIdx * cellW   // 文字の原点X
      const oy = padding.value + lineIdx * cellH   // 文字の原点Y

      for (const strokePath of entry.s) {
        drawPath(ctx, strokePath, ox, oy, scale)
      }
    })
  })
}

// ── SVG Arc → cubic bezier 変換 ──────────────────────────────────────────
function arcToBeziers(
  x1: number, y1: number, rx: number, ry: number,
  phiDeg: number, largeArc: number, sweep: number,
  x2: number, y2: number
): [number, number, number, number, number, number, number, number][] {
  const phi = phiDeg * Math.PI / 180
  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const x1p =  cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy
  rx = Math.abs(rx); ry = Math.abs(ry)
  const x1p2 = x1p*x1p, y1p2 = y1p*y1p
  let rx2 = rx*rx, ry2 = ry*ry
  const lam = x1p2/rx2 + y1p2/ry2
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; rx2 = rx*rx; ry2 = ry*ry }
  const num = Math.max(0, rx2*ry2 - rx2*y1p2 - ry2*x1p2)
  const den = rx2*y1p2 + ry2*x1p2
  let sq = den > 0 ? Math.sqrt(num/den) : 0
  if (largeArc === sweep) sq = -sq
  const cxp =  sq * rx * y1p / ry
  const cyp = -sq * ry * x1p / rx
  const cx = cosPhi*cxp - sinPhi*cyp + (x1+x2)/2
  const cy = sinPhi*cxp + cosPhi*cyp + (y1+y2)/2
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const n = Math.sqrt(ux*ux+uy*uy) * Math.sqrt(vx*vx+vy*vy)
    if (!n) return 0
    const a = Math.acos(Math.max(-1, Math.min(1, (ux*vx+uy*vy)/n)))
    return ux*vy - uy*vx < 0 ? -a : a
  }
  let theta = ang(1, 0, (x1p-cxp)/rx, (y1p-cyp)/ry)
  let dtheta = ang((x1p-cxp)/rx, (y1p-cyp)/ry, (-x1p-cxp)/rx, (-y1p-cyp)/ry)
  if (!sweep && dtheta > 0) dtheta -= 2*Math.PI
  if (sweep  && dtheta < 0) dtheta += 2*Math.PI
  const nSegs = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI/2)))
  const d = dtheta / nSegs
  const result: [number,number,number,number,number,number,number,number][] = []
  let px = x1, py = y1
  for (let s = 0; s < nSegs; s++) {
    const alpha = Math.sin(d) * (Math.sqrt(4 + 3*Math.tan(d/2)**2) - 1) / 3
    const ct = Math.cos(theta), st = Math.sin(theta)
    const ct2 = Math.cos(theta+d), st2 = Math.sin(theta+d)
    const ex = cosPhi*(rx*ct2) - sinPhi*(ry*st2) + cx
    const ey = sinPhi*(rx*ct2) + cosPhi*(ry*st2) + cy
    const dx1 = -rx*st, dy1 = ry*ct
    const dx2 = -rx*st2, dy2 = ry*ct2
    result.push([
      px, py,
      px + alpha*(cosPhi*dx1 - sinPhi*dy1), py + alpha*(sinPhi*dx1 + cosPhi*dy1),
      ex - alpha*(cosPhi*dx2 - sinPhi*dy2), ey - alpha*(sinPhi*dx2 + cosPhi*dy2),
      ex, ey
    ])
    px = ex; py = ey; theta += d
  }
  return result
}

// SVGパス文字列 → Canvas 描画（A コマンド対応）
function drawPath(ctx: CanvasRenderingContext2D, d: string, ox: number, oy: number, scale: number) {
  const tokens = d.match(/[MmLlCcQqAa]|[-+]?[\d]*\.?[\d]+(?:[eE][-+]?[\d]+)?/g)
  if (!tokens) return
  ctx.beginPath()
  let i = 0, cx = 0, cy = 0

  const sc  = (v: string) => parseFloat(v) * scale      // スケールのみ
  const sx  = (v: string) => parseFloat(v) * scale + ox // X絶対
  const sy  = (v: string) => parseFloat(v) * scale + oy // Y絶対

  while (i < tokens.length) {
    const cmd = tokens[i]!
    if (cmd === 'M') {
      i++; const x = sx(tokens[i++]!), y = sy(tokens[i++]!)
      ctx.moveTo(x, y); cx = x; cy = y
    } else if (cmd === 'm') {
      i++; const x = cx + sc(tokens[i++]!), y = cy + sc(tokens[i++]!)
      ctx.moveTo(x, y); cx = x; cy = y
    } else if (cmd === 'L') {
      i++; const x = sx(tokens[i++]!), y = sy(tokens[i++]!)
      ctx.lineTo(x, y); cx = x; cy = y
    } else if (cmd === 'l') {
      i++; const x = cx + sc(tokens[i++]!), y = cy + sc(tokens[i++]!)
      ctx.lineTo(x, y); cx = x; cy = y
    } else if (cmd === 'C') {
      i++
      const x1 = sx(tokens[i++]!), y1 = sy(tokens[i++]!)
      const x2 = sx(tokens[i++]!), y2 = sy(tokens[i++]!)
      const x  = sx(tokens[i++]!), y  = sy(tokens[i++]!)
      ctx.bezierCurveTo(x1,y1,x2,y2,x,y); cx = x; cy = y
    } else if (cmd === 'c') {
      i++
      const x1 = cx+sc(tokens[i++]!), y1 = cy+sc(tokens[i++]!)
      const x2 = cx+sc(tokens[i++]!), y2 = cy+sc(tokens[i++]!)
      const x  = cx+sc(tokens[i++]!), y  = cy+sc(tokens[i++]!)
      ctx.bezierCurveTo(x1,y1,x2,y2,x,y); cx = x; cy = y
    } else if (cmd === 'Q') {
      i++
      const x1 = sx(tokens[i++]!), y1 = sy(tokens[i++]!)
      const x  = sx(tokens[i++]!), y  = sy(tokens[i++]!)
      ctx.quadraticCurveTo(x1,y1,x,y); cx = x; cy = y
    } else if (cmd === 'q') {
      i++
      const x1 = cx+sc(tokens[i++]!), y1 = cy+sc(tokens[i++]!)
      const x  = cx+sc(tokens[i++]!), y  = cy+sc(tokens[i++]!)
      ctx.quadraticCurveTo(x1,y1,x,y); cx = x; cy = y
    } else if (cmd === 'A' || cmd === 'a') {
      // A rx ry x-rotation large-arc-flag sweep-flag x y
      i++
      const rrx  = sc(tokens[i++]!),  rry  = sc(tokens[i++]!)
      const phi  = parseFloat(tokens[i++]!)
      const la   = parseInt(tokens[i++]!)
      const sw   = parseInt(tokens[i++]!)
      const ex   = cmd === 'A' ? sx(tokens[i++]!) : cx + sc(tokens[i++]!)
      const ey   = cmd === 'A' ? sy(tokens[i++]!) : cy + sc(tokens[i++]!)
      // arc → bezier に変換して描画
      const segs = arcToBeziers(cx, cy, rrx, rry, phi, la, sw, ex, ey)
      for (const [,, cp1x,cp1y, cp2x,cp2y, bx,by] of segs) {
        ctx.bezierCurveTo(cp1x,cp1y, cp2x,cp2y, bx,by)
      }
      cx = ex; cy = ey
    } else {
      i++
    }
  }
  ctx.stroke()
}

// パラメータ変更時に自動再描画
let renderTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => {
    if (canvasRef.value) renderToCanvas(canvasRef.value)
  }, 80)
}

watch([text, fontSize, strokeWidth, strokeColor, bgColor, bgTransparent, charSpacing, lineSpacing, padding, () => store.fontSource], scheduleRender)

onMounted(() => nextTick(() => { if (canvasRef.value) renderToCanvas(canvasRef.value) }))
onUnmounted(() => { if (renderTimer) clearTimeout(renderTimer) })

// ── PNG保存 ───────────────────────────────────────────────────────────────
function savePNG() {
  const canvas = canvasRef.value
  if (!canvas) return
  renderToCanvas(canvas)
  const url = canvas.toDataURL('image/png')
  const a   = document.createElement('a')
  a.href     = url
  a.download = `stroke-font-${store.fontSource}-${Date.now()}.png`
  a.click()
}

// ── キャンバスサイズプレビュー ────────────────────────────────────────────
const canvasSize = computed(() => {
  const lines  = text.value.split('\n')
  const maxLen = Math.max(...lines.map(l => [...l].length), 1)
  const w = Math.ceil(maxLen * (fontSize.value + charSpacing.value) + padding.value * 2)
  const h = Math.ceil(lines.length * fontSize.value * lineSpacing.value + padding.value * 2)
  return `${w} × ${h} px`
})

// ESCで閉じる
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <div class="overlay" @keydown="onKeydown" tabindex="-1" @click.self="emit('close')">
    <div class="modal">

      <!-- ヘッダー -->
      <div class="modal-head">
        <span class="modal-title">テキストレンダリング</span>
        <span class="font-badge">{{ store.fontSource }}</span>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">

        <!-- 左: コントロール -->
        <div class="controls">

          <!-- テキスト入力 -->
          <label class="ctrl-label">テキスト</label>
          <textarea
            v-model="text"
            class="text-input"
            rows="4"
            spellcheck="false"
            placeholder="描画するテキストを入力…&#10;改行で複数行"
          />

          <!-- フォントサイズ -->
          <label class="ctrl-label">文字サイズ <span class="val">{{ fontSize }}px</span></label>
          <input type="range" v-model.number="fontSize" min="8" max="200" step="1" class="slider" />

          <!-- 線幅 -->
          <label class="ctrl-label">線幅 <span class="val">{{ strokeWidth }}px</span></label>
          <input type="range" v-model.number="strokeWidth" min="0.5" max="10" step="0.5" class="slider" />

          <!-- 字間 -->
          <label class="ctrl-label">字間 <span class="val">{{ charSpacing }}px</span></label>
          <input type="range" v-model.number="charSpacing" min="-20" max="100" step="1" class="slider" />

          <!-- 行間 -->
          <label class="ctrl-label">行間 <span class="val">{{ lineSpacing.toFixed(1) }}</span></label>
          <input type="range" v-model.number="lineSpacing" min="0.8" max="3.0" step="0.1" class="slider" />

          <!-- 余白 -->
          <label class="ctrl-label">余白 <span class="val">{{ padding }}px</span></label>
          <input type="range" v-model.number="padding" min="0" max="100" step="4" class="slider" />

          <!-- 線色 -->
          <label class="ctrl-label">線の色</label>
          <div class="color-row">
            <input type="color" v-model="strokeColor" class="color-pick" />
            <input type="text"  v-model="strokeColor" class="color-text" maxlength="7" />
          </div>

          <!-- 背景色 -->
          <label class="ctrl-label">背景色</label>
          <div class="color-row">
            <input type="color" v-model="bgColor" class="color-pick" :disabled="bgTransparent" />
            <input type="text"  v-model="bgColor" class="color-text" maxlength="7" :disabled="bgTransparent" />
            <label class="check-label">
              <input type="checkbox" v-model="bgTransparent" />
              透明
            </label>
          </div>

          <!-- キャンバスサイズ表示 -->
          <div class="canvas-size">{{ canvasSize }}</div>

          <!-- 保存ボタン -->
          <button class="save-btn" @click="savePNG">PNG 保存</button>

        </div>

        <!-- 右: プレビューキャンバス -->
        <div class="preview-wrap">
          <div class="checkerboard" v-if="bgTransparent"/>
          <canvas ref="canvasRef" class="preview-canvas" />
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
}

.modal {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0,0,0,.35);
  display: flex; flex-direction: column;
  width: min(92vw, 1000px);
  height: min(88vh, 700px);
  overflow: hidden;
}

/* ── Header ── */
.modal-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px 9px;
  background: var(--paper2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-title {
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem; font-weight: 700;
}
.font-badge {
  font-family: 'Space Mono', monospace; font-size: 0.45rem;
  background: var(--ink); color: var(--paper);
  padding: 2px 8px; border-radius: 10px;
}
.close-btn {
  margin-left: auto;
  background: transparent; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 0.7rem; line-height: 1;
  padding: 2px 4px; border-radius: 3px;
  transition: all .1s;
}
.close-btn:hover { background: var(--red); color: white; }

/* ── Body ── */
.modal-body {
  flex: 1; display: flex; overflow: hidden;
}

/* ── Controls ── */
.controls {
  width: 200px; flex-shrink: 0;
  padding: 10px 12px 16px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
  background: var(--panel-bg);
}

.ctrl-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.45rem; color: var(--text-muted);
  margin-top: 6px; display: flex; justify-content: space-between;
}
.val { color: var(--gold); }

.text-input {
  width: 100%; padding: 5px 6px;
  border: 1px solid var(--border); border-radius: 3px;
  background: var(--canvas-bg); color: var(--ink);
  font-family: 'Space Mono', monospace; font-size: 0.5rem;
  resize: vertical; outline: none;
  transition: border-color .15s;
}
.text-input:focus { border-color: var(--gold); }

.slider {
  width: 100%; accent-color: var(--gold);
  margin: 0;
}

.color-row {
  display: flex; align-items: center; gap: 6px;
}
.color-pick {
  width: 28px; height: 24px;
  border: 1px solid var(--border); border-radius: 3px;
  padding: 1px; cursor: pointer; background: var(--canvas-bg);
  flex-shrink: 0;
}
.color-text {
  flex: 1; padding: 3px 5px;
  border: 1px solid var(--border); border-radius: 3px;
  background: var(--canvas-bg); color: var(--ink);
  font-family: 'Space Mono', monospace; font-size: 0.45rem;
  outline: none;
}
.check-label {
  display: flex; align-items: center; gap: 3px;
  font-family: 'Space Mono', monospace; font-size: 0.45rem;
  color: var(--text-muted); white-space: nowrap; cursor: pointer;
}

.canvas-size {
  font-family: 'Space Mono', monospace; font-size: 0.4rem;
  color: var(--text-dim); text-align: right; margin-top: 4px;
}

.save-btn {
  margin-top: 8px;
  padding: 8px;
  border: 1.5px solid var(--blue); border-radius: 3px;
  background: transparent; color: var(--blue);
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem; font-weight: 700; letter-spacing: .08em;
  cursor: pointer; transition: all .12s;
}
.save-btn:hover { background: var(--blue); color: var(--paper); }

/* ── Preview ── */
.preview-wrap {
  flex: 1; overflow: auto;
  display: flex; align-items: flex-start; justify-content: flex-start;
  padding: 16px;
  background: var(--paper);
  position: relative;
}

.checkerboard {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%);
  background-size: 16px 16px;
  opacity: .5;
}

.preview-canvas {
  display: block;
  box-shadow: 0 2px 12px rgba(0,0,0,.15), 0 0 0 1px var(--border);
  image-rendering: pixelated;
  position: relative; z-index: 1;
}
</style>
