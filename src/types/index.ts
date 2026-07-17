export interface Highlight {
  title: string;
  description: string;
  bulletPoints?: string[];
  anchorId: string;
}

export interface ArticleResponse {
  error?: string; // 如果大模型认为这不是文章，返回错误提示
  title?: string;
  overview?: string;
  highlights?: Highlight[];
}
