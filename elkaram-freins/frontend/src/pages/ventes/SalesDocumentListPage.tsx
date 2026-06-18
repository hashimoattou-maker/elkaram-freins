import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, CheckCircle, RefreshCw, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documents as documentsApi } from "@/lib/api";
import { formatCurrency, formatDate, getStatusBadge, getDocTypeLabel } from "@/lib/utils";
import type { Document, DocumentType } from "@/types";

const DOC_TYPE_MAP: Record<string, DocumentType> = {
  "/ventes/devis": "devis",
  "/ventes/commandes": "commande_client",
  "/ventes/bl": "bon_livraison",
  "/ventes/factures": "facture_vente",
  "/ventes/avoirs": "avoir_vente",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  devis: "Nouveau Devis",
  commande_client: "Nouvelle Commande Client",
  bon_livraison: "Nouveau Bon de Livraison",
  facture_vente: "Nouvelle Facture Vente",
  avoir_vente: "Nouvel Avoir Vente",
};

export default function SalesDocumentListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname;
  const docType = DOC_TYPE_MAP[basePath];

  const [docList, setDocList] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!docType) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = { docType, page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const result = await documentsApi.getDocuments(params);
      setDocList(result.data);
      setTotalPages(result.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [docType, page, search, statusFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleValidate = async (id: string) => {
    try {
      await documentsApi.validateDocument(id);
      fetchDocs();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await documentsApi.deleteDocument(deleteId);
      fetchDocs();
    } catch {
      // ignore
    }
    setDeleteId(null);
  };

  const handleConvert = async (doc: Document) => {
    try {
      const targetTypeMap: Record<string, DocumentType> = {
        devis: "facture_vente",
        commande_client: "facture_vente",
        bon_livraison: "facture_vente",
        facture_vente: "avoir_vente",
      };
      const targetType = targetTypeMap[doc.docType];
      if (!targetType) return;
      const newDoc = await documentsApi.convertDocument(doc.id, targetType);
      navigate(`${basePath}/${newDoc.id}/edit`);
    } catch {
      // ignore
    }
  };

  const handleView = (id: string) => {
    navigate(`${basePath}/${id}`);
  };

  if (!docType) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{getDocTypeLabel(docType)}</CardTitle>
          <Button size="sm" onClick={() => navigate(`${basePath}/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            {DOC_TYPE_LABELS[docType]}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Rechercher..."
                className="pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="confirmé">Validé</SelectItem>
                <SelectItem value="paye">Payé</SelectItem>
                <SelectItem value="partiel">Partiel</SelectItem>
                <SelectItem value="impaye">Impayé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Document</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : docList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun document trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  docList.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.docNumber}</TableCell>
                      <TableCell>{doc.client?.name || "-"}</TableCell>
                      <TableCell>{formatDate(doc.date)}</TableCell>
                      <TableCell>{formatCurrency(doc.total)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(doc.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`${basePath}/${doc.id}`)} title="Voir">
                            <Eye className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleView(doc.id)} title="Télécharger PDF">
                            <FileDown className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`${basePath}/${doc.id}/edit`)} title="Modifier">
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => setDeleteId(doc.id)} title="Supprimer">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                          {doc.status === "brouillon" && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700" onClick={() => handleValidate(doc.id)} title="Valider">
                              <CheckCircle className="h-5 w-5" />
                            </Button>
                          )}
                          {doc.status === "confirmé" && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleConvert(doc)} title="Convertir">
                              <RefreshCw className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} sur {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
