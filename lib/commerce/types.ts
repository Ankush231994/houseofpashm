export type CheckoutLine = { sku: string; quantity: number };

export type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
  note?: string;
};

export type CheckoutRequest = { items: CheckoutLine[]; customer: CheckoutCustomer };

export type CheckoutIssue = { field: string; message: string };

export type PricedLine = {
  sku: string;
  productId: string;
  productName: string;
  colour: string | null;
  size: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  availableStock: number;
};

export type CheckoutTotals = {
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: "INR";
};
