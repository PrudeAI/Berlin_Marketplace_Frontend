import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, Link2, AlertTriangle } from 'lucide-react';

import FileUploadZone from '../components/ai-upload/FileUploadZone';
import UrlInputZone from '../components/ai-upload/UrlInputZone';
import ProcessingProgress, { type FileProcessingStatus } from '../components/ai-upload/ProcessingProgress';
import ProductReviewGrid from '../components/ai-upload/ProductReviewGrid';

import type { AIExtractedProduct } from '../utils/aiTypes';
import { extractProductsFromFile, extractProductsFromUrls, submitApprovedProducts } from '../services/aiExtractionService';

type UploadMode = 'files' | 'urls';

// How many extracted products to RENDER in the live progress list. This caps the
// DOM only — every product stays in state for the review grid and submit.
const MAX_LIVE_PREVIEW = 40;

const AIProductEntryPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'summary'>('upload');
  const [uploadMode, setUploadMode] = useState<UploadMode>('files');
  const [fileStatuses, setFileStatuses] = useState<FileProcessingStatus[]>([]);
  const [products, setProducts] = useState<AIExtractedProduct[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [batchSize, setBatchSize] = useState(3);

  // ── Internal helpers ──────────────────────────────────────────────────────

  const updateFileStatus = useCallback(
    (fileId: string, patch: Partial<FileProcessingStatus>) =>
      setFileStatuses(prev => prev.map(f => f.id === fileId ? { ...f, ...patch } : f)),
    []
  );

  const checkAllDone = useCallback(
    (statuses: FileProcessingStatus[]) => {
      const allSettled = statuses.every(f => f.status === 'done' || f.status === 'error');
      if (allSettled) setStep('review');
    },
    []
  );

  // ── File selection handler (from FileUploadZone) ──────────────────────────

  const handleFilesSelected = useCallback(async (files: File[]) => {
    // Build initial status objects
    const newStatuses: FileProcessingStatus[] = files.map(f => ({
      id: crypto.randomUUID(),
      fileName: f.name,
      status: 'uploading' as const,
      productsFound: 0,
    }));

    setFileStatuses(prev => {
      const next = [...prev, ...newStatuses];
      return next;
    });
    setStep('processing');

    // Start SSE extraction for every file concurrently
    await Promise.allSettled(
      files.map(async (file, i) => {
        const fileId = newStatuses[i].id;

        try {
          updateFileStatus(fileId, { status: 'uploading' });

          await extractProductsFromFile(file, {
            onStart: () => {
              updateFileStatus(fileId, { status: 'extracting' });
            },
            onProduct: (product) => {
              // Keep every product — `products` feeds the review grid AND submit.
              // Only the on-screen preview is capped (see liveProducts below).
              setProducts(prev => [...prev, product]);
              setFileStatuses(prev =>
                prev.map(f =>
                  f.id === fileId ? { ...f, productsFound: f.productsFound + 1 } : f
                )
              );
            },
            onWarning: (w) => setWarnings(prev => prev.includes(w.message) ? prev : [...prev, w.message]),
            onDone: () => {
              setFileStatuses(prev => {
                const next = prev.map(f =>
                  f.id === fileId ? { ...f, status: 'done' as const } : f
                );
                checkAllDone(next);
                return next;
              });
            },
            onError: (err) => {
              setFileStatuses(prev => {
                const next = prev.map(f =>
                  f.id === fileId ? { ...f, status: 'error' as const, errorMessage: err.message } : f
                );
                checkAllDone(next);
                return next;
              });
            },
          }, batchSize);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setFileStatuses(prev => {
            const next = prev.map(f =>
              f.id === fileId ? { ...f, status: 'error' as const, errorMessage: msg } : f
            );
            checkAllDone(next);
            return next;
          });
        }
      })
    );
  }, [updateFileStatus, checkAllDone, batchSize]);

  // ── URL submission handler (from UrlInputZone) ────────────────────────────
  // Deliberately simpler than handleFilesSelected: the server runs the worker
  // pool, so this is one request and per-URL progress arrives as SSE events.
  const handleUrlsSubmitted = useCallback(async (urls: string[]) => {
    const statuses: FileProcessingStatus[] = urls.map(url => ({
      id: crypto.randomUUID(),
      fileName: url,
      status: 'uploading' as const,
      productsFound: 0,
    }));

    setFileStatuses(statuses);
    setStep('processing');

    // The server reports progress by index, so keep the mapping.
    const idByIndex = statuses.map(s => s.id);

    try {
      await extractProductsFromUrls(urls, {
        onUrlStart: ({ index }) => updateFileStatus(idByIndex[index], { status: 'extracting' }),
        onProduct: (product) => setProducts(prev => [...prev, product]),
        onWarning: (w) => setWarnings(prev => prev.includes(w.message) ? prev : [...prev, w.message]),
        onUrlDone: ({ index, productsFound }) =>
          updateFileStatus(idByIndex[index], { status: 'done', productsFound: productsFound ?? 0 }),
        onUrlError: ({ index, message }) =>
          updateFileStatus(idByIndex[index], { status: 'error', errorMessage: message }),
        onDone: () => setStep('review'),
        onError: (err) => {
          // A whole-run failure (auth, config, bad request) — mark everything.
          setFileStatuses(prev => {
            const next = prev.map(f => f.status === 'done' ? f : { ...f, status: 'error' as const, errorMessage: err.message });
            checkAllDone(next);
            return next;
          });
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setFileStatuses(prev => {
        const next = prev.map(f => ({ ...f, status: 'error' as const, errorMessage: msg }));
        checkAllDone(next);
        return next;
      });
    }

    // Safety net: if the server never sent `done`, still move on.
    setStep(s => (s === 'processing' ? 'review' : s));
  }, [updateFileStatus, checkAllDone]);

  // ── Submission ────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const approved = products.filter(p => p.status === 'approved');
    if (approved.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await submitApprovedProducts(approved);
      setSubmittedCount(result.submitted);
      setStep('summary');
    } catch (err) {
      console.error('Submission error:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit products. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [products]);

  // ── Reset to upload ───────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStep('upload');
    setUploadMode('files');
    setFileStatuses([]);
    setProducts([]);
    setWarnings([]);
    setSubmittedCount(0);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 'upload') {
    const tabs: { key: UploadMode; label: string; icon: React.ReactNode }[] = [
      { key: 'files', label: 'Upload documents', icon: <Upload className="w-4 h-4" /> },
      { key: 'urls', label: 'Product URLs', icon: <Link2 className="w-4 h-4" /> },
    ];

    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Product Entry</h1>
          <p className="text-gray-500 mt-2">
            {uploadMode === 'files'
              ? 'Upload your product catalogue — Gemini AI will extract every product and present it for review.'
              : 'Paste links to product pages — we read each one and extract the product for review.'}
          </p>
        </div>

        {/* Mode switcher */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="inline-flex bg-white rounded-xl border border-gray-200 shadow-sm p-1 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setUploadMode(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === tab.key
                    ? 'bg-berlin-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {uploadMode === 'files' ? (
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            batchSize={batchSize}
            onBatchSizeChange={setBatchSize}
          />
        ) : (
          <UrlInputZone onUrlsSubmitted={handleUrlsSubmitted} />
        )}
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
        {warnings.length > 0 && (
          <div className="max-w-4xl mx-auto mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <ul className="space-y-1">
                {warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}
        <ProcessingProgress
          files={fileStatuses}
          /* Cap only what's rendered — `products` itself keeps every item. */
          liveProducts={products.slice(-MAX_LIVE_PREVIEW)}
          onUploadMore={() => setStep('upload')}
        />
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
        <ProductReviewGrid
          products={products}
          onUpdate={setProducts}
          onUploadMore={() => setStep('upload')}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {submittedCount} product{submittedCount !== 1 ? 's' : ''} submitted!
        </h2>
        <p className="text-gray-500 mb-8">
          Your products are now pending admin approval and will be visible to buyers once approved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/supplier/products')}
            className="px-6 py-2.5 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 text-sm font-medium"
          >
            View my products
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Upload more files
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIProductEntryPage;
