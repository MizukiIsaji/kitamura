export type AuthFailure={code?:string;status?:number};
export type AuthOperation='signup'|'signin'|'recovery';

/** Keep credentials, email addresses and provider response text out of logs/UI. */
export function authErrorDetails(error:AuthFailure){
 return {
  code:typeof error.code==='string'&&/^[a-z0-9_]{1,80}$/.test(error.code)?error.code:'unknown',
  status:Number.isInteger(error.status)?error.status:undefined,
 };
}

export function authErrorMessage(error:AuthFailure,operation:AuthOperation){
 if(operation==='signup'&&['user_already_exists','email_exists'].includes(error.code||''))return 'このメールアドレスは登録済みです。ログイン画面からログインしてください。パスワードが不明な場合は再設定してください。';
 if(operation==='signin'&&error.code==='invalid_credentials')return 'メールアドレスまたはパスワードが一致しません。パスワードが不明な場合は再設定してください。';
 if(error.code==='over_email_send_rate_limit')return 'メール送信の回数制限に達しました。時間をおいてから再度お試しください。';
 if(error.code==='over_request_rate_limit')return '操作が集中しています。少し待ってから再度お試しください。';
 if(error.code==='email_address_not_authorized')return '現在、このメールアドレスには確認メールを送信できません。運営にお問い合わせください。';
 if(error.code==='email_not_confirmed')return 'メールアドレスの確認が完了していません。登録時の確認メールをご確認ください。';
 if(error.code==='signup_disabled'||error.code==='email_provider_disabled')return '現在、新規会員登録を受け付けていません。';
 if(error.code==='weak_password')return '別のパスワードをお試しください。英字・数字・記号を組み合わせて設定してください。';
 if(error.code==='email_address_invalid')return 'メールアドレスの形式を確認してください。';
 if(error.status===429)return '短時間に操作が集中しています。時間をおいてから再度お試しください。';
 if(operation==='recovery')return '再設定メールを送信できませんでした。時間をおいて再度お試しください。';
 if(operation==='signin')return 'ログインできませんでした。メールアドレス・パスワードを確認してください。';
 return '登録できませんでした。時間をおいて再度お試しください。';
}
