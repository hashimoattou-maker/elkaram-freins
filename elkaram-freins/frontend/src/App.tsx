import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProductsPage from "@/pages/stock/ProductsPage";
import ProductFormPage from "@/pages/stock/ProductFormPage";
import CategoriesPage from "@/pages/stock/CategoriesPage";
import StockMovementsPage from "@/pages/stock/StockMovementsPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import ClientFormPage from "@/pages/clients/ClientFormPage";
import ClientDetailPage from "@/pages/clients/ClientDetailPage";
import ImportClientsPage from "@/pages/clients/ImportClientsPage";
import ImportSuppliersPage from "@/pages/fournisseurs/ImportSuppliersPage";
import ImportProductsPage from "@/pages/stock/ImportProductsPage";
import SuppliersPage from "@/pages/fournisseurs/SuppliersPage";
import SupplierFormPage from "@/pages/fournisseurs/SupplierFormPage";
import PurchaseDocumentListPage from "@/pages/achats/DocumentListPage";
import PurchaseDocumentFormPage from "@/pages/achats/PurchaseDocumentFormPage";
import SalesDocumentListPage from "@/pages/ventes/SalesDocumentListPage";
import SalesDocumentFormPage from "@/pages/ventes/SalesDocumentFormPage";
import DocumentDetailPage from "@/pages/DocumentDetailPage";
import SettingsPage from "@/pages/parametres/SettingsPage";
import DocumentDesignsPage from "@/pages/parametres/DocumentDesignsPage";
import ColumnSettingsPage from "@/pages/parametres/ColumnSettingsPage";
import UsersPage from "@/pages/users/UsersPage";
import ProfilePage from "@/pages/ProfilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Stock */}
        <Route path="/stock/products" element={<ProductsPage />} />
        <Route path="/stock/products/new" element={<ProductFormPage />} />
        <Route path="/stock/products/:id" element={<ProductFormPage />} />
        <Route path="/stock/products/import" element={<ImportProductsPage />} />
        <Route path="/stock/categories" element={<CategoriesPage />} />
        <Route path="/stock/movements" element={<StockMovementsPage />} />

        {/* Clients */}
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:id/edit" element={<ClientFormPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/clients/import" element={<ImportClientsPage />} />

        {/* Fournisseurs */}
        <Route path="/fournisseurs" element={<SuppliersPage />} />
        <Route path="/fournisseurs/new" element={<SupplierFormPage />} />
        <Route path="/fournisseurs/:id" element={<SupplierFormPage />} />
        <Route path="/fournisseurs/import" element={<ImportSuppliersPage />} />

        {/* Achats */}
        <Route path="/achats/bc" element={<PurchaseDocumentListPage />} />
        <Route path="/achats/ba" element={<PurchaseDocumentListPage />} />
        <Route path="/achats/factures" element={<PurchaseDocumentListPage />} />
        <Route path="/achats/avoirs" element={<PurchaseDocumentListPage />} />
        <Route path="/achats/:type/new" element={<PurchaseDocumentFormPage />} />
        <Route path="/achats/:type/:id/edit" element={<PurchaseDocumentFormPage />} />
        <Route path="/achats/:type/:id" element={<DocumentDetailPage />} />

        {/* Ventes */}
        <Route path="/ventes/devis" element={<SalesDocumentListPage />} />
        <Route path="/ventes/commandes" element={<SalesDocumentListPage />} />
        <Route path="/ventes/bl" element={<SalesDocumentListPage />} />
        <Route path="/ventes/factures" element={<SalesDocumentListPage />} />
        <Route path="/ventes/avoirs" element={<SalesDocumentListPage />} />
        <Route path="/ventes/:type/new" element={<SalesDocumentFormPage />} />
        <Route path="/ventes/:type/:id/edit" element={<SalesDocumentFormPage />} />
        <Route path="/ventes/:type/:id" element={<DocumentDetailPage />} />

        {/* Profil */}
        <Route path="/profil" element={<ProfilePage />} />

        {/* Paramètres */}
        <Route path="/parametres" element={<SettingsPage />} />
        <Route path="/parametres/designs" element={<DocumentDesignsPage />} />
        <Route path="/parametres/colonnes" element={<ColumnSettingsPage />} />

        {/* Utilisateurs (admin only) */}
        <Route
          path="/utilisateurs"
          element={
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
