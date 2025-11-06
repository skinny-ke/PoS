import { Order, OrderStatus, PaymentStatus } from '../types';
import { mockProducts, mockUser } from './mock-data';

// Generate mock orders
export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    userId: '1',
    items: [
      {
        product: mockProducts[0],
        quantity: 5,
        packagingType: 'CARTON',
        pricePerUnit: 2200,
      },
      {
        product: mockProducts[2],
        quantity: 2,
        packagingType: 'SINGLE',
        pricePerUnit: 1200,
      },
    ],
    subtotal: 13400,
    vat: 2144,
    deliveryFee: 500,
    total: 16044,
    status: 'DELIVERED',
    paymentMethod: 'MPESA',
    paymentStatus: 'COMPLETED',
    deliveryAddress: {
      county: 'Nairobi',
      town: 'Westlands',
      streetAddress: 'Waiyaki Way, ABC Building',
      phone: '+254712345678',
    },
    mpesaTransactionCode: 'QFT8K9L0M1',
    createdAt: new Date('2025-10-28'),
    updatedAt: new Date('2025-10-30'),
  },
  {
    id: 'ORD-002',
    userId: '2',
    items: [
      {
        product: mockProducts[1],
        quantity: 10,
        packagingType: 'BALE',
        pricePerUnit: 1050,
      },
    ],
    subtotal: 10500,
    vat: 1680,
    deliveryFee: 800,
    total: 12980,
    status: 'SHIPPED',
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    deliveryAddress: {
      county: 'Kiambu',
      town: 'Thika',
      streetAddress: 'Thika Road, Shop 45',
      phone: '+254723456789',
    },
    createdAt: new Date('2025-10-30'),
    updatedAt: new Date('2025-10-31'),
  },
  {
    id: 'ORD-003',
    userId: '3',
    items: [
      {
        product: mockProducts[4],
        quantity: 8,
        packagingType: 'CARTON',
        pricePerUnit: 1550,
      },
    ],
    subtotal: 12400,
    vat: 1984,
    deliveryFee: 600,
    total: 14984,
    status: 'PROCESSING',
    paymentMethod: 'MPESA',
    paymentStatus: 'COMPLETED',
    deliveryAddress: {
      county: 'Nakuru',
      town: 'Nakuru Town',
      streetAddress: 'Kenyatta Avenue',
      phone: '+254734567890',
    },
    mpesaTransactionCode: 'QFT9K0L1M2',
    createdAt: new Date('2025-10-31'),
    updatedAt: new Date('2025-10-31'),
  },
  {
    id: 'ORD-004',
    userId: '4',
    items: [
      {
        product: mockProducts[3],
        quantity: 15,
        packagingType: 'BALE',
        pricePerUnit: 2850,
      },
    ],
    subtotal: 42750,
    vat: 6840,
    deliveryFee: 1000,
    total: 50590,
    status: 'CONFIRMED',
    paymentMethod: 'CARD',
    paymentStatus: 'COMPLETED',
    deliveryAddress: {
      county: 'Mombasa',
      town: 'Mombasa Island',
      streetAddress: 'Moi Avenue',
      phone: '+254745678901',
    },
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: 'ORD-005',
    userId: '1',
    items: [
      {
        product: mockProducts[5],
        quantity: 3,
        packagingType: 'CARTON',
        pricePerUnit: 5800,
      },
    ],
    subtotal: 17400,
    vat: 2784,
    deliveryFee: 500,
    total: 20684,
    status: 'PENDING',
    paymentMethod: 'MPESA',
    paymentStatus: 'PENDING',
    deliveryAddress: {
      county: 'Nairobi',
      town: 'Kasarani',
      streetAddress: 'Thika Road Mall',
      phone: '+254712345678',
    },
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
];

// Employee type
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'EMPLOYEE' | 'ADMIN';
  position: string;
  salary: number;
  hireDate: Date;
  idNumber: string;
  county: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const mockEmployees: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Jane Wanjiru',
    email: 'jane@murimi.co.ke',
    phone: '+254701234567',
    role: 'ADMIN',
    position: 'Store Manager',
    salary: 75000,
    hireDate: new Date('2023-01-15'),
    idNumber: '12345678',
    county: 'Nairobi',
    status: 'ACTIVE',
  },
  {
    id: 'EMP-002',
    name: 'Peter Kamau',
    email: 'peter@murimi.co.ke',
    phone: '+254702345678',
    role: 'EMPLOYEE',
    position: 'Sales Associate',
    salary: 45000,
    hireDate: new Date('2023-06-20'),
    idNumber: '23456789',
    county: 'Kiambu',
    status: 'ACTIVE',
  },
  {
    id: 'EMP-003',
    name: 'Mary Akinyi',
    email: 'mary@murimi.co.ke',
    phone: '+254703456789',
    role: 'EMPLOYEE',
    position: 'Cashier',
    salary: 40000,
    hireDate: new Date('2024-03-10'),
    idNumber: '34567890',
    county: 'Nairobi',
    status: 'ACTIVE',
  },
  {
    id: 'EMP-004',
    name: 'James Ochieng',
    email: 'james@murimi.co.ke',
    phone: '+254704567890',
    role: 'EMPLOYEE',
    position: 'Stock Clerk',
    salary: 38000,
    hireDate: new Date('2024-07-01'),
    idNumber: '45678901',
    county: 'Kisumu',
    status: 'ACTIVE',
  },
];

// Payroll type
export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'PENDING' | 'PAID';
  paidDate?: Date;
}

export const mockPayroll: PayrollRecord[] = [
  {
    id: 'PAY-001',
    employeeId: 'EMP-001',
    employeeName: 'Jane Wanjiru',
    month: 'October',
    year: 2025,
    basicSalary: 75000,
    allowances: 10000,
    deductions: 8500,
    netSalary: 76500,
    status: 'PAID',
    paidDate: new Date('2025-10-31'),
  },
  {
    id: 'PAY-002',
    employeeId: 'EMP-002',
    employeeName: 'Peter Kamau',
    month: 'October',
    year: 2025,
    basicSalary: 45000,
    allowances: 5000,
    deductions: 5000,
    netSalary: 45000,
    status: 'PAID',
    paidDate: new Date('2025-10-31'),
  },
  {
    id: 'PAY-003',
    employeeId: 'EMP-003',
    employeeName: 'Mary Akinyi',
    month: 'October',
    year: 2025,
    basicSalary: 40000,
    allowances: 4000,
    deductions: 4400,
    netSalary: 39600,
    status: 'PAID',
    paidDate: new Date('2025-10-31'),
  },
  {
    id: 'PAY-004',
    employeeId: 'EMP-004',
    employeeName: 'James Ochieng',
    month: 'October',
    year: 2025,
    basicSalary: 38000,
    allowances: 3800,
    deductions: 4180,
    netSalary: 37620,
    status: 'PAID',
    paidDate: new Date('2025-10-31'),
  },
  {
    id: 'PAY-005',
    employeeId: 'EMP-001',
    employeeName: 'Jane Wanjiru',
    month: 'November',
    year: 2025,
    basicSalary: 75000,
    allowances: 10000,
    deductions: 8500,
    netSalary: 76500,
    status: 'PENDING',
  },
  {
    id: 'PAY-006',
    employeeId: 'EMP-002',
    employeeName: 'Peter Kamau',
    month: 'November',
    year: 2025,
    basicSalary: 45000,
    allowances: 5000,
    deductions: 5000,
    netSalary: 45000,
    status: 'PENDING',
  },
];

// Sales analytics data
export interface SalesData {
  date: string;
  sales: number;
  orders: number;
  profit: number;
}

export const mockSalesData: SalesData[] = [
  { date: '2025-10-25', sales: 125000, orders: 15, profit: 18750 },
  { date: '2025-10-26', sales: 98000, orders: 12, profit: 14700 },
  { date: '2025-10-27', sales: 145000, orders: 18, profit: 21750 },
  { date: '2025-10-28', sales: 167000, orders: 22, profit: 25050 },
  { date: '2025-10-29', sales: 134000, orders: 16, profit: 20100 },
  { date: '2025-10-30', sales: 189000, orders: 24, profit: 28350 },
  { date: '2025-10-31', sales: 156000, orders: 19, profit: 23400 },
  { date: '2025-11-01', sales: 178000, orders: 21, profit: 26700 },
];

// Product performance data
export interface ProductPerformance {
  productName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export const mockProductPerformance: ProductPerformance[] = [
  { productName: 'Maize Flour - Sifted', unitsSold: 450, revenue: 54000, profit: 8100 },
  { productName: 'Rice - Pishori Grade A', unitsSold: 320, revenue: 57600, profit: 8640 },
  { productName: 'Cooking Oil - 5L', unitsSold: 180, revenue: 216000, profit: 32400 },
  { productName: 'Sugar - White Refined', unitsSold: 520, revenue: 78000, profit: 11700 },
  { productName: 'Wheat Flour', unitsSold: 380, revenue: 51300, profit: 7695 },
  { productName: 'Tea Leaves - Kenya AA', unitsSold: 140, revenue: 35000, profit: 5250 },
  { productName: 'Beans - Red Kidney', unitsSold: 290, revenue: 46400, profit: 6960 },
  { productName: 'Salt - Iodized', unitsSold: 680, revenue: 30600, profit: 4590 },
];
