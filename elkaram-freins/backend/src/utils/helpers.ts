import { v4 as uuidv4 } from 'uuid';

const docPrefixes: Record<string, string> = {
  devis: 'DEV',
  commande_client: 'CC',
  bon_livraison: 'BL',
  facture_vente: 'FV',
  avoir_vente: 'AV',
  bon_commande: 'BC',
  bon_achat: 'BA',
  facture_achat: 'FA',
  avoir_achat: 'AA',
};

export function generateDocNumber(type: string): string {
  const prefix = docPrefixes[type] || 'DOC';
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}-${random}`;
}

export function generateBarcode(): string {
  const random = Math.floor(Math.random() * 1000000000000);
  const code = random.toString().padStart(12, '0');
  const digits = code.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return code + check;
}

export function calculateTotals(lines: Array<{
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_percent?: number;
}>): { subtotal: number; tax_amount: number; total: number } {
  let subtotal = 0;
  let totalTax = 0;

  for (const line of lines) {
    const lineTotal = line.quantity * line.unit_price;
    const discount = (line.discount_percent || 0) / 100;
    const lineAfterDiscount = lineTotal * (1 - discount);
    const tax = (line.tax_rate || 0) / 100;
    const taxAmount = lineAfterDiscount * tax;

    subtotal += lineAfterDiscount;
    totalTax += taxAmount;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(totalTax * 100) / 100,
    total: Math.round((subtotal + totalTax) * 100) / 100,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateId(): string {
  return uuidv4();
}

export function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}
