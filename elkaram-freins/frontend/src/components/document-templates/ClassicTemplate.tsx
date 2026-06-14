import React from "react";
import { View } from "lucide-react";
import type { Document, CompanySettings, DocumentDesign } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ClassicTemplateProps {
  document: Document;
  company: CompanySettings;
  design: DocumentDesign;
}

export default function ClassicTemplate({ document, company, design }: ClassicTemplateProps) {
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
        border: design.showBorders ? "1px solid #ddd" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: `2px solid ${design.primaryColor}`,
          paddingBottom: "20px",
          marginBottom: "20px",
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
          <h1 style={{ color: design.primaryColor, margin: 0, fontSize: "24px" }}>{company.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
            {company.address}
          </p>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
            Tél: {company.phone} | Email: {company.email}
          </p>
          {company.fiscalId && (
            <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
              N° Fiscal: {company.fiscalId}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ color: design.secondaryColor, margin: 0, fontSize: "28px", textTransform: "uppercase" }}>
            {document.docType.replace("_", " ")}
          </h2>
          <p style={{ margin: "5px 0", fontWeight: "bold", fontSize: "16px" }}>
            N° {document.docNumber}
          </p>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
            Date: {formatDate(document.date)}
          </p>
          {document.dueDate && (
            <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
              Échéance: {formatDate(document.dueDate)}
            </p>
          )}
        </div>
      </div>

      <div
        className="border-gray-200 dark:border-gray-700 print:border-gray-200"
        style={{
          border: "1px solid #ddd",
          padding: "15px",
          marginBottom: "20px",
          borderRadius: "4px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", color: design.primaryColor, fontSize: "14px" }}>
          {isSales ? "Client" : "Fournisseur"}
        </h3>
        <p style={{ margin: "2px 0", fontWeight: "bold" }}>{party?.name}</p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
          {party?.address}
        </p>
        <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
          Tél: {party?.phone} | Email: {party?.email}
        </p>
        {party?.fiscalId && (
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ margin: "2px 0", fontSize: "12px" }}>
            N° Fiscal: {party.fiscalId}
          </p>
        )}
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: design.primaryColor, color: "#fff" }}>
            <th style={{ padding: "10px", textAlign: "left", border: design.showBorders ? "1px solid #ddd" : "none" }}>
              Référence
            </th>
            <th style={{ padding: "10px", textAlign: "left", border: design.showBorders ? "1px solid #ddd" : "none" }}>
              Désignation
            </th>
            <th style={{ padding: "10px", textAlign: "center", border: design.showBorders ? "1px solid #ddd" : "none" }}>
              Qté
            </th>
            <th style={{ padding: "10px", textAlign: "right", border: design.showBorders ? "1px solid #ddd" : "none" }}>
              Prix HT
            </th>
            <th style={{ padding: "10px", textAlign: "right", border: design.showBorders ? "1px solid #ddd" : "none" }}>
              Total TTC
            </th>
          </tr>
        </thead>
        <tbody>
          {document.lines.map((line, index) => (
            <tr
              key={line.id}
              className="border-gray-200 dark:border-gray-700 print:border-gray-200"
              style={{
                borderBottom: "1px solid #eee",
                backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#fff",
              }}
            >
              <td style={{ padding: "8px", border: design.showBorders ? "1px solid #ddd" : "none" }}>
                {line.ref || line.product?.reference || "-"}
              </td>
              <td style={{ padding: "8px", border: design.showBorders ? "1px solid #ddd" : "none" }}>
                {line.description}
              </td>
              <td style={{ padding: "8px", textAlign: "center", border: design.showBorders ? "1px solid #ddd" : "none" }}>
                {line.quantity}
              </td>
              <td style={{ padding: "8px", textAlign: "right", border: design.showBorders ? "1px solid #ddd" : "none" }}>
                {formatCurrency(line.unitPrice || 0)}
              </td>
              <td style={{ padding: "8px", textAlign: "right", border: design.showBorders ? "1px solid #ddd" : "none" }}>
                {formatCurrency(line.totalTtc || line.total || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "right", fontSize: "14px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "40px", marginBottom: "5px" }}>
          <span className="text-gray-600 dark:text-gray-400 print:text-gray-600">Sous-total:</span>
          <span style={{ fontWeight: "bold" }}>{formatCurrency(document.subtotal)}</span>
        </div>
        {document.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "40px", marginBottom: "5px" }}>
            <span className="text-gray-600 dark:text-gray-400 print:text-gray-600">Remise:</span>
            <span style={{ fontWeight: "bold" }}>
              -{document.discountType === "percentage" ? `${document.discount}%` : formatCurrency(document.discount)}
            </span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "40px", marginBottom: "5px" }}>
          <span className="text-gray-600 dark:text-gray-400 print:text-gray-600">TVA ({document.taxRate}%):</span>
          <span>{formatCurrency(document.taxAmount)}</span>
        </div>
        {document.shipping > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "40px", marginBottom: "5px" }}>
            <span className="text-gray-600 dark:text-gray-400 print:text-gray-600">Frais de port:</span>
            <span>{formatCurrency(document.shipping)}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "40px",
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: `2px solid ${design.primaryColor}`,
            fontSize: "18px",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Total TTC:</span>
          <span style={{ fontWeight: "bold", color: design.primaryColor }}>
            {formatCurrency(document.total)}
          </span>
        </div>
      </div>

      {document.notes && (
        <div className="border-gray-200 dark:border-gray-700 print:border-gray-200" style={{ marginTop: "30px", borderTop: "1px solid #ddd", paddingTop: "15px" }}>
          <h4 style={{ margin: "0 0 5px 0", fontSize: "13px", color: design.primaryColor }}>Notes:</h4>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ fontSize: "12px", margin: 0 }}>{document.notes}</p>
        </div>
      )}

      {document.terms && (
        <div style={{ marginTop: "15px" }}>
          <h4 style={{ margin: "0 0 5px 0", fontSize: "13px", color: design.primaryColor }}>
            Conditions:
          </h4>
          <p className="text-gray-600 dark:text-gray-400 print:text-gray-600" style={{ fontSize: "12px", margin: 0 }}>{document.terms}</p>
        </div>
      )}
    </div>
  );
}
