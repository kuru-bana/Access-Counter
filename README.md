# Access Counter

サイバーパンク風デザインのアクセスカウンター。桁が増えるたびに自動でボックスが追加され、毎日 0:00（JST）に GitHub へバックアップを送信します。

---

## 機能

- ページを開くたびにカウントが +1
- 桁数に応じて自動でボックスが増える（スライドインアニメーション）
- 数字が変わるたびにフリップアニメーション＋グロウエフェクト
- 日付ごとのアクセス数を記録
- 毎日 0:00（JST）に GitHub の JSON ファイルへ自動バックアップ
- 5 分おきに自己 ping（Render フリープランのスリープ防止）

---

## ファイル構成

```
.
├── server.js          # Express サーバー本体
├── counter.json       # カウントデータ（自動生成）
├── package.json
└── public/
    └── index.html     # フロントエンド
```

---

## API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/` | カウンター画面 |
| GET | `/api/count` | **+1 して**カウントを返す |
| GET | `/api/count/current` | カウントを変えずに現在値を返す（`total` + `today` を返す） |
| GET | `/ping` | ヘルスチェック用 |

---

## セットアップ

### ローカルで動かす場合

```bash
npm install
node server.js
```

ブラウザで `http://localhost:5000` を開く。

---

## GitHub バックアップの設定

毎日 0:00（JST）に [`kuru-bana/Access-Counter`](https://github.com/kuru-bana/Access-Counter) の `Choco-tube-plus.json` へ以下の形式で自動更新されます。

```json
{
  "total": 150,
  "last_updated": "2026-06-06",
  "today": 12,
  "history": {
    "2026-06-05": 20,
    "2026-06-06": 12
  }
}
```

### PAT（Personal Access Token）の設定方法

#### Render の場合

1. Render ダッシュボード → サービス → **Environment**
2. `GITHUB_PAT` を追加して **Save Changes**

### PAT の取得方法

**Fine-grained token（推奨）**
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. 「Generate new token」
3. Repository access: `kuru-bana/Access-Counter` のみ選択
4. Permissions → **Contents: Read and write**
5. トークンをコピーして Secrets に登録

**Classic token**
1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. 「Generate new token」
3. スコープで `repo` にチェック
4. トークンをコピーして Secrets に登録

---

## Render へのデプロイ

> **注意：** Render のフリープランはファイルシステムが永続しないため、再デプロイのたびに `counter.json` がリセットされます。本番運用では PostgreSQL 等の外部 DB の利用を推奨します。

1. GitHub にこのリポジトリを push する
2. [Render](https://render.com) で「New Web Service」を作成
3. リポジトリを連携
4. 以下を設定

   | 項目 | 値 |
   |---|---|
   | Build Command | `npm install` |
   | Start Command | `node server.js` |

5. Environment に `GITHUB_PAT` を追加
6. Deploy

---

## counter.json について

サーバーが自動で生成・更新します。手動でリセットしたい場合：

```json
{
  "count": 0,
  "daily": {}
}
```

上記の内容で `counter.json` を上書きしてサーバーを再起動してください。
- アクセスした人のipを自動的に集め情報を収集できる機能を付けたい,,,
