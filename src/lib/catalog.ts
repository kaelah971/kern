export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  swatch: string;
};

/**
 * A tiny deterministic catalog. Prices are integer USD cents.
 */
export const PRODUCTS: readonly Product[] = [
  {
    id: 'tote',
    name: 'Kern Canvas Tote',
    description: 'Heavy cotton canvas, screen-printed in small batches.',
    priceCents: 3_500,
    swatch: 'linear-gradient(135deg, #d8c7a8 0%, #b99b6b 100%)',
  },
  {
    id: 'notebook',
    name: 'Kern Field Notebook',
    description: '96 dot-grid pages, stitched binding, lies flat.',
    priceCents: 2_500,
    swatch: 'linear-gradient(135deg, #6f7a5c 0%, #3f4735 100%)',
  },
  {
    id: 'apron',
    name: 'Kern Studio Apron',
    description: 'Waxed canvas, one size, two deep pockets.',
    priceCents: 5_000,
    swatch: 'linear-gradient(135deg, #b4462a 0%, #7d2b18 100%)',
  },
];

/**
 * Deterministic carts used by the demo and the acceptance tests. Each cart's
 * after-discount merchandise subtotal is fixed and asserted in the tests.
 */
export const PRESET_CARTS = {
  'eligible-60': {
    id: 'eligible-60',
    label: '$60.00 eligible',
    description: 'Tote + field notebook',
    expectedSubtotalCents: 6_000,
    items: [
      { productId: 'tote', qty: 1 },
      { productId: 'notebook', qty: 1 },
    ],
  },
  'boundary-50': {
    id: 'boundary-50',
    label: '$50.00 boundary',
    description: 'Studio apron',
    expectedSubtotalCents: 5_000,
    items: [{ productId: 'apron', qty: 1 }],
  },
  'control-35': {
    id: 'control-35',
    label: '$35.00 control',
    description: 'Canvas tote',
    expectedSubtotalCents: 3_500,
    items: [{ productId: 'tote', qty: 1 }],
  },
} as const;

export type PresetId = keyof typeof PRESET_CARTS;

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}

export function getPreset(presetId: string): (typeof PRESET_CARTS)[PresetId] | undefined {
  if (Object.hasOwn(PRESET_CARTS, presetId)) {
    return PRESET_CARTS[presetId as PresetId];
  }
  return undefined;
}
