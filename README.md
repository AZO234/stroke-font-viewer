[<img src="images/typescript.svg" width="64" alt="TypeScript icon">](https://www.typescriptlang.org/ja/) [<img src="images/vite.svg" width="64" alt="Vite.js icon">](https://ja.vite.dev/) [<img src="images/vue.svg" width="64" alt="Vue.js icon">](https://ja.vuejs.org/)

[![BuyMeACoffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://coff.ee/azo234)

# Stroke Font Viewer

A web-based viewer and stroke order editor for multiple stroke fonts —
**M+ OUTLINE FONTS**, **KST32B**, and **ISO 3098** (standard and italic).

[![Deploy](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml/badge.svg)](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml)

**[→ Open Stroke Font Viewer](https://azo234.github.io/stroke-font-viewer/)**

---

## Background

Stroke fonts (also called vector fonts or single-stroke fonts) represent each character as a set
of center-line paths rather than filled outlines. They are used in CAD, pen plotters, laser
engravers, LED/EL-wire signage, and animated display art.

This viewer collects several stroke font datasets into one place and provides tools to:

- **Browse** stroke animations for any character
- **Compare** stroke order against [KanjiVG](https://kanjivg.tagaini.net/) (the authoritative
  Japanese schoolbook stroke order reference)
- **Edit** stroke order and segment structure (`/?mode=edit`)
- **Render** arbitrary text to a PNG image using any of the loaded fonts

The primary goal for the M+ dataset is correcting stroke order discrepancies against KanjiVG.
KST32B and ISO 3098 have no defined stroke order — corrections to their stroke sequencing are
equally welcome.

---

## Fonts

| Font | Characters | Description |
|---|---:|---|
| **M+ OUTLINE** (`strokes.json`) | 5,235 | Japanese stroke font (kanji, hiragana, katakana). Cubic bezier curves. |
| **KST32B** (`kst32b_strokes.json`) | 6,719 | Japanese + Latin stroke font for CAD (Saka.N). Line segments only. |
| **ISO 3098** (`iso3098_strokes.json`) | 319 | Engineering drawing font, standard style. Lines + circular arcs. |
| **ISO 3098 Italic** (`iso3098i_strokes.json`) | 319 | Engineering drawing font, italic style. Lines + circular arcs. |
| **KanjiVG** (`kanjivg.json`) | 5,144 | Reference only — schoolbook stroke order (Ulrich Apel). Not selectable as main font. |

### Path commands used per font

| Font | Commands |
|---|---|
| M+ OUTLINE | `M` `L` `C` `c` |
| KST32B | `M` `L` |
| ISO 3098 / Italic | `M` `L` `A` |

---

## Features

| Feature | View (`/`) | Edit (`/?mode=edit`) |
|---|:---:|:---:|
| Stroke animation | ✓ | ✓ |
| KanjiVG side-by-side reference | ✓ | ✓ |
| BIZ UD Mincho background overlay | ✓ | ✓ |
| Verified (校正済み) badge | ✓ | ✓ |
| Text → PNG renderer | ✓ | ✓ |
| Reorder strokes / segments | | ✓ |
| Split / merge strokes | | ✓ |
| Promote segment to independent stroke | | ✓ |
| Reverse stroke / segment direction | | ✓ |
| Drag-and-drop segment reassignment | | ✓ |
| Mark character as verified | | ✓ |
| Export diff JSON / full JSON / SVG | | ✓ |
| Load local JSON / SVG file | | ✓ |

### UI features

- **Font selector** — switch between M+, KST32B, ISO 3098, ISO 3098 Italic from the left panel
- **Category selector** — Unicode-block-based combobox; shows all characters in the active font
- **Inline search** — filter within the selected category
- Light / Dark theme (respects `prefers-color-scheme`)
- Font size switch — Small 20 px / Medium 24 px / Large 28 px
- PWA — installable and offline-capable via Service Worker (Workbox)
- Responsive layout (mobile drawer navigation below 768 px)

### Text → PNG renderer

Click the **画像** button (left panel, below the font selector) to open the renderer.

- Enter multi-line text; each line is rendered using the active font
- Controls: character size (8–200 px), stroke width, letter spacing, line spacing, padding,
  stroke colour, background colour (with transparency option)
- Live preview updates automatically; click **PNG 保存** to download

SVG arc (`A`) commands in ISO 3098 are converted to cubic Bézier curves for Canvas rendering.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9

### Development

```bash
pnpm install
pnpm dev
# View mode → http://localhost:5173/
# Edit mode → http://localhost:5173/?mode=edit
```

### Build

```bash
pnpm build    # output → dist/
pnpm preview  # preview locally
```

### Deploy — GitHub Pages

1. Push to `main`
2. **Settings → Pages → Source → GitHub Actions**
3. `.github/workflows/deploy.yml` builds and deploys automatically

`VITE_BASE` is derived from the repository name automatically.  
For a custom domain or root deployment, set `VITE_BASE=/` in the workflow env.

### Deploy — GitLab Pages

Push to the default branch. `.gitlab-ci.yml` handles everything.

---

## Lazy-loaded chunks

Each font dataset is loaded on demand — only M+ loads at startup.

| Chunk | Size (raw) | Loaded when |
|---|---:|---|
| `strokes-*.js` | 3.7 MB | startup (M+ OUTLINE) |
| `kst32b_strokes-*.js` | 2.6 MB | KST32B selected |
| `kanjivg-*.js` | 6.2 MB | KanjiVG panel opened |
| `iso3098_strokes-*.js` | 82 KB | ISO 3098 selected |
| `iso3098i_strokes-*.js` | 83 KB | ISO 3098 Italic selected |

---

## Correction Workflow (M+ stroke order)

```
[Open /?mode=edit]
       ↓
[Select font → M+ OUTLINE]
[Select character from left panel (category combobox or search)]
       ↓
[Compare M+ canvas (left) against KanjiVG reference (right)]
       ↓
[Edit: reorder / split / merge / reverse / drag-drop segments]
       ↓
[Click 校正する to mark as verified ✓]
       ↓
[Export: 差分 JSON  |  全件 JSON  |  SVG 保存]
```

---

## Contributing Corrections

**Correction submissions are always welcome** — for any of the four fonts.

Open an **Issue** or **Pull Request** with your corrected data.

### Diff JSON (preferred)

`stroke_corrections.json` — only the characters you have corrected:

```json
{
  "日": {
    "u": "65E5",
    "s": [
      "M18.05 8.0 L18.05 90.0",
      "M82.05 90.0 L82.05 8.0 M82.05 8.0 L18.05 8.0",
      "M19.05 44.0 L81.05 44.0",
      "M19.05 82.0 L81.05 82.0"
    ],
    "n": 4,
    "verified": true
  }
}
```

Each stroke is one element of the `s` array — an SVG path string (space-separated segments).  
Set `"verified": true` to raise the verified flag.

### Full SVG (M+ stroke format)

```xml
<!-- UTF16:65E5 UTF8:e697a5 item:5 -->
<path style="fill:none;stroke:#000000;stroke-width:1;..."
      d="M18.05 8.0 L18.05 90.0 M82.05 90.0 L82.05 8.0 ..."
      transform="translate(0, 0)"/>
```

---

## Tech Stack

| | |
|---|---|
| Framework | Vue 3 + TypeScript |
| Build | Vite 8, pnpm |
| State | Pinia |
| PWA | vite-plugin-pwa (Workbox) |
| UI fonts | Noto Serif JP, Space Mono (Google Fonts) |
| Reference font | BIZ UD Mincho (Google Fonts / Morisawa) |
| CI/CD | GitHub Actions, GitLab CI |

---

## License

**MIT** — see [LICENSE](LICENSE)

### Third-party data licenses

| Data | License | Author |
|---|---|---|
| [M+ OUTLINE FONTS](https://mplusfonts.github.io/) stroke data | [M+ FONTS LICENSE](https://mplusfonts.github.io/) | M+ FONTS PROJECT |
| [KanjiVG](https://kanjivg.tagaini.net/) reference | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Ulrich Apel |
| [KST32B](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html) stroke font | GPL v2 or later | Saka.N (convert: AZO) |
| [ISO 3098](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html) stroke font | — | AZO |
| [BIZ UD Mincho](https://fonts.google.com/specimen/BIZ+UDMincho) | [SIL OFL 1.1](https://scripts.sil.org/OFL) | Morisawa |

---

## Acknowledgements

- **M+ FONTS PROJECT** — for the stroke-based font design that makes this project possible
- **Ulrich Apel** — for KanjiVG, the authoritative Japanese stroke order reference
- **Saka.N** — for the KST32B stroke font
- **Morisawa** — for releasing BIZ UD fonts under the OFL
- CAD stroke font data and conversion work:
  [domisan.sakura.ne.jp — CAD用ストロークフォント](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html)
