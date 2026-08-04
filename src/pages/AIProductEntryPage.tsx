import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, File, CheckCircle, AlertCircle, Loader2, Link2 } from 'lucide-react';
import ProductSummary from '../components/products/ProductSummary';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ExtractedProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  broaderCategory: string;
  subcategory?: string;
  specifications: {
    material?: string;
    capacity?: { value: number; unit: string };
    dimensions?: { height: number; width: number; depth: number; unit: string };
    color?: string;
    minimumOrderQuantity: number;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  images: string[];
  features: string[];
  certifications: string[];
  sustainability?: {
    recycledContent?: number;
    biodegradable?: boolean;
    compostable?: boolean;
    refillable?: boolean;
  };
  status: 'extracted' | 'reviewed' | 'approved' | 'rejected';
  similarProducts: {
    id: string;
    name: string;
    similarity: number;
  }[];
  missingFields: string[];
}

interface FileUploadStatus {
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const AIProductEntryPage: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadStatus[]>([]);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review' | 'summary'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // URL-extraction mode state (file upload above stays exactly as-is)
  const [entryMode, setEntryMode] = useState<'file' | 'url'>('file');
  const [productUrl, setProductUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlFeedback, setUrlFeedback] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  // Synchronous guard so a double-click / Enter key / stale `urlLoading` cannot fire
  // two concurrent extraction requests (which could let an older response overwrite a newer one).
  const urlInFlightRef = useRef(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: FileUploadStatus[] = Array.from(files).map(file => ({
      name: file.name,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setCurrentStep('processing');

    // Process each file
    Array.from(files).forEach((file, index) => {
      processFile(file, index);
    });
  };

  const processFile = async (file: File, index: number) => {
    try {
      // Update status to processing
      setUploadedFiles(prev => prev.map((f, i) => 
        i === prev.length - 1 + index ? { ...f, status: 'processing', progress: 25 } : f
      ));

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/ai/extract-products`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supplier_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to process file: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update file status
      setUploadedFiles(prev => prev.map((f, i) => 
        i === prev.length - 1 + index ? { ...f, status: 'completed', progress: 100 } : f
      ));

      // Add extracted products
      setExtractedProducts(prev => [...prev, ...data.products]);

      // Check if all files are processed by checking the updated state
      setTimeout(() => {
        setUploadedFiles(currentFiles => {
          const allFilesProcessed = currentFiles.every(f => f.status === 'completed' || f.status === 'error');
          if (allFilesProcessed) {
            setCurrentStep('review');
          }
          return currentFiles;
        });
      }, 100);

    } catch (error) {
      console.error('Error processing file:', error);
      setUploadedFiles(prev => prev.map((f, i) => 
        i === prev.length - 1 + index ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        } : f
      ));
    }
  };

  const processUrl = async () => {
    const trimmedUrl = productUrl.trim();

    // Validate that the field is not empty before making the request.
    if (!trimmedUrl) {
      setUrlFeedback({ type: 'error', text: 'Please enter a product URL.' });
      return;
    }

    // Block duplicate/concurrent submissions before any async work begins.
    if (urlInFlightRef.current) return;
    urlInFlightRef.current = true;

    setUrlLoading(true);
    setUrlFeedback(null);

    try {
      const response = await fetch(`${API_URL}/api/ai/extract-products-from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Same Bearer auth pattern used by the file upload above.
          'Authorization': `Bearer ${localStorage.getItem('supplier_token')}`
        },
        body: JSON.stringify({ url: trimmedUrl })
      });

      // Read the body once; it may carry products (success) or a message (error).
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 403) {
          // Page is behind a login/authentication wall → show the backend's guidance,
          // NOT "No products found for this URL".
          setUrlFeedback({
            type: 'error',
            text: (data && (data.message || data.error)) || "This page appears to require authentication and can't be accessed automatically. Please use a publicly accessible URL or upload the product document instead."
          });
        } else if (response.status === 400) {
          // Validation error → surface the backend-provided message.
          setUrlFeedback({
            type: 'error',
            text: (data && (data.message || data.error)) || 'Invalid URL. Please check it and try again.'
          });
        } else {
          // Server error (500) or anything else.
          setUrlFeedback({
            type: 'error',
            text: 'Something went wrong while extracting products from this URL. Please try again later.'
          });
        }
        return;
      }

      const products: ExtractedProduct[] = (data && data.products) || [];

      if (products.length === 0) {
        // No matches → stay on the upload step with a friendly message.
        setUrlFeedback({ type: 'info', text: 'No products found for this URL.' });
        return;
      }

      // Reuse the existing review pipeline: populate state and jump to review.
      setExtractedProducts(prev => [...prev, ...products]);
      // Clear the URL input so it is empty when the user returns to the upload screen.
      setProductUrl('');
      setCurrentStep('review');
    } catch (error) {
      console.error('Error extracting products from URL:', error);
      setUrlFeedback({
        type: 'error',
        text: 'Unable to reach the server. Please check your connection and try again.'
      });
    } finally {
      setUrlLoading(false);
      urlInFlightRef.current = false;
    }
  };

  const handleProductEdit = (productId: string, updatedProduct: Partial<ExtractedProduct>) => {
    setExtractedProducts(prev => prev.map(product =>
      product.id === productId ? { ...product, ...updatedProduct } : product
    ));
  };

  const handleProductApproval = (productId: string, approved: boolean) => {
    setExtractedProducts(prev => prev.map(product => 
      product.id === productId ? { 
        ...product, 
        status: approved ? 'approved' : 'rejected' 
      } : product
    ));
  };

  const handleFinalSubmission = async () => {
    const approvedProducts = extractedProducts.filter(p => p.status === 'approved');
    
    if (approvedProducts.length === 0) {
      alert('Please approve at least one product before submitting.');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/ai/submit-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supplier_token')}`
        },
        body: JSON.stringify({ products: approvedProducts })
      });

      if (!response.ok) {
        throw new Error('Failed to submit products');
      }

      const result = await response.json();
      console.log('Products submitted successfully:', result);
      
      setCurrentStep('summary');
    } catch (error) {
      console.error('Error submitting products:', error);
      alert('Failed to submit products. Please try again.');
    }
  };

  const renderUploadStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">AI-Powered Product Entry</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <Upload className="w-16 h-16 text-berlin-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Upload Your Product Files</h2>
          <p className="text-gray-600 mb-4">
            Upload Excel, PDF, or PowerPoint files containing product information. 
            Our AI will extract and structure the data automatically.
          </p>
        </div>

        {/* Input source toggle: keep file upload, add URL extraction */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => { setEntryMode('file'); setUrlFeedback(null); }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                entryMode === 'file'
                  ? 'bg-berlin-red-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => { setEntryMode('url'); setUrlFeedback(null); }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                entryMode === 'url'
                  ? 'bg-berlin-red-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Paste Product URL
            </button>
          </div>
        </div>

        {/* File upload mode — unchanged behavior */}
        {entryMode === 'file' && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-berlin-red-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.pdf,.pptx,.ppt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-gray-500">
              Supported formats: Excel (.xlsx, .xls), PDF (.pdf), PowerPoint (.pptx, .ppt)
            </p>
          </div>
        )}

        {/* URL extraction mode */}
        {entryMode === 'url' && (
          <form
            onSubmit={(e) => { e.preventDefault(); processUrl(); }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center"
          >
            <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Paste a product page URL</p>
            <p className="text-sm text-gray-500 mb-6">
              We'll fetch the page and let AI extract the product information.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-xl mx-auto">
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://example.com/product/123"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-berlin-red-500 focus:border-berlin-red-500"
              />
              <button
                type="submit"
                disabled={urlLoading}
                className="px-6 py-3 bg-berlin-red-600 text-white rounded-lg font-semibold hover:bg-berlin-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {urlLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  'Extract Products'
                )}
              </button>
            </div>

            {urlFeedback && (
              <div
                className={`mt-6 max-w-xl mx-auto rounded-lg border p-4 text-sm text-left ${
                  urlFeedback.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                {urlFeedback.text}
              </div>
            )}
          </form>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-lg p-4 mb-3">
              <File className="w-8 h-8 text-blue-600 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">File Processing</h3>
            <p className="text-sm text-gray-600">AI reads and extracts product information from your files</p>
          </div>
          <div className="text-center">
            <div className="bg-yellow-100 rounded-lg p-4 mb-3">
              <CheckCircle className="w-8 h-8 text-yellow-600 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">Data Validation</h3>
            <p className="text-sm text-gray-600">Review and edit extracted product data before submission</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 rounded-lg p-4 mb-3">
              <AlertCircle className="w-8 h-8 text-green-600 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">Quality Check</h3>
            <p className="text-sm text-gray-600">AI checks for similar products and missing information</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Processing Your Files</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Loader2 className="w-16 h-16 text-berlin-red-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-semibold mb-2">AI is extracting product information...</h2>
          <p className="text-gray-600">This may take a few moments depending on file size and complexity</p>
        </div>

        <div className="space-y-4">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{file.name}</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  file.status === 'completed' ? 'bg-green-100 text-green-800' :
                  file.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {file.status === 'uploading' ? 'Uploading...' :
                   file.status === 'processing' ? 'Processing...' :
                   file.status === 'completed' ? 'Completed' :
                   'Error'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    file.status === 'error' ? 'bg-red-500' : 'bg-berlin-red-600'
                  }`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              {file.error && (
                <p className="text-red-600 text-sm mt-2">{file.error}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Review Extracted Products</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {extractedProducts.length} Product(s) Extracted
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentStep('upload')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Upload More Files
            </button>
            <button
              onClick={handleFinalSubmission}
              disabled={extractedProducts.filter(p => p.status === 'approved').length === 0}
              className="px-6 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 disabled:opacity-50"
            >
              Create Products ({extractedProducts.filter(p => p.status === 'approved').length})
            </button>
          </div>
        </div>

        {extractedProducts.map((product) => (
          <ProductSummary
            key={product.id}
            product={product}
            onUpdate={handleProductEdit}
            onApprove={(productId) => handleProductApproval(productId, true)}
            onReject={(productId) => handleProductApproval(productId, false)}
          />
        ))}
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Products Created Successfully!</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-4">
          {extractedProducts.filter(p => p.status === 'approved').length} products have been created
        </h2>
        <p className="text-gray-600 mb-8">
          Your products are now pending approval and will be visible to buyers once approved.
        </p>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/supplier/products')}
            className="px-6 py-3 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
          >
            View My Products
          </button>
          <button
            onClick={() => {
              setCurrentStep('upload');
              setUploadedFiles([]);
              setExtractedProducts([]);
              setProductUrl('');
              setUrlFeedback(null);
              setEntryMode('file');
            }}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Add More Products
          </button>
        </div>
      </div>
    </div>
  );

  switch (currentStep) {
    case 'upload':
      return renderUploadStep();
    case 'processing':
      return renderProcessingStep();
    case 'review':
      return renderReviewStep();
    case 'summary':
      return renderSummaryStep();
    default:
      return renderUploadStep();
  }
};

export default AIProductEntryPage;
