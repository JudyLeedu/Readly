export interface Highlight {
  title: string;
  description: string;
  bulletPoints?: string[];
  anchorId: string;
}

export interface ArticleResponse {
  title: string;
  overview: string;
  highlights: Highlight[];
}
