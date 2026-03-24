[<img src="images/typescript.svg" width="64" alt="TypeScript icon">](https://www.typescriptlang.org/ja/) [<img src="images/vite.svg" width="64" alt="Vite.js icon">](https://ja.vite.dev/) [<img src="images/vue.svg" width="64" alt="Vue.js icon">](https://ja.vuejs.org/)

[![BuyMeACoffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://coff.ee/azo234)

# ストロークフォントビューア

**M+ OUTLINE FONTS** のストロークデータの書き順を、**KanjiVG** を正解として照合・修正するための Web アプリです。

[![デプロイ](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml/badge.svg)](https://github.com/azo234/stroke-font-viewer/actions/workflows/deploy.yml)

---

## 背景

[M+ OUTLINE FONTS](https://mplusfonts.github.io/) は、5,233 文字（漢字・ひらがな・カタカナ）のストロークベースのフォントデータを提供しています。  
[KanjiVG](https://kanjivg.tagaini.net/) は、日本の学校教科書体（主に DynaLab 社の *DFPKyoKaSho-W3*、1997年）をモデルに描かれた、独立した書き順 SVG データベースです。

M+ と KanjiVG は独立して開発されたため、書き順が一致しない文字が存在します。  
**このツールは、その不一致を発見・修正することを目的としています。** KanjiVG の書き順を正解とします。

---

## 機能一覧

| 機能 | 閲覧（`/`） | 編集（`/?mode=edit`） |
|---|:---:|:---:|
| 書き順アニメーション | ✓ | ✓ |
| KanjiVG 並列参照 | ✓ | ✓ |
| BIZ UD 明朝 背景重ね表示 | ✓ | ✓ |
| 校正済みバッジ表示 | ✓ | ✓ |
| 画・セグメントの順序変更 | | ✓ |
| 画の分割・結合 | | ✓ |
| セグメントを画に昇格 | | ✓ |
| 画・セグメントの向き反転 | | ✓ |
| セグメントのドラッグ移動 | | ✓ |
| 校正済みマーク | | ✓ |
| 差分 JSON / 全件 JSON / SVG エクスポート | | ✓ |
| ローカル JSON / SVG ファイルの読み込み | | ✓ |

**その他の UI 機能**

- ライト / ダークテーマ切り替え（`prefers-color-scheme` 自動検出）
- 文字サイズ切り替え — 小 20px / 中 24px / 大 28px（`html { font-size }` で UI 全体に連動）
- 5,233 文字全件を対象にしたインクリメンタル検索
- PWA 対応 — インストール可能、Service Worker (Workbox) によるオフライン動作
- 768px 以下のレスポンシブレイアウト（モバイルドロワーナビ）

---

## データ

| データセット | 文字数 | カバレッジ |
|---|---:|---|
| M+ ストロークデータ（`strokes.json`） | 5,233 | 元データ |
| KanjiVG 参照データ（`kanjivg.json`） | 5,142 | M+ の 98.3 % |

未収録の 1.7 %（半角カタカナ・稀少 CJK・記号）は KanjiVG 自体が対象外としている文字です。

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

## 校正ワークフロー

```
[/?mode=edit を開く]
       ↓
[サイドバーまたは検索で文字を選択]
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

**校正データの提供を常時受け付けています。**

修正した書き順データを JSON または SVG の形式で、**Issue** や **Pull Request** でご提出ください。

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

各ストロークは `s` 配列の 1 要素で、複数の M コマンド（セグメント）をスペース区切りで結合した SVG パス文字列です。  
`verified: true` を付けると校正済みフラグが立ちます。

### 全件 SVG（M+ ストローク互換形式）

`mplus_stroke_corrected.svg`:

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
| [BIZ UD 明朝](https://fonts.google.com/specimen/BIZ+UDMincho) | [SIL OFL 1.1](https://scripts.sil.org/OFL) | モリサワ |

---

## 謝辞

- **M+ FONTS PROJECT** — ストロークベースのフォント設計でこのプロジェクトを可能にしてくださったことに感謝します
- **Ulrich Apel** — KanjiVG という信頼できる書き順データベースを公開・維持してくださっていることに感謝します
- **モリサワ** — BIZ UD フォントを OFL ライセンスで公開してくださっていることに感謝します
- M+ ストロークデータの SVG 抽出作業について:
  [domisan.sakura.ne.jp — CAD用ストロークフォント](https://domisan.sakura.ne.jp/article/cadfont/cadfont.html#MPLUSStroke)
