// User Types
export type UserRole = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  county?: string;
  town?: string;
  idNumber?: string;
  mpesaPhone?: string;
}

// Product Types
export type PackagingType = 'CARTON' | 'BALE' | 'SACHET' | 'OUTER' | 'SINGLE';

export interface PackagingOption {
  type: PackagingType;
  unitsPerPackage: number;
  pricePerPackage: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  basePrice: number;
  stock: number;
  packaging: PackagingOption[];
  supplierId?: string;
  supplierName?: string;
  featured?: boolean;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  packagingType: PackagingType;
  pricePerUnit: number;
}

// Order Types
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'MPESA' | 'CASH' | 'CARD';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface DeliveryAddress {
  county: string;
  town: string;
  streetAddress: string;
  phone: string;
  additionalInfo?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: DeliveryAddress;
  mpesaTransactionCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Kenyan Location Types
export interface County {
  name: string;
  towns: string[];
}

export const KENYAN_COUNTIES: County[] = [
  { name: 'Nairobi', towns: ['Nairobi CBD', 'Westlands', 'Kasarani', 'Embakasi', 'Dagoretti', 'Kibra'] },
  { name: 'Mombasa', towns: ['Mombasa Island', 'Likoni', 'Changamwe', 'Jomvu', 'Kisauni', 'Nyali'] },
  { name: 'Kiambu', towns: ['Thika', 'Kikuyu', 'Ruiru', 'Limuru', 'Kiambu Town', 'Juja'] },
  { name: 'Nakuru', towns: ['Nakuru Town', 'Naivasha', 'Gilgil', 'Molo', 'Njoro'] },
  { name: 'Machakos', towns: ['Machakos Town', 'Athi River', 'Kangundo', 'Matungulu'] },
  { name: 'Kajiado', towns: ['Kajiado Town', 'Ngong', 'Kitengela', 'Ongata Rongai'] },
  { name: 'Kisumu', towns: ['Kisumu Town', 'Ahero', 'Maseno', 'Kondele'] },
  { name: 'Uasin Gishu', towns: ['Eldoret', 'Turbo', 'Burnt Forest', 'Soy'] },
  { name: 'Meru', towns: ['Meru Town', 'Maua', 'Nkubu', 'Timau'] },
  { name: 'Kilifi', towns: ['Kilifi Town', 'Malindi', 'Watamu', 'Gede'] },
];

// VAT Constant
export const VAT_RATE = 0.16; // 16% VAT in Kenya
