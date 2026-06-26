import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSubjectsForSemester } from '../lib/semesterData';

const CART_STORAGE_KEY = 'educrate_cart';

const readStoredCart = () => {
  try {
    const stored = sessionStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (_error) {
    sessionStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
};

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => readStoredCart());

  useEffect(() => {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((pyq) => {
    setCartItems(prev => {
      if (prev.some(item => item._id === pyq._id)) return prev;
      return [...prev, pyq];
    });
  }, []);

  const removeFromCart = useCallback((pyqId) => {
    setCartItems(prev => prev.filter(item => item._id !== pyqId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Compute discount: if the cart contains ALL subjects for a given year in a semester.
  // Note: We don't have the full PYQ list in memory, but we know the subjects for the semester from semesterData.
  // We'll calculate the discount if the cart contains items for ALL subjects of that semester for that year.
  const { subtotal, discount, total, cartCount } = useMemo(() => {
    let sub = 0;
    cartItems.forEach(item => sub += (item.price || 10));

    let disc = 0;
    
    // Group cart items by semester+year
    const semYearGroups = {};
    cartItems.forEach(item => {
      const key = `${item.semester}_${item.year}`;
      if (!semYearGroups[key]) semYearGroups[key] = [];
      semYearGroups[key].push(item.subject);
    });

    Object.keys(semYearGroups).forEach(key => {
      const [semester] = key.split('_');
      const subjectsInCart = semYearGroups[key];
      const allSubjects = getSubjectsForSemester(semester);
      
      // If there are subjects defined for the semester, and cart has them all
      if (allSubjects.length > 0 && subjectsInCart.length === allSubjects.length) {
        // Calculate the subtotal for this specific group to apply the 10% discount
        const groupSubtotal = cartItems
          .filter(item => `${item.semester}_${item.year}` === key)
          .reduce((sum, item) => sum + (item.price || 10), 0);
        
        disc += Math.floor(groupSubtotal * 0.10);
      }
    });

    return {
      subtotal: sub,
      discount: disc,
      total: sub - disc,
      cartCount: cartItems.length
    };
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    subtotal,
    discount,
    total,
    cartCount,
  }), [cartItems, addToCart, removeFromCart, clearCart, subtotal, discount, total, cartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
};
