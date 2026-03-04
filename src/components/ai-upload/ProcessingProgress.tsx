import React from 'react';
import { CheckCircle, XCircle, Loader2, FileText, Package } from 'lucide-react';
import type { AIExtractedProduct } from '../../utils/aiTypes';

export interface FileProcessingStatus {
  id: string;
  fileName: string;
  status: 'queued' | 'uploading' | 'extracting' | 'done' | 'error';
  errorMessage?: string;
  productsFound: number;
}

interface ProcessingProgressProps {
  files: FileProcessingStatus[];
  liveProducts: AIExtractedProduct[]; // products received so far (for live preview)
  onUploadMore: () => void;
}

function statusLabel(status: FileProcessingStatus['status']): string {
  switch (status) {
    case 'queued': return 'Queued';
    case 'uploading': return 'Uploading…';
    case 'extracting': return 'Gemini AI reading…';
    case 'done': return 'Complete';
    case 'error': return 'Error';
  }
}

function statusColor(status: FileProcessingStatus['status']): string {
  switch (status) {
    case 'done': return 'text-green-700 bg-green-100';
    case 'error': return 'text-red-700 bg-red-100';
    case 'extracting': return 'text-blue-700 bg-blue-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function StatusIcon({ status }: { status: FileProcessingStatus['status'] }) {
  if (status === 'done') return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
  if (status === 'extracting' || status === 'uploading')
    return <Loader2 className="w-5 h-5 text-berlin-red-600 animate-spin" />;
  return <FileText className="w-5 h-5 text-gray-400" />;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ files, liveProducts, onUploadMore }) => {
  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');
  const totalFound = files.reduce((sum, f) => sum + f.productsFound, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Processing Your Files</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gemini AI is extracting product information page-by-page
            </p>
          </div>
          <button
            onClick={onUploadMore}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            + Upload more
          </button>
        </div>

        {/* File list */}
        <div className="space-y-3">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <StatusIcon status={file.status} />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{file.fileName}</p>
                {file.errorMessage && (
                  <p className="text-red-600 text-xs mt-0.5">{file.errorMessage}</p>
                )}
                {file.status === 'done' && (
                  <p className="text-green-600 text-xs mt-0.5">
                    {file.productsFound} product{file.productsFound !== 1 ? 's' : ''} extracted
                  </p>
                )}
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(file.status)}`}>
                {statusLabel(file.status)}
              </span>
            </div>
          ))}
        </div>

        {/* Overall animation */}
        {!allDone && (
          <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin text-berlin-red-600" />
            Extracting products… {totalFound > 0 && `${totalFound} found so far`}
          </div>
        )}
      </div>

      {/* Live product stream – appears as products come in */}
      {liveProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-berlin-red-600" />
            <h3 className="font-semibold text-gray-900">
              Products found so far ({liveProducts.length})
            </h3>
            {!allDone && (
              <span className="ml-auto bg-berlin-red-100 text-berlin-red-700 text-xs px-2 py-0.5 rounded-full animate-pulse">
                Live
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {liveProducts.slice(-8).map((p, i) => (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <span className="text-xs text-gray-400 w-5 text-right">{liveProducts.length - (liveProducts.slice(-8).length - 1 - i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.broaderCategory} › {p.category}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {p.pageNumber ? `Page ${p.pageNumber}` : ''}
                </span>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              </div>
            ))}
          </div>

          {liveProducts.length > 8 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              … and {liveProducts.length - 8} more
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessingProgress;
