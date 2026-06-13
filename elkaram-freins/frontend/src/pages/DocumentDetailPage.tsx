import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { documents as documentsApi, settings as settingsApi } from "@/lib/api";
import { getDocTypeLabel, getStatusBadge, formatCurrency } from "@/lib/utils";
import type { Document, CompanySettings, DocumentDesign } from "@/types";
import ClassicTemplate from "@/components/document-templates/ClassicTemplate";
import ModernTemplate from "@/components/document-templates/ModernTemplate";
import ProfessionalTemplate from "@/components/document-templates/ProfessionalTemplate";
import MinimalTemplate from "@/components/document-templates/MinimalTemplate";

const DOC_TYPE_PATH: Record<string, string> = {
  devis: "devis",
  commande_client: "commandes",
  bon_livraison: "bl",
  facture_vente: "factures",
  avoir_vente: "avoirs",
  bon_commande: "bc",
  bon_achat: "ba",
  facture_achat: "factures",
  avoir_achat: "avoirs",
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [design, setDesign] = useState<DocumentDesign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      documentsApi.getDocument(id),
      settingsApi.getCompany(),
      settingsApi.getDesigns(),
    ])
      .then(([d, comp, designs]) => {
        setDoc(d);
        setCompany(comp);
        const defaultDesign = designs.find((des) => des.isDefault) || designs[0];
        setDesign(defaultDesign || {
          id: 0, name: "Classique", primaryColor: "#1e40af", secondaryColor: "#f59e0b",
          fontFamily: "Inter", showLogo: true, showBorders: true, headerStyle: "classic", isDefault: true,
        });
      })
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleValidate = async () => {
    if (!doc) return;
    try {
      await documentsApi.validateDocument(doc.id);
      setDoc({ ...doc, status: "confirmé" });
    } catch {}
  };

  if (loading || !doc) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const base = doc.docType.includes("achat") ? "/achats" : "/ventes";
  const path = DOC_TYPE_PATH[doc.docType] || "";
  const templateMap: Record<string, React.FC<{ document: Document; company: CompanySettings; design: DocumentDesign }>> = {
    classic: ClassicTemplate,
    modern: ModernTemplate,
    professional: ProfessionalTemplate,
    minimal: MinimalTemplate,
  };
  const TemplateComponent = templateMap[design?.headerStyle || "classic"] || ClassicTemplate;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/${path}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">{doc.docNumber}</h2>
          <Badge variant={getStatusBadge(doc.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}>
            {doc.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          {doc.status === "brouillon" && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`${base}/${path}/${doc.id}/edit`)}>
                Modifier
              </Button>
              <Button variant="default" size="sm" className="bg-green-600" onClick={handleValidate}>
                <CheckCircle className="mr-2 h-4 w-4" /> Valider
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="no-print">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{getDocTypeLabel(doc.docType)}</span>
          <span>•</span>
          <span>Date: {doc.date.split("T")[0]}</span>
          <span>•</span>
          <span>Total: {formatCurrency(doc.total)}</span>
        </div>
      </div>

      <div className="print-only">
        {company && design && (
          <div className="bg-white print:bg-white">
            <TemplateComponent document={doc} company={company} design={design} />
          </div>
        )}
      </div>
      <div className="no-print">
        {company && design && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <TemplateComponent document={doc} company={company} design={design} />
          </div>
        )}
      </div>
    </div>
  );
}