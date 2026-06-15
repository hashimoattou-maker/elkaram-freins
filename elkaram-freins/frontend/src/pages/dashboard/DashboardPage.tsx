import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Users, Truck, AlertTriangle, TrendingUp, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboard } from "@/lib/api";
import { formatCurrency, formatDate, getStatusBadge, getDocTypeLabel } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    dashboard
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-bold text-red-700 mb-2">Erreur Dashboard</h2>
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
        <button
          onClick={() => { setError(""); setLoading(true); dashboard.getStats().then(setStats).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  const statCards = [
    {
      title: "Produits",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-100",
      link: "/stock/products",
    },
    {
      title: "Clients",
      value: stats.totalClients,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-100",
      link: "/clients",
    },
    {
      title: "Fournisseurs",
      value: stats.totalSuppliers,
      icon: Truck,
      color: "text-purple-600",
      bg: "bg-purple-100",
      link: "/fournisseurs",
    },
    {
      title: "Stock Faible",
      value: stats.lowStockCount,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100",
      link: "/stock/products",
    },
    {
      title: "Revenu Total",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      link: "/ventes/factures",
    },
    {
      title: "Factures Impayées",
      value: stats.pendingInvoices,
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-100",
      link: "/ventes/factures",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(card.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium truncate">{card.title}</CardTitle>
              <div className={`rounded-lg ${card.bg} p-2`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate" title={String(card.value)}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenus Mensuels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documents Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.recentDocuments || []).slice(0, 6).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    const typeMap: Record<string, string> = {
                      devis: "devis", commande_client: "commandes", bon_livraison: "bl",
                      facture_vente: "factures", avoir_vente: "avoirs",
                      bon_commande: "bc", bon_achat: "ba", facture_achat: "factures", avoir_achat: "avoirs",
                    };
                    const section = doc.docType.includes("achat") ? "achats" : "ventes";
                    const slug = typeMap[doc.docType] || doc.docType;
                    navigate(`/${section}/${slug}/${doc.id}`);
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">{doc.docNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDocTypeLabel(doc.docType)} - {formatDate(doc.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(doc.total)}</span>
                    <Badge variant={getStatusBadge(doc.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}>
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!stats.recentDocuments || stats.recentDocuments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun document récent
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Meilleurs Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.topProducts || []).slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">{product.productReference}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{product.totalSold} vendus</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(product.totalRevenue)}</p>
                  </div>
                </div>
              ))}
              {(!stats.topProducts || stats.topProducts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune vente enregistrée
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertes Stock Faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.lowStockProducts || []).slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">Réf: {product.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{product.stock} {product.unit}</p>
                    <p className="text-xs text-muted-foreground">Min: {product.minStock}</p>
                  </div>
                </div>
              ))}
              {(!stats.lowStockProducts || stats.lowStockProducts.length === 0) && (
                <p className="text-sm text-green-600 text-center py-4">
                  Tous les stocks sont suffisants
                </p>
              )}
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/stock/products")}
            >
              Voir tous les produits
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
