import React from "react";
import type { Document, CompanySettings, DocumentDesign } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProfessionalTemplateProps {
  document: Document;
  company: CompanySettings;
  design: DocumentDesign;
}

export default function ProfessionalTemplate({ document, company, design }: ProfessionalTemplateProps) {
  const isSales = ["devis", "commande_client", "bon_livraison", "facture_vente", "avoir_vente"].includes(document.docType);
  const party = isSales ? document.client : document.supplier;

  return (
    <div
      className="bg-white dark:bg-gray-900 print:bg-white"
      style={{
        fontFamily: design.fontFamily,
        padding: "40px 50px",
        maxWidth: "800px",
        margin: "0 auto",
        background: "#fff",
      }}
    >
      <div
        style={{
          borderBottom: `3px solid ${design.primaryColor}`,
          paddingBottom: "20px",
          marginBottom: "25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          {design.showLogo && company.logo && (
            <img
              src={company.logo}
              alt="Logo"
              style={{ maxWidth: `${company.logoWidth}px`, maxHeight: `${company.logoHeight}px`, marginBottom: "10px" }}
            />
          )}
          <h1 className="text-gray-800 dark:text-gray-200 print:text-gray-800" style={{ margin: 0, fontSize: "20px", color: "#333", fontWeight: "600" }}>{company.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "3px 0", fontSize: "11px", color: "#888" }}>{company.address}</p>
          <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "3px 0", fontSize: "11px", color: "#888" }}>
            Tél: {company.phone} | Email: {company.email} | N° Fiscal: {company.fiscalId}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "26px",
              color: design.primaryColor,
              fontWeight: "300",
              textTransform: "uppercase",
              letterSpacing: "3px",
            }}
          >
            {document.docType.replace("_", " ")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "8px 0 3px", fontSize: "14px", color: "#555", fontWeight: "500" }}>
            {document.docNumber}
          </p>
          <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "2px 0", fontSize: "11px", color: "#888" }}>Date: {formatDate(document.date)}</p>
          {document.dueDate && <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "2px 0", fontSize: "11px", color: "#888" }}>Échéance: {formatDate(document.dueDate)}</p>}
        </div>
      </div>

      <div
        className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50"
        style={{
          background: "#f5f7fa",
          padding: "15px 20px",
          marginBottom: "25px",
          borderLeft: `4px solid ${design.primaryColor}`,
        }}
      >
        <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "0 0 5px 0", fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
          {isSales ? "Client" : "Fournisseur"}
        </p>
        <p className="text-gray-800 dark:text-gray-200 print:text-gray-800" style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#333" }}>{party?.name}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>{party?.address}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>{party?.phone} | {party?.email}</p>
        {party?.fiscalId && <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>N° Fiscal: {party.fiscalId}</p>}
        {document.matricule && <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>Matricule: {document.matricule}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "25px" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${design.primaryColor}` }}>
            <th style={{ padding: "10px 8px", textAlign: "left", color: design.primaryColor, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Référence
            </th>
            <th style={{ padding: "10px 8px", textAlign: "left", color: design.primaryColor, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Désignation
            </th>
            <th style={{ padding: "10px 8px", textAlign: "center", color: design.primaryColor, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Qté
            </th>
            <th style={{ padding: "10px 8px", textAlign: "right", color: design.primaryColor, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              P.U/HT
            </th>
            <th style={{ padding: "10px 8px", textAlign: "right", color: design.primaryColor, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              P.U/TTC
            </th>
            <th style={{ padding: "10px 8px", textAlign: "right", color: design.primaryColor, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Montant TTC
            </th>
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
              <tr key={line.id} className="border-gray-200 dark:border-gray-700 print:border-gray-200" style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 8px" }}>{line.ref || line.product?.reference || "-"}</td>
                <td style={{ padding: "10px 8px" }}>{line.description}</td>
                <td style={{ padding: "10px 8px", textAlign: "center" }}>{line.quantity}</td>
                <td style={{ padding: "10px 8px", textAlign: "right" }}>{formatCurrency(puHT)}</td>
                <td style={{ padding: "10px 8px", textAlign: "right" }}>{formatCurrency(puTTC)}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "500" }}>{formatCurrency(montantTTC)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "280px" }}>
          <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#666" }}>
            <span>HT:</span>
            <span>{formatCurrency(document.subtotal)}</span>
          </div>
          {document.discount > 0 && (
            <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#666" }}>
              <span>Remise:</span>
              <span>-{document.discountType === "percentage" ? `${document.discount}%` : formatCurrency(document.discount)}</span>
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#666" }}>
            <span>TVA ({document.taxRate}%):</span>
            <span>{formatCurrency(document.taxAmount)}</span>
          </div>
          {document.shipping > 0 && (
            <div className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#666" }}>
              <span>Frais de port:</span>
              <span>{formatCurrency(document.shipping)}</span>
            </div>
          )}
          <div
            className="text-gray-800 dark:text-gray-200 print:text-gray-800"
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              marginTop: "5px",
              borderTop: `2px solid ${design.primaryColor}`,
              fontSize: "16px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            <span>Total TTC:</span>
            <span style={{ color: design.primaryColor }}>{formatCurrency(document.total)}</span>
          </div>
        </div>
      </div>

      {(document.notes || document.terms) && (
        <div className="border-gray-200 dark:border-gray-700 print:border-gray-200" style={{ marginTop: "30px", paddingTop: "15px", borderTop: "1px solid #ddd" }}>
          {document.notes && (
            <div style={{ marginBottom: "10px" }}>
              <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "0 0 3px", fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Notes:</p>
              <p className="text-gray-700 dark:text-gray-300 print:text-gray-700" style={{ margin: 0, fontSize: "12px", color: "#555" }}>{document.notes}</p>
            </div>
          )}
          {document.terms && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 print:text-gray-500" style={{ margin: "0 0 3px", fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Conditions:</p>
              <p className="text-gray-700 dark:text-gray-300 print:text-gray-700" style={{ margin: 0, fontSize: "12px", color: "#555" }}>{document.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
