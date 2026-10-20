# TSURI RECORD

釣行記録・イラスト地図・コーチへの相談を備える Next.js / Supabase アプリ。

## ローカル起動

Node.js 22 以上を使い、次を実行する。

```sh
npm ci
# .env.example を .env.local にコピーして接続情報を設定する
npm run dev
```

## 検証

```sh
npm run typecheck
npm test
npm run build
```

## Netlify への公開

1. このリポジトリの main ブランチを Netlify で選ぶ。
2. Base directory は空欄、Build command は npm run build、Publish directory は .next にする。Node.js は netlify.toml で 22 に設定している。
3. Netlify の環境変数に NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY、NEXT_PUBLIC_SITE_URL を登録する。SITE_URL は公開先の正確な HTTPS URL にする。
4. 公開先が決まったら、Supabase の Authentication > URL Configuration に Site URL と次の戻り先を登録する。
   - https://公開先/auth/callback
   - https://公開先/auth/confirm
   - https://公開先/auth/recovery
5. 環境変数を変更した場合は再ビルドし、地図・公開一覧・ログイン・写真保存を確認する。

Supabase の接続先には既存DBを利用できる。既存DBへ初期SQLを再実行しない。
新しい空の専用DBを用意する場合のみ、supabase/migrations のSQLを名前順で適用する。
通常のアプリ実行にDBパスワード・service_role・secret keyは不要である。
秘密鍵を NEXT_PUBLIC_ で始まる変数へ登録しない。

Next.js用のサーバー処理は、netlify.tomlと開発用依存関係で指定した公式Next.js Runtimeが作成する。

このリポジトリには開発時の内部作業記録・認証情報・実DBのデータを含めない。

## 地図データの出典

- 都道府県の輪郭: [Natural Earth 5.1.2](https://www.naturalearthdata.com/about/terms-of-use/)（パブリックドメイン）。日本の都道府県を抽出し、輪郭を簡略化している。
- 市区町村名・代表位置: [Geolonia Japanese Addresses v2 / Digital Agency ABR](https://japanese-addresses-v2.geoloniamaps.com/api/ja.json)、Geolonia / Digital Agency、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。市区町村名と代表位置を抽出し、政令指定都市の区を市へ集約、座標を小数点以下6桁へ丸めている。
