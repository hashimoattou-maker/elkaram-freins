import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { products as productsApi } from "@/lib/api";
import * as XLSX from "xlsx";

interface ImportRow {
  reference?: string;
  name?: string;
  description?: string;
  category_name?: string;
  barcode?: string;
  purchase_price?: number;
  selling_price?: number;
  wholesale_price?: number;
  stock?: number;
  min_stock?: number;
  unit?: string;
}

export default function ImportProductsPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ImportRow>(sheet);
        setPreview(json.slice(0, 10));
      } catch {
        setError("Erreur de lecture du fichier");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const res = await productsApi.importExcel(file);
      setResult({ imported: res.imported, errors: res.errors });
    } catch {
      setError("Erreur lors de l'importation");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stock/products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Importer des Produits</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fichier Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Le fichier doit contenir: reference, name, description, category_name, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit
          </p>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{result.imported} importés, {result.errors} ignorés</span>
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="text-sm font-medium">Aperçu ({preview.length} lignes):</span>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left">Réf</th>
                      <th className="p-2 text-left">Nom</th>
                      <th className="p-2 text-left">Catégorie</th>
                      <th className="p-2 text-left">PA</th>
                      <th className="p-2 text-left">PV</th>
                      <th className="p-2 text-left">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.reference}</td>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.category_name}</td>
                        <td className="p-2">{row.purchase_price}</td>
                        <td className="p-2">{row.selling_price}</td>
                        <td className="p-2">{row.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.length > 0 && !result && (
            <Button onClick={handleImport} disabled={importing}>
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importation..." : "Importer"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
