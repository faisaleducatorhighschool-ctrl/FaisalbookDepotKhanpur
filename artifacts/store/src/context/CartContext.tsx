import React, { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  productId: number;
  name: string;
  salePrice: number;
  discountPrice?: number | null;
  imageUrl?: string | null;
  quantity: number;
  unit?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("store_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("store_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: CartItem) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === newItem.productId);
      if (existing) {
        return current.map((i) =>
          i.productId === newItem.productId
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      return [...current, newItem];
    });
  };

  const removeItem = (productId: number) => {
    setItems((current) => current.filter((i) => i.productId !== productId));
  };

  const updateQty = (productId: number, quantity: number) => {
    setItems((current) =>
      current.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce(
    (sum, item) => sum + (item.discountPrice ?? item.salePrice) * item.quantity,
    0
  );

  const total = subtotal; // Assuming tax/shipping added later

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, subtotal, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
