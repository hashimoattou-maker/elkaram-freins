import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settings as settingsApi } from "@/lib/api";
import type { ColumnSetting } from "@/types";
import { DOCUMENT_TYPES } from "@/lib/utils";

const ALL_COLUMNS: Record<string, string[]> = {
  devis: ["N° Document", "Client", "Date", "Total", "Statut", "Actions"],
  commande_client: ["N° Document", "Client", "Date", "Total", "Statut", "Actions"],
  bl: ["N° Document", "Client", "Date", "Total", "Statut", "Actions"],
  facture_vente: ["N° Document", "Client", "Date", "Total", "Payé", "Statut", "Actions"],
  avoir_vente: ["N° Document", "Client", "Date", "Total", "Statut", "Actions"],
  bc: ["N° Document", "Fournisseur", "Date", "Total", "Statut", "Actions"],
  ba: ["N° Document", "Fournisseur", "Date", "Total", "Statut", "Actions"],
  facture_achat: ["N° Document", "Fournisseur", "Date", "Total", "Statut", "Actions"],
  avoir_achat: ["N° Document", "Fournisseur", "Date", "Total", "Statut", "Actions"],
};

export default function ColumnSettingsPage() {
  const [docType, setDocType] = useState("facture_vente");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.getColumns(docType).then((setting) => {
      setSelectedColumns(setting.columns);
    }).catch(() => {
      setSelectedColumns(ALL_COLUMNS[docType] || []);
    });
  }, [docType]);

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allCols = ALL_COLUMNS[docType] || [];
      await settingsApi.updateColumns(docType, allCols, selectedColumns);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const availableColumns = ALL_COLUMNS[docType] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres des Colonnes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type de document</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  {dt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Colonnes à afficher</Label>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {availableColumns.map((col) => (
              <div key={col} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col}`}
                  checked={selectedColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                />
                <Label htmlFor={`col-${col}`} className="cursor-pointer">
                  {col}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
