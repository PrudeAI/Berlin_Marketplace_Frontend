import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { ArrowRight } from 'lucide-react';
import { productSearchPath } from '../../utils/search';

export const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollPosition = window.scrollY;
        const opacity = Math.max(1 - scrollPosition / 700, 0.2);
        const translateY = scrollPosition * 0.3;
        
        heroRef.current.style.opacity = opacity.toString();
        heroRef.current.style.transform = `translateY(${translateY}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-white via-berlin-gray-50 to-berlin-red-50 pt-20">
      <div 
        className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-10"
        aria-hidden="true"
      />
      
      <div className="container mx-auto px-4 py-16 z-10">
        <div ref={heroRef} className="max-w-4xl mx-auto text-center transition-all duration-300">
          <h1 className="text-4xl md:text-6xl font-bold text-berlin-gray-900 mb-6 leading-tight">
            <span className="block">Sustainable Packaging</span>
            <span className="text-berlin-red-600">for a Better Tomorrow</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-berlin-gray-700 mb-8 max-w-3xl mx-auto font-medium">
            "Search, Sample and Quote" Sustainable Packaging
          </p>
          
          <div className="mb-10">
            <SearchBar
              placeholder="Search for sustainable packaging solutions..."
              className="mx-auto"
              onSearch={(term) => {
                const path = productSearchPath(term);
                if (path) navigate(path);
              }}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" href="/products">
              Browse Products
            </Button>
            <Button variant="outline" size="lg" href="/how-it-works">
              How It Works <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto py-8 border-t border-b border-berlin-gray-200">
            <div className="text-center">
              <p className="text-3xl font-bold text-berlin-red-600">500+</p>
              <p className="text-berlin-gray-600 font-medium">Suppliers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-berlin-red-600">10K+</p>
              <p className="text-berlin-gray-600 font-medium">Products</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-berlin-red-600">98%</p>
              <p className="text-berlin-gray-600 font-medium">Satisfaction</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-berlin-red-600">50M+</p>
              <p className="text-berlin-gray-600 font-medium">Plastic Saved</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
    </section>
  );
};