import React, { useState } from 'react';
import {
  CheckCircle, XCircle, Edit2, AlertTriangle, FileText,
  Leaf, Package, ChevronRight, Layers, Clock, Eye,
  Sparkles
} from 'lucide-react';
import type { AIExtractedProduct } from '../../utils/aiTypes';
import { calculateCompleteness, getProductDisplaySummary } from '../../utils/dataTransformers';
import ProductEditModal from './ProductEditModal';

interface ProductReviewGridProps {
  products: AIExtractedProduct[];
  onUpdate: (products: AIExtractedProduct[]) => void;
  onUploadMore: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

// ─── Completeness ring ────────────────────────────────────────────────────────
function CompletenessRing({ percent, color, size = 'sm' }: { percent: number; color: 'green' | 'yellow' | 'red'; size?: 'sm' | 'md' }) {
  const ringSize = size === 'sm' ? 36 : 48;
  const strokeWidth = size === 'sm' ? 3 : 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  
  const colorClass = {
    green:  'text-emerald-500',
    yellow: 'text-amber-500',
    red:    'text-red-500',
  }[color];

  return (
    <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
      <svg className="transform -rotate-90" width={ringSize} height={ringSize}>
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={colorClass}
        />
      </svg>
      <span className={`absolute text-xs font-bold ${colorClass}`}>{percent}</span>
    </div>
  );
}

// ─── Individual product card ──────────────────────────────────────────────────
function ProductCard({
  product, index, onEdit, onApprove, onReject,
}: {
  product: AIExtractedProduct;
  index: number;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const completeness = calculateCompleteness(product);
  const summaryItems = getProductDisplaySummary(product);
  const isApproved = product.status === 'approved';
  const isRejected = product.status === 'rejected';

  const thumbSrc = product.images[0] || null;

  return (
    <div className={`
      group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 ease-out
      ${isApproved 
        ? 'ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
        : isRejected 
          ? 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
          : 'shadow-sm hover:shadow-xl hover:-translate-y-1 ring-1 ring-gray-200/60 hover:ring-gray-300/80'}
    `}>
      {/* ── Image / thumbnail ──────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 aspect-square overflow-hidden">
        {thumbSrc ? (
          <img 
            src={thumbSrc} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <span className="text-xs text-gray-400 font-medium">No preview</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Status overlay badge */}
        {isApproved && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </div>
        )}
        {isRejected && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-gray-700/90 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </div>
        )}

        {/* Page badge */}
        {product.pageNumber && (
          <div className="absolute top-3 right-3 bg-white/95 text-gray-700 text-xs px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-sm flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            Page {product.pageNumber}
          </div>
        )}

        {/* Index badge */}
        <div className="absolute bottom-3 left-3 w-8 h-8 bg-white/95 rounded-xl text-sm font-bold text-gray-700 flex items-center justify-center shadow-sm backdrop-blur-sm">
          {index + 1}
        </div>

        {/* Completeness ring */}
        <div className="absolute bottom-3 right-3">
          <CompletenessRing percent={completeness.percent} color={completeness.color} />
        </div>

        {/* Quick action buttons on hover */}
        <div className="absolute inset-x-3 bottom-14 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 shadow-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={onApprove}
            className={`flex items-center justify-center w-9 h-9 rounded-lg shadow-lg transition-all ${isApproved ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 hover:bg-emerald-50'}`}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onReject}
            className={`flex items-center justify-center w-9 h-9 rounded-lg shadow-lg transition-all ${isRejected ? 'bg-gray-700 text-white' : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-red-500'}`}
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {/* Product name */}
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
            {product.name || <span className="text-gray-400 italic">Unnamed product</span>}
          </h3>
          <div className="flex items-center flex-wrap gap-1.5">
            {product.broaderCategory && (
              <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                {product.broaderCategory}
              </span>
            )}
            {product.category && (
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                {product.category}
              </span>
            )}
          </div>
        </div>

        {/* Key specs — compact row */}
        {summaryItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summaryItems.slice(0, 2).map(item => (
              <span key={item.label} className="text-[11px] bg-gray-50 text-gray-600 rounded-md px-2 py-1">
                <span className="text-gray-400">{item.label}:</span>{' '}
                <span className="font-semibold text-gray-700">{item.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* Eco score — compact */}
        {product.ecoScore > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50/50 rounded-lg px-2.5 py-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${product.ecoScore >= 70 ? 'bg-emerald-500' : product.ecoScore >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${product.ecoScore}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-600">{product.ecoScore}</span>
          </div>
        )}

        {/* Missing fields warning */}
        {!isRejected && completeness.missingRequired.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-2.5 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 leading-snug line-clamp-1">
              Missing: {completeness.missingRequired.slice(0, 2).join(', ')}
              {completeness.missingRequired.length > 2 && (
                <span className="text-amber-500"> +{completeness.missingRequired.length - 2}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main review grid ─────────────────────────────────────────────────────────
const ProductReviewGrid: React.FC<ProductReviewGridProps> = ({
  products, onUpdate, onUploadMore, onSubmit, isSubmitting,
}) => {
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<FilterTab>('all');

  const setStatus = (id: string, status: AIExtractedProduct['status']) =>
    onUpdate(products.map(p => p.id === id ? { ...p, status } : p));

  const handleBulkApprove = () => onUpdate(products.map(p => ({ ...p, status: 'approved' as const })));
  const handleBulkReject  = () => onUpdate(products.map(p => ({ ...p, status: 'rejected' as const })));

  const handleSaveEdit = (updated: AIExtractedProduct) => {
    onUpdate(products.map(p => p.id === updated.id ? updated : p));
    setEditingId(null);
  };

  const counts = {
    all:      products.length,
    pending:  products.filter(p => p.status === 'extracted' || p.status === 'reviewing').length,
    approved: products.filter(p => p.status === 'approved').length,
    rejected: products.filter(p => p.status === 'rejected').length,
  };

  const visibleProducts = activeTab === 'all'      ? products
    : activeTab === 'approved' ? products.filter(p => p.status === 'approved')
    : activeTab === 'rejected' ? products.filter(p => p.status === 'rejected')
    : products.filter(p => p.status === 'extracted' || p.status === 'reviewing');

  const editingProduct = editingId ? products.find(p => p.id === editingId) : null;

  const TABS: { key: FilterTab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'all',      label: 'All Products',  icon: <Package className="w-4 h-4" />, color: '' },
    { key: 'pending',  label: 'Pending',       icon: <Clock className="w-4 h-4" />, color: 'text-amber-600' },
    { key: 'approved', label: 'Approved',      icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600' },
    { key: 'rejected', label: 'Rejected',      icon: <XCircle className="w-4 h-4" />, color: 'text-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title section */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-berlin-red-500 to-berlin-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-berlin-red-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Review AI Extractions</h1>
                <p className="text-gray-500 mt-1">
                  Gemini AI found <span className="font-semibold text-gray-700">{products.length}</span> product{products.length !== 1 ? 's' : ''} in your documents
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onUploadMore}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Layers className="w-4 h-4" />
                Upload More
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={counts.approved === 0 || isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-berlin-red-600 to-berlin-red-500 text-white rounded-xl hover:from-berlin-red-700 hover:to-berlin-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold shadow-lg shadow-berlin-red-500/25 transition-all"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Publish {counts.approved} Product{counts.approved !== 1 ? 's' : ''}
              </button>
            </div>
          </div>

          {/* ── Stats Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Found</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{counts.all}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5 border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-700 mt-1">{counts.pending}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-5 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Approved</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{counts.approved}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Rejected</p>
                  <p className="text-3xl font-bold text-gray-400 mt-1">{counts.rejected}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-gray-200 shadow-sm">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-md ${
                  activeTab === tab.key 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors font-medium"
            >
              <CheckCircle className="w-4 h-4" /> Approve All
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors font-medium"
            >
              <XCircle className="w-4 h-4" /> Reject All
            </button>
          </div>
        </div>

        {/* ── Tip banner ────────────────────────────────────────────────────── */}
        {counts.approved === 0 && products.length > 0 && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-8">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Ready to review</p>
              <p className="text-sm text-blue-700 mt-0.5">
                Hover over each product card and click <span className="font-semibold">✓ Approve</span> or <span className="font-semibold">Edit</span> to modify details before publishing.
              </p>
            </div>
          </div>
        )}

        {/* ── Product Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              index={products.indexOf(product)}
              onEdit={() => setEditingId(product.id)}
              onApprove={() => setStatus(product.id, 'approved')}
              onReject={() => setStatus(product.id, 'rejected')}
            />
          ))}
        </div>

        {/* Empty state */}
        {visibleProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No products found</h3>
            <p className="text-sm text-gray-500">No products match the current filter</p>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleSaveEdit}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
};

export default ProductReviewGrid;
