import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Product, PackagingType, VAT_RATE } from '../types';
import { toast } from 'sonner@2.0.3';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, packagingType: PackagingType) => void;
  removeItem: (productId: string, packagingType: PackagingType) => void;
  updateQuantity: (productId: string, packagingType: PackagingType, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  vat: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number, packagingType: PackagingType) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.product.id === product.id && item.packagingType === packagingType
      );

      if (existingItem) {
        toast.success('Updated cart quantity');
        return prevItems.map((item) =>
          item.product.id === product.id && item.packagingType === packagingType
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      const packaging = product.packaging.find((p) => p.type === packagingType);
      const pricePerUnit = packaging ? packaging.pricePerPackage : product.basePrice;

      toast.success('Added to cart');
      return [...prevItems, { product, quantity, packagingType, pricePerUnit }];
    });
  }, []);

  const removeItem = useCallback((productId: string, packagingType: PackagingType) => {
    setItems((prevItems) => 
      prevItems.filter(
        (item) => !(item.product.id === productId && item.packagingType === packagingType)
      )
    );
    toast.success('Removed from cart');
  }, []);

  const updateQuantity = useCallback(
    (productId: string, packagingType: PackagingType, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, packagingType);
        return;
      }

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.product.id === productId && item.packagingType === packagingType
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    toast.success('Cart cleared');
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const vat = subtotal * VAT_RATE;
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
