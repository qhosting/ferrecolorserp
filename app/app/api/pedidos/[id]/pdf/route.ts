import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización / Pedido ${pedido.folio}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    body {
      background-color: #f8fafc;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.5;
      padding: 20px;
    }

    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }

    .action-header {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .btn-print {
      background-color: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .btn-print:hover {
      background-color: #1d4ed8;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }

    .brand-bar {
      height: 6px;
      background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #f59e0b 100%);
      border-radius: 4px 4px 0 0;
      margin-bottom: 20px;
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
      gap: 12px;
    }

    .logo-badge {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 22px;
    }

    .company-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .company-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-type {
      font-size: 20px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
    }

    .doc-folio {
      font-size: 13px;
      font-weight: 700;
      color: #f59e0b;
      font-family: monospace;
      margin-top: 2px;
    }

    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 20px;
    }

    .info-col {
      display: table-cell;
      width: 49%;
      vertical-align: top;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }

    .info-spacer {
      display: table-cell;
      width: 2%;
    }

    .card-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .info-row {
      margin-bottom: 4px;
      font-size: 11.5px;
    }

    .info-label {
      color: #64748b;
      font-weight: 500;
    }

    .info-val {
      color: #0f172a;
      font-weight: 600;
    }

    .summary-bar {
      width: 100%;
      background-color: #0f172a;
      color: #ffffff;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 20px;
      border-collapse: collapse;
    }

    .summary-bar td {
      width: 25%;
      font-size: 11px;
    }

    .summary-bar .s-label {
      color: #94a3b8;
      font-size: 10px;
      text-transform: uppercase;
      display: block;
    }

    .summary-bar .s-val {
      font-weight: 700;
      font-size: 12px;
      color: #ffffff;
    }

    .table-container {
      margin-bottom: 20px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      background-color: #1e293b;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
    }

    .items-table th:first-child { border-top-left-radius: 6px; }
    .items-table th:last-child { border-top-right-radius: 6px; }

    .items-table td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }

    .items-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .code-tag {
      font-family: monospace;
      font-size: 10px;
      background-color: #e2e8f0;
      color: #334155;
      padding: 2px 5px;
      border-radius: 4px;
      font-weight: 600;
    }

    .product-name {
      font-weight: 600;
      color: #0f172a;
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
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .obs-content {
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
      margin-bottom: 12px;
    }

    .bank-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 10px;
      font-size: 10.5px;
      color: #1e40af;
    }

    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }

    .totals-table td {
      padding: 6px 10px;
      font-size: 11.5px;
      border-bottom: 1px solid #f1f5f9;
    }

    .totals-table tr.total-row td {
      background-color: #0f172a;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      border-radius: 6px;
      padding: 10px;
    }

    .terms-block {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-bottom: 30px;
      font-size: 10px;
      color: #64748b;
    }

    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }

    .signatures-table td {
      width: 45%;
      text-align: center;
      vertical-align: bottom;
    }

    .signature-line {
      border-top: 1px solid #94a3b8;
      margin: 0 auto 6px auto;
      width: 80%;
    }

    .signature-name {
      font-weight: 700;
      color: #1e293b;
      font-size: 11px;
    }

    .pdf-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
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
      🖨️ Imprimir / Guardar en PDF
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
        <div class="card-header">Empresa / Emisor</div>
        <div class="info-row"><span class="info-label">Razón Social:</span> <span class="info-val">${empresa.nombre}</span></div>
        <div class="info-row"><span class="info-label">RFC:</span> <span class="info-val">${empresa.rfc}</span></div>
        <div class="info-row"><span class="info-label">Dirección:</span> <span class="info-val">${empresa.direccion}</span></div>
        <div class="info-row"><span class="info-label">Teléfono:</span> <span class="info-val">${empresa.telefono}</span></div>
        <div class="info-row"><span class="info-label">Correo:</span> <span class="info-val">${empresa.email}</span></div>
      </div>
      
      <div class="info-spacer"></div>

      <div class="info-col">
        <div class="card-header">Cliente / Receptor</div>
        <div class="info-row"><span class="info-label">Cliente:</span> <span class="info-val">${pedido.cliente.nombre}</span></div>
        <div class="info-row"><span class="info-label">Código:</span> <span class="info-val">${pedido.cliente.codigoCliente}</span></div>
        <div class="info-row"><span class="info-label">RFC:</span> <span class="info-val">${pedido.cliente.rfc || 'XAXX010101000'}</span></div>
        <div class="info-row"><span class="info-label">Teléfono:</span> <span class="info-val">${pedido.cliente.telefono1 || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Correo:</span> <span class="info-val">${pedido.cliente.email || 'N/A'}</span></div>
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
            <th style="width: 5%;" class="text-center">#</th>
            <th style="width: 15%;">Código</th>
            <th style="width: 40%;">Descripción</th>
            <th style="width: 10%;" class="text-center">Cant.</th>
            <th style="width: 15%;" class="text-right">P. Unit.</th>
            <th style="width: 15%;" class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${pedido.detalles.map((det, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td><span class="code-tag">${det.producto?.codigo || 'N/A'}</span></td>
              <td>
                <div class="product-name">${det.producto?.nombre || 'Producto'}</div>
              </td>
              <td class="text-center">${det.cantidad} ${det.producto?.unidadMedida || 'PZA'}</td>
              <td class="text-right">$${det.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">$${det.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="totals-section">
      <div class="notes-box">
        <div class="section-title">Observaciones</div>
        <div class="obs-content">
          ${pedido.observaciones || 'Sin observaciones registradas para este pedido/cotización.'}
        </div>

        <div class="section-title">Datos Bancarios para Pago</div>
        <div class="bank-box">
          <strong>BBVA Bancomer</strong> — CLABE: 012580001123456789<br>
          <strong>Beneficiario:</strong> ${empresa.nombre}
        </div>
      </div>

      <div class="totals-box">
        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">$${pedido.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${pedido.descuento > 0 ? `
            <tr>
              <td>Descuento:</td>
              <td class="text-right" style="color: #dc2626;">-$${pedido.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          ` : ''}
          <tr>
            <td>IVA (16%):</td>
            <td class="text-right">$${pedido.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr class="total-row">
            <td><span class="total-label">TOTAL (MXN):</span></td>
            <td class="text-right">$${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="terms-block">
      <div class="section-title">Términos y Condiciones</div>
      <p>• Cotización válida por 15 días naturales a partir de su emisión.</p>
      <p>• Precios expresados en Moneda Nacional e incluyen impuestos correspondientes.</p>
    </div>

    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-line"></div>
          <div class="signature-name">${pedido.vendedor.name}</div>
          <div class="signature-role">Asesor Comercial</div>
        </td>
        <td style="width: 10%;"></td>
        <td>
          <div class="signature-line"></div>
          <div class="signature-name">${pedido.cliente.nombre}</div>
          <div class="signature-role">Conformidad / Cliente</div>
        </td>
      </tr>
    </table>

    <div class="pdf-footer" style="margin-top: 30px;">
      ${empresa.nombre} • Generado por FerreColors ERP • ${new Date().toLocaleDateString('es-MX')}
    </div>

  </div>

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
