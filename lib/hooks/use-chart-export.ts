import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

const h2cOptions = {
  backgroundColor: "#ffffff",
  scale: 2,
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
