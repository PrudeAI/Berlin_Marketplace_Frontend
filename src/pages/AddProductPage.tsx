import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Import data files
import broaderCategories from '../data/broaderCategories.json';
import categorySpecificFilters from '../data/categorySpecificFilters.json';
import commonFilters from '../data/commonFilters.json';
import specificationTemplates from '../data/specificationTemplates.json';
const API_URL= import.meta.env.VITE_API_URL || 'http://localhost:5000';


const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form data state
  const [selectedBroaderCategory, setSelectedBroaderCategory] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categorySpecificFiltersList, setCategorySpecificFiltersList] = useState<any[]>([]);
  const [commonFiltersList, setCommonFiltersList] = useState<any[]>([]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<{ [key: string]: any }>({});
  const [selectedCommonFilters, setSelectedCommonFilters] = useState<{ [key: string]: any }>({});
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [ecoScore, setEcoScore] = useState<number>(0);
  const [ecoScoreDetails, setEcoScoreDetails] = useState({
    recyclability: 0,
    carbonFootprint: 0,
    sustainableMaterials: 0,
    localSourcing: 0,
    certifications: [] as string[]
  });
  
  const [productInfo, setProductInfo] = useState({
    name: '',
    supplierName: '',
    description: '',
    price: '',
    minimumOrderQuantity: 1,
    availableQuantity: 100,
    features: [] as string[],
    // Legacy fields for backward compatibility
    capacity: '',
    capacityUnit: 'ml',
    height: '',
    width: '',
    depth: '',
    dimensionUnit: 'mm',
    weight: '',
    weightUnit: 'g',
    color: '',
    finish: '',
    closure: '',
    // Lead time
    standardLeadTime: '',
    customLeadTime: '',
    rushLeadTime: '',
    // SEO
    metaTitle: '',
    metaDescription: '',
    keywords: [] as string[]
  });

  // Dynamic specifications
  const [dynamicSpecs, setDynamicSpecs] = useState<Array<{
    name: string;
    value: string | number;
    unit?: string;
    category: 'physical' | 'material' | 'technical' | 'custom';
    displayOrder: number;
    isRequired: boolean;
  }>>([]);

  const [newDynamicSpec, setNewDynamicSpec] = useState({
    name: '',
    value: '',
    unit: '',
    category: 'custom' as 'physical' | 'material' | 'technical' | 'custom',
    isRequired: false
  });

  const [showTemplates, setShowTemplates] = useState(false);

  const [sustainability, setSustainability] = useState({
    recycledContent: 0,
    biodegradable: false,
    compostable: false,
    refillable: false,
    sustainableSourcing: false,
    carbonNeutral: false
  });

  const [sustainabilityCertificates, setSustainabilityCertificates] = useState<{
    [key: string]: string
  }>({});

  const [certifications, setCertifications] = useState<Array<{
    name: string;
    certificationBody?: string;
    validUntil?: string;
    certificateNumber?: string;
  }>>([]);

  const [customization, setCustomization] = useState({
    printingAvailable: false,
    labelingAvailable: false,
    colorOptions: [] as string[],
    printingMethods: [] as string[],
    customSizes: false
  });

  const [newFeature, setNewFeature] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newColorOption, setNewColorOption] = useState('');
  const [newPrintingMethod, setNewPrintingMethod] = useState('');
  const [newCertification, setNewCertification] = useState({
    name: '',
    certificationBody: '',
    validUntil: '',
    certificateNumber: ''
  });

  // Update available categories when broader category changes
  useEffect(() => {
    if (selectedBroaderCategory) {
      const categoryData = broaderCategories.broader_categories.find((cat: any) => cat.name === selectedBroaderCategory);
      setAvailableCategories(categoryData?.categories || []);
      setSelectedCategory('');
      setCategorySpecificFiltersList([]);
      setCommonFiltersList([]);
    }
  }, [selectedBroaderCategory]);

  // Update filters when category changes
  useEffect(() => {
    if (selectedCategory) {
      // Get category-specific filters
      const categoryFilter = categorySpecificFilters.categories.find((cf: any) => cf.category === selectedCategory);
      setCategorySpecificFiltersList(categoryFilter?.filters || []);
      
      // Get common filters
      setCommonFiltersList(commonFilters.filters || []);
      
      // Reset filter selections
      setSelectedCategoryFilters({});
      setSelectedCommonFilters({});
    }
  }, [selectedCategory]);

  // Remove automatic eco score calculation since we'll use interactive sliders
  // useEffect(() => {
  //   ... automatic calculation removed
  // }, [selectedCategoryFilters, selectedCommonFilters, uploadedImages]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    console.log(`Starting upload of ${files.length} file(s)`);
    setUploadingImage(true);
    const uploadedUrls: string[] = [];

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dit8gwqom';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ecopack';
    
    console.log('Cloudinary config:', { cloudName, uploadPreset });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading file ${i + 1}:`, file.name, file.type, file.size);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        console.log('Upload URL:', uploadUrl);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
          console.log('Successfully uploaded:', data.secure_url);
        } else {
          console.error('No secure_url in response:', data);
          if (data.error) {
            alert(`Upload failed: ${data.error.message}`);
          }
        }
      }
      
      console.log('All uploads completed. URLs:', uploadedUrls);
      setUploadedImages([...uploadedImages, ...uploadedUrls]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSustainabilityCertificateUpload = async (featureName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`Starting upload of certificate for ${featureName}:`, file.name);
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dit8gwqom';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ecopack';
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.secure_url) {
        setSustainabilityCertificates(prev => ({
          ...prev,
          [featureName]: data.secure_url
        }));
        console.log(`Certificate uploaded successfully for ${featureName}:`, data.secure_url);
      } else {
        console.error('No secure_url in response:', data);
        alert(`Certificate upload failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Certificate upload failed:', error);
      alert(`Certificate upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Get the auth token using the proper key
      const token = localStorage.getItem('supplier_token');
      
      const productData = {
        name: productInfo.name,
        supplierName: productInfo.supplierName.trim() || undefined,
        description: productInfo.description,
        broaderCategory: selectedBroaderCategory,
        category: selectedCategory,
        images: uploadedImages,
        primaryImage: uploadedImages[0] || null,
        features: productInfo.features,
        specifications: {
          // Legacy fields for backward compatibility
          material: (selectedCategoryFilters['Material'] || selectedCommonFilters['Material'] || ['Not specified']).join(', '),
          capacity: productInfo.capacity ? {
            value: parseFloat(productInfo.capacity),
            unit: productInfo.capacityUnit
          } : undefined,
          dimensions: {
            height: parseFloat(productInfo.height) || undefined,
            width: parseFloat(productInfo.width) || undefined,
            depth: parseFloat(productInfo.depth) || undefined,
            unit: productInfo.dimensionUnit
          },
          weight: productInfo.weight ? {
            value: parseFloat(productInfo.weight),
            unit: productInfo.weightUnit
          } : undefined,
          color: productInfo.color || undefined,
          finish: productInfo.finish || undefined,
          closure: productInfo.closure || undefined,
          minimumOrderQuantity: productInfo.minimumOrderQuantity,
          availableQuantity: productInfo.availableQuantity,
          
          // Dynamic specifications
          dynamicSpecs: dynamicSpecs
        },
        pricing: {
          basePrice: parseFloat(productInfo.price),
          currency: 'USD'
        },
        ecoScore: ecoScore,
        ecoScoreDetails: ecoScoreDetails,
        sustainability: sustainability,
        certifications: certifications,
        customization: customization,
        leadTime: {
          standard: productInfo.standardLeadTime ? parseInt(productInfo.standardLeadTime) : undefined,
          custom: productInfo.customLeadTime ? parseInt(productInfo.customLeadTime) : undefined,
          rush: productInfo.rushLeadTime ? parseInt(productInfo.rushLeadTime) : undefined
        },
        seo: {
          metaTitle: productInfo.metaTitle || undefined,
          metaDescription: productInfo.metaDescription || undefined,
          keywords: productInfo.keywords,
          slug: productInfo.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        },
        categoryFilters: selectedCategoryFilters,
        commonFilters: selectedCommonFilters
      };

      console.log('Sending product data:', productData);

      const response = await fetch(`${API_URL}/api/dashboard/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      console.log('Product creation response:', result);
      
      if (response.ok && result.message) {
        alert('Product created successfully!');
        navigate('/products/filter/all');
      } else {
        console.error('Product creation failed:', result);
        alert(`Failed to create product: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1: return selectedBroaderCategory !== '';
      case 2: return selectedCategory !== '';
      case 3: return categorySpecificFiltersList.length === 0 || Object.keys(selectedCategoryFilters).length > 0;
      case 4: return commonFiltersList.length === 0 || Object.keys(selectedCommonFilters).length > 0;
      case 5: return true; // Images are optional
      case 6: return ecoScore > 0; // Eco score must be calculated
      case 7: return productInfo.name !== '' && productInfo.description !== '' && productInfo.price !== '';
      default: return true;
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
          <div
            key={step}
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step <= currentStep
                ? 'bg-berlin-red-600 border-berlin-red-600 text-white'
                : 'border-berlin-gray-300 text-berlin-gray-400'
            }`}
          >
            {step}
          </div>
        ))}
      </div>
      <div className="w-full bg-berlin-gray-200 rounded-full h-2">
        <div
          className="bg-berlin-red-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 7) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-berlin-gray-500 mt-2">
        <span>Category</span>
        <span>Subcategory</span>
        <span>Category Filters</span>
        <span>Common Filters</span>
        <span>Images</span>
        <span>Eco Score</span>
        <span>Details</span>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 1: Select Broader Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {broaderCategories.broader_categories.map((category: any) => (
                <div
                  key={category.name}
                  onClick={() => setSelectedBroaderCategory(category.name)}
                  className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedBroaderCategory === category.name
                      ? 'border-berlin-red-500 bg-berlin-red-50'
                      : 'border-berlin-gray-300 hover:border-berlin-red-300'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-berlin-gray-900 mb-2">{category.name}</h3>
                  <p className="text-berlin-gray-600 text-sm">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 2: Select Subcategory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCategories.map((category) => (
                <div
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    selectedCategory === category
                      ? 'border-berlin-red-500 bg-berlin-red-50'
                      : 'border-berlin-gray-300 hover:border-berlin-red-300'
                  }`}
                >
                  <span className="text-berlin-gray-900 font-medium">{category}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 3: Category-Specific Filters</h2>
            {categorySpecificFiltersList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-berlin-gray-500">No category-specific filters available for {selectedCategory}.</p>
                <p className="text-sm text-berlin-gray-400 mt-2">Click Next to continue to common filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categorySpecificFiltersList.map((filter: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <label className="block text-lg font-medium text-berlin-gray-700 mb-4">
                      {filter.name}
                    </label>
                    
                    {/* Handle checkbox-group with options */}
                    {filter.type === 'checkbox-group' && filter.options && (
                      <div className="space-y-3">
                        {filter.options.map((option: string) => {
                          const isSelected = selectedCategoryFilters[filter.name]?.includes(option) || false;
                          return (
                            <label key={option} className="flex items-center space-x-3 p-3 border rounded hover:bg-berlin-red-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const currentSelections = selectedCategoryFilters[filter.name] || [];
                                  let updatedSelections;
                                  if (e.target.checked) {
                                    updatedSelections = [...currentSelections, option];
                                  } else {
                                    updatedSelections = currentSelections.filter((item: any) => item !== option);
                                  }
                                  setSelectedCategoryFilters({
                                    ...selectedCategoryFilters,
                                    [filter.name]: updatedSelections
                                  });
                                }}
                                className="w-4 h-4 text-berlin-red-600"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Handle checkbox-group with groups */}
                    {filter.type === 'checkbox-group' && filter.groups && (
                      <div className="space-y-6">
                        {filter.groups.map((group: any, groupIndex: number) => (
                          <div key={groupIndex}>
                            <h3 className="font-medium mb-3 text-berlin-gray-800">{group.groupName}</h3>
                            <div className="space-y-2">
                              {group.options.map((option: any, optionIndex: number) => {
                                const optionValue = typeof option === 'string' ? option : option.name;
                                const isSelected = selectedCategoryFilters[filter.name]?.includes(optionValue) || false;
                                return (
                                  <label key={optionIndex} className="flex items-center space-x-3 p-2 border rounded hover:bg-berlin-red-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const currentSelections = selectedCategoryFilters[filter.name] || [];
                                        let updatedSelections;
                                        if (e.target.checked) {
                                          updatedSelections = [...currentSelections, optionValue];
                                        } else {
                                          updatedSelections = currentSelections.filter((item: any) => item !== optionValue);
                                        }
                                        setSelectedCategoryFilters({
                                          ...selectedCategoryFilters,
                                          [filter.name]: updatedSelections
                                        });
                                      }}
                                      className="w-4 h-4 text-berlin-red-600"
                                    />
                                    <span>{optionValue}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Handle dropdown filters */}
                    {filter.type === 'dropdown' && (
                      <select
                        value={selectedCategoryFilters[filter.name]?.[0] || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedCategoryFilters({
                              ...selectedCategoryFilters,
                              [filter.name]: [e.target.value]
                            });
                          }
                        }}
                        className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      >
                        <option value="">Select {filter.name}</option>
                        {filter.options?.map((option: string) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}

                    {/* Handle range filters */}
                    {filter.type === 'range' && (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Minimum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Min value"
                              onChange={(e) => {
                                const currentSelections = selectedCategoryFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Min:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Min: ${e.target.value}`);
                                }
                                setSelectedCategoryFilters({
                                  ...selectedCategoryFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Maximum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Max value"
                              onChange={(e) => {
                                const currentSelections = selectedCategoryFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Max:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Max: ${e.target.value}`);
                                }
                                setSelectedCategoryFilters({
                                  ...selectedCategoryFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Handle range-or-exact filters */}
                    {filter.type === 'range-or-exact' && (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Minimum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Min value"
                              onChange={(e) => {
                                const currentSelections = selectedCategoryFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Min:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Min: ${e.target.value}`);
                                }
                                setSelectedCategoryFilters({
                                  ...selectedCategoryFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Maximum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Max value"
                              onChange={(e) => {
                                const currentSelections = selectedCategoryFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Max:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Max: ${e.target.value}`);
                                }
                                setSelectedCategoryFilters({
                                  ...selectedCategoryFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show selected count for current filter */}
                    {selectedCategoryFilters[filter.name] && selectedCategoryFilters[filter.name].length > 0 && (
                      <div className="mt-3 text-sm text-berlin-red-600">
                        Selected: {selectedCategoryFilters[filter.name].length} item(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 4: Common Filters</h2>
            {commonFiltersList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-berlin-gray-500">No common filters available.</p>
                <p className="text-sm text-berlin-gray-400 mt-2">Click Next to continue to image upload.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {commonFiltersList.map((filter: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <label className="block text-lg font-medium text-berlin-gray-700 mb-4">
                      {filter.name}
                    </label>
                    
                    {/* Handle checkbox-group with options */}
                    {filter.type === 'checkbox-group' && filter.options && (
                      <div className="space-y-3">
                        {filter.options.map((option: string) => {
                          const isSelected = selectedCommonFilters[filter.name]?.includes(option) || false;
                          return (
                            <label key={option} className="flex items-center space-x-3 p-3 border rounded hover:bg-berlin-red-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const currentSelections = selectedCommonFilters[filter.name] || [];
                                  let updatedSelections;
                                  if (e.target.checked) {
                                    updatedSelections = [...currentSelections, option];
                                  } else {
                                    updatedSelections = currentSelections.filter((item: any) => item !== option);
                                  }
                                  setSelectedCommonFilters({
                                    ...selectedCommonFilters,
                                    [filter.name]: updatedSelections
                                  });
                                }}
                                className="w-4 h-4 text-berlin-red-600"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Handle checkbox-group with groups */}
                    {filter.type === 'checkbox-group' && filter.groups && (
                      <div className="space-y-6">
                        {filter.groups.map((group: any, groupIndex: number) => (
                          <div key={groupIndex}>
                            <h3 className="font-medium mb-3 text-berlin-gray-800">{group.groupName}</h3>
                            <div className="space-y-2">
                              {group.options.map((option: any, optionIndex: number) => {
                                const optionValue = typeof option === 'string' ? option : option.name;
                                const isSelected = selectedCommonFilters[filter.name]?.includes(optionValue) || false;
                                return (
                                  <label key={optionIndex} className="flex items-center space-x-3 p-2 border rounded hover:bg-berlin-red-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const currentSelections = selectedCommonFilters[filter.name] || [];
                                        let updatedSelections;
                                        if (e.target.checked) {
                                          updatedSelections = [...currentSelections, optionValue];
                                        } else {
                                          updatedSelections = currentSelections.filter((item: any) => item !== optionValue);
                                        }
                                        setSelectedCommonFilters({
                                          ...selectedCommonFilters,
                                          [filter.name]: updatedSelections
                                        });
                                      }}
                                      className="w-4 h-4 text-berlin-red-600"
                                    />
                                    <span>{optionValue}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Handle location-group filters */}
                    {filter.type === 'location-group' && (
                      <div className="space-y-6">
                        {/* Toggle options (Manufacturing/Warehousing) */}
                        {filter.toggleOptions && (
                          <div className="mb-4">
                            <div className="flex space-x-4">
                              {filter.toggleOptions.map((toggle: string) => (
                                <button
                                  key={toggle}
                                  type="button"
                                  onClick={() => {
                                    const currentSelections = selectedCommonFilters[filter.name] || [];
                                    const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Toggle:'));
                                    updatedSelections.push(`Toggle: ${toggle}`);
                                    setSelectedCommonFilters({
                                      ...selectedCommonFilters,
                                      [filter.name]: updatedSelections
                                    });
                                  }}
                                  className={`px-4 py-2 rounded-lg border ${
                                    selectedCommonFilters[filter.name]?.some((item: string) => item === `Toggle: ${toggle}`) 
                                      ? 'bg-berlin-red-500 text-white border-berlin-red-500' 
                                      : 'bg-white text-berlin-gray-700 border-berlin-gray-300 hover:bg-berlin-gray-50'
                                  }`}
                                >
                                  {toggle}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Location groups */}
                        {filter.groups && filter.groups.map((group: any, groupIndex: number) => (
                          <div key={groupIndex}>
                            <h3 className="font-medium mb-3 text-berlin-gray-800">{group.groupName}</h3>
                            <div className="space-y-2">
                              {group.options.map((option: any, optionIndex: number) => {
                                const optionValue = typeof option === 'string' ? option : option.name;
                                const isSelected = selectedCommonFilters[filter.name]?.includes(optionValue) || false;
                                return (
                                  <label key={optionIndex} className="flex items-center space-x-3 p-2 border rounded hover:bg-berlin-red-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const currentSelections = selectedCommonFilters[filter.name] || [];
                                        let updatedSelections;
                                        if (e.target.checked) {
                                          updatedSelections = [...currentSelections, optionValue];
                                        } else {
                                          updatedSelections = currentSelections.filter((item: any) => item !== optionValue);
                                        }
                                        setSelectedCommonFilters({
                                          ...selectedCommonFilters,
                                          [filter.name]: updatedSelections
                                        });
                                      }}
                                      className="w-4 h-4 text-berlin-red-600"
                                    />
                                    <span>{optionValue}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Handle dropdown filters */}
                    {filter.type === 'dropdown' && (
                      <select
                        value={selectedCommonFilters[filter.name]?.[0] || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedCommonFilters({
                              ...selectedCommonFilters,
                              [filter.name]: [e.target.value]
                            });
                          }
                        }}
                        className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      >
                        <option value="">Select {filter.name}</option>
                        {filter.options?.map((option: string) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}

                    {/* Handle range filters */}
                    {filter.type === 'range' && (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Minimum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Min value"
                              onChange={(e) => {
                                const currentSelections = selectedCommonFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Min:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Min: ${e.target.value}`);
                                }
                                setSelectedCommonFilters({
                                  ...selectedCommonFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Maximum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Max value"
                              onChange={(e) => {
                                const currentSelections = selectedCommonFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Max:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Max: ${e.target.value}`);
                                }
                                setSelectedCommonFilters({
                                  ...selectedCommonFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Handle range-or-exact filters */}
                    {filter.type === 'range-or-exact' && (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Minimum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Min value"
                              onChange={(e) => {
                                const currentSelections = selectedCommonFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Min:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Min: ${e.target.value}`);
                                }
                                setSelectedCommonFilters({
                                  ...selectedCommonFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Maximum</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                              placeholder="Max value"
                              onChange={(e) => {
                                const currentSelections = selectedCommonFilters[filter.name] || [];
                                const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Max:'));
                                if (e.target.value) {
                                  updatedSelections.push(`Max: ${e.target.value}`);
                                }
                                setSelectedCommonFilters({
                                  ...selectedCommonFilters,
                                  [filter.name]: updatedSelections
                                });
                              }}
                            />
                          </div>
                          {filter.unitOptions && (
                            <div className="w-32">
                              <label className="block text-sm font-medium text-berlin-gray-600 mb-2">Unit</label>
                              <select 
                                className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg"
                                onChange={(e) => {
                                  const currentSelections = selectedCommonFilters[filter.name] || [];
                                  const updatedSelections = currentSelections.filter((item: any) => !item.startsWith('Unit:'));
                                  if (e.target.value) {
                                    updatedSelections.push(`Unit: ${e.target.value}`);
                                  }
                                  setSelectedCommonFilters({
                                    ...selectedCommonFilters,
                                    [filter.name]: updatedSelections
                                  });
                                }}
                              >
                                <option value="">Select</option>
                                {filter.unitOptions.map((unit: string) => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show selected count for current filter */}
                    {selectedCommonFilters[filter.name] && selectedCommonFilters[filter.name].length > 0 && (
                      <div className="mt-3 text-sm text-berlin-red-600">
                        Selected: {selectedCommonFilters[filter.name].length} item(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 5: Upload Product Images</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                  Upload Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                />
                {uploadingImage && (
                  <p className="text-blue-600 mt-2">Uploading images...</p>
                )}
              </div>

              {uploadedImages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-berlin-gray-700 mb-3">Uploaded Images:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 6: Environmental Impact Assessment</h2>
            <div className="space-y-6">
              <div className="bg-berlin-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-berlin-red-800">Calculate Your Eco Score</h3>
                <p className="text-sm text-berlin-red-700 mb-4">
                  Help us understand the environmental impact of your products. This score will be displayed to buyers.
                </p>
              </div>

              {/* Recyclability */}
              <div className="border rounded-lg p-4">
                <label className="block font-medium mb-2">
                  Recyclability (0-100%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ecoScoreDetails.recyclability}
                  onChange={(e) => setEcoScoreDetails({
                    ...ecoScoreDetails,
                    recyclability: Number(e.target.value)
                  })}
                  className="w-full mb-2"
                />
                <div className="flex justify-between text-sm text-berlin-gray-600">
                  <span>0%</span>
                  <span className="font-medium">{ecoScoreDetails.recyclability}%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-berlin-gray-500 mt-1">
                  What percentage of your product can be recycled?
                </p>
              </div>

              {/* Carbon Footprint */}
              <div className="border rounded-lg p-4">
                <label className="block font-medium mb-2">
                  Carbon Footprint Reduction (0-100)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ecoScoreDetails.carbonFootprint}
                  onChange={(e) => setEcoScoreDetails({
                    ...ecoScoreDetails,
                    carbonFootprint: Number(e.target.value)
                  })}
                  className="w-full mb-2"
                />
                <div className="flex justify-between text-sm text-berlin-gray-600">
                  <span>High Impact</span>
                  <span className="font-medium">{ecoScoreDetails.carbonFootprint}/100</span>
                  <span>Low Impact</span>
                </div>
                <p className="text-xs text-berlin-gray-500 mt-1">
                  How low is the carbon footprint of your production process?
                </p>
              </div>

              {/* Sustainable Materials */}
              <div className="border rounded-lg p-4">
                <label className="block font-medium mb-2">
                  Sustainable Materials Usage (0-100%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ecoScoreDetails.sustainableMaterials}
                  onChange={(e) => setEcoScoreDetails({
                    ...ecoScoreDetails,
                    sustainableMaterials: Number(e.target.value)
                  })}
                  className="w-full mb-2"
                />
                <div className="flex justify-between text-sm text-berlin-gray-600">
                  <span>0%</span>
                  <span className="font-medium">{ecoScoreDetails.sustainableMaterials}%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-berlin-gray-500 mt-1">
                  What percentage of your materials are sustainably sourced?
                </p>
              </div>

              {/* Local Sourcing */}
              <div className="border rounded-lg p-4">
                <label className="block font-medium mb-2">
                  Local Sourcing (0-100%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ecoScoreDetails.localSourcing}
                  onChange={(e) => setEcoScoreDetails({
                    ...ecoScoreDetails,
                    localSourcing: Number(e.target.value)
                  })}
                  className="w-full mb-2"
                />
                <div className="flex justify-between text-sm text-berlin-gray-600">
                  <span>0%</span>
                  <span className="font-medium">{ecoScoreDetails.localSourcing}%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-berlin-gray-500 mt-1">
                  What percentage of your supply chain is local (within 500km)?
                </p>
              </div>

              {/* Certifications */}
              <div className="border rounded-lg p-4">
                <label className="block font-medium mb-2">
                  Environmental Certifications
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['FSC Certified', 'ISO 14001', 'Cradle to Cradle', 'LEED Certified', 'Energy Star', 'Fair Trade', 'Organic Certified', 'Carbon Neutral'].map((cert) => (
                    <label key={cert} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ecoScoreDetails.certifications.includes(cert)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEcoScoreDetails({
                              ...ecoScoreDetails,
                              certifications: [...ecoScoreDetails.certifications, cert]
                            });
                          } else {
                            setEcoScoreDetails({
                              ...ecoScoreDetails,
                              certifications: ecoScoreDetails.certifications.filter(c => c !== cert)
                            });
                          }
                        }}
                        className="w-4 h-4 text-berlin-red-600"
                      />
                      <span className="text-sm">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Calculate Eco Score */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mb-3"
                  onClick={() => {
                    const calculatedScore = Math.round(
                      (ecoScoreDetails.recyclability * 0.25) +
                      (ecoScoreDetails.carbonFootprint * 0.25) +
                      (ecoScoreDetails.sustainableMaterials * 0.25) +
                      (ecoScoreDetails.localSourcing * 0.15) +
                      (ecoScoreDetails.certifications.length * 1.25) // 10 points max for certifications
                    );
                    setEcoScore(Math.min(calculatedScore, 100));
                  }}
                >
                  Calculate Eco Score
                </button>
                
                {ecoScore > 0 && (
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-berlin-red-600">
                      {ecoScore}/100
                    </div>
                    <div className="flex-1">
                      <div className="bg-berlin-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full ${
                            ecoScore >= 80 ? 'bg-berlin-red-500' :
                            ecoScore >= 60 ? 'bg-yellow-500' :
                            ecoScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${ecoScore}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-berlin-gray-600 mt-1">
                        {ecoScore >= 80 ? 'Excellent' :
                         ecoScore >= 60 ? 'Good' :
                         ecoScore >= 40 ? 'Fair' : 'Needs Improvement'} Environmental Impact
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 7: Product Details & Review</h2>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={productInfo.name}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                      Supplier / Brand Name
                    </label>
                    <input
                      type="text"
                      value={productInfo.supplierName}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, supplierName: e.target.value }))}
                      placeholder="e.g. WWP Beauty"
                      className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                    <p className="text-xs text-berlin-gray-500 mt-1">
                      Optional — the brand this product belongs to. Leave blank to show your own company name.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={productInfo.description}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={productInfo.price}
                        onChange={(e) => setProductInfo(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                        Min Order Quantity
                      </label>
                      <input
                        type="number"
                        value={productInfo.minimumOrderQuantity}
                        onChange={(e) => setProductInfo(prev => ({ ...prev, minimumOrderQuantity: parseInt(e.target.value) || 1 }))}
                        className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                        Available Quantity
                      </label>
                      <input
                        type="number"
                        value={productInfo.availableQuantity}
                        onChange={(e) => setProductInfo(prev => ({ ...prev, availableQuantity: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Features */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Product Features</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a feature..."
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      className="flex-1 px-4 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="px-4 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
                    >
                      Add
                    </button>
                  </div>
                  {productInfo.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {productInfo.features.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-berlin-red-100 text-berlin-red-800"
                        >
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="ml-2 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Product Specifications</h3>
                
                {/* Standard Specifications */}
                <div className="mb-6">
                  <h4 className="font-medium text-berlin-gray-900 mb-3">Standard Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dimensions */}
                    <div>
                      <h5 className="font-medium text-berlin-gray-900 mb-3">Dimensions</h5>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="Height"
                          value={productInfo.height}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, height: e.target.value }))}
                          className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          placeholder="Width"
                          value={productInfo.width}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, width: e.target.value }))}
                          className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          placeholder="Depth"
                          value={productInfo.depth}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, depth: e.target.value }))}
                          className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={productInfo.dimensionUnit}
                        onChange={(e) => setProductInfo(prev => ({ ...prev, dimensionUnit: e.target.value }))}
                        className="mt-2 w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      >
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="inch">inch</option>
                      </select>
                    </div>

                    {/* Weight */}
                    <div>
                      <h5 className="font-medium text-berlin-gray-900 mb-3">Weight</h5>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Weight"
                          value={productInfo.weight}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, weight: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                        <select
                          value={productInfo.weightUnit}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, weightUnit: e.target.value }))}
                          className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="oz">oz</option>
                          <option value="lb">lb</option>
                        </select>
                      </div>
                    </div>

                    {/* Capacity */}
                    <div>
                      <h5 className="font-medium text-berlin-gray-900 mb-3">Capacity</h5>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Capacity"
                          value={productInfo.capacity}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, capacity: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                        <select
                          value={productInfo.capacityUnit}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, capacityUnit: e.target.value }))}
                          className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        >
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="oz">oz</option>
                          <option value="gal">gal</option>
                          <option value="cc">cc</option>
                        </select>
                      </div>
                    </div>

                    {/* Basic Properties */}
                    <div>
                      <h5 className="font-medium text-berlin-gray-900 mb-3">Basic Properties</h5>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Color (e.g., Transparent, White)"
                          value={productInfo.color}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Finish (e.g., Matte, Glossy)"
                          value={productInfo.finish}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, finish: e.target.value }))}
                          className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Closure (e.g., Pump, Spray, Cap)"
                          value={productInfo.closure}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, closure: e.target.value }))}
                          className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Specifications */}
                <div className="border-t border-berlin-gray-200 pt-6">
                  <h4 className="font-medium text-berlin-gray-900 mb-3">Custom Specifications</h4>
                  <p className="text-sm text-berlin-gray-600 mb-4">Add product-specific details that customers need to know</p>
                  
                  {/* Add New Specification Form */}
                  <div className="bg-berlin-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-berlin-gray-900">Add Custom Specification</h5>
                      
                      {/* Template Suggestions */}
                      {selectedCategory && specificationTemplates.templates[selectedCategory as keyof typeof specificationTemplates.templates] && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="text-sm text-berlin-red-600 hover:text-berlin-red-700"
                          >
                            📋 Use Template Suggestions
                          </button>
                          {showTemplates && (
                            <div className="absolute right-0 top-8 bg-white border border-berlin-gray-200 rounded-lg shadow-lg p-4 w-80 z-10">
                              <h6 className="font-medium mb-2">Common {selectedCategory} Specifications:</h6>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {specificationTemplates.templates[selectedCategory as keyof typeof specificationTemplates.templates]?.map((template: any, index: number) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      setNewDynamicSpec({
                                        name: template.name,
                                        value: '',
                                        unit: template.unit || '',
                                        category: template.category,
                                        isRequired: template.isRequired
                                      });
                                      setShowTemplates(false);
                                    }}
                                    className="w-full text-left text-sm p-2 hover:bg-berlin-gray-50 rounded border"
                                  >
                                    <div className="font-medium">{template.name}</div>
                                    <div className="text-xs text-berlin-gray-500">
                                      {template.category} {template.unit && `• ${template.unit}`} {template.isRequired && '• Required'}
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowTemplates(false)}
                                className="mt-2 text-xs text-berlin-gray-500 hover:text-berlin-gray-700"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Specification name"
                        value={newDynamicSpec.name}
                        onChange={(e) => setNewDynamicSpec(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={newDynamicSpec.value}
                        onChange={(e) => setNewDynamicSpec(prev => ({ ...prev, value: e.target.value }))}
                        className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Unit (optional)"
                        value={newDynamicSpec.unit}
                        onChange={(e) => setNewDynamicSpec(prev => ({ ...prev, unit: e.target.value }))}
                        className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      />
                      <select
                        value={newDynamicSpec.category}
                        onChange={(e) => setNewDynamicSpec(prev => ({ ...prev, category: e.target.value as any }))}
                        className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      >
                        <option value="physical">Physical</option>
                        <option value="material">Material</option>
                        <option value="technical">Technical</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newDynamicSpec.isRequired}
                          onChange={(e) => setNewDynamicSpec(prev => ({ ...prev, isRequired: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-berlin-gray-700">Required specification</span>
                      </label>
                      <button
                        type="button"
                        onClick={addDynamicSpec}
                        className="px-4 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
                      >
                        Add Specification
                      </button>
                    </div>
                  </div>

                  {/* List of Dynamic Specifications */}
                  {dynamicSpecs.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-berlin-gray-900">Added Specifications:</h5>
                      {dynamicSpecs.map((spec, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{spec.name}:</span>
                              <span>{spec.value}</span>
                              {spec.unit && <span className="text-berlin-gray-500">{spec.unit}</span>}
                              <span className={`text-xs px-2 py-1 rounded ${
                                spec.category === 'physical' ? 'bg-blue-100 text-blue-700' :
                                spec.category === 'material' ? 'bg-green-100 text-green-700' :
                                spec.category === 'technical' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {spec.category}
                              </span>
                              {spec.isRequired && (
                                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Required</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDynamicSpec(index)}
                            className="text-red-600 hover:text-red-800 ml-3"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Time */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Lead Time (Days)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Standard</label>
                    <input
                      type="number"
                      placeholder="e.g., 14"
                      value={productInfo.standardLeadTime}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, standardLeadTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Custom</label>
                    <input
                      type="number"
                      placeholder="e.g., 21"
                      value={productInfo.customLeadTime}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, customLeadTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Rush</label>
                    <input
                      type="number"
                      placeholder="e.g., 7"
                      value={productInfo.rushLeadTime}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, rushLeadTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Sustainability */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Sustainability Features</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                      Recycled Content (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={sustainability.recycledContent}
                      onChange={(e) => setSustainability(prev => ({ ...prev, recycledContent: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sustainability.biodegradable}
                        onChange={(e) => setSustainability(prev => ({ ...prev, biodegradable: e.target.checked }))}
                        className="mr-2"
                      />
                      Biodegradable
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sustainability.compostable}
                        onChange={(e) => setSustainability(prev => ({ ...prev, compostable: e.target.checked }))}
                        className="mr-2"
                      />
                      Compostable
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sustainability.refillable}
                        onChange={(e) => setSustainability(prev => ({ ...prev, refillable: e.target.checked }))}
                        className="mr-2"
                      />
                      Refillable
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sustainability.sustainableSourcing}
                        onChange={(e) => setSustainability(prev => ({ ...prev, sustainableSourcing: e.target.checked }))}
                        className="mr-2"
                      />
                      Sustainable Sourcing
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sustainability.carbonNeutral}
                        onChange={(e) => setSustainability(prev => ({ ...prev, carbonNeutral: e.target.checked }))}
                        className="mr-2"
                      />
                      Carbon Neutral
                    </label>
                  </div>
                  {/* Require certificate for each selected sustainability feature */}
                  {(["biodegradable", "compostable", "refillable", "sustainableSourcing", "carbonNeutral"] as (keyof typeof sustainability)[])
                    .filter(f => sustainability[f])
                    .map((feature) => (
                    <div key={feature} className="mt-4">
                      <label className="block text-sm font-medium text-berlin-gray-700 mb-2">
                        Certificate for {feature.charAt(0).toUpperCase() + feature.slice(1)} (required)
                      </label>
                      <input
                        type="text"
                        placeholder={`Enter certificate name for ${feature}`}
                        value={certifications.find(c => c.name === feature)?.certificateNumber || ""}
                        onChange={e => {
                          const certs = certifications.filter(c => c.name !== feature);
                          certs.push({ name: feature, certificateNumber: e.target.value });
                          setCertifications(certs);
                        }}
                        className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Certifications</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Certification Name"
                      value={newCertification.name}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                      className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Certification Body"
                      value={newCertification.certificationBody}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, certificationBody: e.target.value }))}
                      className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      placeholder="Valid Until"
                      value={newCertification.validUntil}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Certificate Number"
                      value={newCertification.certificateNumber}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, certificateNumber: e.target.value }))}
                      className="px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCertification}
                    className="px-4 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
                  >
                    Add Certification
                  </button>
                  {certifications.length > 0 && (
                    <div className="space-y-2">
                      {certifications.map((cert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-berlin-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{cert.name}</span>
                            {cert.certificationBody && <span className="text-sm text-berlin-gray-600 ml-2">by {cert.certificationBody}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCertification(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Review Summary */}
              <div className="bg-berlin-gray-50 rounded-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Review Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Category:</strong> {selectedBroaderCategory} → {selectedCategory}</p>
                    <p><strong>Eco Score:</strong> {ecoScore}/100</p>
                    <p><strong>Images:</strong> {uploadedImages.length} uploaded</p>
                    <p><strong>Features:</strong> {productInfo.features.length} added</p>
                    <p><strong>Certifications:</strong> {certifications.length} added</p>
                  </div>
                  <div>
                    <p><strong>Category Filters:</strong> {Object.keys(selectedCategoryFilters).length} selected</p>
                    <p><strong>Common Filters:</strong> {Object.keys(selectedCommonFilters).length} selected</p>
                    <p><strong>Sustainability Features:</strong> {Object.values(sustainability).filter(v => typeof v === 'boolean' && v).length} enabled</p>
                    <p><strong>Dynamic Specifications:</strong> {dynamicSpecs.length} added</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Helper functions for managing arrays
  const addFeature = () => {
    if (newFeature.trim() && !productInfo.features.includes(newFeature.trim())) {
      setProductInfo(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setProductInfo(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !productInfo.keywords.includes(newKeyword.trim())) {
      setProductInfo(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setProductInfo(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  const addColorOption = () => {
    if (newColorOption.trim() && !customization.colorOptions.includes(newColorOption.trim())) {
      setCustomization(prev => ({
        ...prev,
        colorOptions: [...prev.colorOptions, newColorOption.trim()]
      }));
      setNewColorOption('');
    }
  };

  const removeColorOption = (index: number) => {
    setCustomization(prev => ({
      ...prev,
      colorOptions: prev.colorOptions.filter((_, i) => i !== index)
    }));
  };

  const addPrintingMethod = () => {
    if (newPrintingMethod.trim() && !customization.printingMethods.includes(newPrintingMethod.trim())) {
      setCustomization(prev => ({
        ...prev,
        printingMethods: [...prev.printingMethods, newPrintingMethod.trim()]
      }));
      setNewPrintingMethod('');
    }
  };

  const removePrintingMethod = (index: number) => {
    setCustomization(prev => ({
      ...prev,
      printingMethods: prev.printingMethods.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    if (newCertification.name.trim()) {
      setCertifications(prev => [...prev, { ...newCertification }]);
      setNewCertification({
        name: '',
        certificationBody: '',
        validUntil: '',
        certificateNumber: ''
      });
    }
  };

  const removeCertification = (index: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== index));
  };

  // Dynamic specifications helpers
  const addDynamicSpec = () => {
    if (newDynamicSpec.name.trim() && newDynamicSpec.value.trim()) {
      setDynamicSpecs(prev => [...prev, {
        ...newDynamicSpec,
        value: isNaN(Number(newDynamicSpec.value)) ? newDynamicSpec.value : Number(newDynamicSpec.value),
        displayOrder: prev.length
      }]);
      setNewDynamicSpec({
        name: '',
        value: '',
        unit: '',
        category: 'custom',
        isRequired: false
      });
    }
  };

  const removeDynamicSpec = (index: number) => {
    setDynamicSpecs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-berlin-red-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <button
              onClick={() => navigate('/supplier/dashboard')}
              className="text-berlin-red-600 hover:text-berlin-red-700 mb-4"
            >
              ← Back to Products
            </button>
            <h1 className="text-3xl font-bold text-berlin-gray-900">Add New Product</h1>
            <p className="text-berlin-gray-600 mt-2">Create a detailed product listing with eco-friendly specifications</p>
          </div>

          {renderProgressBar()}
          
          <div className="mb-8">
            {renderStep()}
          </div>

          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-berlin-gray-300 text-berlin-gray-700 rounded-lg hover:bg-berlin-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep === 7 ? (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !canProceedFromStep(currentStep)}
                className="px-8 py-3 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating Product...' : 'Create Product'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep)}
                className="px-6 py-3 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
