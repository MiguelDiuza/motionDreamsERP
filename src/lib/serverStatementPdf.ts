import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Server-side account-statement PDF (no DOM / no logo images — text header only).
 * Mirrors the balance + multi-account logic of the browser generator so the document
 * the WhatsApp agent sends matches what the UI produces.
 */

type Job = {
    title: string;
    price: number | string;
    status: string;
    due_date?: string;
    completion_date?: string;
    created_at?: string;
};

type Payment = {
    amount: number | string;
    payment_method?: string;
    payment_date: string;
};

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const fmtDate = (d?: string | number) =>
    d ? new Date(d).toLocaleDateString('es-CO') : '-';

export function buildAccountStatementPdf(
    client: { name: string; company_name?: string },
    totalBalance: number,
    jobs: Job[] = [],
    payments: Payment[] = []
): Uint8Array {
    const doc = new jsPDF();
    const pageWidth = 210;

    // ── Header bar ──
    doc.setFillColor(242, 15, 15);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTION DREAMS', 15, 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ESTUDIO CREATIVO & PRODUCCIÓN AUDIOVISUAL', 70, 12);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, pageWidth - 15, 12, { align: 'right' });

    // ── Title ──
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Estudio Creativo & Producción Audiovisual', 15, 30);
    doc.text('Cali, Colombia  •  @motiondreams', 15, 35);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE CUENTA', pageWidth - 15, 30, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`#${Date.now().toString().slice(-6)}`, pageWidth - 15, 37, { align: 'right' });

    doc.setDrawColor(242, 15, 15);
    doc.setLineWidth(0.8);
    doc.line(15, 41, pageWidth - 15, 41);

    // ── Client + balance ──
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 15, 48);
    doc.text('ESTADO', pageWidth - 15, 48, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text((client.name || '').toUpperCase(), 15, 55);
    if (client.company_name) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(client.company_name, 15, 61);
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(totalBalance > 0 ? 242 : 34, totalBalance > 0 ? 15 : 197, totalBalance > 0 ? 15 : 94);
    doc.text(`${money(totalBalance)} COP`, pageWidth - 15, 55, { align: 'right' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(totalBalance > 0 ? 'SALDO PENDIENTE' : 'SIN DEUDA', pageWidth - 15, 61, { align: 'right' });

    // ── Multi-account logic (same as UI) ──
    const settlements = payments
        .filter((p) => p.payment_method?.toLowerCase().includes('liquidaci'))
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    const lastSettlementDate = settlements.length > 0 ? new Date(settlements[0].payment_date).getTime() : 0;

    const validJobs = jobs.filter((job) => {
        if (job.status !== 'COMPLETED') return false;
        const jobDate = new Date(job.completion_date || job.created_at || 0).getTime();
        return jobDate > lastSettlementDate;
    });
    const pendingJobs = [...validJobs].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    const subtotalJobs = pendingJobs.reduce((acc, j) => acc + parseFloat(j.price?.toString() || '0'), 0);

    const currentPayments = payments.filter((p) => {
        const payDate = new Date(p.payment_date).getTime();
        return payDate > lastSettlementDate && !p.payment_method?.toLowerCase().includes('liquidaci');
    });
    const totalPaid = currentPayments.reduce((acc, p) => acc + parseFloat(p.amount?.toString() || '0'), 0);
    const appliedPayments = Math.min(totalPaid, subtotalJobs);

    const recentPayments: any[] = [];
    if (appliedPayments > 0) {
        let remaining = appliedPayments;
        const sorted = [...currentPayments].sort(
            (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );
        for (const pay of sorted) {
            if (remaining <= 0) break;
            const payAmount = parseFloat(pay.amount?.toString() || '0');
            const used = Math.min(payAmount, remaining);
            recentPayments.push({ ...pay, amount: used });
            remaining -= used;
        }
    }

    const tableRows: any[][] = [];
    pendingJobs.forEach((job) => {
        const price = parseFloat(job.price?.toString() || '0');
        tableRows.push([
            fmtDate(job.completion_date || job.due_date || job.created_at),
            job.title.toUpperCase(),
            '✓ Entregado',
            money(price),
        ]);
    });
    recentPayments.forEach((pay) => {
        tableRows.push([
            fmtDate(pay.payment_date),
            `ABONO (${pay.payment_method || 'PAGO'})`.toUpperCase(),
            '✓ RECIBIDO',
            `-${money(parseFloat(pay.amount?.toString() || '0'))}`,
        ]);
    });
    if (tableRows.length === 0) {
        tableRows.push([fmtDate(Date.now()), 'Al día: Sin cuentas pendientes', '-', '$0']);
    }

    autoTable(doc, {
        startY: client.company_name ? 68 : 64,
        head: [['FECHA', 'DESCRIPCIÓN', 'ESTADO', 'VALOR']],
        body: tableRows,
        headStyles: { fillColor: [15, 15, 15], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        styles: { cellPadding: 5 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 28 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 32 },
            3: { halign: 'right', cellWidth: 34, fontStyle: 'bold' },
        },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // ── Totals box ──
    doc.setFillColor(245, 245, 245);
    doc.rect(pageWidth - 90, finalY, 75, 18, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBTOTAL PROYECTOS:', pageWidth - 87, finalY + 6);
    doc.text(money(subtotalJobs), pageWidth - 15, finalY + 6, { align: 'right' });
    doc.text('TOTAL ABONADO:', pageWidth - 87, finalY + 13);
    doc.setTextColor(34, 197, 94);
    doc.text(`-${money(appliedPayments)}`, pageWidth - 15, finalY + 13, { align: 'right' });

    doc.setFillColor(15, 15, 15);
    doc.rect(pageWidth - 90, finalY + 20, 75, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SALDO PENDIENTE:', pageWidth - 87, finalY + 28);
    doc.text(`${money(totalBalance)} COP`, pageWidth - 15, finalY + 28, { align: 'right' });

    // ── Payment info ──
    const payY = finalY + 42;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.rect(15, payY, 110, 40);
    doc.setFillColor(15, 15, 15);
    doc.rect(15, payY, 110, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE PAGO', 20, payY + 5.5);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text('Bancolombia (Ahorros):', 20, payY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('750 579946 31', 70, payY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text('Titular:', 20, payY + 21);
    doc.setFont('helvetica', 'bold');
    doc.text('Miguel Angel Diuza Montaño', 40, payY + 21);
    doc.setFont('helvetica', 'normal');
    doc.text('Cédula:', 20, payY + 27);
    doc.setFont('helvetica', 'bold');
    doc.text('1.192.744.528', 40, payY + 27);
    doc.setFont('helvetica', 'normal');
    doc.text('Nequi:', 20, payY + 33);
    doc.setFont('helvetica', 'bold');
    doc.text('3128555441', 40, payY + 33);

    // ── Footer ──
    doc.setFillColor(242, 15, 15);
    doc.rect(0, 287, pageWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por confiar en Motion Dreams  •  motiondreamstudio.com  •  Cali, Colombia', 105, 293, { align: 'center' });

    return new Uint8Array(doc.output('arraybuffer'));
}
