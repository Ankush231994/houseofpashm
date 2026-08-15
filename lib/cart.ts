"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type CartItem = {
  sku: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  colour?: string;
  size?: string;
  unitPrice: number;
  quantity: number;
};

const STORAGE_KEY = "houseofpashm-cart-v1";
const CART_EVENT = "houseofpashm-cart-change";

function parseCart(raw: string): CartItem[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isCartItem).map((item) => ({ ...item, quantity: Math.min(item.quantity, 10) }));
  } catch {
    return [];
  }
}

function getCartSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function subscribeToCart(onStoreChange: () => void) {
  window.addEventListener(CART_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CART_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function loadCart() {
  return parseCart(getCartSnapshot());
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return typeof item.sku === "string" && typeof item.productId === "string" &&
    typeof item.slug === "string" && typeof item.name === "string" &&
    typeof item.image === "string" && Number.isFinite(item.unitPrice) &&
    Number.isInteger(item.quantity) && (item.quantity ?? 0) > 0;
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function useCart() {
  const raw = useSyncExternalStore(subscribeToCart, getCartSnapshot, () => "[]");
  const ready = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const items = useMemo(() => parseCart(raw), [raw]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const next = loadCart();
    const existing = next.find((entry) => entry.sku === item.sku);
    if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
    else next.push({ ...item, quantity: Math.min(10, Math.max(1, quantity)) });
    saveCart(next);
  }, []);
  const setQuantity = useCallback((sku: string, quantity: number) => {
    const next = loadCart()
      .map((item) => item.sku === sku ? { ...item, quantity: Math.min(10, quantity) } : item)
      .filter((item) => item.quantity > 0);
    saveCart(next);
  }, []);
  const removeItem = useCallback((sku: string) => saveCart(loadCart().filter((item) => item.sku !== sku)), []);
  const clearCart = useCallback(() => saveCart([]), []);

  return {
    items,
    ready,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    displaySubtotal: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
  };
}
