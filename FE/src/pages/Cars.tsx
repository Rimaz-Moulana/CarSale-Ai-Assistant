import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, Car as CarIcon } from 'lucide-react';
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

  const { register, handleSubmit, reset, formState: { errors } } = useReactHookForm<Car>();

  useEffect(() => {
    loadCars();
  }, [page, search, statusFilter]);

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
    reset({ make: '', model: '', year: new Date().getFullYear(), price: 0, status: 'Available', quantity: 1, vin: '', imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=150&q=80' });
    setIsFormOpen(true);
  };

  const openEdit = (car: Car) => {
    setEditingCar(car);
    reset(car);
    setIsFormOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: Car) => {
    try {
      if (editingCar) {
        await CarsService.updateCar(editingCar.id, data);
        toast.success("Car updated successfully");
      } else {
        await CarsService.createCar(data);
        toast.success("Car added successfully");
      }
      setIsFormOpen(false);
      loadCars();
    } catch (err) {
      console.error("Failed to save car", err);
      toast.error("Failed to save car");
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-12 h-12 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="w-32 h-4 mb-2" /><Skeleton className="w-16 h-3" /></TableCell>
                    <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-16 h-6 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="w-8 h-4" /></TableCell>
                    <TableCell><div className="flex justify-end gap-2"><Skeleton className="w-8 h-8 rounded-md" /><Skeleton className="w-8 h-8 rounded-md" /></div></TableCell>
                  </TableRow>
                ))
              ) : cars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState 
                      icon={<CarIcon className="w-6 h-6" />}
                      title="No cars found"
                      description="We couldn't find any vehicles matching your current filters."
                      actionLabel={search || statusFilter !== 'All' ? "Clear Filters" : undefined}
                      onAction={() => { setSearch(''); setStatusFilter('All'); setPage(1); }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                cars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <img src={car.imageUrl} alt={`${car.make} ${car.model}`} className="w-12 h-12 object-cover rounded-md" />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{car.make} {car.model}</div>
                      <div className="text-xs text-slate-500">{car.year}</div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-slate-500">{car.vin}</TableCell>
                    <TableCell className="font-medium">LKR {car.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        car.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                        car.status === 'Sold' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}>
                        {car.status}
                      </span>
                    </TableCell>
                    <TableCell>{car.quantity}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(car)}>
                        <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(car.id)}>
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

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
        <DialogContent onClose={() => setIsFormOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editingCar ? 'Edit Car' : 'Add New Car'}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
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
              <div className="space-y-1">
                <label className="text-sm font-medium">VIN</label>
                <Input {...register("vin", { required: true })} placeholder="Vehicle Identification Number" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Image URL</label>
                <Input {...register("imageUrl")} placeholder="https://..." />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
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
