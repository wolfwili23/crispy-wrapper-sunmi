import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((item) => {
    setItems(prev => [...prev, { ...item, cartId: Date.now() + Math.random() }]);
  }, []);

  const removeItem = useCallback((cartId) => {
    setItems(prev => prev.filter(i => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.cartId !== cartId));
      return;
    }
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((sum, item) => sum + (item.item_total * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      subtotal, itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);