import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

import FileUploadZone from '../components/ai-upload/FileUploadZone';
import ProcessingProgress, { type FileProcessingStatus } from '../components/ai-upload/ProcessingProgress';
import ProductReviewGrid from '../components/ai-upload/ProductReviewGrid';

import type { AIExtractedProduct } from '../utils/aiTypes';
import { extractProductsFromFile, submitApprovedProducts } from '../services/aiExtractionService';

// ─── How many extracted products we remember for the "live preview" scroll ───
const MAX_LIVE_PREVIEW = 40;

const AIProductEntryPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'summary'>('upload');
  const [fileStatuses, setFileStatuses] = useState<FileProcessingStatus[]>([]);
  const [products, setProducts] = useState<AIExtractedProduct[]>([]);
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
              // Trim live preview list to avoid giant DOM lists during extraction
              setProducts(prev => {
                const next = [...prev, product];
                return next.length > MAX_LIVE_PREVIEW ? next.slice(-MAX_LIVE_PREVIEW) : next;
              });
              setFileStatuses(prev =>
                prev.map(f =>
                  f.id === fileId ? { ...f, productsFound: f.productsFound + 1 } : f
                )
              );
            },
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
    setFileStatuses([]);
    setProducts([]);
    setSubmittedCount(0);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Product Entry</h1>
          <p className="text-gray-500 mt-2">
            Upload your product catalogue — Gemini AI will extract every product and present it for review.
          </p>
        </div>
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          batchSize={batchSize}
          onBatchSizeChange={setBatchSize}
        />
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
        <ProcessingProgress
          files={fileStatuses}
          liveProducts={products}
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
