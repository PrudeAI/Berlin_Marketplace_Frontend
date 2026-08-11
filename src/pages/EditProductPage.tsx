import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Import data files
import broaderCategories from '../data/broaderCategories.json';
import categorySpecificFilters from '../data/categorySpecificFilters.json';
import commonFilters from '../data/commonFilters.json';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Product {
  _id: string;
  name: string;
  supplierName?: string | null;
  description: string;
  broaderCategory: string;
  category: string;
  images: string[];
  primaryImage: string;
  features: string[];
  specifications: {
    material: string;
    capacity?: { value: number; unit: string };
    dimensions: {
      height?: number;
      width?: number;
      depth?: number;
      unit: string;
    };
    weight?: { value: number; unit: string };
    color?: string;
    finish?: string;
    closure?: string;
    minimumOrderQuantity: number;
    availableQuantity: number;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  ecoScore: number;
  ecoScoreDetails: {
    recyclability: number;
    carbonFootprint: number;
    sustainableMaterials: number;
    localSourcing: number;
    certifications: string[];
  };
  sustainability: {
    recycledContent: number;
    biodegradable: boolean;
    compostable: boolean;
    refillable: boolean;
    sustainableSourcing: boolean;
    carbonNeutral: boolean;
  };
  certifications: Array<{
    name: string;
    certificationBody?: string;
    validUntil?: string;
    certificateNumber?: string;
  }>;
  customization: {
    printingAvailable: boolean;
    labelingAvailable: boolean;
    colorOptions: string[];
    printingMethods: string[];
    customSizes: boolean;
  };
  leadTime: {
    standard?: number;
    custom?: number;
    rush?: number;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords: string[];
  };
  categoryFilters: { [key: string]: any };
  commonFilters: { [key: string]: any };
}

const EditProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form data state
  const [selectedBroaderCategory, setSelectedBroaderCategory] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categorySpecificFiltersList, setCategorySpecificFiltersList] = useState<any[]>([]);
  const [commonFiltersList, setCommonFiltersList] = useState<any[]>([]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<{ [key: string]: any }>({});
  const [selectedCommonFilters, setSelectedCommonFilters] = useState<{ [key: string]: any }>({});
  const [tempCategoryFilters, setTempCategoryFilters] = useState<{ [key: string]: any }>({});
  const [tempCommonFilters, setTempCommonFilters] = useState<{ [key: string]: any }>({});
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
    // Capacity
    capacity: '',
    capacityUnit: 'ml',
    // Dimensions
    height: '',
    width: '',
    depth: '',
    dimensionUnit: 'mm',
    // Weight
    weight: '',
    weightUnit: 'g',
    // Other specifications
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

  const [sustainability, setSustainability] = useState({
    recycledContent: 0,
    biodegradable: false,
    compostable: false,
    refillable: false,
    sustainableSourcing: false,
    carbonNeutral: false
  });

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

  // Load product data for editing
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError('No product ID provided');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('supplier_token');
        const response = await fetch(`${API_URL}/api/dashboard/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load product');
        }

        const product: Product = await response.json();
        console.log('Loaded product:', product);
        console.log('TEMP DEBUG - Product name:', product.name);
        console.log('TEMP DEBUG - Product description:', product.description);
        console.log('TEMP DEBUG - Product pricing:', product.pricing);
        console.log('Product categoryFilters:', product.categoryFilters);
        console.log('Product commonFilters:', product.commonFilters);

        // Populate form with existing data
        setSelectedBroaderCategory(product.broaderCategory || '');
        setSelectedCategory(product.category || '');
        setUploadedImages(product.images || []);
        setEcoScore(product.ecoScore || 0);
        setEcoScoreDetails(product.ecoScoreDetails || {
          recyclability: 0,
          carbonFootprint: 0,
          sustainableMaterials: 0,
          localSourcing: 0,
          certifications: []
        });
        
        console.log('Loaded eco score details:', {
          ecoScore: product.ecoScore || 0,
          ecoScoreDetails: product.ecoScoreDetails || {},
          certifications: product.certifications || []
        });

        setProductInfo({
          name: product.name || '',
          // Must be hydrated: without this the input renders empty and the
          // update payload would overwrite a stored value with ''.
          supplierName: product.supplierName || '',
          description: product.description || '',
          price: product.pricing?.basePrice?.toString() || '',
          minimumOrderQuantity: product.specifications?.minimumOrderQuantity || 1,
          availableQuantity: product.specifications?.availableQuantity || 100,
          features: product.features || [],
          capacity: product.specifications?.capacity?.value?.toString() || '',
          capacityUnit: product.specifications?.capacity?.unit || 'ml',
          height: product.specifications?.dimensions?.height?.toString() || '',
          width: product.specifications?.dimensions?.width?.toString() || '',
          depth: product.specifications?.dimensions?.depth?.toString() || '',
          dimensionUnit: product.specifications?.dimensions?.unit || 'mm',
          weight: product.specifications?.weight?.value?.toString() || '',
          weightUnit: product.specifications?.weight?.unit || 'g',
          color: product.specifications?.color || '',
          finish: product.specifications?.finish || '',
          closure: product.specifications?.closure || '',
          standardLeadTime: product.leadTime?.standard?.toString() || '',
          customLeadTime: product.leadTime?.custom?.toString() || '',
          rushLeadTime: product.leadTime?.rush?.toString() || '',
          metaTitle: product.seo?.metaTitle || '',
          metaDescription: product.seo?.metaDescription || '',
          keywords: product.seo?.keywords || []
        });

        console.log('TEMP DEBUG - Product info set to:', {
          name: product.name || '',
          description: product.description || '',
          price: product.pricing?.basePrice?.toString() || ''
        });

        setSustainability(product.sustainability || {
          recycledContent: 0,
          biodegradable: false,
          compostable: false,
          refillable: false,
          sustainableSourcing: false,
          carbonNeutral: false
        });

        setCertifications(product.certifications || []);
        setCustomization(product.customization || {
          printingAvailable: false,
          labelingAvailable: false,
          colorOptions: [],
          printingMethods: [],
          customSizes: false
        });

        // Store the filter data temporarily to apply after filters are loaded
        const tempCatFilters = product.categoryFilters || {};
        const tempComFilters = product.commonFilters || {};
        
        // Fix malformed filter data structure
        let normalizedCatFilters = {};
        let normalizedComFilters = {};

        // Handle category filters - check if data is nested under numeric keys
        if (tempCatFilters && typeof tempCatFilters === 'object') {
          // Check if data is under numeric keys (like "0": {...})
          const firstKey = Object.keys(tempCatFilters)[0];
          if (firstKey && !isNaN(Number(firstKey)) && typeof tempCatFilters[firstKey] === 'object') {
            normalizedCatFilters = tempCatFilters[firstKey] || {};
          } else {
            // Data is in correct format
            normalizedCatFilters = tempCatFilters;
          }
        }

        // Handle common filters - same logic
        if (tempComFilters && typeof tempComFilters === 'object') {
          const firstKey = Object.keys(tempComFilters)[0];
          if (firstKey && !isNaN(Number(firstKey)) && typeof tempComFilters[firstKey] === 'object') {
            normalizedComFilters = tempComFilters[firstKey] || {};
          } else {
            normalizedComFilters = tempComFilters;
          }
        }

        setTempCategoryFilters(normalizedCatFilters);
        setTempCommonFilters(normalizedComFilters);

      } catch (err: any) {
        console.error('Error loading product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Update available categories when broader category changes
  useEffect(() => {
    if (selectedBroaderCategory) {
      const categoryData = broaderCategories.broader_categories.find((cat: any) => cat.name === selectedBroaderCategory);
      setAvailableCategories(categoryData?.categories || []);
    }
  }, [selectedBroaderCategory]);

  // Update filters when category changes and apply saved filter data
  useEffect(() => {
    if (selectedCategory) {
      // Get category-specific filters
      const categoryFilter = categorySpecificFilters.categories.find((cf: any) => cf.category === selectedCategory);
      let categoryFiltersList = categoryFilter?.filters || [];
      
      // Get common filters - always load them
      let commonFiltersList = commonFilters.filters || [];
      
      // Dynamically add missing saved values to filter options
      if (Object.keys(tempCategoryFilters).length > 0) {
        categoryFiltersList = categoryFiltersList.map((filter: any) => {
          const savedValues = tempCategoryFilters[filter.name];
          if (savedValues && Array.isArray(savedValues)) {
            // Add any saved values that aren't in the current options
            const currentOptions = filter.options || [];
            const missingValues = savedValues.filter(value => !currentOptions.includes(value));
            if (missingValues.length > 0) {
              console.log(`Adding missing values to category filter ${filter.name}:`, missingValues);
              logMissingValuesForJSON('category', filter.name, missingValues);
              return {
                ...filter,
                options: [...currentOptions, ...missingValues]
              };
            }
          }
          return filter;
        });
      }

      if (Object.keys(tempCommonFilters).length > 0) {
        commonFiltersList = commonFiltersList.map((filter: any) => {
          const savedValues = tempCommonFilters[filter.name];
          if (savedValues && Array.isArray(savedValues)) {
            if (filter.groups) {
              // Handle grouped filters (like Material, Location)
              const updatedGroups = [...filter.groups];
              
              // Check if any saved values are missing from all groups
              const allExistingOptions = filter.groups.flatMap((g: any) => {
                if (!g.options) return [];
                // Handle both string arrays and object arrays
                return Array.isArray(g.options) ? g.options.map((option: any) => 
                  typeof option === 'string' ? option : option.name || option.code || option
                ) : [];
              });
              const missingValues = savedValues.filter(value => 
                !allExistingOptions.includes(value) && 
                !value.startsWith('Toggle:') // Exclude toggle values
              );
              
              if (missingValues.length > 0) {
                console.log(`Adding missing values to ${filter.name}:`, missingValues);
                logMissingValuesForJSON('common', filter.name, missingValues);
                
                // For location filters, add to appropriate region or create "Other" group
                if (filter.name === 'Location' || filter.name.toLowerCase().includes('location')) {
                  let otherGroup = updatedGroups.find(g => g.groupName === 'Other' || g.groupName === 'Others');
                  if (!otherGroup) {
                    // Create "Other" group if it doesn't exist
                    otherGroup = { groupName: 'Other', options: [] };
                    updatedGroups.push(otherGroup);
                  }
                  otherGroup.options = [...(otherGroup.options || []), ...missingValues];
                } else {
                  // For other grouped filters, add to first group or create general group
                  if (updatedGroups.length > 0) {
                    updatedGroups[0].options = [...(updatedGroups[0].options || []), ...missingValues];
                  } else {
                    updatedGroups.push({ groupName: 'Other', options: missingValues });
                  }
                }
              }
              
              return { ...filter, groups: updatedGroups };
            } else if (filter.options) {
              // Handle regular options
              const currentOptions = filter.options || [];
              const missingValues = savedValues.filter(value => 
                !currentOptions.includes(value) &&
                !value.startsWith('Toggle:') // Exclude toggle values
              );
              if (missingValues.length > 0) {
                console.log(`Adding missing values to ${filter.name}:`, missingValues);
                logMissingValuesForJSON('common', filter.name, missingValues);
                return {
                  ...filter,
                  options: [...currentOptions, ...missingValues]
                };
              }
            }
          }
          return filter;
        });
      }
      
      setCategorySpecificFiltersList(categoryFiltersList);
      setCommonFiltersList(commonFiltersList);

      // Apply saved filter data if available
      if (Object.keys(tempCategoryFilters).length > 0 || Object.keys(tempCommonFilters).length > 0) {
        console.log('Applying saved filter data:', { tempCategoryFilters, tempCommonFilters });
        setSelectedCategoryFilters(tempCategoryFilters);
        setSelectedCommonFilters(tempCommonFilters);
        
        // Clear the temporary data after a short delay to ensure state is updated
        setTimeout(() => {
          setTempCategoryFilters({});
          setTempCommonFilters({});
        }, 100);
      }
    }
  }, [selectedCategory]);

  // Load filters immediately when component mounts, regardless of loading state
  useEffect(() => {
    // Always load common filters with dynamic value addition
    let commonFiltersList = commonFilters.filters || [];
    
    // If we have temporary common filter data, add missing values
    if (Object.keys(tempCommonFilters).length > 0) {
      commonFiltersList = commonFiltersList.map((filter: any) => {
        const savedValues = tempCommonFilters[filter.name];
        if (savedValues && Array.isArray(savedValues)) {
          if (filter.groups) {
            // Handle grouped filters (like Material, Location)
            const updatedGroups = [...filter.groups];
            
            // Check if any saved values are missing from all groups
            const allExistingOptions = filter.groups.flatMap((g: any) => {
              if (!g.options) return [];
              // Handle both string arrays and object arrays
              return Array.isArray(g.options) ? g.options.map((option: any) => 
                typeof option === 'string' ? option : option.name || option.code || option
              ) : [];
            });
            const missingValues = savedValues.filter(value => 
              !allExistingOptions.includes(value) &&
              !value.startsWith('Toggle:') // Exclude toggle values
            );
            
            if (missingValues.length > 0) {
              console.log(`Adding missing values to initial ${filter.name}:`, missingValues);
              logMissingValuesForJSON('common', filter.name, missingValues);
              
              // For location filters, add to appropriate region or create "Other" group
              if (filter.name === 'Location' || filter.name.toLowerCase().includes('location')) {
                let otherGroup = updatedGroups.find(g => g.groupName === 'Other' || g.groupName === 'Others');
                if (!otherGroup) {
                  // Create "Other" group if it doesn't exist
                  otherGroup = { groupName: 'Other', options: [] };
                  updatedGroups.push(otherGroup);
                }
                otherGroup.options = [...(otherGroup.options || []), ...missingValues];
              } else {
                // For other grouped filters, add to first group or create general group
                if (updatedGroups.length > 0) {
                  updatedGroups[0].options = [...(updatedGroups[0].options || []), ...missingValues];
                } else {
                  updatedGroups.push({ groupName: 'Other', options: missingValues });
                }
              }
            }
            
            return { ...filter, groups: updatedGroups };
          } else if (filter.options) {
            // Handle regular options
            const currentOptions = filter.options || [];
            const missingValues = savedValues.filter(value => 
              !currentOptions.includes(value) &&
              !value.startsWith('Toggle:') // Exclude toggle values
            );
            if (missingValues.length > 0) {
              console.log(`Adding missing values to initial ${filter.name}:`, missingValues);
              logMissingValuesForJSON('common', filter.name, missingValues);
              return {
                ...filter,
                options: [...currentOptions, ...missingValues]
              };
            }
          }
        }
        return filter;
      });
    }
    
    setCommonFiltersList(commonFiltersList);
  }, [tempCommonFilters]);

  // Re-apply saved filter selections after filters are loaded and product data is available
  useEffect(() => {
    // Only run this after product is loaded and filters are available
    if (!loading && selectedCategory && (categorySpecificFiltersList.length > 0 || commonFiltersList.length > 0)) {
      console.log('Filters loaded - current selections:', {
        categoryFilters: selectedCategoryFilters,
        commonFilters: selectedCommonFilters,
        categorySpecificFiltersCount: categorySpecificFiltersList.length,
        commonFiltersCount: commonFiltersList.length
      });
    }
  }, [loading, selectedCategory, categorySpecificFiltersList.length, commonFiltersList.length, selectedCategoryFilters, selectedCommonFilters]);

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
      for (const file of Array.from(files)) {
        console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('cloud_name', cloudName);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Cloudinary error response:', errorData);
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Upload successful:', data.secure_url);
        uploadedUrls.push(data.secure_url);
      }

      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      console.log('All uploads completed successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImage(false);
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

  const handleUpdate = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('supplier_token');
      
      const productData = {
        name: productInfo.name,
        supplierName: productInfo.supplierName.trim() || null,
        description: productInfo.description,
        broaderCategory: selectedBroaderCategory,
        category: selectedCategory,
        images: uploadedImages,
        primaryImage: uploadedImages[0] || null,
        features: productInfo.features,
        specifications: {
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
          availableQuantity: productInfo.availableQuantity
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

      console.log('Updating product data:', productData);

      const response = await fetch(`${API_URL}/api/dashboard/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      console.log('Product update response:', result);
      
      if (response.ok && result.message) {
        alert('Product updated successfully!');
        navigate('/supplier/dashboard');
      } else {
        console.error('Product update failed:', result);
        alert(`Failed to update product: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('supplier_token');
      
      const response = await fetch(`${API_URL}/api/dashboard/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (response.ok && result.message) {
        alert('Product deleted successfully!');
        navigate('/supplier/dashboard');
      } else {
        console.error('Product deletion failed:', result);
        alert(`Failed to delete product: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-berlin-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-berlin-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-berlin-gray-900 mb-4">Error Loading Product</h2>
          <p className="text-berlin-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/supplier/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  // Helper function to detect and add missing values to JSON files (for dynamic enhancement)
  const logMissingValuesForJSON = (filterType: 'category' | 'common', filterName: string, missingValues: string[]) => {
    if (missingValues.length > 0) {
      console.group(`🔍 MISSING VALUES DETECTED`);
      console.log(`Filter Type: ${filterType}`);
      console.log(`Filter Name: ${filterName}`);
      console.log(`Missing Values:`, missingValues);
      console.log(`📝 Consider adding these to the ${filterType === 'category' ? 'categorySpecificFilters' : 'commonFilters'}.json file`);
      console.groupEnd();
    }
  };

  // Helper functions for managing arrays (same as AddProductPage)
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

  // Render step content (same structure as AddProductPage, but with edit functionality)
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 1: Basic Product Information</h2>
            
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
              <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={productInfo.name}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Supplier / Brand Name</label>
                  <input
                    type="text"
                    value={productInfo.supplierName}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, supplierName: e.target.value }))}
                    className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    placeholder="e.g. WWP Beauty"
                  />
                  <p className="text-xs text-berlin-gray-500 mt-1">
                    Optional — the brand this product belongs to. Leave blank to show your own company name.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Description *</label>
                  <textarea
                    value={productInfo.description}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    placeholder="Describe your product..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productInfo.price}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Min Order Quantity</label>
                    <input
                      type="number"
                      value={productInfo.minimumOrderQuantity}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, minimumOrderQuantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Available Quantity</label>
                    <input
                      type="number"
                      value={productInfo.availableQuantity}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, availableQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
              <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Product Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Broader Category *</label>
                  <select
                    value={selectedBroaderCategory}
                    onChange={(e) => setSelectedBroaderCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select broader category</option>
                    {broaderCategories.broader_categories.map((category: any) => (
                      <option key={category.name} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Specific Category *</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                    disabled={!selectedBroaderCategory}
                    required
                  >
                    <option value="">Select specific category</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
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
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
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

            {/* Product Specifications */}
            <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
              <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Product Specifications</h3>
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
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 2: Category-Specific Filters</h2>
            {categorySpecificFiltersList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-berlin-gray-500">No category-specific filters available for "{selectedCategory}".</p>
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
                          const currentSelections = selectedCategoryFilters[filter.name] || [];
                          const isSelected = currentSelections.includes(option);
                          return (
                            <label key={option} className={`flex items-center space-x-3 p-3 border rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-berlin-red-50 border-berlin-red-200' : 'hover:bg-berlin-red-50'
                            }`}>
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
                              <span className={isSelected ? 'font-medium text-berlin-red-900' : ''}>{option}</span>
                            </label>
                          );
                        })}
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

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 3: Common Filters</h2>
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
                          const currentSelections = selectedCommonFilters[filter.name] || [];
                          const isSelected = currentSelections.includes(option);
                          return (
                            <label key={option} className={`flex items-center space-x-3 p-3 border rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-berlin-red-50 border-berlin-red-200' : 'hover:bg-berlin-red-50'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  console.log(`Filter change for ${filter.name}: ${option}, checked: ${e.target.checked}`);
                                  const currentSelections = selectedCommonFilters[filter.name] || [];
                                  console.log(`Current selections for ${filter.name}:`, currentSelections);
                                  let updatedSelections;
                                  if (e.target.checked) {
                                    updatedSelections = [...currentSelections, option];
                                  } else {
                                    updatedSelections = currentSelections.filter((item: any) => item !== option);
                                  }
                                  console.log(`Updated selections for ${filter.name}:`, updatedSelections);
                                  setSelectedCommonFilters({
                                    ...selectedCommonFilters,
                                    [filter.name]: updatedSelections
                                  });
                                }}
                                className="w-4 h-4 text-berlin-red-600"
                              />
                              <span className={isSelected ? 'font-medium text-berlin-red-900' : ''}>{option}</span>
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
                                const currentSelections = selectedCommonFilters[filter.name] || [];
                                const isSelected = currentSelections.includes(optionValue);
                                return (
                                  <label key={optionIndex} className={`flex items-center space-x-3 p-2 border rounded cursor-pointer transition-colors ${
                                    isSelected ? 'bg-berlin-red-50 border-berlin-red-200' : 'hover:bg-berlin-red-50'
                                  }`}>
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
                                    <span className={isSelected ? 'font-medium text-berlin-red-900' : ''}>{optionValue}</span>
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
                                const currentSelections = selectedCommonFilters[filter.name] || [];
                                const isSelected = currentSelections.includes(optionValue);
                                return (
                                  <label key={optionIndex} className={`flex items-center space-x-3 p-2 border rounded cursor-pointer transition-colors ${
                                    isSelected ? 'bg-berlin-red-50 border-berlin-red-200' : 'hover:bg-berlin-red-50'
                                  }`}>
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
                                    <span className={isSelected ? 'font-medium text-berlin-red-900' : ''}>{optionValue}</span>
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
                              value={selectedCommonFilters[filter.name]?.find((item: string) => item.startsWith('Min:'))?.replace('Min: ', '') || ''}
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
                              value={selectedCommonFilters[filter.name]?.find((item: string) => item.startsWith('Max:'))?.replace('Max: ', '') || ''}
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

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 4: Product Images</h2>
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

      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 5: Environmental Impact Assessment</h2>
            <div className="space-y-6">
              <div className="bg-berlin-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-berlin-red-800">Update Your Eco Score</h3>
                <p className="text-sm text-berlin-red-700 mb-4">
                  Help us understand the environmental impact of your products. This score will be displayed to buyers.
                </p>
                {ecoScore > 0 && (
                  <div className="text-sm text-berlin-red-600 mb-2">
                    Current Eco Score: <span className="font-bold">{ecoScore}/100</span>
                  </div>
                )}
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
              </div>

              {/* Calculate Eco Score */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mb-3"
                  onClick={() => {
                    console.log('Calculating eco score with details:', {
                      recyclability: ecoScoreDetails.recyclability,
                      carbonFootprint: ecoScoreDetails.carbonFootprint,
                      sustainableMaterials: ecoScoreDetails.sustainableMaterials,
                      localSourcing: ecoScoreDetails.localSourcing,
                      certificationsCount: certifications.length
                    });
                    
                    const calculatedScore = Math.round(
                      (ecoScoreDetails.recyclability * 0.25) +
                      (ecoScoreDetails.carbonFootprint * 0.25) +
                      (ecoScoreDetails.sustainableMaterials * 0.25) +
                      (ecoScoreDetails.localSourcing * 0.15) +
                      (certifications.length * 1.25)
                    );
                    
                    console.log('Calculated eco score:', calculatedScore);
                    setEcoScore(Math.min(calculatedScore, 100));
                    
                    // Update ecoScoreDetails certifications to match the actual certifications
                    setEcoScoreDetails(prev => ({
                      ...prev,
                      certifications: certifications.map(cert => cert.name)
                    }));
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

      case 6:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 6: Sustainability & Certifications</h2>
            <div className="space-y-6">
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
                            {cert.validUntil && <span className="text-sm text-berlin-gray-600 ml-2">valid until {cert.validUntil}</span>}
                            {cert.certificateNumber && <span className="text-sm text-berlin-gray-600 ml-2">#{cert.certificateNumber}</span>}
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

              {/* Customization Options */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Customization Options</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customization.printingAvailable}
                        onChange={(e) => setCustomization(prev => ({ ...prev, printingAvailable: e.target.checked }))}
                        className="mr-2"
                      />
                      Printing Available
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customization.labelingAvailable}
                        onChange={(e) => setCustomization(prev => ({ ...prev, labelingAvailable: e.target.checked }))}
                        className="mr-2"
                      />
                      Labeling Available
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customization.customSizes}
                        onChange={(e) => setCustomization(prev => ({ ...prev, customSizes: e.target.checked }))}
                        className="mr-2"
                      />
                      Custom Sizes
                    </label>
                  </div>

                  {/* Color Options */}
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Color Options</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newColorOption}
                        onChange={(e) => setNewColorOption(e.target.value)}
                        className="flex-1 px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        placeholder="Add color option"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColorOption())}
                      />
                      <button
                        type="button"
                        onClick={addColorOption}
                        className="px-4 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customization.colorOptions.map((color, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {color}
                          <button
                            type="button"
                            onClick={() => removeColorOption(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Printing Methods */}
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Printing Methods</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newPrintingMethod}
                        onChange={(e) => setNewPrintingMethod(e.target.value)}
                        className="flex-1 px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        placeholder="Add printing method"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrintingMethod())}
                      />
                      <button
                        type="button"
                        onClick={addPrintingMethod}
                        className="px-4 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customization.printingMethods.map((method, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {method}
                          <button
                            type="button"
                            onClick={() => removePrintingMethod(index)}
                            className="text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO Settings */}
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">SEO Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Meta Title</label>
                    <input
                      type="text"
                      value={productInfo.metaTitle}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, metaTitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      placeholder="Enter meta title for SEO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">Meta Description</label>
                    <textarea
                      value={productInfo.metaDescription}
                      onChange={(e) => setProductInfo(prev => ({ ...prev, metaDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                      placeholder="Enter meta description for SEO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-berlin-gray-700 mb-2">SEO Keywords</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        className="flex-1 px-3 py-2 border border-berlin-gray-300 rounded-lg focus:ring-2 focus:ring-berlin-red-500 focus:border-transparent"
                        placeholder="Add SEO keyword"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="px-4 py-2 bg-berlin-red-600 text-white rounded-lg hover:bg-berlin-red-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {productInfo.keywords.map((keyword, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword(index)}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div>
            <h2 className="text-2xl font-bold text-berlin-gray-900 mb-6">Step 7: Review & Update</h2>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-berlin-gray-200">
                <h3 className="text-lg font-semibold text-berlin-gray-900 mb-4">Product Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p><strong>Name:</strong> {productInfo.name}</p>
                    <p><strong>Category:</strong> {selectedBroaderCategory} / {selectedCategory}</p>
                    <p><strong>Price:</strong> ${productInfo.price}</p>
                    <p><strong>Min Order:</strong> {productInfo.minimumOrderQuantity}</p>
                    <p><strong>Available Quantity:</strong> {productInfo.availableQuantity}</p>
                    <p><strong>Features:</strong> {productInfo.features.length} items</p>
                  </div>
                  <div>
                    <p><strong>Images:</strong> {uploadedImages.length} uploaded</p>
                    <p><strong>Eco Score:</strong> {ecoScore}/100</p>
                    <p><strong>Certifications:</strong> {certifications.length} added</p>
                    <p><strong>Category Filters:</strong> {Object.keys(selectedCategoryFilters).length} selected</p>
                    <p><strong>Common Filters:</strong> {Object.keys(selectedCommonFilters).length} selected</p>
                    <p><strong>Sustainability Features:</strong> {Object.values(sustainability).filter(v => typeof v === 'boolean' && v).length} enabled</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p><strong>Description:</strong> {productInfo.description}</p>
                </div>
                {/* Specifications Summary */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Specifications:</h4>
                    {productInfo.height && <p>Height: {productInfo.height} {productInfo.dimensionUnit}</p>}
                    {productInfo.width && <p>Width: {productInfo.width} {productInfo.dimensionUnit}</p>}
                    {productInfo.depth && <p>Depth: {productInfo.depth} {productInfo.dimensionUnit}</p>}
                    {productInfo.weight && <p>Weight: {productInfo.weight} {productInfo.weightUnit}</p>}
                    {productInfo.capacity && <p>Capacity: {productInfo.capacity} {productInfo.capacityUnit}</p>}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Lead Times:</h4>
                    {productInfo.standardLeadTime && <p>Standard: {productInfo.standardLeadTime} days</p>}
                    {productInfo.customLeadTime && <p>Custom: {productInfo.customLeadTime} days</p>}
                    {productInfo.rushLeadTime && <p>Rush: {productInfo.rushLeadTime} days</p>}
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

  return (
    <div className="min-h-screen bg-berlin-gray-50 my-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/supplier/dashboard')}
              className="flex items-center gap-2 text-berlin-gray-600 hover:text-berlin-gray-800"
            >
              ← Back to Products
            </button>
            <div className="h-6 w-px bg-berlin-gray-300" />
            <h1 className="text-3xl font-bold text-berlin-gray-900">Edit Product</h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete Product'}
            </button>
            <button
              onClick={handleUpdate}
              disabled={isLoading || !productInfo.name || !productInfo.description || !selectedCategory}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-berlin-gray-300 text-berlin-gray-600'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="mt-2 h-2 bg-berlin-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-berlin-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 text-berlin-gray-600 border border-berlin-gray-300 rounded-md hover:bg-berlin-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-4">
              {currentStep < 7 && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;
