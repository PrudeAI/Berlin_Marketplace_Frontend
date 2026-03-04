import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, FileSpreadsheet, Presentation, FileType } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
}

const ACCEPTED_TYPES = [
  { ext: '.pdf', label: 'PDF', mimes: ['application/pdf'] },
  { ext: '.pptx,.ppt', label: 'PowerPoint', mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'] },
  { ext: '.docx,.doc', label: 'Word', mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'] },
  { ext: '.xlsx,.xls', label: 'Excel', mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] },
];

const ACCEPT_STRING = ACCEPTED_TYPES.flatMap(t => t.ext.split(',')).join(',');

function FileTypeIcon({ label }: { label: string }) {
  const cls = 'w-5 h-5';
  if (label === 'PDF') return <FileText className={cls} />;
  if (label === 'Excel') return <FileSpreadsheet className={cls} />;
  if (label === 'PowerPoint') return <Presentation className={cls} />;
  return <FileType className={cls} />;
}

function isValidFile(file: File): boolean {
  const allMimes = ACCEPTED_TYPES.flatMap(t => t.mimes);
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const allExts = ACCEPTED_TYPES.flatMap(t => t.ext.split(','));
  return allMimes.includes(file.type) || allExts.includes(ext);
}

const BATCH_SIZE_OPTIONS = [1, 2, 3, 5, 8, 10, 15, 20];

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFilesSelected, disabled, batchSize, onBatchSizeChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);

  const handleFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const valid: File[] = [];
      const invalid: string[] = [];

      for (const file of Array.from(rawFiles)) {
        if (isValidFile(file)) valid.push(file);
        else invalid.push(file.name);
      }

      if (invalid.length > 0) setInvalidFiles(invalid);
      else setInvalidFiles([]);

      if (valid.length > 0) onFilesSelected(valid);
    },
    [onFilesSelected]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-14 text-center transition-all cursor-pointer select-none
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200' : ''}
          ${dragOver ? 'border-berlin-red-500 bg-berlin-red-50 scale-[1.01]' : 'border-gray-300 hover:border-berlin-red-400 hover:bg-gray-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          onChange={e => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 transition-colors ${dragOver ? 'bg-berlin-red-100' : 'bg-gray-100'}`}>
          <Upload className={`w-8 h-8 ${dragOver ? 'text-berlin-red-600' : 'text-gray-500'}`} />
        </div>

        <p className="text-xl font-semibold text-gray-800 mb-2">
          {dragOver ? 'Release to upload' : 'Drop files here or click to browse'}
        </p>
        <p className="text-sm text-gray-500">
          Upload product catalogues, spec sheets, or price lists
        </p>
      </div>

      {/* Batch size selector */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-800">Pages per batch</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              How many pages to send to AI at once for extraction. Fewer pages = more accurate but slower. More pages = faster but may miss details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {BATCH_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => onBatchSizeChange(size)}
                disabled={disabled}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                  ${batchSize === size
                    ? 'bg-berlin-red-600 text-white border-berlin-red-600 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-berlin-red-300 hover:bg-berlin-red-50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Supported formats */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACCEPTED_TYPES.map(t => (
          <div key={t.label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 font-medium border border-gray-200">
            <FileTypeIcon label={t.label} />
            {t.label}
            <span className="ml-auto text-gray-400 text-xs">{t.ext.split(',')[0]}</span>
          </div>
        ))}
      </div>

      {/* Invalid file warning */}
      {invalidFiles.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <strong>Unsupported files skipped:</strong> {invalidFiles.join(', ')}
        </div>
      )}

      {/* How it works */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '📄', title: 'Page-by-page analysis', desc: 'PDFs and presentations are processed slide-by-slide so each product gets precise attention.' },
          { icon: '🤖', title: 'Gemini AI extraction', desc: 'Google\'s Gemini 2.5 Flash reads your document and extracts all product fields automatically.' },
          { icon: '✏️', title: 'Review & correct', desc: 'Every extracted product lands on a review card where you can edit, approve, or reject before publishing.' },
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

export default FileUploadZone;
