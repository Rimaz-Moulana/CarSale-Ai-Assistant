import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Car as CarIcon, 
  Image as ImageIcon,
  Trash,
  ChevronLeftSquare,
  ChevronRightSquare,
  Eye
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CarsService } from '@/services/CarsService';
import type { Car } from '@/services/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { useForm as useReactHookForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export function Cars() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cars, setCars] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const limit = 10;

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Images management state
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Table Image Slider indices
  const [carImageIndices, setCarImageIndices] = useState<Record<string, number>>({});

  const { register, handleSubmit, reset, formState: { errors } } = useReactHookForm<Car>();

  useEffect(() => {
    loadCars();
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (cars.length > 0 && location.state) {
      const state = location.state as any;
      if (state.editCarId) {
        const target = cars.find(c => c.id === state.editCarId);
        if (target) {
          openEdit(target);
          window.history.replaceState({}, document.title);
        }
      } else if (state.deleteCarId) {
        openDelete(state.deleteCarId);
        window.history.replaceState({}, document.title);
      }
    }
  }, [cars, location.state]);

  async function loadCars() {
    setLoading(true);
    try {
      const res = await CarsService.getCars(page, limit, search, statusFilter);
      setCars(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cars");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const openCreate = () => {
    setEditingCar(null);
    setImagesList([]);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setSubmitting(false);
    reset({ 
      make: '', 
      model: '', 
      year: new Date().getFullYear(), 
      price: 0, 
      status: 'Available', 
      quantity: 1, 
      vin: '',
      color: ''
    });
    setIsFormOpen(true);
  };

  const openEdit = (car: Car) => {
    setEditingCar(car);
    setImagesList(car.images || (car.imageUrl ? [car.imageUrl] : []));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setSubmitting(false);
    reset(car);
    setIsFormOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      toast.warning("Only image files are allowed.");
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx: number) => idx !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, idx: number) => idx !== index));
  };

  const removeImageUrl = (index: number) => {
    setImagesList(imagesList.filter((_, idx: number) => idx !== index));
  };

  const onSubmit = async (data: Car) => {
    if (imagesList.length === 0 && selectedFiles.length === 0) {
      toast.error("You must upload or select at least one image for the car.");
      return;
    }

    setSubmitting(true);
    const payload = { 
      ...data, 
      vin: data.vin ? data.vin.trim().toUpperCase() : '',
      images: imagesList,
      imageUrl: imagesList.length > 0 ? imagesList[0] : ''
    };

    try {
      let carId = editingCar?.id;
      if (editingCar) {
        await CarsService.updateCar(editingCar.id, payload);
      } else {
        const created = await CarsService.createCar(payload);
        carId = created.id;
      }

      // Upload files if selected
      if (selectedFiles.length > 0 && carId) {
        await CarsService.uploadCarImages(carId, selectedFiles);
      }

      toast.success(editingCar ? "Car updated successfully" : "Car added successfully");
      setIsFormOpen(false);
      loadCars();
    } catch (err) {
      console.error("Failed to save car", err);
      toast.error("Failed to save car");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await CarsService.deleteCar(deletingId);
        toast.success("Car deleted successfully");
        setIsDeleteOpen(false);
        setDeletingId(null);
        loadCars();
      } catch (err) {
        console.error("Failed to delete car", err);
        toast.error("Failed to delete car");
      }
    }
  };

  // Image sliding actions inside table
  const nextCarImage = (carId: string, maxLen: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarImageIndices(prev => ({
      ...prev,
      [carId]: ((prev[carId] || 0) + 1) % maxLen
    }));
  };

  const prevCarImage = (carId: string, maxLen: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarImageIndices(prev => ({
      ...prev,
      [carId]: ((prev[carId] || 0) - 1 + maxLen) % maxLen
    }));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Cars Management</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Car
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by make, model, or VIN..."
                className="pl-9"
                value={search}
                onChange={handleSearch}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onChange={handleFilter}>
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Pending">Pending</option>
                <option value="Sold">Sold</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <CardHeader className="p-4">
                    <Skeleton className="w-32 h-6 mb-2" />
                    <Skeleton className="w-24 h-4 mb-2" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="w-20 h-4 mb-2" />
                    <Skeleton className="w-16 h-6 rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cars.length === 0 ? (
            <EmptyState 
              icon={<CarIcon className="w-12 h-12 text-slate-400" />}
              title="No cars found"
              description="We couldn't find any vehicles matching your current filters."
              actionLabel={search || statusFilter !== 'All' ? "Clear Filters" : undefined}
              onAction={() => { setSearch(''); setStatusFilter('All'); setPage(1); }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => {
                const carImages = car.images && car.images.length > 0 
                  ? car.images 
                  : [car.imageUrl || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80'];
                const imageIdx = carImageIndices[car.id] || 0;
                const currentImage = carImages[imageIdx % carImages.length];

                return (
                  <Card key={car.id} className="overflow-hidden flex flex-col group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                    {/* Image Section */}
                    <div className="relative w-full h-48 bg-slate-950 overflow-hidden">
                      <img 
                        src={currentImage} 
                        alt={`${car.make || car.brand} ${car.model}`} 
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" 
                      />
                      
                      {carImages.length > 1 && (
                        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <button 
                            type="button"
                            onClick={(e) => prevCarImage(car.id, carImages.length, e)}
                            className="bg-black/75 hover:bg-black/90 text-white rounded p-1"
                          >
                            <ChevronLeftSquare className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] text-white font-mono bg-black/60 px-1.5 py-0.5 rounded-sm">
                            {imageIdx + 1}/{carImages.length}
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => nextCarImage(car.id, carImages.length, e)}
                            className="bg-black/75 hover:bg-black/90 text-white rounded p-1"
                          >
                            <ChevronRightSquare className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${
                          car.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300' :
                          car.status === 'Sold' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300'
                        }`}>
                          {car.status}
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold truncate">
                            {car.make || car.brand} {car.model}
                          </CardTitle>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {car.year} | {car.color || 'Unspecified'} | Qty: {car.quantity}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 pb-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-mono font-medium text-slate-400 truncate mb-2">
                          VIN: {car.vin}
                        </div>
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                          LKR {car.price.toLocaleString()}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-slate-700 dark:text-slate-300"
                          onClick={() => navigate(`/cars/${car.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          onClick={() => openEdit(car)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => openDelete(car.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div className="text-sm text-slate-500">
              Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl" onClose={() => setIsFormOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editingCar ? 'Edit Car' : 'Add New Car'}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Make</label>
                  <Input {...register("make", { required: true })} placeholder="e.g. Toyota" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Model</label>
                  <Input {...register("model", { required: true })} placeholder="e.g. Camry" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Year</label>
                  <Input type="number" {...register("year", { required: true, valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Price (LKR)</label>
                  <Input type="number" {...register("price", { required: true, valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <Select {...register("status")}>
                    <option value="Available">Available</option>
                    <option value="Pending">Pending</option>
                    <option value="Sold">Sold</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" {...register("quantity", { required: true, valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">VIN</label>
                  <Input {...register("vin", { required: true })} placeholder="VIN Number" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Color</label>
                  <Input {...register("color")} placeholder="e.g. Black, White" />
                </div>
              </div>

              {/* Currently Uploaded Photos */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Currently Uploaded Photos ({imagesList.length})
                </label>
                {imagesList.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 max-h-[120px] overflow-y-auto pr-1">
                    {imagesList.map((url: string, idx: number) => (
                      <div key={idx} className="relative group aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <img src={url} alt="Uploaded photo" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImageUrl(idx)}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 block py-1">No images currently uploaded.</span>
                )}
              </div>

              {/* Multiple Local Files Upload Manager */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  Upload New Reference Photos
                </label>
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-400"
                  />
                  <span className="text-[10px] text-slate-400">Select one or more image files (.jpg, .png, etc.)</span>
                </div>

                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2 max-h-[120px] overflow-y-auto pr-1">
                    {previewUrls.map((url: string, idx: number) => (
                      <div key={idx} className="relative group aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    {selectedFiles.length > 0 ? "Uploading photos..." : "Saving..."}
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent onClose={() => setIsDeleteOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-slate-500">Are you sure you want to delete this car? This action cannot be undone.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
