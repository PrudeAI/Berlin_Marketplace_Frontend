import React, { useState, useCallback, useMemo } from 'react';
import { Link2, Plus, X, AlertCircle, Globe } from 'lucide-react';

interface UrlInputZoneProps {
  onUrlsSubmitted: (urls: string[]) => void;
  disabled?: boolean;
  maxUrls?: number;
}

const DEFAULT_MAX_URLS = 10;

function isValidProductUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    // Must have a real hostname with a dot — rejects "http://localhost" typos early.
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Accept a pasted block: newlines, commas or plain whitespace all separate URLs. */
function splitUrls(text: string): string[] {
  return text
    .split(/[\s,\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

const UrlInputZone: React.FC<UrlInputZoneProps> = ({
  onUrlsSubmitted,
  disabled,
  maxUrls = DEFAULT_MAX_URLS,
}) => {
  const [draft, setDraft] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [invalid, setInvalid] = useState<string[]>([]);

  const atLimit = urls.length >= maxUrls;

  const addFromText = useCallback((text: string) => {
    const candidates = splitUrls(text);
    if (candidates.length === 0) return;

    const good: string[] = [];
    const bad: string[] = [];

    for (const c of candidates) {
      // Be forgiving about a missing scheme — suppliers copy from address bars.
      const normalised = /^https?:\/\//i.test(c) ? c : `https://${c}`;
      if (isValidProductUrl(normalised)) good.push(normalised);
      else bad.push(c);
    }

    setUrls(prev => {
      const merged = [...prev];
      for (const g of good) {
        if (!merged.includes(g) && merged.length < maxUrls) merged.push(g);
      }
      return merged;
    });
    setInvalid(bad);
    setDraft('');
  }, [maxUrls]);

  const removeUrl = (url: string) => setUrls(prev => prev.filter(u => u !== url));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits a URL; Shift+Enter keeps a newline for multi-paste editing.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addFromText(draft);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (splitUrls(text).length > 1) {
      e.preventDefault();
      addFromText(text);
    }
  };

  const canSubmit = urls.length > 0 && !disabled;

  const hostSummary = useMemo(() => {
    const hosts = new Set(urls.map(u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }));
    return [...hosts];
  }, [urls]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input card */}
      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-10 transition-all hover:border-berlin-red-400 hover:bg-gray-50/50">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <Link2 className="w-8 h-8 text-gray-500" />
        </div>

        <p className="text-xl font-semibold text-gray-800 mb-2 text-center">
          Paste product page URLs
        </p>
        <p className="text-sm text-gray-500 text-center mb-6">
          One per line. We&apos;ll read each page and extract the product automatically.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled || atLimit}
            rows={2}
            placeholder={atLimit ? `Limit of ${maxUrls} URLs reached` : 'https://supplier.com/product/500ml-amber-bottle'}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => addFromText(draft)}
            disabled={disabled || atLimit || !draft.trim()}
            className="px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed self-start"
            title="Add URL"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          Press Enter to add · paste a whole list at once · up to {maxUrls} URLs
        </p>
      </div>

      {/* Invalid warning */}
      {invalid.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Not valid URLs:</strong> {invalid.join(', ')}
          </div>
        </div>
      )}

      {/* Queued URLs */}
      {urls.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">
              {urls.length} URL{urls.length !== 1 ? 's' : ''} ready
              {hostSummary.length > 0 && (
                <span className="ml-2 font-normal text-gray-400">
                  {hostSummary.slice(0, 3).join(', ')}{hostSummary.length > 3 ? '…' : ''}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => { setUrls([]); setInvalid([]); }}
              disabled={disabled}
              className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {urls.map(url => (
              <li key={url} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700" title={url}>{url}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(url)}
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onUrlsSubmitted(urls)}
            disabled={!canSubmit}
            className="mt-4 w-full px-6 py-3 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Extract {urls.length} product{urls.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '🔗', title: 'Any public product page', desc: 'Paste the link to a single product. Category and listing pages will be rejected.' },
          { icon: '🖼️', title: 'Images come too', desc: 'Product photos are pulled from the page and saved to your own library, not hot-linked.' },
          { icon: '⏱️', title: '10–30s per page', desc: 'Each page is fetched, read by Gemini, then lands on a review card you can edit.' },
        ].map(item => (
          <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UrlInputZone;
