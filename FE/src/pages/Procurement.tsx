import React, { useEffect, useState } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, PackageSearch, Truck, DollarSign, CalendarCheck } from 'lucide-react';
import { SupplierService } from '@/services/SupplierService';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';

export function Procurement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const limit = 10;

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    loadData();
  }, [page, search, statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [listRes, metricsRes] = await Promise.all([
        SupplierService.getPurchaseOrders(page, limit, search, statusFilter),
        SupplierService.getProcurementMetrics()
      ]);
      setOrders(listRes.data);
      setTotal(listRes.total);
      setMetrics(metricsRes);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load procurement data");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const openCreate = () => {
    reset({
      supplier: '',
      status: 'Pending',
      expectedDelivery: new Date().toISOString().split('T')[0],
      totalCost: 0
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      await SupplierService.createPurchaseOrder(data);
      toast.success("Purchase order created successfully");
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      console.error("Failed to create PO", err);
      toast.error("Failed to create purchase order");
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
        <h2 className="text-3xl font-bold tracking-tight">Procurement</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <PackageSearch className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Truck className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingDeliveries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Spend (Month)</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {(metrics?.totalSpend || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Delivered (Month)</CardTitle>
            <CalendarCheck className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.deliveredThisMonth || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by PO Number or Supplier..."
                className="pl-9"
                value={search}
                onChange={handleSearch}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onChange={handleStatusFilter}>
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-32 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-20 h-6 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                    <TableCell><Skeleton className="w-24 h-4 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState 
                      icon={<PackageSearch className="w-6 h-6" />}
                      title="No purchase orders found"
                      description="No records matched your current filters."
                      actionLabel={search || statusFilter !== 'All' ? "Clear Filters" : undefined}
                      onAction={() => { setSearch(''); setStatusFilter('All'); setPage(1); }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm font-medium text-slate-600 dark:text-slate-300">{po.poNumber}</TableCell>
                    <TableCell className="font-medium">{po.supplier}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        po.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                        po.status === 'In Transit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                        po.status === 'Approved' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' :
                        po.status === 'Cancelled' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}>
                        {po.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{po.expectedDelivery}</TableCell>
                    <TableCell className="text-right font-medium">LKR {po.totalCost.toLocaleString()}</TableCell>
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

      {/* Create PO Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent onClose={() => setIsFormOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Supplier Name</label>
                <Input {...register("supplier", { required: true })} placeholder="e.g. Global Auto Parts" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Expected Delivery Date</label>
                <Input type="date" {...register("expectedDelivery", { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <Select {...register("status")}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="In Transit">In Transit</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Total Cost (LKR)</label>
                  <Input type="number" {...register("totalCost", { required: true, valueAsNumber: true })} />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit">Create Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
