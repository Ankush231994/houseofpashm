"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../lib/cart";
import type { StorefrontProduct, StorefrontVariant } from "../../../lib/catalog/types";

function variantsFor(product: StorefrontProduct): StorefrontVariant[] {
  return product.variants?.length ? product.variants : [{ sku: product.sku, colour: product.colour, size: product.size, price: product.price, mrp: product.mrp, available: product.available }];
}

export default function ProductDetails({ product }: { product: StorefrontProduct }) {
  const variants = useMemo(() => variantsFor(product), [product]);
  const [sku, setSku] = useState(variants.find((variant) => variant.available)?.sku ?? variants[0].sku);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const selected = variants.find((variant) => variant.sku === sku) ?? variants[0];

  function add() {
    if (!selected.available) return;
    cart.addItem({ sku: selected.sku, productId: product.id, slug: product.slug, name: product.name, image: product.image, colour: selected.colour, size: selected.size, unitPrice: selected.price }, quantity);
    setAdded(true);
  }

  return <main className="product-page">
    <header className="simple-header"><Link className="brand" href="/"><span className="brand-mark">H</span><span><b>HOUSEOF</b><em>PASHM</em></span></Link><Link href="/checkout">BAG ({cart.itemCount})</Link></header>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{product.category}</span><span>/</span><b>{product.name}</b></nav>
    <section className="product-detail-grid">
      <div className="product-detail-image"><img src={product.image} alt={product.name}/></div>
      <div className="product-detail-copy"><span className="eyebrow">{product.category.toUpperCase()}</span><h1>{product.name}</h1><p>{product.subtitle}</p>
        <div className="detail-price"><strong>₹{selected.price.toLocaleString("en-IN")}</strong><del>₹{selected.mrp.toLocaleString("en-IN")}</del><span>Final total calculated securely at checkout</span></div>
        <fieldset><legend>Choose size and colour</legend><div className="variant-grid">{variants.map((variant)=><button type="button" key={variant.sku} className={sku===variant.sku?"selected":""} disabled={!variant.available} onClick={()=>setSku(variant.sku)}><b>{variant.size??"Standard"}</b><span>{variant.colour??variant.sku}</span>{!variant.available&&<small>Out of stock</small>}</button>)}</div></fieldset>
        <label className="detail-quantity">Quantity <input type="number" min="1" max="10" value={quantity} onChange={(event)=>setQuantity(Math.min(10,Math.max(1,Number(event.target.value))))}/></label>
        <button className="detail-add" type="button" disabled={!selected.available||!cart.ready} onClick={add}>{selected.available?"ADD TO BAG":"OUT OF STOCK"}</button>
        {added&&<p className="added-message" role="status">Added to your bag. <Link href="/checkout">Go to checkout</Link></p>}
        <ul className="detail-promises"><li>Server-checked price and stock at checkout</li><li>Delivery across supported Indian PIN codes</li><li>Exchange eligibility follows the published policy</li></ul>
      </div>
    </section>
  </main>;
}
