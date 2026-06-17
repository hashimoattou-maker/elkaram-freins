import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { suppliers as suppliersApi } from "@/lib/api";
import * as XLSX from "xlsx";

interface ImportRow {
  code?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  fiscal_id?: string;
  ice?: string;
}

export default function ImportSuppliersPage() {
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
        const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false });
        const mapped = raw.map((row) => ({
          code: row.code || row.Code || row.CODE || "",
          name: row.name || row.Name || row.Nom || row.nom || "",
          company: row.company || row.Company || row.Société || row.societe || row["Societe"] || "",
          phone: row.phone || row.Phone || row.Téléphone || row.telephone || row.Tel || "",
          email: row.email || row.Email || "",
          address: row.address || row.Address || row.Adresse || "",
          fiscal_id: row.fiscal_id || "",
          ice: row.ice || "",
        }));
        setPreview(mapped.slice(0, 10));
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
      const res = await suppliersApi.importExcel(file) as any;
      setResult({ imported: res.imported || 0, errors: res.skipped || 0 });
      if (res.headers) {
        setError(`Entêtes: ${res.headers.join(' | ')}\nTotal: ${res.total} | Importés: ${res.imported} | Ignorés: ${res.skipped}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erreur lors de l'importation";
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/fournisseurs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Importer des Fournisseurs</h2>
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
            Le fichier doit contenir les colonnes: code, name, company, phone, email, address, fiscal_id, ice
          </p>

          {error && (
            <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="text-sm whitespace-pre-line">{error}</span>
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
                      <th className="p-2 text-left">Code</th>
                      <th className="p-2 text-left">Nom</th>
                      <th className="p-2 text-left">Société</th>
                      <th className="p-2 text-left">Téléphone</th>
                      <th className="p-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.code}</td>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.company}</td>
                        <td className="p-2">{row.phone}</td>
                        <td className="p-2">{row.email}</td>
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
