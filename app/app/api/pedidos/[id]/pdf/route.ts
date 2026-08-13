import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { numeroALetras } from '@/lib/numero-a-letras'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isDownload = searchParams.get('download') === 'true'

    const pedido = await prisma.pedido.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        vendedor: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        },
        sucursal: true,
        detalles: {
          include: {
            producto: true
          }
        }
      }
    })

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const configuracion = await prisma.configuracion.findFirst()

    const empresa = {
      nombre: configuracion?.nombreEmpresa || 'FerreColors ERP',
      rfc: configuracion?.rfc || 'FCO180412XYZ',
      direccion: configuracion?.direccion || 'Av. Central #450, Col. Industrial, Monterrey, N.L.',
      telefono: configuracion?.telefono || '(81) 8234-5678',
      email: configuracion?.email || 'ventas@ferrecolors.com',
      colorPrimario: configuracion?.colorPrimario || '#1e3a8a'
    }

    const fechaFormateada = format(new Date(pedido.fechaPedido), "dd 'de' MMMM, yyyy", { locale: es })
    const fechaVencimientoFormateada = pedido.fechaEntregaEstimada 
      ? format(new Date(pedido.fechaEntregaEstimada), "dd 'de' MMMM, yyyy", { locale: es })
      : '15 días hábiles'

    const totalEnLetras = numeroALetras(pedido.total)

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización / Pedido ${pedido.folio}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      background-color: #f1f5f9;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.5;
      padding: 20px;
    }

    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .container {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
    }

    .action-header {
      max-width: 850px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a !important;
      color: #ffffff !important;
      padding: 14px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
    }

    .btn-print {
      background-color: #2563eb !important;
      color: #ffffff !important;
      border: none;
      padding: 9px 20px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      transition: all 0.2s ease;
    }

    .btn-print:hover {
      background-color: #1d4ed8 !important;
    }

    .container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff !important;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid #cbd5e1;
      position: relative;
    }

    .brand-bar {
      height: 7px;
      background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #f59e0b 100%) !important;
      border-radius: 6px 6px 0 0;
      margin-bottom: 24px;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .header-table td {
      vertical-align: top;
    }

    .company-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-badge {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #1e3a8a, #2563eb) !important;
      color: #ffffff !important;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 24px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }

    .company-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a !important;
      letter-spacing: -0.5px;
    }

    .company-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-type {
      font-size: 20px;
      font-weight: 800;
      color: #1e3a8a !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .doc-folio {
      font-size: 14px;
      font-weight: 800;
      color: #b45309 !important;
      background-color: #fef3c7 !important;
      border: 1px solid #fde68a !important;
      font-family: ui-monospace, monospace;
      margin-top: 4px;
      padding: 3px 10px;
      border-radius: 6px;
      display: inline-block;
    }

    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      background-color: #d1fae5 !important;
      color: #047857 !important;
      border: 1px solid #6ee7b7 !important;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }

    .info-col {
      display: table-cell;
      width: 49%;
      vertical-align: top;
      background-color: #f8fafc !important;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 12px;
      padding: 0;
      overflow: hidden;
    }

    .info-spacer {
      display: table-cell;
      width: 2%;
    }

    .card-header {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b !important;
      background-color: #e2e8f0 !important;
      border-bottom: 1.5px solid #cbd5e1 !important;
      padding: 8px 14px;
      letter-spacing: 0.5px;
    }

    .card-body {
      padding: 14px;
    }

    .info-row {
      margin-bottom: 5px;
      font-size: 11.5px;
    }

    .info-label {
      color: #64748b !important;
      font-weight: 500;
    }

    .info-val {
      color: #0f172a !important;
      font-weight: 700;
    }

    .summary-bar {
      width: 100%;
      background-color: #0f172a !important;
      color: #ffffff !important;
      border-radius: 10px;
      padding: 12px 18px;
      margin-bottom: 24px;
      border-collapse: collapse;
    }

    .summary-bar td {
      width: 25%;
      font-size: 11px;
    }

    .summary-bar .s-label {
      color: #94a3b8 !important;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .summary-bar .s-val {
      font-weight: 700;
      font-size: 12.5px;
      color: #ffffff !important;
    }

    .table-container {
      margin-bottom: 24px;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 10px;
      overflow: hidden;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 10px 12px;
      text-align: left;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #020617 !important;
    }

    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1 !important;
      font-size: 11.5px;
      color: #0f172a !important;
    }

    .items-table tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }

    .code-tag {
      font-family: ui-monospace, monospace;
      font-size: 10.5px;
      background-color: #e2e8f0 !important;
      color: #0f172a !important;
      padding: 3px 7px;
      border-radius: 5px;
      font-weight: 700;
      border: 1px solid #cbd5e1 !important;
    }

    .product-name {
      font-weight: 700;
      color: #0f172a !important;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .totals-section {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }

    .notes-box {
      display: table-cell;
      width: 55%;
      vertical-align: top;
      padding-right: 20px;
    }

    .totals-box {
      display: table-cell;
      width: 45%;
      vertical-align: top;
    }

    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #1e293b !important;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    .obs-content {
      background-color: #f8fafc !important;
      border: 1.5px dashed #cbd5e1 !important;
      border-radius: 8px;
      padding: 12px;
      font-size: 11px;
      color: #334155 !important;
      line-height: 1.5;
      margin-bottom: 14px;
    }

    .bank-box {
      background-color: #eff6ff !important;
      border: 1.5px solid #bfdbfe !important;
      border-radius: 8px;
      padding: 12px;
      font-size: 11px;
      color: #1e40af !important;
    }

    .totals-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 10px;
      overflow: hidden;
    }

    .totals-table td {
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px solid #cbd5e1 !important;
    }

    .totals-table tr.total-row td {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 900;
      padding: 14px 12px;
    }

    .amount-words-card {
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6px;
      padding: 8px 10px;
      margin-top: 8px;
      font-size: 10px;
      font-weight: 700;
      color: #475569 !important;
      text-align: center;
      text-transform: uppercase;
    }

    .terms-block {
      border-top: 1.5px solid #cbd5e1 !important;
      padding-top: 14px;
      margin-bottom: 30px;
      font-size: 10.5px;
      color: #64748b !important;
    }

    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 36px;
    }

    .signatures-table td {
      width: 45%;
      text-align: center;
      vertical-align: bottom;
    }

    .signature-line {
      border-top: 2px solid #64748b !important;
      margin: 0 auto 6px auto;
      width: 80%;
    }

    .signature-name {
      font-weight: 800;
      color: #0f172a !important;
      font-size: 12px;
    }

    .signature-role {
      font-size: 10.5px;
      color: #64748b !important;
    }

    .pdf-footer {
      border-top: 1.5px solid #cbd5e1 !important;
      padding-top: 12px;
      text-align: center;
      font-size: 10px;
      color: #64748b !important;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <div class="action-header no-print">
    <div>
      <strong>Documento de Cotización / Pedido</strong>
      <span style="opacity: 0.7; font-size: 11px; margin-left: 8px;">Folio: ${pedido.folio}</span>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>

  <div class="container">
    <div class="brand-bar"></div>

    <table class="header-table">
      <tr>
        <td>
          <div class="company-brand">
            <div class="logo-badge">FC</div>
            <div>
              <div class="company-title">${empresa.nombre}</div>
              <div class="company-subtitle">Pinturas, Impermeabilizantes y Ferretería</div>
            </div>
          </div>
        </td>
        <td class="doc-meta">
          <div class="doc-type">Cotización / Pedido</div>
          <div class="doc-folio">Folio: ${pedido.folio}</div>
          <div><span class="status-pill">${pedido.estatus.replace('_', ' ')}</span></div>
        </td>
      </tr>
    </table>

    <div class="info-grid">
      <div class="info-col">
        <div class="card-header">
          <span>Empresa / Emisor</span>
        </div>
        <div class="card-body">
          <div class="info-row"><span class="info-label">Razón Social:</span> <span class="info-val">${empresa.nombre}</span></div>
          <div class="info-row"><span class="info-label">RFC:</span> <span class="info-val">${empresa.rfc}</span></div>
          <div class="info-row"><span class="info-label">Dirección:</span> <span class="info-val">${empresa.direccion}</span></div>
          <div class="info-row"><span class="info-label">Teléfono:</span> <span class="info-val">${empresa.telefono}</span></div>
          <div class="info-row"><span class="info-label">Correo:</span> <span class="info-val">${empresa.email}</span></div>
        </div>
      </div>
      
      <div class="info-spacer"></div>

      <div class="info-col">
        <div class="card-header">
          <span>Cliente / Receptor</span>
        </div>
        <div class="card-body">
          <div class="info-row"><span class="info-label">Cliente:</span> <span class="info-val">${pedido.cliente.nombre}</span></div>
          <div class="info-row"><span class="info-label">Código:</span> <span class="info-val">${pedido.cliente.codigoCliente}</span></div>
          <div class="info-row"><span class="info-label">RFC:</span> <span class="info-val">${pedido.cliente.rfc || 'XAXX010101000'}</span></div>
          <div class="info-row"><span class="info-label">Teléfono:</span> <span class="info-val">${pedido.cliente.telefono1 || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Correo:</span> <span class="info-val">${pedido.cliente.email || 'N/A'}</span></div>
        </div>
      </div>
    </div>

    <table class="summary-bar">
      <tr>
        <td>
          <span class="s-label">Fecha Emisión</span>
          <span class="s-val">${fechaFormateada}</span>
        </td>
        <td>
          <span class="s-label">Vencimiento / Entrega</span>
          <span class="s-val">${fechaVencimientoFormateada}</span>
        </td>
        <td>
          <span class="s-label">Vendedor</span>
          <span class="s-val">${pedido.vendedor.name}</span>
        </td>
        <td>
          <span class="s-label">Prioridad</span>
          <span class="s-val">${pedido.prioridad}</span>
        </td>
      </tr>
    </table>

    <div class="table-container">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 6%;" class="text-center">#</th>
            <th style="width: 16%;">Código</th>
            <th style="width: 42%;">Descripción de Producto / Servicio</th>
            <th style="width: 10%;" class="text-center">Cant.</th>
            <th style="width: 13%;" class="text-right">P. Unit.</th>
            <th style="width: 13%;" class="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${pedido.detalles.map((det, idx) => `
            <tr>
              <td class="text-center font-bold text-slate-500">${idx + 1}</td>
              <td><span class="code-tag">${det.producto?.codigo || 'N/A'}</span></td>
              <td>
                <div class="product-name">${det.producto?.nombre || 'Producto'}</div>
              </td>
              <td class="text-center font-semibold">${det.cantidad} ${det.producto?.unidadMedida || 'PZA'}</td>
              <td class="text-right">$${det.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right font-bold">$${det.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="totals-section">
      <div class="notes-box">
        <div class="section-title">Observaciones</div>
        <div class="obs-content">
          ${pedido.observaciones || 'Sin observaciones adicionales registradas para esta cotización.'}
        </div>

        <div class="section-title">Datos Bancarios para Depósito / Transferencia</div>
        <div class="bank-box">
          <strong>BBVA Bancomer</strong> — CLABE: 012580001123456789<br>
          <strong>Beneficiario:</strong> ${empresa.nombre}
        </div>
      </div>

      <div class="totals-box">
        <table class="totals-table">
          <tr>
            <td>Subtotal Bruto:</td>
            <td class="text-right font-semibold">$${pedido.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          ${pedido.descuento > 0 ? `
            <tr>
              <td>Descuento:</td>
              <td class="text-right font-semibold" style="color: #dc2626;">-$${pedido.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ` : ''}
          <tr>
            <td>IVA (16%):</td>
            <td class="text-right font-semibold">$${pedido.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr class="total-row">
            <td><span>TOTAL (MXN):</span></td>
            <td class="text-right">$${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </table>
        <div class="amount-words-card">
          ${totalEnLetras}
        </div>
      </div>
    </div>

    <div class="terms-block">
      <div class="section-title">Términos y Condiciones</div>
      <p>• Cotización válida por 15 días naturales a partir de su emisión.</p>
      <p>• Los precios están expresados en Moneda Nacional e incluyen impuestos aplicables.</p>
    </div>

    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-line"></div>
          <div class="signature-name">${pedido.vendedor.name}</div>
          <div class="signature-role">Asesor Comercial — ${empresa.nombre}</div>
        </td>
        <td style="width: 10%;"></td>
        <td>
          <div class="signature-line"></div>
          <div class="signature-name">${pedido.cliente.nombre}</div>
          <div class="signature-role">Aceptado / Conformidad de Cliente</div>
        </td>
      </tr>
    </table>

    <div class="pdf-footer" style="margin-top: 30px;">
      ${empresa.nombre} • Sistema ERP • Documento generado electrónicamente
    </div>

  </div>

  ${isDownload ? `
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          window.print();
        }, 400);
      });
    </script>
  ` : ''}

</body>
</html>
    `

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('Error al generar PDF de pedido:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
