<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <button
    class="tog"
    :class="{ dark: modelValue }"
    @click="$emit('update:modelValue', !modelValue)"
    :aria-label="modelValue ? 'ライトモードへ' : 'ダークモードへ'"
  >
    <!-- トラック背景 -->
    <div class="tog__track">

      <!-- ── ライト側: 空・雲 ── -->
      <div class="tog__sky">
        <div class="tog__cloud tog__cloud--1"/>
        <div class="tog__cloud tog__cloud--2"/>
      </div>

      <!-- ── ダーク側: 星空 ── -->
      <div class="tog__night">
        <div class="tog__star" v-for="n in 8" :key="n" :class="`tog__star--${n}`"/>
      </div>

    </div>

    <!-- サム（太陽/月） -->
    <div class="tog__thumb">
      <!-- 太陽 -->
      <div class="tog__sun">
        <div class="tog__sun-ray" v-for="n in 8" :key="n" :style="{transform:`rotate(${n*45}deg)`}"/>
        <div class="tog__sun-core"/>
      </div>
      <!-- 月 -->
      <div class="tog__moon">
        <div class="tog__crater tog__crater--1"/>
        <div class="tog__crater tog__crater--2"/>
        <div class="tog__crater tog__crater--3"/>
      </div>
    </div>

  </button>
</template>

<style scoped>
/* ── ベース ── */
.tog {
  --w: 4.2rem;
  --h: 2.1rem;
  --r: 1.05rem;   /* = h/2 */
  --thumb: 1.7rem;
  --pad: 0.18rem;
  position: relative;
  width: var(--w);
  height: var(--h);
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

/* ── トラック ── */
.tog__track {
  position: absolute;
  inset: 0;
  border-radius: var(--r);
  overflow: hidden;
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,0.25),
    0 1px 3px rgba(255,255,255,0.15);
  transition: box-shadow 0.4s;
}

/* ── 昼空背景 ── */
.tog__sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, #5ab4e8 0%, #8dd4f8 55%, #c8eaff 100%);
  opacity: 1;
  transition: opacity 0.4s;
}
.dark .tog__sky { opacity: 0; }

/* 雲 */
.tog__cloud {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(255,255,255,0.8);
}
.tog__cloud--1 {
  width: 1.4rem; height: 0.75rem;
  right: 0.3rem; bottom: 0.2rem;
  border-radius: 0.4rem;
}
.tog__cloud--1::before {
  content: '';
  position: absolute;
  width: 0.7rem; height: 0.7rem;
  background: #fff;
  border-radius: 50%;
  top: -0.35rem; left: 0.25rem;
}
.tog__cloud--2 {
  width: 0.9rem; height: 0.45rem;
  right: 0.8rem; bottom: 0.5rem;
  border-radius: 0.25rem;
  opacity: 0.85;
}

/* ── 夜空背景 ── */
.tog__night {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0d0d1f 100%);
  opacity: 0;
  transition: opacity 0.4s;
}
.dark .tog__night { opacity: 1; }

/* 星 */
.tog__star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
}
.tog__star--1 { width:2px; height:2px; top:20%; left:15%; opacity:.9; }
.tog__star--2 { width:3px; height:3px; top:50%; left:25%; opacity:.8; }
.tog__star--3 { width:2px; height:2px; top:30%; left:40%; opacity:1;  }
.tog__star--4 { width:2px; height:2px; top:65%; left:35%; opacity:.7; }
.tog__star--5 { width:3px; height:3px; top:20%; left:55%; opacity:.9; }
.tog__star--6 { width:2px; height:2px; top:55%; left:50%; opacity:.8; }
.tog__star--7 { width:2px; height:2px; top:75%; left:20%; opacity:.6; }
.tog__star--8 { width:2px; height:2px; top:40%; left:60%; opacity:.9; }
/* 4角星エフェクト */
.tog__star--2::after,
.tog__star--5::after {
  content: '';
  position: absolute;
  width: 1px; height: 6px;
  background: rgba(255,255,255,0.6);
  top: -1.5px; left: 1px;
  box-shadow: 0 0 2px white;
}

/* ── サム ── */
.tog__thumb {
  position: absolute;
  top: var(--pad);
  left: var(--pad);
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}
.dark .tog__thumb {
  transform: translateX(calc(var(--w) - var(--thumb) - var(--pad) * 2));
}

/* ── 太陽 ── */
.tog__sun {
  position: absolute;
  inset: 0;
  opacity: 1;
  transition: opacity 0.3s;
}
.dark .tog__sun { opacity: 0; }

.tog__sun-core {
  position: absolute;
  inset: 0.18rem;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #ffe566, #f5a800 60%, #e07800);
  box-shadow:
    0 0 8px 2px rgba(255,200,50,0.7),
    0 0 16px 4px rgba(255,160,0,0.3);
}
.tog__sun-ray {
  position: absolute;
  width: 2px;
  height: 35%;
  background: linear-gradient(to bottom, rgba(255,220,60,0.9), transparent);
  top: 0;
  left: 50%;
  transform-origin: 50% 100%;
  border-radius: 1px;
}

/* ── 月 ── */
.tog__moon {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #e8e8ec, #b8b8c4 55%, #9090a0);
  box-shadow:
    inset -2px -2px 4px rgba(0,0,0,0.2),
    inset 1px 1px 3px rgba(255,255,255,0.4),
    0 2px 8px rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.3s 0.1s;
}
.dark .tog__moon { opacity: 1; }

.tog__crater {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(180,180,195,1), rgba(130,130,148,1));
  box-shadow: inset 1px 1px 2px rgba(0,0,0,0.3);
}
.tog__crater--1 { width: 35%; height: 35%; top: 20%; left: 20%; }
.tog__crater--2 { width: 22%; height: 22%; top: 50%; left: 52%; }
.tog__crater--3 { width: 18%; height: 18%; top: 28%; left: 58%; }

/* トラック外枠 */
.tog__track::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--r);
  box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.12);
  pointer-events: none;
}
</style>
