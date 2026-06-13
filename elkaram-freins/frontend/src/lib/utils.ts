import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "MAD"): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, format: "short" | "long" = "short"): string {
  const d = new Date(date);
  if (format === "long") {
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getStatusBadge(status: string): string {
  const statusMap: Record<string, string> = {
    brouillon: "secondary",
    confirmé: "success",
    converti: "default",
    annulé: "destructive",
    payée: "success",
    partiel: "warning",
  };
  return statusMap[status] || "secondary";
}

export function getDocTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    devis: "Devis",
    commande_client: "Commande Client",
    bl: "Bon de Livraison",
    facture_vente: "Facture Vente",
    avoir_vente: "Avoir Vente",
    bc: "Bon de Commande",
    ba: "Bon d'Arrivage",
    facture_achat: "Facture Achat",
    avoir_achat: "Avoir Achat",
  };
  return labels[type] || type;
}

export const DOCUMENT_TYPES = [
  { value: "devis", label: "Devis" },
  { value: "commande_client", label: "Commande Client" },
  { value: "bl", label: "Bon de Livraison" },
  { value: "facture_vente", label: "Facture Vente" },
  { value: "avoir_vente", label: "Avoir Vente" },
  { value: "bc", label: "Bon de Commande" },
  { value: "ba", label: "Bon d'Arrivage" },
  { value: "facture_achat", label: "Facture Achat" },
  { value: "avoir_achat", label: "Avoir Achat" },
] as const;
