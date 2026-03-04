import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Image as ImageIcon, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { AIExtractedProduct, AIDynamicSpec, AICertification } from '../../utils/aiTypes';
import { transformAIProductToFormData, transformFormDataToProduct } from '../../utils/dataTransformers';
import broaderCategories from '../../data/broaderCategories.json';
import categorySpecificFilters from '../../data/categorySpecificFilters.json';
import commonFilters from '../../data/commonFilters.json';

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dit8gwqom';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ecopack';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductEditModalProps {
  product: AIExtractedProduct;
  onSave: (updated: AIExtractedProduct) => void;
  onClose: () => void;
}

// ─── Accordion section header ─────────────────────────────────────────────────
function Section({
  title, open, onToggle, badge, children,
}: {
  title: string; open: boolean; onToggle: () => void; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 text-left"
      >
        <span className="font-semibold text-gray-800">
          {title}
          {badge && (
            <span className="ml-2 text-xs bg-berlin-red-100 text-berlin-red-700 px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5 pt-2 bg-white">{children}</div>}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-berlin-red-400';
const textareaCls = inputCls + ' resize-none';

// ─── Main modal ────────────────────────────────────────────────────────────────
const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, onSave, onClose }) => {
  // Initialize form state from AI product
  const [form, setForm] = useState(() => transformAIProductToFormData(product));
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryFiltersList, setCategoryFiltersList] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [newSpec, setNewSpec] = useState({ name: '', value: '', unit: '', category: 'custom' as AIDynamicSpec['category'] });
  const [newCert, setNewCert] = useState<AICertification>({ name: '', certificationBody: '', validUntil: '', certificateNumber: '' });
  const [saving, setSaving] = useState(false);

  // Accordion open state — open all by default
  const sections = ['category', 'details', 'specifications', 'filters', 'images', 'ecoScore', 'sustainability', 'certifications', 'customization', 'highlights', 'targeting', 'compliance'] as const;
  type SectionKey = typeof sections[number];
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() =>
    Object.fromEntries(sections.map(s => [s, true])) as Record<SectionKey, boolean>
  );
  const toggleSection = (s: SectionKey) => setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  // Update available categories when broader category changes
  useEffect(() => {
    if (form.selectedBroaderCategory) {
      const cat = (broaderCategories as any).broader_categories.find((c: any) => c.name === form.selectedBroaderCategory);
      setAvailableCategories(cat?.categories || []);
    }
  }, [form.selectedBroaderCategory]);

  // Update filters when category changes
  useEffect(() => {
    if (form.selectedCategory) {
      const cf = (categorySpecificFilters as any).categories.find((c: any) => c.category === form.selectedCategory);
      setCategoryFiltersList(cf?.filters || []);
    }
  }, [form.selectedCategory]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const setInfo = (field: string, value: any) =>
    setForm(f => ({ ...f, productInfo: { ...f.productInfo, [field]: value } }));

  // Toggle item in a simple top-level string array field
  const toggleArrayField = (field: string, value: string) => {
    setForm((f: any) => {
      const current: string[] = f[field] || [];
      const updated = current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value];
      return { ...f, [field]: updated };
    });
  };

  const toggleCheckboxFilter = (key: 'selectedCategoryFilters' | 'selectedCommonFilters', filterName: string, option: string) => {
    setForm(f => {
      const current = f[key][filterName] || [];
      const updated = current.includes(option) ? current.filter((v: string) => v !== option) : [...current, option];
      return { ...f, [key]: { ...f[key], [filterName]: updated } };
    });
  };

  const calculateEcoScore = () => {
    const d = form.ecoScoreDetails;
    const score = Math.round((d.recyclability * 0.25) + (d.carbonFootprint * 0.25) + (d.sustainableMaterials * 0.25) + (d.localSourcing * 0.15));
    setForm(f => ({ ...f, ecoScore: Math.min(100, score) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingImage(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) urls.push(data.secure_url);
    }
    setForm(f => ({ ...f, uploadedImages: [...f.uploadedImages, ...urls] }));
    setUploadingImage(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updated = transformFormDataToProduct(form, product);
    onSave(updated);
    setSaving(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl">
        {/* Modal header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Product</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fill in missing details or correct AI-extracted values</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Accordion body */}
        <div className="p-6 space-y-3">

          {/* ── Category ──────────────────── */}
          <Section title="Category" open={openSections.category} onToggle={() => toggleSection('category')}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Broader Category" required>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {(broaderCategories as any).broader_categories.map((c: any) => (
                    <label key={c.name} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${form.selectedBroaderCategory === c.name ? 'border-berlin-red-500 bg-berlin-red-50 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" className="text-berlin-red-600" checked={form.selectedBroaderCategory === c.name} onChange={() => setForm(f => ({ ...f, selectedBroaderCategory: c.name, selectedCategory: '' }))} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Subcategory" required>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {availableCategories.map(c => (
                    <label key={c} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${form.selectedCategory === c ? 'border-berlin-red-500 bg-berlin-red-50 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" className="text-berlin-red-600" checked={form.selectedCategory === c} onChange={() => setForm(f => ({ ...f, selectedCategory: c }))} />
                      {c}
                    </label>
                  ))}
                  {availableCategories.length === 0 && <p className="text-sm text-gray-400">Select a broader category first</p>}
                </div>
              </Field>
            </div>
          </Section>

          {/* ── Core Details ──────────────────── */}
          <Section title="Product Details" open={openSections.details} onToggle={() => toggleSection('details')}>
            <div className="space-y-4">
              <Field label="Product Name" required>
                <input className={inputCls} value={form.productInfo.name} onChange={e => setInfo('name', e.target.value)} placeholder="e.g. Airless Pump Bottle 50ml" />
              </Field>
              <Field label="Description" required>
                <textarea className={textareaCls} rows={4} value={form.productInfo.description} onChange={e => setInfo('description', e.target.value)} placeholder="Describe the product…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Base Price (USD)" required>
                  <input className={inputCls} type="number" step="0.01" value={form.productInfo.price} onChange={e => setInfo('price', e.target.value)} />
                </Field>
                <Field label="Minimum Order Qty">
                  <input className={inputCls} type="number" value={form.productInfo.minimumOrderQuantity} onChange={e => setInfo('minimumOrderQuantity', parseInt(e.target.value))} />
                </Field>
                <Field label="Available Quantity">
                  <input className={inputCls} type="number" value={form.productInfo.availableQuantity} onChange={e => setInfo('availableQuantity', parseInt(e.target.value))} />
                </Field>
              </div>
              {/* Features */}
              <Field label="Features">
                <div className="flex gap-2 mb-2">
                  <input className={inputCls} value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newFeature.trim()) { setInfo('features', [...form.productInfo.features, newFeature.trim()]); setNewFeature(''); } } }} placeholder="Type a feature and press Enter" />
                  <button type="button" className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => { if (newFeature.trim()) { setInfo('features', [...form.productInfo.features, newFeature.trim()]); setNewFeature(''); } }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.productInfo.features.map((f: string, i: number) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {f}
                      <button type="button" onClick={() => setInfo('features', form.productInfo.features.filter((_: string, j: number) => j !== i))}>
                        <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
              </Field>
              {/* Lead time */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Standard Lead (days)"><input className={inputCls} type="number" value={form.productInfo.standardLeadTime} onChange={e => setInfo('standardLeadTime', e.target.value)} /></Field>
                <Field label="Custom Lead (days)"><input className={inputCls} type="number" value={form.productInfo.customLeadTime} onChange={e => setInfo('customLeadTime', e.target.value)} /></Field>
                <Field label="Rush Lead (days)"><input className={inputCls} type="number" value={form.productInfo.rushLeadTime} onChange={e => setInfo('rushLeadTime', e.target.value)} /></Field>
              </div>
            </div>
          </Section>

          {/* ── Specifications ─────────────── */}
          <Section title="Specifications" open={openSections.specifications} onToggle={() => toggleSection('specifications')}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Color"><input className={inputCls} value={form.productInfo.color} onChange={e => setInfo('color', e.target.value)} /></Field>
                <Field label="Finish"><input className={inputCls} value={form.productInfo.finish} onChange={e => setInfo('finish', e.target.value)} /></Field>
                <Field label="Closure"><input className={inputCls} value={form.productInfo.closure} onChange={e => setInfo('closure', e.target.value)} /></Field>
              </div>
              {/* Capacity */}
              <Field label="Capacity">
                <div className="flex gap-2">
                  <input className={inputCls} type="number" value={form.productInfo.capacity} onChange={e => setInfo('capacity', e.target.value)} placeholder="Value" />
                  <select className={inputCls + ' w-24'} value={form.productInfo.capacityUnit} onChange={e => setInfo('capacityUnit', e.target.value)}>
                    {['ml', 'oz', 'L', 'g', 'kg'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Field>
              {/* Dimensions */}
              <Field label="Dimensions (H×W×D or H×Ø)">
                <div className="flex gap-2 flex-wrap">
                  <input className={inputCls + ' w-20'} type="number" placeholder="H" value={form.productInfo.height} onChange={e => setInfo('height', e.target.value)} />
                  <input className={inputCls + ' w-20'} type="number" placeholder="W" value={form.productInfo.width} onChange={e => setInfo('width', e.target.value)} />
                  <input className={inputCls + ' w-20'} type="number" placeholder="D" value={form.productInfo.depth} onChange={e => setInfo('depth', e.target.value)} />
                  <input className={inputCls + ' w-20'} type="number" placeholder="Ø (dia)" value={form.productInfo.diameter || ''} onChange={e => setInfo('diameter', e.target.value)} />
                  <select className={inputCls + ' w-20'} value={form.productInfo.dimensionUnit} onChange={e => setInfo('dimensionUnit', e.target.value)}>
                    {['mm', 'cm', 'in'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Use W×D for boxes, Ø (diameter) for cylinders</p>
              </Field>
              {/* Weight */}
              <Field label="Weight">
                <div className="flex gap-2">
                  <input className={inputCls} type="number" value={form.productInfo.weight} onChange={e => setInfo('weight', e.target.value)} placeholder="Value" />
                  <select className={inputCls + ' w-24'} value={form.productInfo.weightUnit} onChange={e => setInfo('weightUnit', e.target.value)}>
                    {['g', 'kg', 'oz', 'lb'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Field>
              {/* Dynamic specs */}
              <Field label="Custom Specifications">
                <div className="space-y-2 mb-3">
                  {form.dynamicSpecs.map((spec: AIDynamicSpec, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <span className="text-sm flex-1">{spec.name}: <strong>{spec.value}</strong>{spec.unit ? ` ${spec.unit}` : ''}</span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{spec.category}</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, dynamicSpecs: f.dynamicSpecs.filter((_: AIDynamicSpec, j: number) => j !== i) }))}>
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Spec name" value={newSpec.name} onChange={e => setNewSpec(s => ({ ...s, name: e.target.value }))} />
                  <input className={inputCls} placeholder="Value" value={newSpec.value} onChange={e => setNewSpec(s => ({ ...s, value: e.target.value }))} />
                  <input className={inputCls} placeholder="Unit (optional)" value={newSpec.unit} onChange={e => setNewSpec(s => ({ ...s, unit: e.target.value }))} />
                  <select className={inputCls} value={newSpec.category} onChange={e => setNewSpec(s => ({ ...s, category: e.target.value as AIDynamicSpec['category'] }))}>
                    {['physical', 'material', 'technical', 'custom'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => { if (newSpec.name && newSpec.value) { setForm(f => ({ ...f, dynamicSpecs: [...f.dynamicSpecs, { ...newSpec }] })); setNewSpec({ name: '', value: '', unit: '', category: 'custom' }); } }} className="mt-2 text-sm text-berlin-red-600 hover:text-berlin-red-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add spec
                </button>
              </Field>
            </div>
          </Section>

          {/* ── Category Filters ─────────────── */}
          <Section title="Category Filters" open={openSections.filters} onToggle={() => toggleSection('filters')} badge={`${Object.values(form.selectedCategoryFilters).flat().length + Object.values(form.selectedCommonFilters).flat().length} selected`}>
            {categoryFiltersList.length === 0 && <p className="text-sm text-gray-400">No category-specific filters for {form.selectedCategory || 'this category'}.</p>}
            {categoryFiltersList.map((filter: any) => (
              <div key={filter.name} className="mb-4">
                <p className="font-medium text-sm text-gray-700 mb-2">{filter.name}</p>
                {filter.type === 'checkbox-group' && filter.options && (
                  <div className="flex flex-wrap gap-2">
                    {filter.options.map((opt: string) => {
                      const checked = (form.selectedCategoryFilters[filter.name] || []).includes(opt);
                      return (
                        <label key={opt} className={`px-3 py-1.5 text-sm border rounded-lg cursor-pointer ${checked ? 'bg-berlin-red-50 border-berlin-red-400 text-berlin-red-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleCheckboxFilter('selectedCategoryFilters', filter.name, opt)} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {/* Common filters – Material & Sustainability */}
            {(commonFilters as any).filters.filter((f: any) => f.name === 'Sustainability' || f.name === 'Material').map((filter: any) => (
              <div key={filter.name} className="mb-4">
                <p className="font-medium text-sm text-gray-700 mb-2">{filter.name}</p>
                {filter.options && (
                  <div className="flex flex-wrap gap-2">
                    {filter.options.map((opt: string) => {
                      const checked = (form.selectedCommonFilters[filter.name] || []).includes(opt);
                      return (
                        <label key={opt} className={`px-3 py-1.5 text-sm border rounded-lg cursor-pointer ${checked ? 'bg-berlin-red-50 border-berlin-red-400 text-berlin-red-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleCheckboxFilter('selectedCommonFilters', filter.name, opt)} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                )}
                {filter.groups && filter.groups.map((group: any) => (
                  <div key={group.groupName} className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">{group.groupName}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt: string) => {
                        const checked = (form.selectedCommonFilters[filter.name] || []).includes(opt);
                        return (
                          <label key={opt} className={`px-3 py-1.5 text-sm border rounded-lg cursor-pointer ${checked ? 'bg-berlin-red-50 border-berlin-red-400 text-berlin-red-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleCheckboxFilter('selectedCommonFilters', filter.name, opt)} />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </Section>

          {/* ── Images ───────────────────────── */}
          <Section title="Product Images" open={openSections.images} onToggle={() => toggleSection('images')}>
            {/* Page image preview */}
            {product.pageImageUrl && form.uploadedImages.length === 0 && (
              <div className="mb-4 border-2 border-dashed border-berlin-red-200 rounded-xl p-4 bg-berlin-red-50">
                <p className="text-xs font-medium text-berlin-red-700 mb-2 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Source page image (from your document)
                </p>
                <div className="flex items-start gap-4">
                  <img src={product.pageImageUrl} alt="Source page" className="w-32 h-auto rounded-lg shadow border border-gray-200 object-cover" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Use the page image from your document as the product photo, or upload a proper product image below.</p>
                    <button type="button" onClick={() => {
                      // Use the Cloudinary URL directly
                      setForm(f => ({ ...f, uploadedImages: [product.pageImageUrl!] }));
                    }} className="text-sm px-3 py-1.5 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700">
                      Use this image
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Image grid */}
            {form.uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {form.uploadedImages.map((url: string, i: number) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`img ${i}`} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, uploadedImages: f.uploadedImages.filter((_: string, j: number) => j !== i) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={`flex items-center gap-2 px-4 py-2.5 text-sm border-2 border-dashed rounded-lg cursor-pointer ${uploadingImage ? 'opacity-50' : 'hover:bg-gray-50 border-gray-300'}`}>
              <ImageIcon className="w-4 h-4 text-gray-500" />
              {uploadingImage ? 'Uploading…' : 'Upload product images'}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
            </label>
          </Section>

          {/* ── Eco Score ────────────────────── */}
          <Section title="Environmental Impact" open={openSections.ecoScore} onToggle={() => toggleSection('ecoScore')} badge={`Score: ${form.ecoScore}`}>
            <div className="space-y-4">
              {[
                { key: 'recyclability', label: 'Recyclability' },
                { key: 'carbonFootprint', label: 'Carbon Footprint' },
                { key: 'sustainableMaterials', label: 'Sustainable Materials' },
                { key: 'localSourcing', label: 'Local Sourcing' },
              ].map(({ key, label }) => (
                <Field key={key} label={`${label}: ${form.ecoScoreDetails[key as keyof typeof form.ecoScoreDetails]}`}>
                  <input type="range" min={0} max={100} className="w-full accent-berlin-red-600" value={form.ecoScoreDetails[key as keyof typeof form.ecoScoreDetails]} onChange={e => setForm(f => ({ ...f, ecoScoreDetails: { ...f.ecoScoreDetails, [key]: parseInt(e.target.value) } }))} />
                </Field>
              ))}
              <button type="button" onClick={calculateEcoScore} className="flex items-center gap-2 px-4 py-2 bg-berlin-red-600 text-white text-sm rounded-lg hover:bg-berlin-red-700">
                <RefreshCw className="w-4 h-4" /> Calculate Eco Score
              </button>
              {form.ecoScore > 0 && (
                <div className={`text-2xl font-bold ${form.ecoScore >= 70 ? 'text-green-600' : form.ecoScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  Eco Score: {form.ecoScore}/100
                </div>
              )}
            </div>
          </Section>

          {/* ── Sustainability ───────────────── */}
          <Section title="Sustainability Features" open={openSections.sustainability} onToggle={() => toggleSection('sustainability')}>
            <div className="space-y-3">
              <Field label="Recycled Content (%)">
                <input className={inputCls} type="number" min={0} max={100} value={form.sustainability.recycledContent} onChange={e => setForm(f => ({ ...f, sustainability: { ...f.sustainability, recycledContent: parseInt(e.target.value) || 0 } }))} />
              </Field>
              {(['biodegradable', 'compostable', 'refillable', 'sustainableSourcing', 'carbonNeutral'] as const).map(key => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-berlin-red-600" checked={form.sustainability[key]} onChange={e => setForm(f => ({ ...f, sustainability: { ...f.sustainability, [key]: e.target.checked } }))} />
                  <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* ── Certifications ───────────────── */}
          <Section title="Certifications" open={openSections.certifications} onToggle={() => toggleSection('certifications')} badge={form.certifications.length > 0 ? `${form.certifications.length}` : undefined}>
            <div className="space-y-3 mb-4">
              {form.certifications.map((cert: AICertification, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1 text-sm">
                    <strong>{cert.name}</strong>
                    {cert.certificationBody && <span className="text-gray-500"> · {cert.certificationBody}</span>}
                    {cert.validUntil && <span className="text-gray-400 text-xs ml-2">Expires {cert.validUntil}</span>}
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, certifications: f.certifications.filter((_: AICertification, j: number) => j !== i) }))}>
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Certification name" value={newCert.name} onChange={e => setNewCert(c => ({ ...c, name: e.target.value }))} />
              <input className={inputCls} placeholder="Issuing body" value={newCert.certificationBody || ''} onChange={e => setNewCert(c => ({ ...c, certificationBody: e.target.value }))} />
              <input className={inputCls} type="date" placeholder="Valid until" value={newCert.validUntil || ''} onChange={e => setNewCert(c => ({ ...c, validUntil: e.target.value }))} />
              <input className={inputCls} placeholder="Certificate number" value={newCert.certificateNumber || ''} onChange={e => setNewCert(c => ({ ...c, certificateNumber: e.target.value }))} />
            </div>
            <button type="button" onClick={() => { if (newCert.name) { setForm(f => ({ ...f, certifications: [...f.certifications, { name: newCert.name, certificationBody: newCert.certificationBody ?? '', validUntil: newCert.validUntil ?? '', certificateNumber: newCert.certificateNumber ?? '' }] })); setNewCert({ name: '', certificationBody: '', validUntil: '', certificateNumber: '' }); } }} className="mt-2 text-sm text-berlin-red-600 hover:text-berlin-red-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add certification
            </button>
          </Section>

          {/* ── Product Highlights ───────────── */}
          <Section title="Product Highlights & Advantages" open={openSections.highlights} onToggle={() => toggleSection('highlights')}>
            <div className="space-y-4">
              <Field label="Product Highlights (AI-generated summary)">
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="2-3 sentences describing why this product stands out..."
                  value={(form as any).productHighlights ?? ''}
                  onChange={e => setForm((f: any) => ({ ...f, productHighlights: e.target.value }))}
                />
              </Field>
              <Field label="Key Advantages">
                <div className="flex flex-wrap gap-2 mb-2">
                  {((form as any).keyAdvantages ?? []).map((adv: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
                      {adv}
                      <button type="button" onClick={() => setForm((f: any) => ({ ...f, keyAdvantages: f.keyAdvantages.filter((_: string, j: number) => j !== i) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Add advantage (e.g. 30% lighter than glass)"
                    id="newAdvantage"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) { setForm((f: any) => ({ ...f, keyAdvantages: [...(f.keyAdvantages || []), val] })); (e.target as HTMLInputElement).value = ''; }
                      }
                    }}
                  />
                  <button type="button" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => {
                    const el = document.getElementById('newAdvantage') as HTMLInputElement;
                    if (el?.value.trim()) { setForm((f: any) => ({ ...f, keyAdvantages: [...(f.keyAdvantages || []), el.value.trim()] })); el.value = ''; }
                  }}><Plus className="w-4 h-4" /></button>
                </div>
              </Field>
              <Field label="Discovery Tags">
                <div className="flex flex-wrap gap-2 mb-2">
                  {((form as any).tags ?? []).map((tag: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">
                      #{tag}
                      <button type="button" onClick={() => setForm((f: any) => ({ ...f, tags: f.tags.filter((_: string, j: number) => j !== i) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Add tag (e.g. eco-friendly, travel-size, food-grade)"
                    id="newTag"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) { setForm((f: any) => ({ ...f, tags: [...(f.tags || []), val] })); (e.target as HTMLInputElement).value = ''; }
                      }
                    }}
                  />
                  <button type="button" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => {
                    const el = document.getElementById('newTag') as HTMLInputElement;
                    if (el?.value.trim()) { setForm((f: any) => ({ ...f, tags: [...(f.tags || []), el.value.trim()] })); el.value = ''; }
                  }}><Plus className="w-4 h-4" /></button>
                </div>
              </Field>
            </div>
          </Section>

          {/* ── Target Industries & End Use ─── */}
          <Section title="Target Industries & End Use" open={openSections.targeting} onToggle={() => toggleSection('targeting')} badge={`${((form as any).targetIndustries?.length ?? 0) + ((form as any).endUse?.length ?? 0)} selected`}>
            <div className="space-y-4">
              <Field label="Target Industries">
                <div className="grid grid-cols-2 gap-2">
                  {['food-beverage','pharmaceuticals','cosmetics-beauty','personal-care','household','industrial','chemicals','nutraceuticals','pet-care','cannabis','other'].map(ind => (
                    <label key={ind} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-berlin-red-600" checked={((form as any).targetIndustries ?? []).includes(ind)} onChange={() => toggleArrayField('targetIndustries', ind)} />
                      <span className="text-sm text-gray-700 capitalize">{ind.replace(/-/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Use Cases (specific applications)">
                <div className="flex flex-wrap gap-2 mb-2">
                  {((form as any).useCases ?? []).map((uc: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full border border-purple-200">
                      {uc}
                      <button type="button" onClick={() => setForm((f: any) => ({ ...f, useCases: f.useCases.filter((_: string, j: number) => j !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className={inputCls} placeholder="Add use case (e.g. shampoo, face serum)" id="newUseCase"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val) { setForm((f: any) => ({ ...f, useCases: [...(f.useCases || []), val] })); (e.target as HTMLInputElement).value = ''; } } }} />
                  <button type="button" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => { const el = document.getElementById('newUseCase') as HTMLInputElement; if (el?.value.trim()) { setForm((f: any) => ({ ...f, useCases: [...(f.useCases || []), el.value.trim()] })); el.value = ''; } }}><Plus className="w-4 h-4" /></button>
                </div>
              </Field>
              <Field label="End Use">
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {['Body Lotion','Body Oil','Body Scrub','Body Wash','Deodorant','Hand Cream','Hand Soap','Fragrance','Eye','Face Cleanser','Face Moisturizer','Face Serum','Lip','Toner','Hair Oil','Hair Spray','Hair Treatment','Shampoo Conditioner','Dish Soap','Laundry Detergent','Surface Cleaners','Carbonated Beverage','Juice','Liquor','Milk','Water','Wine','Dry Foods And Spreads','Oils','Sauces'].map(eu => (
                    <label key={eu} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 text-berlin-red-600" checked={((form as any).endUse ?? []).includes(eu)} onChange={() => toggleArrayField('endUse', eu)} />
                      <span className="text-xs text-gray-700">{eu}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          {/* ── Compliance ─────────────────── */}
          <Section title="Compliance & Regulations" open={openSections.compliance} onToggle={() => toggleSection('compliance')} badge={Object.values((form as any).compliance ?? {}).filter(Boolean).length > 0 ? `${Object.values((form as any).compliance ?? {}).filter(Boolean).length} active` : undefined}>
            <div className="grid grid-cols-2 gap-3">
              {([['fdaApproved', 'FDA Approved'], ['euCompliant', 'EU Compliant'], ['reach', 'REACH Compliant'], ['rohs', 'RoHS Compliant']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" className="w-4 h-4 text-berlin-red-600"
                    checked={(form as any).compliance?.[key] ?? false}
                    onChange={e => setForm((f: any) => ({ ...f, compliance: { ...(f.compliance || {}), [key]: e.target.checked } }))}
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* ── Customization ───────────────── */}
          <Section title="Customization" open={openSections.customization} onToggle={() => toggleSection('customization')}>
            <div className="space-y-3">
              {(['printingAvailable', 'labelingAvailable', 'customSizes'] as const).map(key => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-berlin-red-600" checked={form.customization[key]} onChange={e => setForm(f => ({ ...f, customization: { ...f.customization, [key]: e.target.checked } }))} />
                  <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </Section>

        </div>

        {/* Footer save button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-2xl px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
