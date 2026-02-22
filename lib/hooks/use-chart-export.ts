import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Tailwind v4 generates @supports (color: lab(0% 0 0)) blocks that override
 * CSS custom properties with lab() values in modern browsers. html2canvas
 * cannot parse lab()/oklch() — this onclone callback injects a <style> tag
 * with plain hex equivalents that take cascade priority over Tailwind's block.
 */
function injectHexColors(doc: Document) {
  const style = doc.createElement("style");
  style.textContent = `
    :root {
      --background: #ffffff; --foreground: #18181b;
      --card: #ffffff; --card-foreground: #18181b;
      --popover: #ffffff; --popover-foreground: #18181b;
      --primary: #10b981; --primary-foreground: #fafafa;
      --secondary: #f4f4f5; --secondary-foreground: #27272a;
      --muted: #f4f4f5; --muted-foreground: #71717a;
      --accent: #ecfdf5; --accent-foreground: #065f46;
      --destructive: #dc2626;
      --border: #e4e4e7; --input: #e4e4e7; --ring: #10b981;
      --chart-1: #10b981; --chart-2: #34d399; --chart-3: #059669;
      --chart-4: #fbbf24; --chart-5: #71717a;
    }
  `;
  doc.head.appendChild(style);
}

const h2cOptions = {
  backgroundColor: "#ffffff",
  scale: 2,
  onclone: injectHexColors,
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
