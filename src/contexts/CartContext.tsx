"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Product, PackagingType } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, packagingType?: PackagingType) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  vat: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number, packagingType?: PackagingType) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      let unitPrice = product.retailPrice;
      let unitsPerPackage = 1;

      // Get packaging-specific pricing if available
      if (packagingType && product.packaging) {
        const packaging = product.packaging.find(p => p.type === packagingType);
        if (packaging) {
          unitPrice = packaging.pricePerPackage;
          unitsPerPackage = packaging.unitsPerPackage;
        }
      }

      return [...prevItems, {
        product,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        discountAmount: 0,
        taxAmount: 0,
        packagingType,
        unitsPerPackage
      }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) => item.product.id !== productId
      )
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity,
                totalPrice: item.unitPrice * quantity
              }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const vatRate = 0.16; // 16% VAT
  const vat = subtotal * vatRate;
  const total = subtotal + vat;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        vat,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
