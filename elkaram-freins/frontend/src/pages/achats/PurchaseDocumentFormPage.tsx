import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documents as documentsApi, suppliers as suppliersApi, products as productsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Document, DocumentLine, Supplier, Product, DocumentType } from "@/types";

const DOC_TYPE_MAP: Record<string, DocumentType> = {
  bc: "bon_commande",
  ba: "bon_achat",
  factures: "facture_achat",
  avoirs: "avoir_achat",
};

export default function PurchaseDocumentFormPage() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docType = type ? DOC_TYPE_MAP[type] : "bon_commande";
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);

  const [form, setForm] = useState({
    supplierId: "",
    matricule: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    terms: "",
    taxRate: "20",
    discount: "0",
    discountType: "percentage" as "percentage" | "fixed",
    shipping: "0",
  });

  const [lines, setLines] = useState<DocumentLine[]>([
    { id: 1, ref: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 20, total: 0 },
  ]);

  useEffect(() => {
    suppliersApi.getSuppliers({ limit: 100 }).then((r) => setSuppliers(r.data)).catch(() => {});
    productsApi.getProducts({ limit: 200 }).then((r) => {
      setProducts(r.data);
      setProductResults(r.data);
    }).catch(() => {});

    const convertId = searchParams.get("convert");
    if (convertId) {
      documentsApi.getDocument(convertId).then((doc) => {
        setForm({
          supplierId: doc.supplierId ? String(doc.supplierId) : "",
          matricule: (doc as any).matricule || "",
          date: new Date().toISOString().split("T")[0],
          dueDate: "",
          notes: doc.notes || "",
          terms: doc.terms || "",
          taxRate: String(doc.taxRate),
          discount: String(doc.discount),
          discountType: doc.discountType,
          shipping: String(doc.shipping),
        });
        setLines(doc.lines.map((l, i) => ({ ...l, id: i + 1 })));
      }).catch(() => {});
    } else if (isEdit && id) {
      documentsApi.getDocument(id).then((doc) => {
        setForm({
          supplierId: doc.supplierId ? String(doc.supplierId) : "",
          matricule: (doc as any).matricule || "",
          date: doc.date.split("T")[0],
          dueDate: doc.dueDate ? doc.dueDate.split("T")[0] : "",
          notes: doc.notes || "",
          terms: doc.terms || "",
          taxRate: String(doc.taxRate),
          discount: String(doc.discount),
          discountType: doc.discountType,
          shipping: String(doc.shipping),
        });
        setLines(doc.lines.map((l, i) => ({ ...l, id: i + 1 })));
      }).catch(() => navigate(`/achats/${type}`));
    }
  }, [type, id, isEdit, navigate, searchParams]);

  const updateLine = (index: number, field: keyof DocumentLine, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const ht = updated[index].quantity * updated[index].unitPrice - (updated[index].discount || 0);
      const tva = Number(form.taxRate);
      updated[index].total = ht;
      updated[index].totalHt = ht;
      updated[index].totalTtc = ht * (1 + tva / 100);
      updated[index].taxAmount = ht * (tva / 100);
      return updated;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now(), ref: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: Number(form.taxRate), total: 0 },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, product: Product) => {
    setLines((prev) => {
      const updated = [...prev];
      const price = docType === "bon_commande" || docType === "bon_achat" ? product.purchasePrice : product.sellingPrice;
      updated[index] = {
        ...updated[index],
        productId: product.id,
        ref: product.reference,
        description: product.name,
        unitPrice: price,
        quantity: 1,
        discount: 0,
        taxRate: Number(form.taxRate),
        total: price,
        totalHt: price,
        totalTtc: price * (1 + Number(form.taxRate) / 100),
        taxAmount: price * (Number(form.taxRate) / 100),
      };
      return updated;
    });
    setProductSearch("");
    setProductResults(products);
  };

  const searchProduct = (q: string) => {
    setProductSearch(q);
    setProductResults(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.reference.toLowerCase().includes(q.toLowerCase()) ||
          (p.barcode && p.barcode.includes(q))
      )
    );
  };

  const subtotal = lines.reduce((sum, l) => sum + (l.total || 0), 0);
  const discountValue =
    form.discountType === "percentage"
      ? subtotal * (Number(form.discount) / 100)
      : Number(form.discount);
  const taxable = subtotal - discountValue;
  const taxAmount = taxable * (Number(form.taxRate) / 100);
  const shipping = Number(form.shipping);
  const total = taxable + taxAmount + shipping;

  const handleSave = async (status: "brouillon" | "confirmé") => {
    setLoading(true);
    try {
      const data: Partial<Document> = {
        docType,
        date: form.date,
        dueDate: form.dueDate || undefined,
        supplierId: form.supplierId ? String(form.supplierId) : undefined,
        matricule: form.matricule,
        lines: lines.map((l) => ({
          productId: l.productId,
          ref: l.ref,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
          taxRate: l.taxRate,
          total: l.total,
          totalHt: l.totalHt,
          totalTtc: l.totalTtc,
          taxAmount: l.taxAmount,
        })),
        subtotal,
        taxRate: Number(form.taxRate),
        taxAmount,
        discount: Number(form.discount),
        discountType: form.discountType,
        shipping,
        total,
        notes: form.notes,
        terms: form.terms,
        status,
      };

      if (isEdit && id) {
        await documentsApi.updateDocument(id, data);
      } else {
        const doc = await documentsApi.createDocument(data);
        if (status === "confirmé") {
          await documentsApi.validateDocument(doc.id);
        }
      }
      navigate(`/achats/${type}`);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/achats/${type}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{isEdit ? "Modifier" : "Nouveau"} Document Achat</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fournisseur *</Label>
              <Combobox
                options={suppliers.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  sublabel: s.company || s.code,
                }))}
                value={form.supplierId}
                onChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
                placeholder="Sélectionner un fournisseur"
                searchPlaceholder="Tapez le nom du fournisseur..."
              />
              {form.supplierId && (() => {
                const selected = suppliers.find((s) => String(s.id) === form.supplierId);
                if (!selected) return null;
                return (
                  <div className="space-y-1">
                    <p className={`text-sm ${selected.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      Solde : {formatCurrency(selected.balance)}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>Matricule</Label>
              <Input value={form.matricule} onChange={(e) => setForm((f) => ({ ...f, matricule: e.target.value }))} placeholder="Matricule" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date d'échéance</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lignes du Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Rechercher un produit (nom, réf, code-barres)..."
                value={productSearch}
                onChange={(e) => searchProduct(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {productSearch && productResults.length > 0 && (
              <div className="rounded-md border bg-background shadow-lg max-h-40 overflow-y-auto">
                {productResults.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted"
                    onClick={() => {
                      const idx = lines.findIndex((l) => l.productId === p.id);
                      selectProduct(idx >= 0 ? idx : lines.length - 1, p);
                    }}
                  >
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.reference} - Stock: {p.stock}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Réf</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead className="w-16">Qté</TableHead>
                    <TableHead className="w-24">Prix Unit.</TableHead>
                    <TableHead className="w-24">Remise</TableHead>
                    <TableHead className="w-24">Total HT</TableHead>
                    <TableHead className="w-16">TVA %</TableHead>
                    <TableHead className="w-24">Mt TVA</TableHead>
                    <TableHead className="w-24">Total TTC</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => {
                    const ht = line.quantity * line.unitPrice - (line.discount || 0);
                    const tva = Number(form.taxRate);
                    const mtTva = ht * (tva / 100);
                    const ttc = ht + mtTva;
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Input value={line.ref || ""} onChange={(e) => updateLine(index, "ref", e.target.value)} placeholder="Réf" className="w-16 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Input value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} placeholder="Article" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={line.quantity} onChange={(e) => updateLine(index, "quantity", Number(e.target.value))} className="w-16" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", Number(e.target.value))} className="w-24" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={line.discount || 0} onChange={(e) => updateLine(index, "discount", Number(e.target.value))} className="w-24" />
                        </TableCell>
                        <TableCell className="font-medium text-xs">{formatCurrency(ht)}</TableCell>
                        <TableCell className="text-xs">{tva}%</TableCell>
                        <TableCell className="font-medium text-xs">{formatCurrency(mtTva)}</TableCell>
                        <TableCell className="font-medium text-xs">{formatCurrency(ttc)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => removeLine(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Conditions</Label>
                <Textarea
                  value={form.terms}
                  onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Remise</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                    className="w-20 h-8"
                  />
                  <Select
                    value={form.discountType}
                    onValueChange={(v) => setForm((f) => ({ ...f, discountType: v as "percentage" | "fixed" }))}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">MAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>TVA ({form.taxRate}%)</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                    className="w-20 h-8"
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frais de port</span>
                <Input
                  type="number"
                  value={form.shipping}
                  onChange={(e) => setForm((f) => ({ ...f, shipping: e.target.value }))}
                  className="w-24 h-8"
                />
              </div>
              <SeparatorLine />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(`/achats/${type}`)}>
          Annuler
        </Button>
        <Button variant="secondary" onClick={() => handleSave("brouillon")} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer brouillon
        </Button>
        <Button onClick={() => handleSave("confirmé")} disabled={loading}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Valider
        </Button>
      </div>
    </div>
  );
}

function SeparatorLine() {
  return <div className="h-px bg-border" />;
}
