import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { FileText, FileSpreadsheet, Printer, Download, Calendar, BarChart3, Package, Truck, Users } from 'lucide-react';
import { ReportsService } from '@/services/ReportsService';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

type ReportTab = 'daily_sales' | 'monthly_revenue' | 'inventory' | 'procurement' | 'customer';

const tabs = [
  { id: 'daily_sales', label: 'Daily Sales', icon: Calendar },
  { id: 'monthly_revenue', label: 'Monthly Revenue', icon: BarChart3 },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'procurement', label: 'Procurement', icon: Truck },
  { id: 'customer', label: 'Customers', icon: Users },
];

export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily_sales');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await ReportsService.getReportData(activeTab);
        setData(res);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  const handleExport = (type: string) => {
    // Simulated export action
    toast.success(`Generating ${type} for ${tabs.find(t => t.id === activeTab)?.label}...`);
  };

  const renderActiveReport = () => {
    if (loading || !data) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[350px] w-full" />
        </div>
      );
    }

    switch (activeTab) {
      case 'daily_sales':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Sales Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)' }} />
                    <Bar dataKey="sales" name="Vehicles Sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sales Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount (LKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tableData.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.item}</TableCell>
                        <TableCell>{row.customer}</TableCell>
                        <TableCell className="text-right">LKR {row.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 'monthly_revenue':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue (Millions LKR) - Last 6 Months</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Revenue (LKR)</TableHead>
                      <TableHead className="text-right">Growth (MoM)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tableData.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell>{row.revenue}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.growth.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {row.growth}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock by Location</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)' }} />
                    <Bar dataKey="count" name="Vehicles" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tableData.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.model}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell className="text-center font-semibold text-rose-500">{row.stock}</TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                            {row.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 'procurement':
      case 'customer':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{activeTab === 'customer' ? 'Customer Demographics' : 'PO Status Breakdown'}</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey={activeTab === 'customer' ? 'value' : 'count'}
                    >
                      {data.chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{activeTab === 'customer' ? 'Top Customers' : 'Active Purchase Orders'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeTab === 'customer' ? (
                        <>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center">Vehicles</TableHead>
                          <TableHead className="text-right">Total Spent (LKR)</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total (LKR)</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tableData.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{activeTab === 'customer' ? row.name : row.po}</TableCell>
                        <TableCell>{activeTab === 'customer' ? row.type : row.supplier}</TableCell>
                        {activeTab === 'customer' ? (
                          <TableCell className="text-center">{row.vehicles}</TableCell>
                        ) : (
                          <TableCell>{row.status}</TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {(activeTab === 'customer' ? row.totalSpent : row.total).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-12"
    >
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports Center</h2>
          <p className="text-slate-500 mt-1">Generate, view, and export company reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('PDF')}>
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('Excel')}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <Button onClick={() => handleExport('Print')}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0">
          <Card>
            <CardContent className="p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ReportTab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap lg:whitespace-normal text-left ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0">
          <Card className="mb-6 bg-slate-50 dark:bg-slate-900/50 border-dashed">
            <CardContent className="p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                {tabs.find(t => t.id === activeTab)?.label} Report
              </h3>
              <Button variant="ghost" size="sm" onClick={() => handleExport('Quick Print')}>
                <Download className="w-4 h-4 mr-2" /> Download Section
              </Button>
            </CardContent>
          </Card>
          
          {renderActiveReport()}
        </div>
      </div>
    </motion.div>
  );
}
