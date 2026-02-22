import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Tailwind v4 generates @supports (color: lab(…)) and
 * @supports (color: color-mix(in lab, …)) blocks that override CSS custom
 * properties with lab()/oklch()/color-mix(in oklab, …) values in modern
 * browsers. html2canvas cannot parse any of these — it throws
 * "Attempting to parse an unsupported color function lab".
 *
 * The only reliable fix is to walk the cloned document's stylesheets and
 * delete every CSSSupportsRule whose condition mentions "lab" or "oklch".
 * This leaves only the plain hex fallback values that html2canvas can parse.
 *
 * We also inject an override <style> block as a belt-and-braces safeguard
 * to guarantee our custom-property hex values win the cascade.
 */
function stripUnsupportedColorRules(doc: Document) {
  // 1. Walk stylesheets and delete @supports rules that reference lab/oklch
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      deleteLabRules(sheet.cssRules);
    } catch {
      // cross-origin stylesheets throw SecurityError — skip them
    }
  }

  // 2. Belt-and-braces: inject hex overrides for our custom properties
  const style = doc.createElement("style");
  style.textContent = `
    :root {
      --background: #ffffff !important;
      --foreground: #18181b !important;
      --card: #ffffff !important;
      --card-foreground: #18181b !important;
      --popover: #ffffff !important;
      --popover-foreground: #18181b !important;
      --primary: #10b981 !important;
      --primary-foreground: #fafafa !important;
      --secondary: #f4f4f5 !important;
      --secondary-foreground: #27272a !important;
      --muted: #f4f4f5 !important;
      --muted-foreground: #71717a !important;
      --accent: #ecfdf5 !important;
      --accent-foreground: #065f46 !important;
      --destructive: #dc2626 !important;
      --border: #e4e4e7 !important;
      --input: #e4e4e7 !important;
      --ring: #10b981 !important;
      --chart-1: #10b981 !important;
      --chart-2: #34d399 !important;
      --chart-3: #059669 !important;
      --chart-4: #fbbf24 !important;
      --chart-5: #71717a !important;
    }
  `;
  doc.head.appendChild(style);
}

function deleteLabRules(rules: CSSRuleList) {
  // Walk backwards so index removal doesn't skip rules
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (
      rule instanceof CSSSupportsRule &&
      /lab|oklch|oklab/.test(rule.conditionText)
    ) {
      rule.parentStyleSheet?.deleteRule(i);
      continue;
    }
    // Recurse into nested group rules (@media, @layer, other @supports)
    if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules?.length) {
      deleteLabRules((rule as CSSGroupingRule).cssRules);
    }
  }
}

const h2cOptions = {
  backgroundColor: "#ffffff",
  scale: 2,
  onclone: stripUnsupportedColorRules,
} as const;

export function useChartExport(ref: React.RefObject<HTMLElement | null>, title: string) {
  async function exportPng() {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, h2cOptions);
    const link = document.createElement("a");
    link.download = `${title}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportPdf() {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, h2cOptions);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${title}.pdf`);
  }

  return { exportPng, exportPdf };
}
