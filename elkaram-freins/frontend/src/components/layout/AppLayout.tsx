import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Toaster } from "react-hot-toast";

const pageTitles: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/stock/products": "Produits",
  "/stock/products/new": "Nouveau Produit",
  "/stock/categories": "Catégories",
  "/stock/movements": "Mouvements de Stock",
  "/clients": "Clients",
  "/clients/new": "Nouveau Client",
  "/clients/import": "Import Clients",
  "/fournisseurs": "Fournisseurs",
  "/fournisseurs/new": "Nouveau Fournisseur",
  "/achats/bc": "Bons de Commande",
  "/achats/ba": "Bons d'Arrivage",
  "/achats/factures": "Factures Achats",
  "/achats/avoirs": "Avoirs Achats",
  "/ventes/devis": "Devis",
  "/ventes/commandes": "Commandes Clients",
  "/ventes/bl": "Bons de Livraison",
  "/ventes/factures": "Factures Ventes",
  "/ventes/avoirs": "Avoirs Ventes",
  "/parametres": "Paramètres Société",
  "/parametres/designs": "Modèles de Documents",
  "/parametres/colonnes": "Paramètres des Colonnes",
  "/profil": "Mon Profil",
  "/utilisateurs": "Gestion des Utilisateurs",
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const basePath = "/" + location.pathname.split("/").slice(1, 3).join("/");
  const title = pageTitles[location.pathname] || pageTitles[basePath] || "EL Karam Freins";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="no-print">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="no-print">
          <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <div className="no-print">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "8px",
              background: "#333",
              color: "#fff",
            },
          }}
        />
      </div>
    </div>
  );
}
