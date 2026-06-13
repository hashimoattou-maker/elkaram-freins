import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { settings as settingsApi } from "@/lib/api";
import type { DocumentDesign } from "@/types";

const FONTS = ["Inter", "Arial", "Helvetica", "Times New Roman", "Courier New", "Georgia"];

export default function DocumentDesignsPage() {
  const [designs, setDesigns] = useState<DocumentDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<DocumentDesign | null>(null);
  const [form, setForm] = useState({
    name: "",
    primaryColor: "#1e40af",
    secondaryColor: "#f59e0b",
    fontFamily: "Inter",
    showLogo: true,
    showBorders: true,
    headerStyle: "modern" as "modern" | "classic" | "professional" | "minimal",
  });

  const fetchDesigns = () => {
    setLoading(true);
    settingsApi.getDesigns()
      .then(setDesigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      name: "",
      primaryColor: "#1e40af",
      secondaryColor: "#f59e0b",
      fontFamily: "Inter",
      showLogo: true,
      showBorders: true,
      headerStyle: "modern",
    });
    setDialogOpen(true);
  };

  const openEdit = (design: DocumentDesign) => {
    setEditItem(design);
    setForm({
      name: design.name,
      primaryColor: design.primaryColor,
      secondaryColor: design.secondaryColor,
      fontFamily: design.fontFamily,
      showLogo: design.showLogo,
      showBorders: design.showBorders,
      headerStyle: design.headerStyle,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await settingsApi.updateDesign(editItem.id, form);
      } else {
        await settingsApi.createDesign(form);
      }
      setDialogOpen(false);
      fetchDesigns();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await settingsApi.deleteDesign(deleteId);
      setDeleteId(null);
      fetchDesigns();
    } catch {
      // ignore
    }
  };

  const setAsDefault = async (id: number) => {
    try {
      await settingsApi.updateDesign(id, { isDefault: true });
      fetchDesigns();
    } catch {
      // ignore
    }
  };

  const getHeaderPreview = (style: string) => {
    switch (style) {
      case "modern": return "En-tête moderne avec fond coloré";
      case "classic": return "En-tête classique avec bordures";
      case "professional": return "En-tête professionnel sobre";
      case "minimal": return "En-tête minimaliste simple";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Modèles de Documents</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Modèle
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {designs.map((design) => (
              <Card key={design.id} className="relative overflow-hidden">
                <div
                  className="h-2"
                  style={{ background: `linear-gradient(90deg, ${design.primaryColor}, ${design.secondaryColor})` }}
                />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {design.name}
                    {design.isDefault && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: design.primaryColor }}
                    />
                    <span className="text-muted-foreground">Primaire</span>
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: design.secondaryColor }}
                    />
                    <span className="text-muted-foreground">Secondaire</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Police: {design.fontFamily} | {getHeaderPreview(design.headerStyle)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Logo: {design.showLogo ? "Oui" : "Non"}</span>
                    <span>|</span>
                    <span>Bordures: {design.showBorders ? "Oui" : "Non"}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(design)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                    {!design.isDefault && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setAsDefault(design.id)}>
                          <Star className="h-4 w-4 mr-1" />
                          Défaut
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteId(design.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {designs.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                Aucun modèle de document créé
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Modifier le Modèle" : "Nouveau Modèle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Couleur Primaire</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur Secondaire</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Police</Label>
              <Select value={form.fontFamily} onValueChange={(v) => setForm((f) => ({ ...f, fontFamily: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font} value={font}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Style d'en-tête</Label>
              <Select value={form.headerStyle} onValueChange={(v) => setForm((f) => ({ ...f, headerStyle: v as "modern" | "classic" | "professional" | "minimal" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Moderne</SelectItem>
                  <SelectItem value="classic">Classique</SelectItem>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.showLogo} onCheckedChange={(v) => setForm((f) => ({ ...f, showLogo: v }))} />
              <Label>Afficher le logo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.showBorders} onCheckedChange={(v) => setForm((f) => ({ ...f, showBorders: v }))} />
              <Label>Afficher les bordures</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer ce modèle ?</AlertDialogDescription>
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
