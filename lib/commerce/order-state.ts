export const operatorTransitions: Record<string, readonly string[]> = {
  paid: ["packing", "refund_pending"],
  packing: ["shipped", "refund_pending"],
  shipped: ["delivered", "refund_pending"],
  delivered: ["refund_pending"],
};

export function canOperatorTransition(from: string, to: string) {
  return operatorTransitions[from]?.includes(to) ?? false;
}
