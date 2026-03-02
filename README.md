# 整理して連絡くん（seiri-renraku-next）

学校・クラス向けの**連絡事項を整理・管理するWebアプリ**です。  
貼り付けた連絡文をAI（Gemini）で解析し、日付・学年・会場・時間などを構造化して表示・保存できます。

## 主な機能

- **連絡の入力・解析**  
  テキストを貼り付けて「整理（Gemini）」で解析。日付あり／日付なしで自動分類されます。
- **日付あり連絡**  
  日付・学年（2年生／4年生／全体）ごとにグループ表示。会場・集合・解散・ユニフォーム・持ち物なども表示。
- **日付なし連絡**  
  タイトル・概要・詳細で表示。確認後は「過去の日程なし連絡倉庫」へ移動可能。
- **過去倉庫**  
  - **過去の日程あり連絡倉庫**（`/past-dated`）  
    過去日付の連絡を保管。元に戻す・削除が可能。  
  - **過去の日程なし連絡倉庫**（`/past-undated`）  
    「確認した」で移動した日付なし連絡を保管。
- **データ永続化**  
  Firebase（匿名認証 + Firestore）で保存。ブラウザを閉じてもデータは保持されます。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | [Next.js](https://nextjs.org/) 16（App Router） |
| UI | React 19, [Tailwind CSS](https://tailwindcss.com/) 4, [DaisyUI](https://daisyui.com/) |
| 言語 | TypeScript |
| BaaS | [Firebase](https://firebase.google.com/)（Authentication 匿名ログイン, Firestore） |
| 解析API | Firebase Cloud Functions（Gemini 呼び出し） |

## 必要な環境

- Node.js 18+
- npm / yarn / pnpm / bun のいずれか

## セットアップ

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone <リポジトリURL>
cd seiri-renraku-next
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` を作成し、Firebase の設定を記述してください。

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
CLOUD_FUNCTIONS_PARSE_URL=https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/parseMessage
```

- Firebase の設定値は、Firebase コンソールの「プロジェクトの設定」→「一般」→「マイアプリ」から取得できます。
- `CLOUD_FUNCTIONS_PARSE_URL` には、デプロイ済みの Cloud Functions エンドポイント URL を設定してください（`NEXT_PUBLIC_` は不要なサーバー側専用の変数です）。

**Vercel にデプロイする場合は、Vercel ダッシュボードの `Settings` → `Environment Variables` にも同じ変数を登録してください。**

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 利用可能なスクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動（ホットリロード） |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番ビルドの実行（`build` 後） |
| `npm run clean` | `.next` ディレクトリの削除（クロスプラットフォーム対応） |

## プロジェクト構成（抜粋）

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # トップページ
│   ├── layout.tsx          # 共通レイアウト（Header / Footer）
│   ├── providers.tsx       # MessageStoreProvider など
│   ├── past-dated/         # 過去の日程あり連絡倉庫
│   ├── past-undated/       # 過去の日程なし連絡倉庫
│   └── api/parseMessage/   # 解析API（Cloud Functions へ中継）
├── components/             # UI コンポーネント
│   ├── Header.tsx          # ヘッダー・ナビゲーション
│   ├── Footer.tsx
│   ├── InputForm.tsx       # 連絡入力フォーム
│   ├── CardList.tsx        # 日付あり／日付なしカード一覧
│   └── ClientAppWrapper.tsx # 認証・Firestore 読み込み
├── stores/
│   └── messageStore.tsx   # 連絡データの状態管理・Firestore 操作
├── types/
│   └── message.ts         # DatedMessage / UndatedMessage 型
├── api/
│   └── gemini.ts          # 解析API 呼び出し（/api/parseMessage）
├── firebase.ts            # Firebase 初期化・匿名認証
└── utils/                 # ユーティリティ
```

## 解析APIについて

- フロントは **Next.js の API ルート**（`/api/parseMessage`）に POST でテキストを送信します。
- この API が **Firebase Cloud Functions** の `parseMessage` を呼び出し、Gemini で連絡文を解析します。
- Cloud Functions のデプロイ・Gemini API キー設定は、別途 Firebase プロジェクト側で行ってください。

## ライセンス・著作権

All Rights Reserved 2025 © Hiroaki Ito
