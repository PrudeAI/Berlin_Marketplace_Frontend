import React, { useState } from 'react';
import { SearchBar } from '../components/ui/SearchBar';
import { ProductCard } from '../components/ui/ProductCard';
import { CategoryGrid } from '../components/products/CategoryGrid';
import { Button } from '../components/ui/Button';
import { Sliders } from 'lucide-react';
import commonFilters from '../data/commonFilters.json';
import { useNavigate } from 'react-router-dom';

const mockProducts = [
	{
		id: '1',
		name: 'Recyclable Paper Pouch',
		image: 'https://images.pexels.com/photos/7262764/pexels-photo-7262764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'EcoPack Solutions',
		sustainabilityScore: 92,
		material: 'Recycled Paper',
		minOrderQuantity: 1000,
		location: 'USA',
	},
	{
		id: '2',
		name: 'Compostable Food Container',
		image: 'https://images.pexels.com/photos/5217954/pexels-photo-5217954.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Green Earth Packaging',
		sustainabilityScore: 88,
		material: 'Bagasse',
		minOrderQuantity: 500,
		location: 'EU',
	},
	{
		id: '3',
		name: 'Biodegradable Bottle',
		image: 'https://images.pexels.com/photos/4498136/pexels-photo-4498136.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'NaturePack',
		sustainabilityScore: 85,
		material: 'PLA',
		minOrderQuantity: 2000,
		location: 'USA',
	},
	{
		id: '4',
		name: 'PCR Plastic Jar',
		image: 'https://images.pexels.com/photos/7262444/pexels-photo-7262444.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Circular Packaging Co.',
		sustainabilityScore: 75,
		material: 'PCR Plastic',
		minOrderQuantity: 1000,
		location: 'Asia',
	},
	{
		id: '5',
		name: 'Hemp Fiber Box',
		image: 'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Plant Based Packing',
		sustainabilityScore: 95,
		material: 'Hemp',
		minOrderQuantity: 250,
		location: 'EU',
	},
	{
		id: '6',
		name: 'Refillable Glass Container',
		image: 'https://images.pexels.com/photos/5446310/pexels-photo-5446310.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Forever Packaging',
		sustainabilityScore: 90,
		material: 'Glass',
		minOrderQuantity: 500,
		location: 'USA',
	},
	{
		id: '7',
		name: 'Ocean-Bound Plastic Tube',
		image: 'https://images.pexels.com/photos/6823502/pexels-photo-6823502.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Ocean Rescue Packaging',
		sustainabilityScore: 82,
		material: 'Recycled Ocean Plastic',
		minOrderQuantity: 1000,
		location: 'Asia',
	},
	{
		id: '8',
		name: 'Mushroom Mycelium Container',
		image: 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Fungi Packaging',
		sustainabilityScore: 98,
		material: 'Mycelium',
		minOrderQuantity: 500,
		location: 'EU',
	},
	{
		id: '9',
		name: 'Bamboo Jar Lids',
		image: 'https://images.pexels.com/photos/6045353/pexels-photo-6045353.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Bamboo Packaging Co.',
		sustainabilityScore: 89,
		material: 'Bamboo',
		minOrderQuantity: 1000,
		location: 'Asia',
	},
	{
		id: '10',
		name: 'Sugarcane Pulp Tray',
		image: 'https://images.pexels.com/photos/5217831/pexels-photo-5217831.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Green Earth Packaging',
		sustainabilityScore: 92,
		material: 'Sugarcane',
		minOrderQuantity: 500,
		location: 'USA',
	},
	{
		id: '11',
		name: 'Cork Container',
		image: 'https://images.pexels.com/photos/5691694/pexels-photo-5691694.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Natural Materials Co.',
		sustainabilityScore: 94,
		material: 'Cork',
		minOrderQuantity: 250,
		location: 'EU',
	},
	{
		id: '12',
		name: 'Seaweed Film Wrap',
		image: 'https://images.pexels.com/photos/6823502/pexels-photo-6823502.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
		supplier: 'Ocean Solutions',
		sustainabilityScore: 96,
		material: 'Seaweed',
		minOrderQuantity: 1000,
		location: 'Asia',
	},
];

function normalizeKey(str: string) {
	return str.toLowerCase().replace(/\s+/g, '');
}

function productMatchesFilters(product: any, filters: Record<string, any>) {
	for (const key in filters) {
		const value = filters[key];
		if (!value || value.length === 0) continue;
		const normalizedKey = normalizeKey(key);
		const productKey = Object.keys(product).find(
			k => normalizeKey(k) === normalizedKey
		);
		if (!productKey) continue;
		const productValue = product[productKey];
		if (Array.isArray(value)) {
			if (Array.isArray(productValue)) {
				if (!value.some((v) => productValue.map((p: string) => p.toLowerCase()).includes(v.toLowerCase()))) return false;
			} else {
				if (!value.map((v: string) => v.toLowerCase()).includes(String(productValue).toLowerCase())) return false;
			}
		} else {
			if (typeof productValue === 'string' && productValue.toLowerCase() !== String(value).toLowerCase()) return false;
		}
	}
	return true;
}

export const ProductsPage = () => {
	const [showCategories, setShowCategories] = useState(true);
	const navigate = useNavigate();
	const [filterState, setFilterState] = useState<Record<string, any>>({});
	const [openFilterIndexes, setOpenFilterIndexes] = useState<number[]>([]);

	// Handler for filter value changes
	const handleFilterChange = (filterName: string, value: any) => {
		setFilterState((prev) => ({ ...prev, [filterName]: value }));
	};

	// Run a product search: go to the all-products listing with the term as a URL param.
	// An empty term navigates without a search param, restoring the normal list.
	const handleSearch = (searchTerm: string) => {
		const q = searchTerm.trim();
		navigate(q ? `/products/filter/all?search=${encodeURIComponent(q)}` : '/products/filter/all');
	};

	const filteredProducts = mockProducts.filter(product => productMatchesFilters(product, filterState));

	return (
		<div className="pt-20 min-h-screen bg-berlin-gray-50">
			<div className="bg-gradient-to-r from-white to-berlin-red-50 py-16">
				<div className="berlin-container">
					<h1 className="text-3xl md:text-4xl font-bold text-berlin-gray-900 mb-6 text-center">
						Sustainable Packaging Products
					</h1>
					<div className="max-w-3xl mx-auto">
						<SearchBar placeholder="Search products by type, material, or supplier..." onSearch={handleSearch} />
					</div>
					<div className="flex justify-center mt-6 space-x-4">
						<Button
							variant={showCategories ? 'primary' : 'outline'}
							onClick={() => setShowCategories(true)}
						>
							Browse Categories
						</Button>
						<Button
							variant={!showCategories ? 'primary' : 'outline'}
							onClick={() => {
								setShowCategories(false);
								navigate('/products/filter/all');
							}}
						>
							View All Products
						</Button>
					</div>
				</div>
			</div>
			<div className="berlin-container py-8">
				{showCategories ? (
					<CategoryGrid />
				) : null}
			</div>
		</div>
	);
};