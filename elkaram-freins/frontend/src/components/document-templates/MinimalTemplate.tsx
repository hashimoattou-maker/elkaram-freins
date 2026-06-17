import React from "react";
import type { Document, CompanySettings, DocumentDesign } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MinimalTemplateProps {
  document: Document;
  company: CompanySettings;
  design: DocumentDesign;
}

export default function MinimalTemplate({ document, company, design }: MinimalTemplateProps) {
  const isSales = ["devis", "commande_client", "bon_livraison", "facture_vente", "avoir_vente"].includes(document.docType);
  const party = isSales ? document.client : document.supplier;

  return (
    <div
      className="bg-white dark:bg-gray-900 print:bg-white"
      style={{
        fontFamily: design.fontFamily,
        padding: "40px",
        maxWidth: "750px",
        margin: "0 auto",
        color: "#333",
      }}
    >
      <div style={{ marginBottom: "40px" }}>
        {design.showLogo && company.logo && (
          <img
            src={company.logo}
            alt="Logo"
            style={{ maxWidth: `${company.logoWidth}px`, maxHeight: `${company.logoHeight}px`, marginBottom: "15px" }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "300", letterSpacing: "2px", textTransform: "uppercase", color: "#999" }}>
          {company.name}
        </h1>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h2 className="text-gray-900 dark:text-gray-100 print:text-gray-900" style={{ margin: 0, fontSize: "32px", fontWeight: "200", color: "#111", textTransform: "uppercase", letterSpacing: "1px" }}>
          {document.docType.replace("_", " ")}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "5px 0", fontSize: "14px", color: "#999" }}>{document.docNumber}</p>
        <p className="text-gray-400 dark:text-gray-500 print:text-gray-400" style={{ margin: "2px 0", fontSize: "12px", color: "#bbb" }}>Date: {formatDate(document.date)}</p>
        {document.dueDate && <p className="text-gray-400 dark:text-gray-500 print:text-gray-400" style={{ margin: "2px 0", fontSize: "12px", color: "#bbb" }}>Échéance: {formatDate(document.dueDate)}</p>}
      </div>

      <div style={{ marginBottom: "30px" }}>
        <p className="text-gray-400 dark:text-gray-500 print:text-gray-400" style={{ margin: "0 0 5px", fontSize: "11px", color: "#bbb", textTransform: "uppercase", letterSpacing: "1px" }}>
          {isSales ? "Client" : "Fournisseur"}
        </p>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>{party?.name}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#888" }}>{party?.address}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#888" }}>{party?.phone}</p>
        {document.matricule && <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#888" }}>Matricule: {document.matricule}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "30px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: "8px 5px", textAlign: "left", fontWeight: "400", color: "#999", fontSize: "11px" }}>Référence</th>
            <th style={{ padding: "8px 5px", textAlign: "left", fontWeight: "400", color: "#999", fontSize: "11px" }}>Désignation</th>
            <th style={{ padding: "8px 5px", textAlign: "center", fontWeight: "400", color: "#999", fontSize: "11px" }}>Qté</th>
            <th style={{ padding: "8px 5px", textAlign: "right", fontWeight: "400", color: "#999", fontSize: "11px" }}>P.U/HT</th>
            <th style={{ padding: "8px 5px", textAlign: "right", fontWeight: "400", color: "#999", fontSize: "11px" }}>P.U/TTC</th>
            <th style={{ padding: "8px 5px", textAlign: "right", fontWeight: "400", color: "#999", fontSize: "11px" }}>Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          {document.lines.map((line) => {
            const puHT = line.unitPrice || 0;
            const taxRate = line.taxRate || 0;
            const puTTC = puHT * (1 + taxRate / 100);
            const qty = line.quantity || 0;
            const montantTTC = puTTC * qty;
            return (
              <tr key={line.id} className="border-gray-200 dark:border-gray-700 print:border-gray-200" style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "8px 5px" }}>{line.ref || line.product?.reference || "-"}</td>
                <td style={{ padding: "8px 5px" }}>{line.description}</td>
                <td className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ padding: "8px 5px", textAlign: "center", color: "#666" }}>{line.quantity}</td>
                <td className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ padding: "8px 5px", textAlign: "right", color: "#666" }}>{formatCurrency(puHT)}</td>
                <td className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ padding: "8px 5px", textAlign: "right", color: "#666" }}>{formatCurrency(puTTC)}</td>
                <td style={{ padding: "8px 5px", textAlign: "right" }}>{formatCurrency(montantTTC)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "250px" }}>
          <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#888" }}>
            <span>HT</span>
            <span>{formatCurrency(document.subtotal)}</span>
          </div>
          {document.discount > 0 && (
            <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#888" }}>
              <span>Remise</span>
              <span>-{document.discountType === "percentage" ? `${document.discount}%` : formatCurrency(document.discount)}</span>
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#888" }}>
            <span>TVA ({document.taxRate}%)</span>
            <span>{formatCurrency(document.taxAmount)}</span>
          </div>
          {document.shipping > 0 && (
            <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#888" }}>
              <span>Frais de port</span>
              <span>{formatCurrency(document.shipping)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: "5px", borderTop: "1px solid #333", fontSize: "16px", fontWeight: "500" }}>
            <span>Total TTC</span>
            <span>{formatCurrency(document.total)}</span>
          </div>
        </div>
      </div>

      {document.notes && (
        <div className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50" style={{ marginTop: "40px", padding: "15px", background: "#fafafa", fontSize: "11px", color: "#888" }}>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: 0 }}>{document.notes}</p>
        </div>
      )}
    </div>
  );
}
