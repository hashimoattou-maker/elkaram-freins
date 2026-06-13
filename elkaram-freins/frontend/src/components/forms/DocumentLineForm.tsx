import React from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { DocumentLine } from "@/types";

interface DocumentLineFormProps {
  lines: DocumentLine[];
  onUpdate: (index: number, field: keyof DocumentLine, value: string | number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
  taxRate?: number;
}

export default function DocumentLineForm({
  lines,
  onUpdate,
  onAdd,
  onRemove,
  readOnly = false,
  taxRate = 20,
}: DocumentLineFormProps) {
  const totalHt = (line: DocumentLine) => line.quantity * line.unitPrice - (line.discount || 0);
  const taxAmt = (line: DocumentLine) => totalHt(line) * (taxRate / 100);
  const totalTtc = (line: DocumentLine) => totalHt(line) + taxAmt(line);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf</TableHead>
              <TableHead className="w-[25%]">Article</TableHead>
              <TableHead>Qté</TableHead>
              <TableHead>Prix HT</TableHead>
              <TableHead>Prix Unit.</TableHead>
              <TableHead>Total TTC</TableHead>
              <TableHead>TVA %</TableHead>
              <TableHead>Mt TVA</TableHead>
              {!readOnly && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 8 : 9} className="text-center py-8 text-muted-foreground">
                  Aucune ligne
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {readOnly ? (
                      line.ref || "-"
                    ) : (
                      <Input
                        value={line.ref || ""}
                        onChange={(e) => onUpdate(index, "ref", e.target.value)}
                        placeholder="Réf"
                        className="w-20"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      line.description
                    ) : (
                      <Input
                        value={line.description}
                        onChange={(e) => onUpdate(index, "description", e.target.value)}
                        placeholder="Article"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      line.quantity
                    ) : (
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => onUpdate(index, "quantity", Number(e.target.value))}
                        className="w-16"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(totalHt(line))}</TableCell>
                  <TableCell>
                    {readOnly ? (
                      formatCurrency(line.unitPrice)
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => onUpdate(index, "unitPrice", Number(e.target.value))}
                        className="w-24"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(totalTtc(line))}</TableCell>
                  <TableCell>{taxRate}%</TableCell>
                  <TableCell className="font-medium">{formatCurrency(taxAmt(line))}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => onRemove(index)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={onAdd}>
          + Ajouter une ligne
        </Button>
      )}
    </div>
  );
}
