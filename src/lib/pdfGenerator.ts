import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extending jsPDF with autotable types for TypeScript
declare module 'jspdf' {
    interface jsPDF {
        autoTable: any;
    }
}

interface Job {
    id: string;
    title: string;
    price: number | string;
    status: string;
    due_date?: string;
    completion_date?: string;
    created_at?: string;
}

interface Expense {
    id: string;
    description: string;
    amount: number | string;
    category: string;
    due_date: string;
    is_paid: boolean;
}

interface Income {
    id: string;
    client_name: string;
    amount: number | string;
    payment_method: string;
    payment_date?: string;
    created_at: string;
}

interface Payment {
    id: string;
    amount: number | string;
    payment_method: string;
    payment_date: string;
    notes?: string;
}

/**
 * Converts an SVG/Image from a URL to a High-Res PNG Base64 string.
 * Ensures the aspect ratio is preserved and optionally forces the image to white.
 */
const getPngFromUrl = async (url: string, forceWhite: boolean = false): Promise<{ data: string; width: number; height: number } | null> => {
    if (typeof window === 'undefined') return null;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const scale = 4; // High res scale
                const w = (img.width || 100);
                const h = (img.height || 100);

                canvas.width = w * scale;
                canvas.height = h * scale;

                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                if (forceWhite) {
                    ctx.globalCompositeOperation = 'source-in';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                resolve({
                    data: canvas.toDataURL('image/png'),
                    width: w,
                    height: h
                });
            } catch (err) {
                console.error('Error converting image to PNG:', url, err);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.error('Failed to load image:', url);
            resolve(null);
        };
        img.src = url;
    });
};

/**
 * Generates a professional PDF Account Statement for Motion Dreams.
 */
export const generateAccountStatementPDF = async (client: any, totalBalance: number, jobs: Job[] = [], payments: Payment[] = []) => {
    const doc = new jsPDF();
    const pageWidth = 210;

    // Load Logos as PNG (Safe for jsPDF)
    const favicon = await getPngFromUrl('/img/favicon.svg', true); // Whitened favicon
    const logoDark = await getPngFromUrl('/img/logo-dark.svg');

    // ── Header Red Bar ──────────────────────────────────────────
    doc.setFillColor(242, 15, 15); // #F20F0F
    doc.rect(0, 0, pageWidth, 18, 'F');

    // Favicon in red bar (Requested: favicon white, proportional)
    if (favicon) {
        const targetH = 10;
        const targetW = (favicon.width / favicon.height) * targetH;
        doc.addImage(favicon.data, 'PNG', 15, 4, targetW, targetH);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ESTUDIO CREATIVO & PRODUCCIÓN AUDIOVISUAL', 70, 12);

    // Issue date top-right
    doc.setFontSize(7);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, pageWidth - 15, 12, { align: 'right' });

    // ── Studio Info & Document Title ─────────────────────────────
    // Instead of Text title, use logo-dark proportional
    if (logoDark) {
        const targetW = 45;
        const targetH = (logoDark.height / logoDark.width) * targetW;
        doc.addImage(logoDark.data, 'PNG', 15, 25, targetW, targetH);
    } else {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('MOTION DREAMS', 15, 34);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Estudio Creativo & Producción Audiovisual', 15, 44);
    doc.text('Cali, Colombia  •  @motiondreams', 15, 49);

    // Document label top-right
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE CUENTA', pageWidth - 15, 34, { align: 'right' });

    // Invoice-style number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`#${Date.now().toString().slice(-6)}`, pageWidth - 15, 41, { align: 'right' });

    // ── Divider ──────────────────────────────────────────────────
    doc.setDrawColor(242, 15, 15);
    doc.setLineWidth(0.8);
    doc.line(15, 53, pageWidth - 15, 53);

    // ── Client Info ──────────────────────────────────────────────
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 15, 59);
    doc.text('ESTADO', pageWidth - 15, 59, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(client.name?.toUpperCase() || '', 15, 66);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (client.company) doc.text(client.company, 15, 72);

    // Balance badge top-right
    const balanceText = `$${parseFloat(totalBalance.toString()).toLocaleString('es-CO')} COP`;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(totalBalance > 0 ? 242 : 34, totalBalance > 0 ? 15 : 197, totalBalance > 0 ? 15 : 94);
    doc.text(balanceText, pageWidth - 15, 66, { align: 'right' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(totalBalance > 0 ? 'SALDO PENDIENTE' : 'SIN DEUDA', pageWidth - 15, 72, { align: 'right' });

    // ── Table Data Combined (Jobs + Payments) ───────────────────
    const subtotalJobs = jobs.reduce((acc, job) => acc + parseFloat(job.price?.toString() || '0'), 0);
    const totalPayments = payments.reduce((acc, pay) => acc + parseFloat(pay.amount?.toString() || '0'), 0);

    let tableRows: any[][] = [];

    // Add Jobs
    if (jobs && jobs.length > 0) {
        jobs.forEach((job) => {
            const price = parseFloat(job.price?.toString() || '0');
            const date = job.completion_date || job.due_date || job.created_at || '';
            const formattedDate = date ? new Date(date).toLocaleDateString('es-CO') : '-';
            const status = job.status === 'COMPLETED' ? '✓ Entregado' : '⏳ Pendiente';
            tableRows.push([
                formattedDate,
                job.title.toUpperCase(),
                status,
                `$${price.toLocaleString('es-CO')}`,
            ]);
        });
    }

    // Add Payments
    if (payments && payments.length > 0) {
        payments.forEach((pay) => {
            const amount = parseFloat(pay.amount?.toString() || '0');
            const date = pay.payment_date || '';
            const formattedDate = date ? new Date(date).toLocaleDateString('es-CO') : '-';
            tableRows.push([
                formattedDate,
                `ABONO / PAGO (${pay.payment_method})`.toUpperCase(),
                '✓ RECIBIDO',
                `-$${amount.toLocaleString('es-CO')}`,
            ]);
        });
    }

    if (tableRows.length === 0) {
        tableRows = [
            [new Date().toLocaleDateString('es-CO'), 'Sin movimientos registrados', '-', '$0']
        ];
    }

    doc.autoTable({
        startY: client.company ? 82 : 78,
        head: [['FECHA', 'DESCRIPCIÓN', 'ESTADO', 'VALOR']],
        body: tableRows,
        headStyles: {
            fillColor: [15, 15, 15],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 30, 30],
        },
        styles: { cellPadding: 5 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 28 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 32 },
            3: { halign: 'right', cellWidth: 34, fontStyle: 'bold' },
        },
    });

    // ── Totals Box ───────────────────────────────────────────────
    const finalY = doc.autoTable.previous.finalY + 8;

    // Summary Background
    doc.setFillColor(245, 245, 245);
    doc.rect(pageWidth - 90, finalY, 75, 24, 'F');

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    // Subtotal Jobs
    doc.text('SUBTOTAL PROYECTOS:', pageWidth - 87, finalY + 6);
    doc.text(`$${subtotalJobs.toLocaleString('es-CO')}`, pageWidth - 15, finalY + 6, { align: 'right' });

    // Total Payments
    doc.text('TOTAL ABONADO:', pageWidth - 87, finalY + 13);
    doc.setTextColor(34, 197, 94); // Green for payments received
    doc.text(`-$${totalPayments.toLocaleString('es-CO')}`, pageWidth - 15, finalY + 13, { align: 'right' });

    // Divider in totals
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(pageWidth - 87, finalY + 16, pageWidth - 15, finalY + 16);

    // Final Balance
    doc.setFillColor(15, 15, 15);
    doc.rect(pageWidth - 90, finalY + 24, 75, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SALDO PENDIENTE:', pageWidth - 87, finalY + 32);
    doc.text(`$${totalBalance.toLocaleString('es-CO')} COP`, pageWidth - 15, finalY + 32, { align: 'right' });

    // ── Payment Info ─────────────────────────────────────────────
    const payY = finalY + 45;
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
    doc.setFontSize(8);
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

    // ── Footer ───────────────────────────────────────────────────
    doc.setFillColor(242, 15, 15);
    doc.rect(0, 287, pageWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por confiar en Motion Dreams  •  motiondreamstudio.com  •  Cali, Colombia', 105, 293, { align: 'center' });

    doc.save(`Estado_Cuenta_${client.name.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Generates a monthly financial summary PDF.
 */
export const generateMonthlyReportPDF = async (monthName: string, income: Income[], expenses: Expense[]) => {
    const doc = new jsPDF();
    const pageWidth = 210;

    const logoDark = await getPngFromUrl('/img/logo-dark.svg');

    // Header
    doc.setFillColor(242, 15, 15);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE FINANCIERO MENSUAL', 15, 12);
    doc.text(`${monthName.toUpperCase()} ${new Date().getFullYear()}`, pageWidth - 15, 12, { align: 'right' });

    // Logo & Title Proportional
    if (logoDark) {
        const targetW = 45;
        const targetH = (logoDark.height / logoDark.width) * targetW;
        doc.addImage(logoDark.data, 'PNG', 15, 25, targetW, targetH);
    } else {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('MOTION DREAMS', 15, 34);
    }

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Resumen Operativo de Ingresos y Egresos', 15, 42);

    doc.setDrawColor(242, 15, 15);
    doc.setLineWidth(0.8);
    doc.line(15, 50, pageWidth - 15, 50);

    // Financial Summary Stats
    const totalIncome = income.reduce((acc, curr) => acc + parseFloat(curr.amount.toString()), 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount.toString()), 0);
    const netProfit = totalIncome - totalExpenses;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DEL PERIODO', 15, 60);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Ingresos Totales:', 15, 70);
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`$${totalIncome.toLocaleString('es-CO')}`, 70, 70);

    doc.setTextColor(0, 0, 0);
    doc.text('Egresos Totales:', 15, 77);
    doc.setTextColor(242, 15, 15); // Red
    doc.text(`$${totalExpenses.toLocaleString('es-CO')}`, 70, 77);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('UTILIDAD NETA:', 15, 87);
    doc.setTextColor(netProfit >= 0 ? 34 : 242, netProfit >= 0 ? 197 : 15, netProfit >= 0 ? 94 : 15);
    doc.text(`$${netProfit.toLocaleString('es-CO')}`, 70, 87);

    // ── Income Table ──────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE INGRESOS', 15, 105);

    doc.autoTable({
        startY: 110,
        head: [['FECHA', 'CLIENTE', 'MÉTODO', 'VALOR']],
        body: income.map(i => [
            new Date(i.created_at).toLocaleDateString('es-CO'),
            i.client_name,
            i.payment_method,
            `$${parseFloat(i.amount.toString()).toLocaleString('es-CO')}`
        ]),
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 8 }
    });

    // ── Expenses Table ────────────────────────────────────────────
    const expensesStartY = doc.autoTable.previous.finalY + 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE EGRESOS', 15, expensesStartY);

    doc.autoTable({
        startY: expensesStartY + 5,
        head: [['FECHA', 'DESCRIPCIÓN', 'CATEGORÍA', 'VALOR']],
        body: expenses.map(e => [
            new Date(e.due_date).toLocaleDateString('es-CO'),
            e.description,
            e.category === 'BUSINESS' ? 'EMPRESA' : 'PERSONAL',
            `$${parseFloat(e.amount.toString()).toLocaleString('es-CO')}`
        ]),
        headStyles: { fillColor: [242, 15, 15], textColor: [255, 255, 255] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 8 }
    });

    // Footer
    doc.setFillColor(242, 15, 15);
    doc.rect(0, 287, pageWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('Motion Dreams ERP - Reporte Generado Automáticamente', 105, 293, { align: 'center' });

    doc.save(`Reporte_${monthName}_${new Date().getFullYear()}.pdf`);
};
