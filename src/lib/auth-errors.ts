export function getAuthErrorMessage(error: any, type: 'signin' | 'signup' | 'reset' = 'signin'): string {
  
  if (!error) {
    return type === 'signin' ? 'ログインに失敗しました。' : 
           type === 'signup' ? 'アカウント作成に失敗しました。' : 
           '処理に失敗しました。'
  }

  const message = (error.message || '').toLowerCase()

  // 共通エラー
  if (message.includes('invalid email')) {
    return 'メールアドレスの形式が正しくありません。'
  }
  if (message.includes('password should be at least')) {
    return 'パスワードは6文字以上で入力してください。'
  }
  if (message.includes('too many requests')) {
    return '試行回数が多すぎます。しばらく時間をおいてから再度お試しください。'
  }

  // ログイン固有のエラー
  if (type === 'signin') {
    if (message.includes('invalid login credentials')) {
      return 'メールアドレスまたはパスワードが正しくありません。'
    }
    if (message.includes('email not confirmed')) {
      return 'メールアドレスが確認されていません。確認メールをご確認ください。'
    }
    if (message.includes('user not found')) {
      return 'このメールアドレスは登録されていません。'
    }
  }

  // サインアップ固有のエラー
  if (type === 'signup') {
    if (message.includes('user already registered')) {
      return 'このメールアドレスは既に登録されています。'
    }
    if (message.includes('password is too weak')) {
      return 'パスワードが弱すぎます。より強力なパスワードを設定してください。'
    }
    if (message.includes('signup is disabled')) {
      return '現在新規登録は停止されています。'
    }
  }

  // パスワードリセット固有のエラー
  if (type === 'reset') {
    if (message.includes('user not found')) {
      return 'このメールアドレスは登録されていません。'
    }
    if (message.includes('rate limit')) {
      return 'リセットメールの送信回数が上限に達しました。しばらく時間をおいてから再度お試しください。'
    }
  }

  // デフォルトエラーメッセージ
  return error.message || (type === 'signin' ? 'ログインに失敗しました。' : 
                          type === 'signup' ? 'アカウント作成に失敗しました。' : 
                          '処理に失敗しました。')
}

// エラータイプの判定
export function getAuthErrorType(error: any): 'credentials' | 'email' | 'password' | 'rate_limit' | 'other' {
  if (!error?.message) return 'other'

  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials') || message.includes('user not found')) {
    return 'credentials'
  }
  if (message.includes('invalid email') || message.includes('email not confirmed')) {
    return 'email'
  }
  if (message.includes('password')) {
    return 'password'
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'rate_limit'
  }

  return 'other'
}
