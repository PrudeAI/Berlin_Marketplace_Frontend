import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  ChevronRight,
  Leaf,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RotateCcw,
  Package,
  Loader2,
  SlidersHorizontal,
  BarChart3,
} from 'lucide-react';

// All requests go through Vite's proxy (/rec-api → http://localhost:6000/api)
// so there are no CORS issues regardless of browser or dev port.
const REC_ENGINE_URL = '/rec-api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DimensionScore {
  score: number;
  weight: number;
  met?: string[];
  missing?: string[];
  matchedRule?: string;
  details?: Record<string, number>;
}

interface ScoreBreakdown {
  material: DimensionScore;
  compliance: DimensionScore;
  sustainability: DimensionScore;
  endUse: DimensionScore;
  semantic: DimensionScore;
  price: DimensionScore;
}

interface Recommendation {
  productId: string;
  name: string;
  category: string;
  broaderCategory?: string;
  packagingType?: string;
  targetIndustries?: string[];
  ecoScore?: number;
  fdaApproved?: boolean;
  euCompliant?: boolean;
  productHighlights?: string;
  keyAdvantages?: string[];
  similarityScore?: number;
  betterScore?: number;
  breakdown?: ScoreBreakdown;
}

interface AdvancedFilters {
  broaderCategory: string;
  packagingType: string;
  targetIndustry: string;
  requireFda: boolean;
  requireEu: boolean;
  minEcoScore: string;
  capacityMin: string;
  capacityMax: string;
}

interface QueryParsed {
  material?: string;
  betterThanMaterial?: string;
  packagingType?: string;
  endUse?: string[];
  industries?: string[];
  complianceNeeds?: string[];
  betterMeans?: string[];
  mode?: string;
  confidence?: number;
  parsedBy?: string;
}

type ChatMessage =
  | { type: 'user'; text: string }
  | { type: 'thinking' }
  | { type: 'results'; text: string; recommendations: Recommendation[]; totalScanned: number; queryParsed?: QueryParsed }
  | { type: 'error'; text: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  'Better than PET bottle for juice, eco-friendly',
  'Best glass bottle for hot sauces, FDA approved, ~300ml',
  'Sustainable alternative to plastic for cosmetics',
  'HDPE container for pharmaceutical use, compliant',
  'Affordable packaging for dairy products',
  'Eco-friendly pouch for protein powder',
];

const BROADER_CATEGORIES = [
  '', 'Bottles & Jars', 'Pouches & Bags', 'Boxes & Cartons',
  'Tubes', 'Caps & Closures', 'Accessories',
];

const PACKAGING_TYPES = [
  '', 'Glass Bottle', 'Plastic Bottle', 'Aluminum Can', 'Cardboard Box',
  'Plastic Pouch', 'Paper Bag', 'Metal Tin', 'Tube', 'Jar', 'Cap',
];

const INDUSTRIES = [
  '', 'Food & Beverage', 'Cosmetics & Beauty', 'Pharmaceutical',
  'E-commerce', 'Retail', 'Industrial', 'Agriculture',
  'Healthcare', 'Automotive', 'Electronics',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductFinderPage() {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    broaderCategory: '',
    packagingType: '',
    targetIndustry: '',
    requireFda: false,
    requireEu: false,
    minEcoScore: '',
    capacityMin: '',
    capacityMax: '',
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setFilters({
      broaderCategory: '', packagingType: '', targetIndustry: '',
      requireFda: false, requireEu: false, minEcoScore: '', capacityMin: '', capacityMax: '',
    });
    setShowFilters(false);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Append user message + thinking bubble
    setMessages(prev => [...prev, { type: 'user', text }, { type: 'thinking' }]);
    setLoading(true);

    try {
      // Build a natural-language query string enriched with filter hints
      let enrichedQuery = text;
      if (filters.broaderCategory) enrichedQuery += `, category: ${filters.broaderCategory}`;
      if (filters.packagingType)   enrichedQuery += `, type: ${filters.packagingType}`;
      if (filters.targetIndustry)  enrichedQuery += `, for ${filters.targetIndustry}`;
      if (filters.requireFda)      enrichedQuery += ', FDA approved';
      if (filters.requireEu)       enrichedQuery += ', EU compliant';
      if (filters.minEcoScore)     enrichedQuery += `, eco score above ${filters.minEcoScore}`;
      if (filters.capacityMin || filters.capacityMax) {
        const min = filters.capacityMin || '0';
        const max = filters.capacityMax || '';
        enrichedQuery += max ? `, ${min}-${max}ml` : `, at least ${min}ml`;
      }

      const res = await fetch(`${REC_ENGINE_URL}/recommendations/better`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: enrichedQuery, topN: 6 }),
      });

      if (!res.ok) throw new Error(`Engine returned ${res.status}`);
      const data = await res.json();

      const recs: Recommendation[] = data.recommendations ?? [];
      const totalScanned: number = data.totalScanned ?? 0;
      const queryParsed: QueryParsed | undefined = data.queryParsed;

      // Replace thinking bubble with results
      setMessages(prev => {
        const withoutThinking = prev.filter(m => m.type !== 'thinking');
        const parsedHints: string[] = [];
        if (queryParsed?.material) parsedHints.push(`Material: ${queryParsed.material}`);
        if (queryParsed?.endUse?.length) parsedHints.push(`End use: ${queryParsed.endUse.join(', ')}`);
        if (queryParsed?.industries?.length) parsedHints.push(`Industry: ${queryParsed.industries.join(', ')}`);
        if (queryParsed?.mode === 'upgrade' && queryParsed.betterThanMaterial) parsedHints.push(`Upgrade from: ${queryParsed.betterThanMaterial}`);
        const hintsStr = parsedHints.length ? ` Understood: ${parsedHints.join(' · ')}.` : '';
        const replyText = recs.length > 0
          ? `Found ${recs.length} best-fit product${recs.length > 1 ? 's' : ''} from ${totalScanned} evaluated — scored across material, compliance, sustainability, end-use, semantic, and price dimensions.${hintsStr}`
          : `No products matched your query. Try broadening your description or removing filters.`;
        return [...withoutThinking, { type: 'results', text: replyText, recommendations: recs, totalScanned, queryParsed }];
      });
    } catch (err) {
      console.error('[ProductFinder] Error:', err);
      setMessages(prev => {
        const withoutThinking = prev.filter(m => m.type !== 'thinking');
        return [...withoutThinking, {
          type: 'error',
          text: 'The recommendation engine is currently unavailable. Make sure it is running on port 6000.',
        }];
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pt-16 min-h-screen bg-berlin-gray-50 flex flex-col">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-berlin-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-berlin-red-100 p-2 rounded-xl">
              <Sparkles className="h-6 w-6 text-berlin-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI Product Finder</h1>
              <p className="text-xs text-gray-500">Describe what you need — scored across 6 expert dimensions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={resetChat}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-berlin-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-berlin-red-50"
              >
                <RotateCcw className="h-4 w-4" />
                New search
              </button>
            )}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
                showFilters
                  ? 'bg-berlin-red-600 text-white border-berlin-red-600'
                  : 'text-gray-600 border-gray-200 hover:border-berlin-red-300 hover:text-berlin-red-600'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Advanced Filters Panel ─────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white border-b border-berlin-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Narrow results with optional filters
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Category */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select
                  value={filters.broaderCategory}
                  onChange={e => setFilters(f => ({ ...f, broaderCategory: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-berlin-red-400"
                >
                  {BROADER_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c || 'Any category'}</option>
                  ))}
                </select>
              </div>

              {/* Packaging type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Packaging Type</label>
                <select
                  value={filters.packagingType}
                  onChange={e => setFilters(f => ({ ...f, packagingType: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-berlin-red-400"
                >
                  {PACKAGING_TYPES.map(t => (
                    <option key={t} value={t}>{t || 'Any type'}</option>
                  ))}
                </select>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Target Industry</label>
                <select
                  value={filters.targetIndustry}
                  onChange={e => setFilters(f => ({ ...f, targetIndustry: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-berlin-red-400"
                >
                  {INDUSTRIES.map(i => (
                    <option key={i} value={i}>{i || 'Any industry'}</option>
                  ))}
                </select>
              </div>

              {/* Eco score */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min. Eco Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 70"
                  value={filters.minEcoScore}
                  onChange={e => setFilters(f => ({ ...f, minEcoScore: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-berlin-red-400"
                />
              </div>

              {/* Capacity range */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Capacity Min (ml)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 200"
                  value={filters.capacityMin}
                  onChange={e => setFilters(f => ({ ...f, capacityMin: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-berlin-red-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Capacity Max (ml)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1000"
                  value={filters.capacityMax}
                  onChange={e => setFilters(f => ({ ...f, capacityMax: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-berlin-red-400"
                />
              </div>

              {/* Compliance toggles */}
              <div className="flex items-end gap-3 pb-1">
                <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.requireFda}
                    onChange={e => setFilters(f => ({ ...f, requireFda: e.target.checked }))}
                    className="w-4 h-4 accent-berlin-red-600"
                  />
                  FDA
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.requireEu}
                    onChange={e => setFilters(f => ({ ...f, requireEu: e.target.checked }))}
                    className="w-4 h-4 accent-berlin-red-600"
                  />
                  EU
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Area ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Empty state — welcome */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-berlin-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-berlin-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Find the Best Packaging Products</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed mb-8">
                Describe your requirements in plain English — material, size, industry, compliance needs — 
                or pick one of the quick prompts below. Products are scored across 6 expert dimensions:
                material fit, compliance, sustainability, end-use compatibility, semantic relevance, and pricing.
              </p>

              {/* Quick prompt chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleQuickPrompt(p)}
                    className="text-sm bg-white border border-berlin-gray-200 text-gray-700 px-4 py-2 rounded-full hover:border-berlin-red-400 hover:text-berlin-red-700 hover:bg-berlin-red-50 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => {
            if (msg.type === 'user') {
              return (
                <div key={idx} className="flex justify-end">
                  <div className="max-w-[75%] bg-berlin-red-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 text-sm leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }

            if (msg.type === 'thinking') {
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="bg-berlin-red-100 rounded-full p-2 flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-berlin-red-600" />
                  </div>
                  <div className="bg-white border border-berlin-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-berlin-red-500 animate-spin" />
                    <span className="text-sm text-gray-500">Analyzing products across 6 dimensions…</span>
                  </div>
                </div>
              );
            }

            if (msg.type === 'error') {
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="bg-red-100 rounded-full p-2 flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-tl-sm px-5 py-3 text-sm shadow-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }

            if (msg.type === 'results') {
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="bg-berlin-red-100 rounded-full p-2 flex-shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-berlin-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Reply text */}
                    <div className="bg-white border border-berlin-gray-200 rounded-2xl rounded-tl-sm px-5 py-3 text-sm text-gray-700 shadow-sm mb-4 inline-block">
                      {msg.text}
                    </div>

                    {/* Product cards grid */}
                    {msg.recommendations.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {msg.recommendations.map(p => (
                          <ProductCard
                            key={p.productId}
                            product={p}
                            onClick={() => navigate(`/products/${p.productId}`)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Auto-scroll anchor */}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Input Area ─────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white border-t border-berlin-gray-200 px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {/* Quick prompts (shown below chat too, compact) */}
          {messages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              {QUICK_PROMPTS.slice(0, 4).map(p => (
                <button
                  key={p}
                  onClick={() => handleQuickPrompt(p)}
                  className="flex-shrink-0 text-xs bg-berlin-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-berlin-red-50 hover:text-berlin-red-700 transition-all whitespace-nowrap"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          <div className="flex items-end gap-3 bg-berlin-gray-50 border border-berlin-gray-200 rounded-2xl px-4 py-3 focus-within:border-berlin-red-400 focus-within:ring-1 focus-within:ring-berlin-red-200 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe the packaging you need… e.g. 'FDA-approved glass bottle for hot sauces, around 300ml'"
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed disabled:opacity-60"
              style={{ maxHeight: '160px' }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 bg-berlin-red-600 text-white rounded-xl p-2.5 hover:bg-berlin-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-xs">Enter</kbd> to search · 
            <kbd className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-xs">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}

// ── ProductCard sub-component ──────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, { label: string; color: string }> = {
  material:       { label: 'Material',       color: 'bg-purple-500' },
  compliance:     { label: 'Compliance',     color: 'bg-blue-500' },
  sustainability: { label: 'Sustainability', color: 'bg-emerald-500' },
  endUse:         { label: 'End-Use',        color: 'bg-amber-500' },
  semantic:       { label: 'Relevance',      color: 'bg-indigo-500' },
  price:          { label: 'Price Value',    color: 'bg-pink-500' },
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function ProductCard({ product: p, onClick }: { product: Recommendation; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const score = p.betterScore ?? (p.similarityScore != null ? Math.round(p.similarityScore * 100) : 0);

  return (
    <div
      className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-berlin-red-300 hover:shadow-md transition-all duration-200 flex flex-col"
    >
      {/* Score + eco */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          score >= 80 ? 'bg-emerald-50 text-emerald-700' :
          score >= 60 ? 'bg-amber-50 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {Math.round(score)} / 100
        </span>
        <div className="flex items-center gap-1.5">
          {p.breakdown && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowBreakdown(v => !v); }}
              className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-berlin-red-600 transition-colors"
              title="Score breakdown"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          )}
          {p.ecoScore != null && (
            <span className="flex items-center gap-0.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Leaf className="h-3 w-3" /> {p.ecoScore}
            </span>
          )}
          {(p.fdaApproved || p.euCompliant) && (
            <span className="flex items-center gap-0.5 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              {p.fdaApproved && p.euCompliant ? 'FDA+EU' : p.fdaApproved ? 'FDA' : 'EU'}
            </span>
          )}
        </div>
      </div>

      {/* Score breakdown panel */}
      {showBreakdown && p.breakdown && (
        <div className="mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Score Breakdown</p>
          <div className="space-y-1.5">
            {Object.entries(p.breakdown).map(([key, val]) => {
              const dim = DIMENSION_LABELS[key];
              if (!dim) return null;
              const dimVal = val as DimensionScore;
              const score = dimVal?.score ?? 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20 text-right">{dim.label}</span>
                  <div className="flex-1">
                    <ScoreBar value={score} color={dim.color} />
                  </div>
                  <span className="text-xs font-mono text-gray-600 w-8 text-right">{Math.round(score)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Name */}
      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
        {p.name}
      </h3>

      {/* Category */}
      <p className="text-xs text-gray-400 mb-2">
        {p.broaderCategory ? `${p.broaderCategory} › ` : ''}{p.category}
        {p.packagingType ? ` · ${p.packagingType}` : ''}
      </p>

      {/* Highlights */}
      {p.productHighlights && (
        <p className={`text-xs text-gray-600 mb-2 ${expanded ? '' : 'line-clamp-2'}`}>
          {p.productHighlights}
        </p>
      )}

      {/* Key advantages (collapsible) */}
      {p.keyAdvantages && p.keyAdvantages.length > 0 && (
        <div className="mb-2">
          <ul className="space-y-1">
            {(expanded ? p.keyAdvantages : p.keyAdvantages.slice(0, 2)).map((adv, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">{adv}</span>
              </li>
            ))}
          </ul>
          {p.keyAdvantages.length > 2 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              className="mt-1 text-xs text-berlin-red-600 flex items-center gap-0.5 hover:underline"
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" /> Show less</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> +{p.keyAdvantages.length - 2} more</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Industries */}
      {p.targetIndustries && p.targetIndustries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {p.targetIndustries.slice(0, 3).map(ind => (
            <span key={ind} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
              {ind}
            </span>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA */}
      <button
        onClick={onClick}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-berlin-red-600 border border-berlin-red-200 rounded-lg py-2 hover:bg-berlin-red-50 transition-all group-hover:border-berlin-red-400"
      >
        View full product <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
