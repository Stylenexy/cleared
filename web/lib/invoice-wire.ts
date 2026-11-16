import type { Invoice } from "@pagar/sdk";
export type SerializedInvoice = Omit<Invoice, "amount"> & { amount: string };
export const serializeInvoice = (i: Invoice): SerializedInvoice => ({
  ...i,
  amount: i.amount.toString(),
});
export const deserializeInvoice = (i: SerializedInvoice): Invoice => ({
  ...i,
  amount: BigInt(i.amount),
});
