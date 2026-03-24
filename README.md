[<img src="images/typescript.svg" width="64" alt="TypeScript icon">](https://www.typescriptlang.org/ja/) [<img src="images/vite.svg" width="64" alt="Vite.js icon">](https://ja.vite.dev/) [<img src="images/vue.svg" width="64" alt="Vue.js icon">](https://ja.vuejs.org/)

[![BuyMeACoffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://coff.ee/azo234)

# Stroke Font Viewer

A web-based viewer and editor for correcting the stroke order of **M+ OUTLINE FONTS** data,
cross-referenced against **KanjiVG** as the authoritative source.

[![Deploy](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml/badge.svg)](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml)

---

## Background

The [M+ OUTLINE FONTS](https://mplusfonts.github.io/) project provides stroke-based font data
for 5,233 Japanese characters (kanji, hiragana, katakana).  
[KanjiVG](https://kanjivg.tagaini.net/) independently provides stroke order diagrams derived from
Japanese schoolbook fonts (specifically *DFPKyoKaSho-W3* by DynaLab, 1997).

Because M+ and KanjiVG were developed independently, their stroke orders do not always agree.  
**This tool exists to identify and correct those discrepancies**, with KanjiVG treated as the
authoritative reference.

---

## Features

| Feature | View (`/`) | Edit (`/?mode=edit`) |
|---|:---:|:---:|
| Stroke order animation | ✓ | ✓ |
| KanjiVG side-by-side reference | ✓ | ✓ |
| BIZ UD Mincho background overlay | ✓ | ✓ |
| Verified (校正済み) badge | ✓ | ✓ |
| Reorder strokes / segments | | ✓ |
| Split / merge strokes | | ✓ |
| Promote segment to independent stroke | | ✓ |
| Reverse stroke / segment direction | | ✓ |
| Drag-and-drop segment reassignment | | ✓ |
| Mark character as verified | | ✓ |
| Export diff JSON / full JSON / SVG | | ✓ |
| Load local JSON / SVG correction file | | ✓ |

**Additional UI features**

- Light / Dark theme toggle (respects `prefers-color-scheme`)
- Font size switch — Small 20 px / Medium 24 px / Large 28 px (scales the entire UI via `html { font-size }`)
- Full-text search across all 5,233 characters in the database
- PWA — installable and offline-capable via Service Worker (Workbox)
- Responsive layout down to 768 px with mobile drawer navigation

---

## Data

| Dataset | Characters | Coverage |
|---|---:|---|
| M+ stroke data (`strokes.json`) | 5,233 | source |
| KanjiVG reference (`kanjivg.json`) | 5,142 | 98.3 % of M+ |

The uncovered 1.7 % consists of half-width katakana, rare CJK characters, and symbols —
outside KanjiVG's scope by design.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9

### Development

```bash
pnpm install
pnpm dev
# View mode  → http://localhost:5173/
# Edit mode  → http://localhost:5173/?mode=edit
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

`VITE_BASE` is set from the repository name.  
For a custom domain or root deployment set `VITE_BASE=/` in the workflow env.

### Deploy — GitLab Pages

Push to the default branch. `.gitlab-ci.yml` handles everything.

---

## Correction Workflow

```
[Open /?mode=edit]
       ↓
[Select character from sidebar or search]
       ↓
[Compare M+ canvas (left) with KanjiVG reference (right)]
       ↓
[Edit: reorder / split / merge / reverse / drag-drop segments]
       ↓
[Click 校正する to mark as verified ✓]
       ↓
[Export: 差分 JSON  |  全件 JSON  |  SVG 保存]
```

---

## Contributing Corrections

**Correction submissions are always welcome.**

If you have corrected stroke order data — as a JSON diff or the full SVG — please open an
**Issue** or **Pull Request**.

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

### Full SVG (M+ stroke format)

`mplus_stroke_corrected.svg` — same format as the original `mplus_stroke.svg`:

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

### Third-party data

| Data | License | Author |
|---|---|---|
| [M+ OUTLINE FONTS](https://mplusfonts.github.io/) stroke data | [M+ FONTS LICENSE](https://mplusfonts.github.io/) | M+ FONTS PROJECT |
| [KanjiVG](https://kanjivg.tagaini.net/) reference | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Ulrich Apel |
| [BIZ UD Mincho](https://fonts.google.com/specimen/BIZ+UDMincho) | [SIL OFL 1.1](https://scripts.sil.org/OFL) | Morisawa |

---

## Acknowledgements

- **M+ FONTS PROJECT** — for the stroke-based font design that makes this possible
- **Ulrich Apel** — for KanjiVG, the authoritative Japanese stroke order reference
- **Morisawa** — for releasing BIZ UD fonts under the OFL
- Original stroke SVG extraction work:
  [domisan.sakura.ne.jp — CAD用ストロークフォント](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html#MPLUSStroke)
