import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, Leaf, CheckCircle2, Loader2 } from 'lucide-react';

// All requests go through Vite's proxy (/rec-api → http://localhost:6000/api)
const REC_ENGINE_URL = '/rec-api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SimilarProduct {
  productId: string;
  name: string;
  category: string;
  broaderCategory?: string;
  packagingType?: string;
  targetIndustries?: string[];
  ecoScore?: number;
  productHighlights?: string;
  keyAdvantages?: string[];
  similarityScore: number;
}

interface SimilarProductsProps {
  /** MongoDB _id or productId of the current product */
  productId: string;
  /** Number of results to request (default 6) */
  topN?: number;
  /** If true, only show products in the same category */
  sameCategory?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SimilarProducts({ productId, topN = 6, sameCategory = false }: SimilarProductsProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      topN: String(topN),
      ...(sameCategory && { sameCategory: 'true' }),
    });

    fetch(`${REC_ENGINE_URL}/recommendations/similar/${productId}?${params}`)
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        setProducts(data.recommendations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[SimilarProducts] fetch error:', err);
        setError('Unable to load recommendations right now.');
        setLoading(false);
      });
  }, [productId, topN, sameCategory]);

  // Don't render the section if nothing to show
  if (!loading && (error || products.length === 0)) return null;

  return (
    <section className="mt-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-berlin-red-100 p-2 rounded-full">
          <Sparkles className="h-5 w-5 text-berlin-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Similar Products</h2>
        <span className="text-sm text-gray-500 ml-1">AI-matched alternatives</span>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-berlin-red-500 animate-spin" />
          <span className="ml-3 text-gray-500 text-sm">Finding similar products…</span>
        </div>
      )}

      {/* Grid */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(p => (
            <div
              key={p.productId}
              onClick={() => navigate(`/products/${p.productId}`)}
              className="group cursor-pointer bg-white border border-gray-200 rounded-xl p-5 hover:border-berlin-red-300 hover:shadow-md transition-all duration-200"
            >
              {/* Score badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium bg-berlin-red-50 text-berlin-red-700 px-2 py-1 rounded-full">
                  {Math.round(p.similarityScore * 100)}% match
                </span>
                {p.ecoScore != null && (
                  <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                    <Leaf className="h-3 w-3" />
                    {p.ecoScore}
                  </div>
                )}
              </div>

              {/* Name + category */}
              <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-berlin-red-700 transition-colors line-clamp-2 mb-1">
                {p.name}
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {p.broaderCategory ? `${p.broaderCategory} › ` : ''}{p.category}
                {p.packagingType ? ` · ${p.packagingType}` : ''}
              </p>

              {/* Product highlights */}
              {p.productHighlights && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{p.productHighlights}</p>
              )}

              {/* Key advantages (first 2) */}
              {p.keyAdvantages && p.keyAdvantages.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {p.keyAdvantages.slice(0, 2).map((adv, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{adv}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Industries */}
              {p.targetIndustries && p.targetIndustries.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.targetIndustries.slice(0, 3).map(ind => (
                    <span
                      key={ind}
                      className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center text-xs font-medium text-berlin-red-600 group-hover:gap-2 gap-1 transition-all">
                View product <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
