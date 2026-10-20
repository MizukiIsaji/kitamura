'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="empty-state"><h1>読み込みを完了できませんでした</h1><p>時間をおいて、もう一度お試しください。開発環境ではDB接続と初期設定も確認してください。</p><button className="button primary" onClick={reset}>再試行する</button></section>;}
