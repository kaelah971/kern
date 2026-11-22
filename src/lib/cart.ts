import { randomUUID } from 'node:crypto';
import { getPreset, getProduct, type Product } from './catalog.ts';

export type CartLineView = {
  product: Product;
  qty: number;
  lineTotalCents: number;
};

type CartItems = Map<string, number>;

/**
 * In-memory cart state for the single local demo process. A cart survives
 * navigation through a session cookie; it does not survive a server restart.
 */
export class CartStore {
  readonly #carts = new Map<string, CartItems>();

  create(): string {
    const id = randomUUID();
    this.#carts.set(id, new Map());
    return id;
  }

  has(id: string): boolean {
    return this.#carts.has(id);
  }

  #require(id: string): CartItems {
    const cart = this.#carts.get(id);
    if (!cart) {
      throw new Error(`unknown cart session: ${id}`);
    }
    return cart;
  }

  add(id: string, productId: string, qty = 1): void {
    if (!Number.isSafeInteger(qty) || qty < 1) {
      throw new RangeError(`quantity must be a positive integer, got ${qty}`);
    }
    if (!getProduct(productId)) {
      throw new RangeError(`unknown product: ${productId}`);
    }
    const cart = this.#require(id);
    cart.set(productId, (cart.get(productId) ?? 0) + qty);
  }

  setPreset(id: string, presetId: string): void {
    const preset = getPreset(presetId);
    if (!preset) {
      throw new RangeError(`unknown preset: ${presetId}`);
    }
    const cart = this.#require(id);
    cart.clear();
    for (const item of preset.items) {
      this.add(id, item.productId, item.qty);
    }
  }

  clear(id: string): void {
    this.#require(id).clear();
  }

  lines(id: string): CartLineView[] {
    const cart = this.#require(id);
    const lines: CartLineView[] = [];
    for (const [productId, qty] of cart) {
      const product = getProduct(productId);
      if (!product) continue;
      lines.push({
        product,
        qty,
        lineTotalCents: product.priceCents * qty,
      });
    }
    return lines;
  }

  /**
   * After-discount merchandise subtotal in integer cents.
   *
   * The P0 store has no discount codes and no tax, so this is currently the
   * sum of merchandise line totals. The label stays explicit because the
   * promise contract is defined on the after-discount basis.
   */
  merchandiseSubtotalCents(id: string): number {
    return this.lines(id).reduce((sum, line) => sum + line.lineTotalCents, 0);
  }

  itemCount(id: string): number {
    return this.lines(id).reduce((sum, line) => sum + line.qty, 0);
  }
}
