// Positive control: domain imports only its own domain and the kernel.
import type { StoreId } from "@/shared/kernel";

export type Product = { readonly storeId: StoreId; readonly name: string };
