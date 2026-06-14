import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  Users,
  ShoppingCart,
  FileText,
  FileSpreadsheet,
  Receipt,
  Settings,
  UserCog,
  ChevronDown,
  ChevronRight,
  Boxes,
  Import,
  Building2,
  FileBarChart,
  ScrollText,
  FileCheck,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
  adminOnly?: boolean;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(["stock", "ventes", "achats"]);

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems: (NavItem & { key: string })[] = [
    {
      key: "dashboard",
      label: "Tableau de bord",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/dashboard",
    },
    {
      key: "stock",
      label: "Stock",
      icon: <Package className="h-5 w-5" />,
      children: [
        { label: "Produits", icon: <Boxes className="h-4 w-4" />, path: "/stock/products" },
        { label: "Catégories", icon: <Tags className="h-4 w-4" />, path: "/stock/categories" },
        { label: "Mouvements", icon: <FileBarChart className="h-4 w-4" />, path: "/stock/movements" },
      ],
    },
    {
      key: "clients",
      label: "Clients",
      icon: <Users className="h-5 w-5" />,
      children: [
        { label: "Liste", icon: <Users className="h-4 w-4" />, path: "/clients" },
        { label: "Import Excel", icon: <Import className="h-4 w-4" />, path: "/clients/import" },
      ],
    },
    {
      key: "fournisseurs",
      label: "Fournisseurs",
      icon: <Truck className="h-5 w-5" />,
      children: [
        { label: "Liste", icon: <Truck className="h-4 w-4" />, path: "/fournisseurs" },
      ],
    },
    {
      key: "achats",
      label: "Achats",
      icon: <ShoppingCart className="h-5 w-5" />,
      children: [
        { label: "Bons de Commande", icon: <FileText className="h-4 w-4" />, path: "/achats/bc" },
        { label: "Bons d'Arrivage", icon: <FileSpreadsheet className="h-4 w-4" />, path: "/achats/ba" },
        { label: "Factures Achats", icon: <Receipt className="h-4 w-4" />, path: "/achats/factures" },
        { label: "Avoirs Achats", icon: <FileCheck className="h-4 w-4" />, path: "/achats/avoirs" },
      ],
    },
    {
      key: "ventes",
      label: "Ventes",
      icon: <Calculator className="h-5 w-5" />,
      children: [
        { label: "Devis", icon: <ScrollText className="h-4 w-4" />, path: "/ventes/devis" },
        { label: "Commandes Clients", icon: <FileText className="h-4 w-4" />, path: "/ventes/commandes" },
        { label: "Bons de Livraison", icon: <FileSpreadsheet className="h-4 w-4" />, path: "/ventes/bl" },
        { label: "Factures Ventes", icon: <Receipt className="h-4 w-4" />, path: "/ventes/factures" },
        { label: "Avoirs Ventes", icon: <FileCheck className="h-4 w-4" />, path: "/ventes/avoirs" },
      ],
    },
    {
      key: "parametres",
      label: "Paramètres",
      icon: <Settings className="h-5 w-5" />,
      children: [
        { label: "Société", icon: <Building2 className="h-4 w-4" />, path: "/parametres" },
        { label: "Modèles Documents", icon: <FileText className="h-4 w-4" />, path: "/parametres/designs" },
        { label: "Colonnes", icon: <FileSpreadsheet className="h-4 w-4" />, path: "/parametres/colonnes" },
      ],
    },
  ];

  if (isAdmin) {
    navItems.push({
      key: "utilisateurs",
      label: "Utilisateurs",
      icon: <UserCog className="h-5 w-5" />,
      path: "/utilisateurs",
    });
  }

  const renderNavItem = (item: NavItem & { key: string }) => {
    if (item.adminOnly && !isAdmin) return null;

    if (item.children) {
      const expanded = expandedMenus.includes(item.key);
      return (
        <div key={item.key}>
          <button
            onClick={() => toggleMenu(item.key)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              item.children.some((c) => c.path && isActive(c.path))
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {expanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => {
                if (child.adminOnly && !isAdmin) return null;
                return (
                  <NavLink
                    key={child.path}
                    to={child.path || "#"}
                    onClick={onClose}
                    className={({ isActive: active }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    {child.icon}
                    <span>{child.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path || "#"}
        onClick={onClose}
        className={({ isActive: active }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )
        }
      >
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-300 md:static md:translate-x-0 md:h-full",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary overflow-hidden">
            <svg viewBox="0 0 40 40" className="h-9 w-9" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:"#1e40af",stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:"#3b82f6",stopOpacity:1}} />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="8" fill="url(#grad)"/>
              <circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="5" fill="none" stroke="white" strokeWidth="2"/>
              <circle cx="20" cy="20" r="2" fill="white"/>
              <rect x="18.5" y="5" width="3" height="6" rx="1.5" fill="white"/>
              <rect x="18.5" y="29" width="3" height="6" rx="1.5" fill="white"/>
              <rect x="5" y="18.5" width="6" height="3" rx="1.5" fill="white"/>
              <rect x="29" y="18.5" width="6" height="3" rx="1.5" fill="white"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold">EL Karam Freins</h1>
            <p className="text-xs text-muted-foreground">SARL</p>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll px-3 py-4">
          <nav className="space-y-1.5">
            {navItems.map(renderNavItem)}
          </nav>
        </div>
      </aside>
    </>
  );
}
