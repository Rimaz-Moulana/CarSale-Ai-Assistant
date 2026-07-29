import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { DollarSign, TrendingUp, Car, Box, Clock, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { FinanceService } from '@/services/FinanceService';
import { SalesService } from '@/services/SalesService';
import { SupplierService } from '@/services/SupplierService';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashMetrics, recentSales, pendingOrders] = await Promise.all([
          FinanceService.getDashboardMetrics().catch(err => {
            console.error('Failed getDashboardMetrics', err);
            return null;
          }),
          SalesService.getSalesList(1, 5).then(res => res?.data || []).catch(err => {
            console.error('Failed getSalesList', err);
            return [];
          }),
          SupplierService.getPurchaseOrders(1, 5, '', 'Pending').then(res => res?.data || []).catch(err => {
            console.error('Failed getPurchaseOrders', err);
            return [];
          })
        ]);
        setData(dashMetrics || {
          kpis: { revenue: 0, expenses: 0, profit: 0, cashFlow: 0, outstandingPayments: 0, inventoryValue: 0, carsSold: 0, activeInventory: 0, pendingOrders: 0 },
          salesTrend: [],
          revenueVsExpenses: [],
          vehicleCategories: []
        });
        setSales(recentSales || []);
        setOrders(pendingOrders || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[300px] w-full" />)}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const salesTrend = (data?.salesTrend || []).map((item: any) => ({
    name: item.name,
    sales: item.sales ?? item.profit ?? 0
  }));
  const revenueVsExpenses = data?.revenueVsExpenses || [];
  const vehicleCategories = data?.vehicleCategories || [];
  const statusCounts = data?.statusCounts || {
    totalCars: 0,
    availableCars: 0,
    soldCars: 0,
    pendingCars: 0,
    completedSales: 0,
    pendingSales: 0,
    cancelledSales: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">CEO Dashboard</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {(kpis.totalRevenue ?? kpis.revenue ?? 0).toLocaleString()}</div>
            <p className="text-xs text-emerald-500 mt-1">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {(kpis.monthlyProfit ?? kpis.profit ?? 0).toLocaleString()}</div>
            <p className="text-xs text-blue-500 mt-1">+5.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cars Sold</CardTitle>
            <Car className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.carsSold ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">Target: 150</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Available Inventory</CardTitle>
            <Box className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeInventory ?? (kpis.inventoryValue ? `LKR ${(kpis.inventoryValue).toLocaleString()}` : 0)}</div>
            <p className="text-xs text-slate-500 mt-1">45 new units in transit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingOrders ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">Needs approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Procurement Cost</CardTitle>
            <ShoppingCart className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {(kpis.procurementCost ?? kpis.expenses ?? 0).toLocaleString()}</div>
            <p className="text-xs text-rose-500 mt-1">Slightly above budget</p>
          </CardContent>
        </Card>
      </div>

      {/* CEO Status Overview Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Car Inventory Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">Car Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500">Total Vehicles</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">{statusCounts.totalCars ?? 0}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded-md">
                  <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">Available</div>
                  <div className="text-base font-bold text-green-700 dark:text-green-300">{statusCounts.availableCars ?? 0}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending</div>
                  <div className="text-base font-bold text-amber-700 dark:text-amber-300">{statusCounts.pendingCars ?? 0}</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Sold</div>
                  <div className="text-base font-bold text-slate-700 dark:text-slate-300">{statusCounts.soldCars ?? 0}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Funnel Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sales Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[90px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Completed', count: statusCounts.completedSales ?? 0 },
                  { name: 'Pending', count: statusCounts.pendingSales ?? 0 },
                  { name: 'Cancelled', count: statusCounts.cancelledSales ?? 0 }
                ]} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={75} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)', fontSize: 11 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">Procurement Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1.5 text-center pt-2">
              <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                <div className="text-[9px] text-slate-500 font-medium truncate">Pending</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{statusCounts.pendingOrders ?? 0}</div>
              </div>
              <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/20">
                <div className="text-[9px] text-blue-600 dark:text-blue-400 font-medium truncate">Approved</div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{statusCounts.approvedOrders ?? 0}</div>
              </div>
              <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/20">
                <div className="text-[9px] text-purple-600 dark:text-purple-400 font-medium truncate">Transit</div>
                <div className="text-sm font-bold text-purple-700 dark:text-purple-300">{statusCounts.inTransitOrders ?? 0}</div>
              </div>
              <div className="p-1 rounded bg-green-50 dark:bg-green-950/20">
                <div className="text-[9px] text-green-600 dark:text-green-400 font-medium truncate">Delivered</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-300">{statusCounts.deliveredOrders ?? 0}</div>
              </div>
              <div className="p-1 rounded bg-red-50 dark:bg-red-950/20">
                <div className="text-[9px] text-red-600 dark:text-red-400 font-medium truncate">Cancelled</div>
                <div className="text-sm font-bold text-red-700 dark:text-red-300">{statusCounts.cancelledOrders ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Sales Trend */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue vs Expenses */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsExpenses}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (k LKR)" />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses (k LKR)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Category Pie Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Inventory Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {vehicleCategories.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: any) => (
                  <TableRow key={sale.id || sale.invoiceNo}>
                    <TableCell className="font-medium">{sale.customerName || 'Customer'}</TableCell>
                    <TableCell>{sale.vehicle || `${sale.make || ''} ${sale.model || ''}`.trim() || 'Vehicle'}</TableCell>
                    <TableCell className="text-right font-semibold">LKR {(sale.amount ?? sale.totalAmount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po: any) => (
                  <TableRow key={po.id || po.poNumber}>
                    <TableCell className="font-medium">{po.supplier || 'Supplier'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        {po.status || 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">LKR {(po.totalCost ?? po.totalAmount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}
