# Notion to Astro Markdown コンバーター

NotionのページをAstro対応のmarkdownファイルに変換するツールです。Notionデータベースからコンテンツを取得し、Astroのコンテンツコレクションで使用できるmarkdownファイルに変換します。

## 機能

- NotionページをAstro対応のmarkdownに変換
- フォーマットを保持（太字、斜体、コードなど）
- 適切なfrontmatterを生成
- 以下のブロックタイプをサポート：
  - 段落
  - 見出し（H1、H2、H3）
  - 箇条書きリスト
  - 番号付きリスト
  - コードブロック
  - 引用
  - リンク

## インストール

1. リポジトリをクローン：
```bash
git clone https://github.com/yourusername/notion-to-astro.git
cd notion-to-astro
```

2. 依存関係をインストール：
```bash
npm install
```

3. 環境設定ファイルをコピーして設定：
```bash
cp .env.example .env
```

## 設定

`.env`ファイルを編集して、以下の変数を設定してください：

- `NOTION_TOKEN`: NotionインテグレーションのAPIトークン
- `NOTION_DATABASE_ID`: NotionデータベースのID
- `OUTPUT_DIR`: markdownファイルの保存先ディレクトリ（デフォルト: src/content/blog）

### Notionの認証情報の取得方法

1. Notionインテグレーションの作成：
   - https://www.notion.so/my-integrations にアクセス
   - 「新しいインテグレーション」をクリック
   - 名前を付けて作成
   - 「Internal Integration Token」をコピー

2. データベースとインテグレーションの共有：
   - Notionデータベースを開く
   - 「共有」をクリックしてインテグレーションを招待
   - URLからデータベースIDをコピー（ワークスペース名の後、「?」の前の部分）

## 使用方法

1. プロジェクトのビルド：
```bash
npm run build
```

2. コンバーターの実行：
```bash
npm start
```

ツールは以下の処理を行います：
1. Notionデータベースから全てのページを取得
2. markdownフォーマットに変換
3. 指定されたディレクトリに保存
4. ページタイトルに基づいてファイル名を生成

## 出力フォーマット

各markdownファイルは以下の形式で出力されます：

descriptionは、Notionページのプロパティに設定されていない場合、本文の最初の70文字が自動的に使用されます。改行は半角スペースに変換されます。

```markdown
---
title: "ページタイトル"
description: "ページの説明"
date: "2024-03-08"
tags: ["タグ1", "タグ2"]
draft: false
---

コンテンツ...
```

## エラー処理

- 1つのページで失敗しても、他のページの処理は継続
- エラーはコンソールに出力
- 各ページの変換は独立して処理

## コントリビューション

コントリビューションを歓迎します！Pull Requestをお気軽に提出してください。

## ライセンス

MIT License
