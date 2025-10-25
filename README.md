# パッケージインストール
npm i
# 開発サーバ起動
npm run dev
# ビルド
npm run build
# ビルドサーバ起動
npm start
```

```
├ src
│ ├ app // Next.jsのルーティング
│ ├ components // コンポーネント
│ │ ├ features // 特定の機能を実現するコンポーネント
│ │ ├ functions // UIとして表示されないコンポーネント
│ │ ├ ui // UIコンポーネント, shadcn/uiは全てここに入る
│ ├ constants // 全体に共通の定数ファイルを配置する
│ ├ libs // ライブラリのラッパーを使いまわしやすいようにする
│ ├ types // 全体に共通の型定義ファイルを配置する
│ ├ usecases // 共通で使い回すhooks
│ ├ utils // 使い回すロジックなど
```