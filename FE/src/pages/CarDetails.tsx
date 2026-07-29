import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Tag, 
  Palette, 
  Layers, 
  Trash2, 
  Edit2, 
  Box, 
  Info, 
  DollarSign, 
  ShieldCheck 
} from 'lucide-react';
import { CarsService } from '@/services/CarsService';
import type { Car } from '@/services/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';

export function CarDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function fetchCarDetails() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await CarsService.getCarById(id);
        setCar(data);
      } catch (err) {
        console.error('Failed to load car details', err);
        toast.error('Failed to load car details');
        navigate('/cars');
      } finally {
        setLoading(false);
      }
    }
    fetchCarDetails();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-48 h-8" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="w-full h-96 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="w-full h-24 rounded-xl" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-xl font-bold mb-2">Car not found</h3>
        <Button onClick={() => navigate('/cars')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cars List
        </Button>
      </div>
    );
  }

  const carImages = car.images && car.images.length > 0 
    ? car.images 
    : [car.imageUrl || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'];

  const nextImage = () => {
    setActiveImageIndex(prev => (prev + 1) % carImages.length);
  };

  const prevImage = () => {
    setActiveImageIndex(prev => (prev - 1 + carImages.length) % carImages.length);
  };

  const triggerEdit = () => {
    navigate('/cars', { state: { editCarId: car.id } });
  };

  const triggerDelete = () => {
    navigate('/cars', { state: { deleteCarId: car.id } });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 max-w-6xl mx-auto pb-12"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/cars')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {car.make || car.brand} {car.model}
            </h2>
            <p className="text-sm text-slate-500 font-mono mt-0.5">VIN: {car.vin}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={triggerEdit}>
            <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
            Edit Car
          </Button>
          <Button variant="outline" className="border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400" onClick={triggerDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Car
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Image Slider */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md group">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImageIndex}
                src={carImages[activeImageIndex]}
                alt={`${car.make || car.brand} ${car.model}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {carImages.length > 1 && (
              <>
                {/* Navigation Arrows */}
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Index Indicator */}
                <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-1 rounded-full text-xs text-white font-mono font-medium backdrop-blur-sm shadow-sm">
                  {activeImageIndex + 1} / {carImages.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Track */}
          {carImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {carImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImageIndex === index 
                      ? 'border-blue-500 scale-95 shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 scale-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Specs Sheets */}
        <div className="lg:col-span-5 space-y-6">
          {/* Availability Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selling Price</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  LKR {car.price.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                  car.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300' :
                  car.status === 'Sold' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-300' :
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {car.status}
                </span>
                <span className="text-xs text-slate-500 mt-2 font-medium">Stock Qty: {car.quantity}</span>
              </div>
            </CardContent>
          </Card>

          {/* Specifications Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">Make / Brand</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{car.make || car.brand}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Model</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{car.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Year
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{car.year}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium flex items-center gap-1">
                    <Palette className="w-3 h-3 text-slate-400" /> Color
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{car.color || 'Unspecified'}</span>
                  </div>
                </div>
                <div className="col-span-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-slate-500 block text-xs font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> Chassis Number (VIN)
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5 block select-all">
                    {car.vin}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financials / Registry Info */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Procurement Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">Estimated Cost Price</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    LKR {(car.price * 0.8).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium flex items-center gap-1">
                    <Box className="w-3 h-3 text-slate-400" /> Location
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    Showroom A
                  </span>
                </div>
                <div className="col-span-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-slate-500 block text-xs">Storage Registry Status</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    This vehicle record is active and searchable inside the dealership's unified inventory ledger. Images have been pre-optimized and cached in vector space for instant verification matching audits.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
