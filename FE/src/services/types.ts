// Generic Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Car Interfaces
export interface Car {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: 'Available' | 'Sold' | 'Pending';
  quantity: number;
  imageUrl?: string;
}

// Sales Interfaces
export interface Sale {
  id: string;
  invoiceNo: string;
  customerName: string;
  vehicle: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
}

export interface SalesMetrics {
  todaysSales: number;
  monthlySales: number;
  revenue: number;
  profit: number;
}

// Customer Interfaces
export interface Customer {
  id: string;
  name: string;
  type: 'Retail' | 'Corporate' | 'Government';
  totalSpent: number;
  vehiclesPurchased: number;
  email: string;
  phone: string;
}

// Supplier Interfaces
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: 'Pending' | 'Approved' | 'In Transit' | 'Delivered' | 'Cancelled';
  expectedDelivery: string;
  totalCost: number;
}

// Inventory Interfaces
export interface InventoryItem {
  id: string;
  vehicle: string;
  quantity: number;
  location: string;
  status: 'Available' | 'Reserved' | 'Low Stock' | 'Sold' | 'Critical';
  reorderLevel: number;
}

export interface InventoryMetrics {
  totalVehicles: number;
  availableStock: number;
  reserved: number;
  sold: number;
  lowStock: number;
  inventoryValue: number;
}

// Finance Interfaces
export interface FinanceMetrics {
  revenue: number;
  expenses: number;
  profit: number;
  cashFlow: number;
  outstandingPayments: number;
  inventoryValue: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'Income' | 'Expense';
  amount: number;
  status: string;
}

// AI Chat Interfaces
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
