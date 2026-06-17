import React from "react";
import type { Document, CompanySettings, DocumentDesign } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ModernTemplateProps {
  document: Document;
  company: CompanySettings;
  design: DocumentDesign;
}

export default function ModernTemplate({ document, company, design }: ModernTemplateProps) {
  const isSales = ["devis", "commande_client", "bon_livraison", "facture_vente", "avoir_vente"].includes(document.docType);
  const party = isSales ? document.client : document.supplier;

  return (
    <div
      className="bg-white dark:bg-gray-900 print:bg-white"
      style={{
        fontFamily: design.fontFamily,
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${design.primaryColor}, ${design.secondaryColor})`,
          color: "#fff",
          padding: "30px",
          borderRadius: "8px",
          marginBottom: "30px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {design.showLogo && company.logo && (
              <img
                src={company.logo}
                alt="Logo"
                style={{ maxWidth: `${company.logoWidth}px`, maxHeight: `${company.logoHeight}px`, marginBottom: "10px", filter: "brightness(0) invert(1)" }}
              />
            )}
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>{company.name}</h1>
            <p style={{ margin: "2px 0", fontSize: "12px", opacity: 0.9 }}>{company.address}</p>
            <p style={{ margin: "2px 0", fontSize: "12px", opacity: 0.9 }}>Tél: {company.phone} | {company.email}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, fontSize: "24px", textTransform: "uppercase", letterSpacing: "2px" }}>
              {document.docType.replace("_", " ")}
            </h2>
            <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "bold" }}>
              N° {document.docNumber}
            </p>
            <p style={{ margin: "2px 0", fontSize: "12px", opacity: 0.9 }}>
              Date: {formatDate(document.date)}
            </p>
            {document.dueDate && (
              <p style={{ margin: "2px 0", fontSize: "12px", opacity: 0.9 }}>
                Échéance: {formatDate(document.dueDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50"
        style={{
          background: "#f8f9fa",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "25px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", color: design.primaryColor, fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {isSales ? "CLIENT" : "FOURNISSEUR"}
        </h3>
        <p style={{ margin: "2px 0", fontWeight: "bold", fontSize: "14px" }}>{party?.name}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>{party?.address}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>{party?.phone} | {party?.email}</p>
        {party?.fiscalId && <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>N° Fiscal: {party.fiscalId}</p>}
        {document.matricule && <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>Matricule: {document.matricule}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px", fontSize: "13px", marginBottom: "25px" }}>
        <thead>
          <tr>
            <th style={{ padding: "12px 15px", textAlign: "left", background: design.primaryColor, color: "#fff", borderRadius: "6px 0 0 6px" }}>
              Référence
            </th>
            <th style={{ padding: "12px 15px", textAlign: "left", background: design.primaryColor, color: "#fff" }}>
              Désignation
            </th>
            <th style={{ padding: "12px 15px", textAlign: "center", background: design.primaryColor, color: "#fff" }}>
              Qté
            </th>
            <th style={{ padding: "12px 15px", textAlign: "right", background: design.primaryColor, color: "#fff" }}>
              P.U/HT
            </th>
            <th style={{ padding: "12px 15px", textAlign: "right", background: design.primaryColor, color: "#fff" }}>
              P.U/TTC
            </th>
            <th style={{ padding: "12px 15px", textAlign: "right", background: design.primaryColor, color: "#fff", borderRadius: "0 6px 6px 0" }}>
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
              <tr
                key={line.id}
                className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50"
                style={{
                  background: "#f8f9fa",
                  borderRadius: "6px",
                }}
              >
                <td style={{ padding: "10px 15px", borderRadius: "6px 0 0 6px" }}>{line.ref || line.product?.reference || "-"}</td>
                <td style={{ padding: "10px 15px" }}>{line.description}</td>
                <td style={{ padding: "10px 15px", textAlign: "center" }}>{line.quantity}</td>
                <td style={{ padding: "10px 15px", textAlign: "right" }}>{formatCurrency(puHT)}</td>
                <td style={{ padding: "10px 15px", textAlign: "right" }}>{formatCurrency(puTTC)}</td>
                <td style={{ padding: "10px 15px", textAlign: "right", borderRadius: "0 6px 6px 0", fontWeight: "bold" }}>
                  {formatCurrency(montantTTC)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "25px" }}>
        <div style={{ width: "300px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "14px" }}>
            <span>HT:</span>
            <span>{formatCurrency(document.subtotal)}</span>
          </div>
          {document.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "14px" }}>
              <span>Remise:</span>
              <span>-{document.discountType === "percentage" ? `${document.discount}%` : formatCurrency(document.discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "14px" }}>
            <span>TVA ({document.taxRate}%):</span>
            <span>{formatCurrency(document.taxAmount)}</span>
          </div>
          {document.shipping > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "14px" }}>
              <span>Frais de port:</span>
              <span>{formatCurrency(document.shipping)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              marginTop: "5px",
              borderTop: `2px solid ${design.secondaryColor}`,
              fontSize: "18px",
              fontWeight: "bold",
              color: design.primaryColor,
            }}
          >
            <span>Total TTC:</span>
            <span>{formatCurrency(document.total)}</span>
          </div>
        </div>
      </div>

      {document.notes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 print:bg-yellow-50" style={{ background: "#fff3cd", padding: "15px", borderRadius: "6px", marginBottom: "10px" }}>
          <p className="text-yellow-800 dark:text-yellow-200 print:text-yellow-800" style={{ margin: 0, fontSize: "12px", color: "#856404" }}><strong>Notes:</strong> {document.notes}</p>
        </div>
      )}
      {document.terms && (
        <div className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50" style={{ background: "#f8f9fa", padding: "15px", borderRadius: "6px" }}>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: 0, fontSize: "12px", color: "#666" }}><strong>Conditions:</strong> {document.terms}</p>
        </div>
      )}
    </div>
  );
}
