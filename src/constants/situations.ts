/**
 * 画像生成の目的・用途の定数
 */
export const SITUATIONS = [
  '広告バナー',
  'アイキャッチ画像',
  'プレゼン資料',
  'Webサイト',
  'SNS投稿'
] as const;

export type Situation = typeof SITUATIONS[number];
