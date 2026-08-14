import type { StorefrontCatalog } from "./types";

export const demoCatalog: StorefrontCatalog = {
  source: "demo",
  categories: [
    { name: "Kurtis", image: "https://houseofkari.in/cdn/shop/files/hok-6th-april2869.jpg?v=1776938923&width=1500" },
    { name: "Suit Sets", image: "https://houseofkari.in/cdn/shop/files/DSC09655-copy.jpg?v=1771922549&width=1500" },
    { name: "Co-ord Sets", image: "https://www.kashmirorigin.com/cdn/shop/files/31_5.jpg?v=1746523693" },
    { name: "Kaftans", image: "https://www.kashmirorigin.com/cdn/shop/files/4_3_3f3cad95-bac6-43ec-956a-9343783fffc0.jpg?v=1744711145&width=1946" },
    { name: "Stoles", image: "https://zamourstore.com/cdn/shop/products/WomenKashmiriAariEmbroideryWoollenStoleBlack2_98133a72-9155-405d-aa50-4b435b17eece.jpg?v=1650304716" },
    { name: "Bags", image: "https://media.gyawun.com/wp-content/uploads/2025/01/Basket-bag-kashmiri-03.webp" },
  ],
  products: [
    { id: "noor-ivory-aari-kurta-set", sku: "HOP-SUI-001", slug: "noor-ivory-aari-kurta-set", name: "Noor Ivory Aari Kurta Set", category: "Suit Sets", subtitle: "Pure cotton • Hand-finished Aari work", price: 2499, mrp: 3999, rating: 4.7, reviews: 124, badge: "Bestseller", image: "https://houseofkari.in/cdn/shop/files/DSC09655-copy.jpg?v=1771922549&width=1500", colour: "Ivory", available: true },
    { id: "gul-maroon-short-kurti", sku: "HOP-KUR-001", slug: "gul-maroon-short-kurti", name: "Gul Maroon Short Kurti", category: "Kurtis", subtitle: "Breathable cotton • Floral embroidery", price: 1699, mrp: 2199, rating: 4.5, reviews: 86, badge: "Trending", image: "https://houseofkari.in/cdn/shop/files/hok-6th-april2869.jpg?v=1776938923&width=1500", colour: "Maroon", available: true },
    { id: "siah-tulip-co-ord-set", sku: "HOP-CRD-001", slug: "siah-tulip-co-ord-set", name: "Siah Tulip Co-ord Set", category: "Co-ord Sets", subtitle: "Cotton blend • Two-piece set", price: 2899, mrp: 4499, rating: 4.8, reviews: 61, badge: "Only a few left", image: "https://www.kashmirorigin.com/cdn/shop/files/31_5.jpg?v=1746523693", available: true },
    { id: "ruh-black-aari-kaftan", sku: "HOP-KAF-001", slug: "ruh-black-aari-kaftan", name: "Ruh Black Aari Kaftan", category: "Kaftans", subtitle: "Flowing fit • Artisan embroidery", price: 2199, mrp: 3299, rating: 4.6, reviews: 73, image: "https://www.kashmirorigin.com/cdn/shop/files/4_3_3f3cad95-bac6-43ec-956a-9343783fffc0.jpg?v=1744711145&width=1946", colour: "Black", available: true },
    { id: "zoon-navy-long-kurta", sku: "HOP-KUR-002", slug: "zoon-navy-long-kurta", name: "Zoon Navy Long Kurta", category: "Kurtis", subtitle: "Ruby cotton • Lace detailing", price: 2775, mrp: 3699, rating: 4.7, reviews: 94, badge: "New", image: "https://houseofkari.in/cdn/shop/files/IMG_9240.jpg?v=1756988326&width=1500", colour: "Navy", available: true },
    { id: "bagh-crewel-tote", sku: "HOP-BAG-001", slug: "bagh-crewel-tote", name: "Bagh Crewel Tote", category: "Bags", subtitle: "Canvas • Hand crewel work", price: 1799, mrp: 2499, rating: 4.4, reviews: 48, image: "https://media.gyawun.com/wp-content/uploads/2025/06/kashmiri-crewel-bag01-1.webp", available: true },
    { id: "koh-e-noor-black-stole", sku: "HOP-STL-001", slug: "koh-e-noor-black-stole", name: "Koh-e-Noor Black Stole", category: "Stoles", subtitle: "Soft wool blend • Aari border", price: 1499, mrp: 2399, rating: 4.6, reviews: 112, badge: "Popular", image: "https://zamourstore.com/cdn/shop/products/WomenKashmiriAariEmbroideryWoollenStoleBlack2_98133a72-9155-405d-aa50-4b435b17eece.jpg?v=1650304716", colour: "Black", available: true },
    { id: "meher-mahogany-kaftan", sku: "HOP-KAF-002", slug: "meher-mahogany-kaftan", name: "Meher Mahogany Kaftan", category: "Kaftans", subtitle: "Relaxed silhouette • Aari vines", price: 2599, mrp: 3899, rating: 4.5, reviews: 39, image: "https://cdn.exoticindia.com/images/products/original/salwarkameez/stq66.jpg", colour: "Mahogany", available: true },
    { id: "kashur-velvet-basket-bag", sku: "HOP-BAG-002", slug: "kashur-velvet-basket-bag", name: "Kashur Velvet Basket Bag", category: "Bags", subtitle: "Velvet • Walnut wood handle", price: 2299, mrp: 3199, rating: 4.8, reviews: 42, badge: "Handcrafted", image: "https://media.gyawun.com/wp-content/uploads/2025/01/Basket-bag-kashmiri-03.webp", available: true },
    { id: "aabshar-pashmina-stole", sku: "HOP-STL-002", slug: "aabshar-pashmina-stole", name: "Aabshar Pashmina Stole", category: "Stoles", subtitle: "Fine weave • Floral needlework", price: 3499, mrp: 4999, rating: 4.9, reviews: 57, badge: "Premium", image: "https://www.pashminacouture.com/images/embroidered-pashmina-preview.jpg", available: true },
  ],
};
