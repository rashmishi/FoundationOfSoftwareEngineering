import { Fragment } from 'react';
import { queryWords } from '../model/filter';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps the parts of `text` that match the search words in <mark>. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const words = queryWords(query);
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
