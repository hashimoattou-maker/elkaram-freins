import React, { useEffect, useState } from "react";
import ClassicTemplate from "./ClassicTemplate";
import ModernTemplate from "./ModernTemplate";
import ProfessionalTemplate from "./ProfessionalTemplate";
import MinimalTemplate from "./MinimalTemplate";
import { settings as settingsApi } from "@/lib/api";
import type { Document, CompanySettings, DocumentDesign } from "@/types";

interface DocumentPreviewProps {
  document: Document;
}

export default function DocumentPreview({ document }: DocumentPreviewProps) {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [design, setDesign] = useState<DocumentDesign | null>(null);

  useEffect(() => {
    Promise.all([
      settingsApi.getCompany(),
      settingsApi.getDesigns(),
    ])
      .then(([comp, designs]) => {
        setCompany(comp);
        const defaultDesign = designs.find((d) => d.isDefault) || designs[0];
        setDesign(defaultDesign || {
          id: 0,
          name: "Classique",
          primaryColor: "#1e40af",
          secondaryColor: "#f59e0b",
          fontFamily: "Inter",
          showLogo: true,
          showBorders: true,
          headerStyle: "classic",
          isDefault: true,
        });
      })
      .catch(() => {});
  }, []);

  if (!company || !design) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const props = { document, company, design };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      {(() => {
        switch (design.headerStyle) {
          case "modern":
            return <ModernTemplate {...props} />;
          case "professional":
            return <ProfessionalTemplate {...props} />;
          case "minimal":
            return <MinimalTemplate {...props} />;
          default:
            return <ClassicTemplate {...props} />;
        }
      })()}
    </div>
  );
}
