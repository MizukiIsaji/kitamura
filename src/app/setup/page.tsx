import {PageTitle} from '@/components/ui';
import {isConfigured} from '@/lib/env';
import {getEmailConfirmationMode} from '@/lib/auth-settings';
export const metadata={title:'開発環境の初期設定'};
export default async function Setup(){
 const mode=isConfigured()?await getEmailConfirmationMode():'unknown';
 return <div className="narrow">
  <PageTitle kicker="DEVELOPMENT SETUP" title="開発環境の初期設定" description="運営者向けの接続手順です。"/>
  <section className="panel prose">
   <p className="notice">{isConfigured()?'接続情報は設定されています。DBへのSQL適用と動作確認も実施してください。':'Supabaseへの接続情報が未設定です。実データの保存はまだ利用できません。'}</p>
   <ol><li>専用のSupabaseプロジェクトを作成します。</li><li>SQL Editorで <code>supabase/migrations/202610170001_initial.sql</code> を適用します。</li><li><code>.env.local</code> がなければ <code>.env.example</code> から作成します。</li><li>Project URLとPublishable keyを、それぞれ環境変数に設定します。</li><li>AuthのSite URLと許可するRedirect URLを設定し、開発サーバーを再起動します。</li></ol>
   <pre>NEXT_PUBLIC_SUPABASE_URL=…{'\n'}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…{'\n'}NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000</pre>
   <p>DBパスワードやservice_roleキーは、このアプリの初期接続には必要ありません。</p>
  </section>
  {process.env.NODE_ENV!=='production'&&<section className="panel prose" id="email-registration">
   <h2>確認メールなしで開発用の会員登録を行う</h2>
   <p role="status" className={'notice '+(mode==='disabled'?'positive':'')}>{mode==='disabled'?'設定済み：確認メールは不要です。会員登録後、そのままプロフィール設定へ進めます。':mode==='required'?'現在は確認メールが必要な設定です。下記の変更がまだ必要です。':'メール確認の設定を取得できませんでした。接続設定を確認してください。'}</p>
   <ol><li>開発用Supabaseの <strong>Authentication → Sign In / Providers → Email</strong> を開きます。</li><li><strong>Confirm email（メール確認）</strong> をOFFにし、保存します。メールの所有確認を省略する、開発用プロジェクト向けの設定です。</li><li>会員登録画面を再読み込みして、メールアドレスとパスワードで登録します。</li></ol>
   <p><a href="/signup">会員登録画面を開く →</a></p>
   <p>メールを使う運用に戻すときは、独自のメール送信設定を行ってから確認メールを有効にします。パスワード再設定メールの送信には、引き続きメール送信設定が必要です。</p>
  </section>}
 </div>;
}
