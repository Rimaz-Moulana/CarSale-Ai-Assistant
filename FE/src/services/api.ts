import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Car {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: 'Available' | 'Sold' | 'Pending';
  quantity: number;
  imageUrl: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Generate some mock cars for pagination testing
let mockCars: Car[] = Array.from({ length: 45 }).map((_, i) => ({
  id: `${i + 1}`,
  vin: `VIN${String(i).padStart(5, '0')}XYZ`,
  make: ['Honda', 'Toyota', 'BMW', 'Audi', 'Tesla', 'Ford', 'Chevrolet'][i % 7],
  model: ['Sedan', 'SUV', 'Truck', 'Coupe'][i % 4],
  year: 2020 + (i % 5),
  price: 25000 + (i * 1000),
  status: i % 5 === 0 ? 'Sold' : (i % 7 === 0 ? 'Pending' : 'Available'),
  quantity: i % 5 === 0 ? 0 : (i % 3) + 1,
  imageUrl: `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=150&q=80` // Placeholder generic car
}));

// Generate 45 mock sales for pagination testing
let mockSalesList = Array.from({ length: 45 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  return {
    id: `INV-${1000 + i}`,
    invoiceNo: `INV-${1000 + i}`,
    customerName: ['Alice Johnson', 'Michael Smith', 'Sarah Davis', 'James Wilson', 'Emily Brown'][i % 5],
    vehicle: ['BMW X5', 'Audi Q7', 'Tesla Model 3', 'Mercedes C-Class', 'Honda Accord'][i % 5],
    amount: 25000 + (i * 1500) % 50000,
    date: d.toISOString().split('T')[0],
    status: i % 4 === 0 ? 'Pending' : (i % 7 === 0 ? 'Cancelled' : 'Completed')
  };
});

// Generate 45 mock procurement orders for pagination testing
let mockProcurementList = Array.from({ length: 45 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + (i % 15));
  return {
    id: `PO-${5000 + i}`,
    poNumber: `PO-${5000 + i}`,
    supplier: ['Global Auto Parts', 'Japan Motors Inc', 'EuroTech Suppliers', 'US Vehicles Wholesale', 'Electro Drive Inc'][i % 5],
    status: i % 5 === 0 ? 'Delivered' : (i % 3 === 0 ? 'Approved' : (i % 7 === 0 ? 'Cancelled' : 'In Transit')),
    expectedDelivery: d.toISOString().split('T')[0],
    totalCost: 150000 + (i * 25000) % 2000000,
  };
});

// Generate 45 mock inventory items
let mockInventoryList = Array.from({ length: 45 }).map((_, i) => {
  return {
    id: `INV-ITEM-${1000 + i}`,
    vehicle: ['BMW X5 2024', 'Audi Q7 2023', 'Tesla Model 3 2024', 'Mercedes C-Class 2022', 'Honda Accord 2025'][i % 5],
    quantity: (i % 7) * 2 + 1,
    location: ['Main Showroom', 'Warehouse A', 'Warehouse B'][i % 3],
    status: i % 8 === 0 ? 'Low Stock' : (i % 6 === 0 ? 'Reserved' : (i % 11 === 0 ? 'Sold' : 'Available')),
    reorderLevel: 5,
  };
});

export const api = {
  // Cars CRUD with Pagination and Filtering
  getCars: async (page = 1, limit = 10, search = '', statusFilter = ''): Promise<PaginatedResponse<Car>> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockCars;
        if (search) {
          filtered = filtered.filter(c => 
            c.make.toLowerCase().includes(search.toLowerCase()) || 
            c.model.toLowerCase().includes(search.toLowerCase()) ||
            c.vin.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (statusFilter && statusFilter !== 'All') {
          filtered = filtered.filter(c => c.status === statusFilter);
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedData = filtered.slice(start, end);

        resolve({
          data: paginatedData,
          total: filtered.length,
          page,
          limit
        });
      }, 500);
    });
  },

  // Sales Management endpoints
  getSalesMetrics: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          todaysSales: 4,
          monthlySales: 128,
          revenue: 2450000,
          profit: 340000
        });
      }, 200);
    });
  },

  getSalesList: async (page = 1, limit = 10, search = '', dateFilter = '', statusFilter = '') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockSalesList;
        if (search) {
          filtered = filtered.filter(s => 
            s.invoiceNo.toLowerCase().includes(search.toLowerCase()) || 
            s.customerName.toLowerCase().includes(search.toLowerCase()) ||
            s.vehicle.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (dateFilter) {
          filtered = filtered.filter(s => s.date === dateFilter);
        }
        if (statusFilter && statusFilter !== 'All') {
          filtered = filtered.filter(s => s.status === statusFilter);
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedData = filtered.slice(start, end);

        resolve({
          data: paginatedData,
          total: filtered.length,
          page,
          limit
        });
      }, 400);
    });
  },

  createCar: async (car: Omit<Car, 'id'>): Promise<Car> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCar = { ...car, id: Math.random().toString(36).substr(2, 9) };
        mockCars = [newCar, ...mockCars];
        resolve(newCar);
      }, 500);
    });
  },

  // Procurement Endpoints
  getProcurementMetrics: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          activeOrders: 12,
          pendingDeliveries: 5,
          totalSpend: 4500000,
          deliveredThisMonth: 8
        });
      }, 200);
    });
  },

  getProcurementList: async (page = 1, limit = 10, search = '', statusFilter = '') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockProcurementList;
        if (search) {
          filtered = filtered.filter(p => 
            p.poNumber.toLowerCase().includes(search.toLowerCase()) || 
            p.supplier.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (statusFilter && statusFilter !== 'All') {
          filtered = filtered.filter(p => p.status === statusFilter);
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedData = filtered.slice(start, end);

        resolve({
          data: paginatedData,
          total: filtered.length,
          page,
          limit
        });
      }, 400);
    });
  },

  createPurchaseOrder: async (poData: any) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newPO = {
          ...poData,
          id: `PO-${Math.floor(Math.random() * 10000)}`,
          poNumber: `PO-${Math.floor(Math.random() * 10000)}`
        };
        mockProcurementList = [newPO, ...mockProcurementList];
        resolve(newPO);
      }, 500);
    });
  },

  // Inventory Endpoints
  getInventoryMetrics: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalVehicles: 342,
          availableStock: 215,
          reserved: 45,
          sold: 82,
          lowStock: 12,
          inventoryValue: 1250000000 // In LKR
        });
      }, 200);
    });
  },

  getInventoryList: async (page = 1, limit = 10, search = '', locationFilter = '') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockInventoryList;
        if (search) {
          filtered = filtered.filter(i => 
            i.vehicle.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (locationFilter && locationFilter !== 'All') {
          filtered = filtered.filter(i => i.location === locationFilter);
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedData = filtered.slice(start, end);

        resolve({
          data: paginatedData,
          total: filtered.length,
          page,
          limit
        });
      }, 400);
    });
  },

  // Finance Endpoints
  getFinanceMetrics: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          revenue: 125000000,
          expenses: 85000000,
          profit: 40000000,
          cashFlow: 15000000,
          outstandingPayments: 4500000,
          inventoryValue: 1250000000
        });
      }, 200);
    });
  },

  getFinanceCharts: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          cashFlowTrend: [
            { name: 'Jan', in: 120, out: 80 },
            { name: 'Feb', in: 135, out: 90 },
            { name: 'Mar', in: 110, out: 95 },
            { name: 'Apr', in: 150, out: 100 },
            { name: 'May', in: 140, out: 110 },
            { name: 'Jun', in: 165, out: 120 }
          ],
          monthlyProfit: [
            { name: 'Jan', profit: 40 },
            { name: 'Feb', profit: 45 },
            { name: 'Mar', profit: 15 },
            { name: 'Apr', profit: 50 },
            { name: 'May', profit: 30 },
            { name: 'Jun', profit: 45 }
          ],
          expenseBreakdown: [
            { name: 'Procurement', value: 65, color: '#3b82f6' },
            { name: 'Payroll', value: 15, color: '#8b5cf6' },
            { name: 'Marketing', value: 10, color: '#10b981' },
            { name: 'Operations', value: 10, color: '#f59e0b' }
          ]
        });
      }, 200);
    });
  },

  getRecentTransactions: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'TX-1001', date: '2026-07-14', description: 'Vehicle Sale - INV-1023', type: 'Income', amount: 8500000, status: 'Completed' },
          { id: 'TX-1002', date: '2026-07-13', description: 'Supplier Payment - PO-5002', type: 'Expense', amount: 4500000, status: 'Completed' },
          { id: 'TX-1003', date: '2026-07-13', description: 'Showroom Lease Payment', type: 'Expense', amount: 250000, status: 'Completed' },
          { id: 'TX-1004', date: '2026-07-12', description: 'Vehicle Sale - INV-1005', type: 'Income', amount: 12500000, status: 'Pending' },
          { id: 'TX-1005', date: '2026-07-11', description: 'Marketing Agency Retainer', type: 'Expense', amount: 150000, status: 'Completed' }
        ]);
      }, 200);
    });
  },

  // Reports Endpoints
  getReportData: async (reportType: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch(reportType) {
          case 'daily_sales':
            resolve({
              chartData: [
                { time: '09:00', sales: 2 },
                { time: '12:00', sales: 5 },
                { time: '15:00', sales: 3 },
                { time: '18:00', sales: 4 }
              ],
              tableData: [
                { id: '1', item: 'BMW X5 2024', amount: 15000000, customer: 'John Doe' },
                { id: '2', item: 'Audi Q7 2023', amount: 12000000, customer: 'Jane Smith' },
                { id: '3', item: 'Tesla Model 3', amount: 8000000, customer: 'Acme Corp' }
              ]
            });
            break;
          case 'monthly_revenue':
            resolve({
              chartData: [
                { name: 'Jan', revenue: 400 },
                { name: 'Feb', revenue: 300 },
                { name: 'Mar', revenue: 550 },
                { name: 'Apr', revenue: 450 },
                { name: 'May', revenue: 600 },
                { name: 'Jun', revenue: 700 }
              ],
              tableData: [
                { id: '1', month: 'June', revenue: '700M', growth: '+16%' },
                { id: '2', month: 'May', revenue: '600M', growth: '+33%' },
                { id: '3', month: 'April', revenue: '450M', growth: '-18%' }
              ]
            });
            break;
          case 'inventory':
            resolve({
              chartData: [
                { name: 'Main Showroom', count: 120 },
                { name: 'Warehouse A', count: 85 },
                { name: 'Warehouse B', count: 40 }
              ],
              tableData: [
                { id: '1', model: 'Honda Civic', location: 'Main Showroom', stock: 2, status: 'Low Stock' },
                { id: '2', model: 'Toyota Camry', location: 'Warehouse A', stock: 1, status: 'Critical' },
                { id: '3', model: 'Ford Mustang', location: 'Warehouse B', stock: 3, status: 'Low Stock' }
              ]
            });
            break;
          case 'procurement':
            resolve({
              chartData: [
                { name: 'Pending', count: 15 },
                { name: 'Approved', count: 10 },
                { name: 'In Transit', count: 25 },
                { name: 'Delivered', count: 50 }
              ],
              tableData: [
                { id: '1', po: 'PO-5011', supplier: 'Global Auto Parts', status: 'Pending', total: 4500000 },
                { id: '2', po: 'PO-5012', supplier: 'Japan Motors', status: 'In Transit', total: 12000000 },
                { id: '3', po: 'PO-5013', supplier: 'EuroTech', status: 'Approved', total: 8500000 }
              ]
            });
            break;
          case 'customer':
            resolve({
              chartData: [
                { name: 'Retail', value: 60, color: '#3b82f6' },
                { name: 'Corporate', value: 30, color: '#10b981' },
                { name: 'Government', value: 10, color: '#f59e0b' }
              ],
              tableData: [
                { id: '1', name: 'Acme Corp', type: 'Corporate', totalSpent: 45000000, vehicles: 12 },
                { id: '2', name: 'Tech Solutions', type: 'Corporate', totalSpent: 28000000, vehicles: 6 },
                { id: '3', name: 'John Doe', type: 'Retail', totalSpent: 15000000, vehicles: 1 }
              ]
            });
            break;
          default:
            resolve({});
        }
      }, 300);
    });
  },

  updateCar: async (id: string, updates: Partial<Car>): Promise<Car> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCars.findIndex(c => c.id === id);
        if (index > -1) {
          mockCars[index] = { ...mockCars[index], ...updates };
          resolve(mockCars[index]);
        } else {
          reject(new Error("Car not found"));
        }
      }, 500);
    });
  },

  deleteCar: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockCars = mockCars.filter(c => c.id !== id);
        resolve();
      }, 500);
    });
  },

  // Dashboard Metrics (kept simplified for space)
  getDashboardMetrics: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          kpis: { totalRevenue: 2450000, monthlyProfit: 340000, carsSold: 128, activeInventory: 342, pendingOrders: 15, procurementCost: 850000 },
          salesTrend: [{ name: 'Jan', sales: 45 }, { name: 'Feb', sales: 52 }],
          revenueVsExpenses: [{ name: 'Jan', revenue: 400, expenses: 240 }],
          vehicleCategories: [{ name: 'SUV', value: 400, color: '#3b82f6' }]
        });
      }, 200);
    });
  },
  getRecentSales: async () => {
    return new Promise(r => setTimeout(() => r([]), 200));
  },
  getPendingPurchaseOrders: async () => {
    return new Promise(r => setTimeout(() => r([]), 200));
  }
};
