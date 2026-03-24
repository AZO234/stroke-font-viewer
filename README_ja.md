[<img src="images/typescript.svg" width="64" alt="TypeScript icon">](https://www.typescriptlang.org/ja/) [<img src="images/vite.svg" width="64" alt="Vite.js icon">](https://ja.vite.dev/) [<img src="images/vue.svg" width="64" alt="Vue.js icon">](https://ja.vuejs.org/)

[![BuyMeACoffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://coff.ee/azo234)

# ストロークフォントビューア

**M+ OUTLINE FONTS**・**KST32B**・**ISO 3098**（標準体・イタリック体）を閲覧・書き順編集できる
Web ベースのストロークフォントビューアです。

[![デプロイ](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml/badge.svg)](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml)

**[→ Stroke Font Viewer を開く](https://azo234.github.io/stroke-font-viewer/)**

---

## 背景

ストロークフォント（ベクターフォント・シングルストロークフォント）は、文字の輪郭ではなく
中心線のパスで文字を表現します。CAD・ペンプロッター・レーザー加工・LED/EL サイネージ・
アニメーション表示アートなどで使われています。

このビューアは複数のストロークフォントデータセットを一か所にまとめ、以下の機能を提供します。

- **閲覧** — 任意の文字のストロークアニメーションを確認
- **比較** — [KanjiVG](https://kanjivg.tagaini.net/)（日本の教科書体を基準とした書き順の正解データ）との書き順照合
- **編集** — 書き順・セグメント構造の修正（`/?mode=edit`）
- **レンダリング** — 任意のテキストを指定フォントで PNG 画像として出力

M+ データセットに対しては KanjiVG との書き順不一致の修正が主目的です。
KST32B・ISO 3098 は書き順の定義がないため、ストロークの並び順の整備が目標です。

---

## フォント

| フォント | 文字数 | 説明 |
|---|---:|---|
| **M+ OUTLINE** (`strokes.json`) | 5,235 | 日本語ストロークフォント（漢字・ひらがな・カタカナ）。三次ベジェ曲線。 |
| **KST32B** (`kst32b_strokes.json`) | 6,719 | CAD 向け日本語＋ラテン文字ストロークフォント（坂 直純 氏作）。直線のみ。 |
| **ISO 3098** (`iso3098_strokes.json`) | 319 | 工業製図用フォント・標準体。直線＋円弧。 |
| **ISO 3098 Italic** (`iso3098i_strokes.json`) | 319 | 工業製図用フォント・イタリック体。直線＋円弧。 |
| **KanjiVG** (`kanjivg.json`) | 5,144 | 参照専用 — 教科書体の書き順（Ulrich Apel 氏作）。メインフォントとしては選択不可。 |

### フォント別パスコマンド

| フォント | 使用コマンド |
|---|---|
| M+ OUTLINE | `M` `L` `C` `c` |
| KST32B | `M` `L` |
| ISO 3098 / Italic | `M` `L` `A` |

---

## 機能一覧

| 機能 | 閲覧（`/`） | 編集（`/?mode=edit`） |
|---|:---:|:---:|
| ストロークアニメーション | ✓ | ✓ |
| KanjiVG 並列参照 | ✓ | ✓ |
| BIZ UD 明朝 背景重ね表示 | ✓ | ✓ |
| 校正済みバッジ表示 | ✓ | ✓ |
| テキスト→PNG レンダリング | ✓ | ✓ |
| 画・セグメントの順序変更 | | ✓ |
| 画の分割・結合 | | ✓ |
| セグメントを画に昇格 | | ✓ |
| 画・セグメントの向き反転 | | ✓ |
| セグメントのドラッグ移動 | | ✓ |
| 校正済みマーク | | ✓ |
| 差分 JSON / 全件 JSON / SVG エクスポート | | ✓ |
| ローカル JSON / SVG ファイルの読み込み | | ✓ |

### UI 機能

- **フォント選択** — 左パネルのコンボボックスで M+ / KST32B / ISO 3098 / ISO 3098 Italic を切り替え
- **区分選択** — Unicode ブロック単位のコンボボックス。選択中フォントの全文字を網羅
- **インライン絞り込み** — 区分内をさらに絞り込み
- ライト / ダークテーマ（`prefers-color-scheme` 自動検出）
- 文字サイズ切り替え — 小 20px / 中 24px / 大 28px
- PWA 対応 — Service Worker (Workbox) によるオフライン動作・インストール
- 768px 以下のレスポンシブレイアウト（モバイルドロワーナビ）

### テキスト→PNG レンダリング

左パネルのフォント選択コンボの横にある **画像** ボタンでモーダルを開きます。

- 複数行テキストを入力し、現在のフォントでレンダリング
- 設定項目: 文字サイズ（8〜200px）・線幅・字間・行間・余白・線色・背景色（透明対応）
- パラメータ変更のたびに自動再描画。**PNG 保存** でダウンロード

ISO 3098 の楕円弧（`A` コマンド）は Canvas 描画時に三次ベジェ曲線に変換されます。

---

## 開始方法

### 必要環境

- Node.js ≥ 18
- pnpm ≥ 9

### 開発サーバー

```bash
pnpm install
pnpm dev
# 閲覧モード → http://localhost:5173/
# 編集モード → http://localhost:5173/?mode=edit
```

### ビルド

```bash
pnpm build    # 出力先: dist/
pnpm preview  # ビルド結果のローカルプレビュー
```

### GitHub Pages へのデプロイ

1. `main` ブランチにプッシュ
2. **Settings → Pages → Source → GitHub Actions** を選択
3. `.github/workflows/deploy.yml` が自動でビルド・デプロイします

`VITE_BASE` はリポジトリ名から自動設定されます。  
独自ドメインやルートデプロイの場合は `VITE_BASE=/` に変更してください。

### GitLab Pages へのデプロイ

デフォルトブランチにプッシュするだけです。`.gitlab-ci.yml` が自動処理します。

---

## 遅延ロードチャンク

起動時にロードされるのは M+ のみです。他のフォントは選択時に初めてロードされます。

| チャンク | サイズ（非圧縮） | ロードタイミング |
|---|---:|---|
| `strokes-*.js` | 3.7 MB | 起動時（M+ OUTLINE） |
| `kst32b_strokes-*.js` | 2.6 MB | KST32B 選択時 |
| `kanjivg-*.js` | 6.2 MB | KanjiVG パネルを開いた時 |
| `iso3098_strokes-*.js` | 82 KB | ISO 3098 選択時 |
| `iso3098i_strokes-*.js` | 83 KB | ISO 3098 Italic 選択時 |

---

## 校正ワークフロー（M+ 書き順）

```
[/?mode=edit を開く]
       ↓
[フォント → M+ OUTLINE を選択]
[左パネルの区分コンボまたは絞り込みで文字を選択]
       ↓
[左のキャンバス（M+）と右の KanjiVG 参照を比較]
       ↓
[ストロークパネルで並べ替え・分割・結合・向き反転・ドラッグ移動]
       ↓
[「校正する」ボタンで校正済みマーク ✓ を付ける]
       ↓
[差分 JSON ／ 全件 JSON ／ SVG 保存 でエクスポート]
```

---

## 校正データの提供

**4つのフォント全てについて、校正データの提供を常時受け付けています。**

修正したデータを **Issue** や **Pull Request** でご提出ください。

### 差分 JSON（推奨）

`stroke_corrections.json` — 修正した文字のみ:

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

各ストロークは `s` 配列の 1 要素で、SVG パス文字列（スペース区切りのセグメント）です。  
`"verified": true` を付けると校正済みフラグが立ちます。

### 全件 SVG（M+ ストローク互換形式）

```xml
<!-- UTF16:65E5 UTF8:e697a5 item:5 -->
<path style="fill:none;stroke:#000000;stroke-width:1;..."
      d="M18.05 8.0 L18.05 90.0 M82.05 90.0 L82.05 8.0 ..."
      transform="translate(0, 0)"/>
```

---

## 技術スタック

| | |
|---|---|
| フレームワーク | Vue 3 + TypeScript |
| ビルド | Vite 8、pnpm |
| 状態管理 | Pinia |
| PWA | vite-plugin-pwa（Workbox） |
| UI フォント | Noto Serif JP、Space Mono（Google Fonts） |
| 参照フォント | BIZ UD 明朝（Google Fonts / モリサワ） |
| CI/CD | GitHub Actions、GitLab CI |

---

## ライセンス

**MIT** — [LICENSE](LICENSE) を参照

### サードパーティデータのライセンス

| データ | ライセンス | 著作者 |
|---|---|---|
| [M+ OUTLINE FONTS](https://mplusfonts.github.io/) ストロークデータ | [M+ FONTS LICENSE](https://mplusfonts.github.io/) | M+ FONTS PROJECT |
| [KanjiVG](https://kanjivg.tagaini.net/) 書き順参照データ | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Ulrich Apel |
| [KST32B](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html) ストロークフォント | GPL v2 以降 | 坂 直純（変換: AZO） |
| [ISO 3098](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html) ストロークフォント | — | AZO |
| [BIZ UD 明朝](https://fonts.google.com/specimen/BIZ+UDMincho) | [SIL OFL 1.1](https://scripts.sil.org/OFL) | モリサワ |

---

## 謝辞

- **M+ FONTS PROJECT** — ストロークベースのフォント設計でこのプロジェクトを可能にしてくださったことに感謝します
- **Ulrich Apel** — KanjiVG という信頼できる書き順データベースを公開・維持してくださっていることに感謝します
- **坂 直純 氏** — KST32B ストロークフォントデータを公開してくださっていることに感謝します
- **モリサワ** — BIZ UD フォントを OFL ライセンスで公開してくださっていることに感謝します
- CAD ストロークフォントのデータと変換作業:
  [domisan.sakura.ne.jp — CAD用ストロークフォント](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html)
