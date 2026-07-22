import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Car, 
  DollarSign, 
  Building, 
  GraduationCap, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { CustomerService } from '@/services/CustomerService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // New Customer Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await CustomerService.getCustomers(page, limit, search);
      setCustomers(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error("Failed to load customers", error);
      toast.error("Failed to load customers data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      await CustomerService.createCustomer(newCustomer);
      toast.success("Customer created successfully");
      setDialogOpen(false);
      setNewCustomer({ fullName: '', email: '', phone: '', address: '' });
      loadCustomers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination totals
  const totalPages = Math.ceil(total / limit) || 1;

  // Render badges helper
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Corporate':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-400">
            <Building className="w-3 h-3" /> Corporate
          </span>
        );
      case 'Retail':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
            <UserIcon className="w-3 h-3" /> Retail
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:text-purple-400">
            <GraduationCap className="w-3 h-3" /> Government
          </span>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Relationship Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">View purchasing history, contact information, and client segmentation.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add New Customer
        </Button>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-slate-500 mt-1">Active buyers & prospects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Corporate Accounts</CardTitle>
            <Building className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.type === 'Corporate').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Premium partnership buyers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Vehicles Handed Over</CardTitle>
            <Car className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.reduce((acc, c) => acc + (c.vehiclesPurchased || 0), 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total customer vehicles delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 space-y-4 sm:space-y-0">
          <CardTitle>Customer Registry</CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead className="text-center">Vehicles Bought</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      <span className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                      Loading customer registry...
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No customers found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {c.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2) || 'U'}
                          </div>
                          <div>
                            <div className="leading-none mb-1">{c.name}</div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ID: {c.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(c.type)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1 text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium font-mono">{c.vehiclesPurchased ?? 0}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                        LKR {(c.totalSpent ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
              <span className="text-xs text-slate-500">
                Showing page {page} of {totalPages}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" /> Register Dealership Customer
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Full Name</label>
              <Input
                placeholder="e.g. Priyantha Perera"
                value={newCustomer.fullName}
                onChange={e => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <Input
                  placeholder="+94 77 123 4567"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Residential/Billing Address</label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <Input
                  placeholder="Street, City, Sri Lanka"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex items-center gap-1.5">
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Save Customer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
