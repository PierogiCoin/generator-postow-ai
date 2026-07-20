import { callApi } from './apiClient';

export interface FetchedArticle {
  title: string;
  text: string;
  sourceUrl: string;
  kind: 'html' | 'rss' | 'text';
}

/** Pobiera treść z URL (HTML lub RSS) przez backend. */
export async function fetchArticleOrRss(
  url: string,
  userId: string
): Promise<FetchedArticle> {
  const result = await callApi(
    'content/fetch-url',
    { url },
    userId
  );

  if (!result?.text && !result?.title) {
    throw new Error(result?.message || 'Nie udało się pobrać treści z URL');
  }

  return {
    title: String(result.title || ''),
    text: String(result.text || ''),
    sourceUrl: url,
    kind: (result.kind as FetchedArticle['kind']) || 'html',
  };
}
