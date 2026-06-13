import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clients as clientsApi } from "@/lib/api";
import type { Client } from "@/types";

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    company: "",
    address: "",
    phone: "",
    email: "",
    fiscalId: "",
    ice: "",
    commercialId: "",
    articleId: "",
    creditLimit: "0",
    balance: "0",
    notes: "",
    active: true,
  });

  useEffect(() => {
    if (isEdit && id) {
      clientsApi
        .getClient(id)
        .then((client) => {
          setForm({
            code: client.code,
            name: client.name,
            company: client.company || "",
            address: client.address || "",
            phone: client.phone || "",
            email: client.email || "",
            fiscalId: client.fiscalId || "",
            ice: client.ice || "",
            commercialId: client.commercialId || "",
            articleId: client.articleId || "",
            creditLimit: String(client.creditLimit),
            balance: String(client.balance),
            notes: client.notes || "",
            active: client.active,
          });
        })
        .catch(() => navigate("/clients"));
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: Partial<Client> = {
        ...form,
        creditLimit: Number(form.creditLimit),
        balance: Number(form.balance),
      };
      if (isEdit && id) {
        await clientsApi.updateClient(id, data);
      } else {
        await clientsApi.createClient(data);
      }
      navigate("/clients");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{isEdit ? "Modifier le Client" : "Nouveau Client"}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Société</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations Fiscales et Commerciales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>N° Fiscal (NIF)</Label>
                <Input
                  value={form.fiscalId}
                  onChange={(e) => setForm((f) => ({ ...f, fiscalId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>ICE</Label>
                <Input
                  value={form.ice}
                  onChange={(e) => setForm((f) => ({ ...f, ice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>N° Commercial</Label>
                <Input
                  value={form.commercialId}
                  onChange={(e) => setForm((f) => ({ ...f, commercialId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>N° Article</Label>
                <Input
                  value={form.articleId}
                  onChange={(e) => setForm((f) => ({ ...f, articleId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de Crédit</Label>
                <Input
                  type="number"
                  value={form.creditLimit}
                  onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                />
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label>Solde actuel</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
                <Label>Client actif</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/clients")}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
