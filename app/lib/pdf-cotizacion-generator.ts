import PDFDocument from 'pdfkit'
import { numeroALetras } from '@/lib/numero-a-letras'

export async function generarCotizacionPdfBuffer(pedido: any, empresa: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 36,
        bufferPages: true,
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err) => reject(err))

      const primaryColor = '#0f172a'
      const accentColor = '#2563eb'
      const darkGold = '#b45309'
      const lightBg = '#f8fafc'
      const borderLineColor = '#cbd5e1'

      // Top Accent Line
      doc.rect(36, 36, 540, 5).fill('#1e3a8a')
      doc.rect(200, 36, 180, 5).fill('#2563eb')
      doc.rect(380, 36, 196, 5).fill('#f59e0b')

      let y = 50

      // Header Branding
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text(empresa.nombre, 36, y)
      doc.fillColor(accentColor).fontSize(9).font('Helvetica-Bold').text('PINTURAS, IMPERMEABILIZANTES Y FERRETERÍA', 36, y + 22)

      // Right Header: Doc Type & Folio
      doc.fillColor('#1e3a8a').fontSize(16).font('Helvetica-Bold').text('COTIZACIÓN / PEDIDO', 350, y, { align: 'right', width: 226 })
      
      // Folio Pill Box
      doc.roundedRect(420, y + 20, 156, 18, 4).fillAndStroke('#fef3c7', '#fde68a')
      doc.fillColor(darkGold).fontSize(10).font('Helvetica-Bold').text(`Folio: ${pedido.folio}`, 425, y + 24, { width: 146, align: 'center' })

      // Status Pill
      const statusText = (pedido.estatus || 'PENDIENTE').replace('_', ' ')
      doc.roundedRect(440, y + 42, 136, 16, 8).fillAndStroke('#d1fae5', '#6ee7b7')
      doc.fillColor('#047857').fontSize(8).font('Helvetica-Bold').text(statusText, 445, y + 46, { width: 126, align: 'center' })

      y += 65

      // Line Divider
      doc.moveTo(36, y).lineTo(576, y).strokeColor(borderLineColor).lineWidth(1).stroke()
      y += 12

      // Two Columns Cards: Empresa & Cliente
      const colWidth = 262
      const cardHeight = 85

      // Empresa Card
      doc.roundedRect(36, y, colWidth, cardHeight, 6).fillAndStroke(lightBg, borderLineColor)
      doc.rect(36, y, colWidth, 18).fill('#e2e8f0')
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('EMPRESA / EMISOR', 44, y + 5)

      let ey = y + 24
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Razón Social:', 44, ey)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(empresa.nombre, 105, ey, { width: 185, lineBreak: false })
      ey += 12
      doc.fillColor('#64748b').font('Helvetica').text('RFC:', 44, ey)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(empresa.rfc, 105, ey)
      ey += 12
      doc.fillColor('#64748b').font('Helvetica').text('Dirección:', 44, ey)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(empresa.direccion, 105, ey, { width: 185, lineBreak: false })
      ey += 12
      doc.fillColor('#64748b').font('Helvetica').text('Tel / Correo:', 44, ey)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${empresa.telefono} | ${empresa.email}`, 105, ey, { width: 185, lineBreak: false })

      // Cliente Card
      const cx = 314
      doc.roundedRect(cx, y, colWidth, cardHeight, 6).fillAndStroke(lightBg, borderLineColor)
      doc.rect(cx, y, colWidth, 18).fill('#e2e8f0')
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('CLIENTE / RECEPTOR', cx + 8, y + 5)

      let cy = y + 24
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Cliente:', cx + 8, cy)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(pedido.cliente?.nombre || 'Cliente General', cx + 60, cy, { width: 200, lineBreak: false })
      cy += 12
      doc.fillColor('#64748b').font('Helvetica').text('Código:', cx + 8, cy)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(pedido.cliente?.codigoCliente || 'N/A', cx + 60, cy)
      cy += 12
      doc.fillColor('#64748b').font('Helvetica').text('RFC:', cx + 8, cy)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(pedido.cliente?.rfc || 'XAXX010101000', cx + 60, cy)
      cy += 12
      doc.fillColor('#64748b').font('Helvetica').text('Tel / Correo:', cx + 8, cy)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${pedido.cliente?.telefono1 || 'N/A'} | ${pedido.cliente?.email || 'N/A'}`, cx + 60, cy, { width: 200, lineBreak: false })

      y += cardHeight + 12

      // Summary Bar
      doc.roundedRect(36, y, 540, 26, 6).fill(primaryColor)
      
      const fechaFormat = new Date(pedido.fechaPedido).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      const entregaFormat = pedido.fechaEntregaEstimada 
        ? new Date(pedido.fechaEntregaEstimada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : '15 días'

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Bold').text('FECHA EMISIÓN', 46, y + 4)
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(fechaFormat, 46, y + 14)

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Bold').text('ENTREGA ESTIMADA', 180, y + 4)
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(entregaFormat, 180, y + 14)

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Bold').text('VENDEDOR', 320, y + 4)
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(pedido.vendedor?.name || 'Ventas', 320, y + 14, { width: 120, lineBreak: false })

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Bold').text('PRIORIDAD', 460, y + 4)
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(pedido.prioridad || 'NORMAL', 460, y + 14)

      y += 36

      // Products Table Header
      const tableX = 36
      const tableWidth = 540

      doc.roundedRect(tableX, y, tableWidth, 20, 4).fill(primaryColor)
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
      doc.text('#', tableX + 8, y + 6, { width: 20, align: 'center' })
      doc.text('CÓDIGO', tableX + 32, y + 6, { width: 80 })
      doc.text('DESCRIPCIÓN DEL PRODUCTO', tableX + 115, y + 6, { width: 225 })
      doc.text('CANT.', tableX + 345, y + 6, { width: 45, align: 'center' })
      doc.text('P. UNIT.', tableX + 395, y + 6, { width: 65, align: 'right' })
      doc.text('IMPORTE', tableX + 465, y + 6, { width: 65, align: 'right' })

      y += 20

      // Table Rows
      const detalles = pedido.detalles || []
      detalles.forEach((det: any, index: number) => {
        const rowHeight = 22
        if (y + rowHeight > 700) {
          doc.addPage()
          y = 50
        }

        if (index % 2 === 1) {
          doc.rect(tableX, y, tableWidth, rowHeight).fill(lightBg)
        }

        doc.moveTo(tableX, y + rowHeight).lineTo(tableX + tableWidth, y + rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke()

        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text(String(index + 1), tableX + 8, y + 6, { width: 20, align: 'center' })
        
        // Code Tag Box
        doc.roundedRect(tableX + 32, y + 4, 75, 14, 3).fillAndStroke('#e2e8f0', '#cbd5e1')
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(det.producto?.codigo || 'N/A', tableX + 34, y + 7, { width: 71, align: 'center' })

        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(det.producto?.nombre || 'Producto', tableX + 115, y + 6, { width: 225, lineBreak: false })
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica').text(`${det.cantidad} ${det.producto?.unidadMedida || 'PZA'}`, tableX + 345, y + 6, { width: 45, align: 'center' })
        
        const pUnitStr = `$${(det.precioUnitario || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const subtotalStr = `$${(det.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica').text(pUnitStr, tableX + 395, y + 6, { width: 65, align: 'right' })
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(subtotalStr, tableX + 465, y + 6, { width: 65, align: 'right' })

        y += rowHeight
      })

      y += 14

      if (y + 110 > 720) {
        doc.addPage()
        y = 50
      }

      // Notes & Bank Details (Left) vs Totals (Right)
      const leftW = 290
      const rightX = 340
      const rightW = 236

      // Observaciones Box
      doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold').text('OBSERVACIONES', tableX, y)
      doc.roundedRect(tableX, y + 10, leftW, 36, 6).fillAndStroke(lightBg, borderLineColor)
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(pedido.observaciones || 'Sin observaciones adicionales registradas.', tableX + 8, y + 16, { width: leftW - 16 })

      // Datos Bancarios Box
      const bankY = y + 52
      doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold').text('DATOS BANCARIOS PARA PAGO', tableX, bankY)
      doc.roundedRect(tableX, bankY + 10, leftW, 36, 6).fillAndStroke('#eff6ff', '#bfdbfe')
      doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold').text('BBVA Bancomer — CLABE: 012580001123456789', tableX + 8, bankY + 16)
      doc.fillColor('#1e40af').fontSize(8).font('Helvetica').text(`Beneficiario: ${empresa.nombre}`, tableX + 8, bankY + 28)

      // Totals Table (Right)
      const subtotalVal = `$${(pedido.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const ivaVal = `$${(pedido.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const totalVal = `$${(pedido.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

      let ty = y
      doc.roundedRect(rightX, ty, rightW, 64, 6).fillAndStroke('#ffffff', borderLineColor)

      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Subtotal Bruto:', rightX + 12, ty + 10)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(subtotalVal, rightX + 120, ty + 10, { width: 104, align: 'right' })

      if (pedido.descuento > 0) {
        const descVal = `-$${(pedido.descuento || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        doc.fillColor('#dc2626').fontSize(8.5).font('Helvetica').text('Descuento:', rightX + 12, ty + 24)
        doc.fillColor('#dc2626').font('Helvetica-Bold').text(descVal, rightX + 120, ty + 24, { width: 104, align: 'right' })
        ty += 14
      }

      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('IVA (16%):', rightX + 12, ty + 24)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(ivaVal, rightX + 120, ty + 24, { width: 104, align: 'right' })

      // Total Final Card Box
      doc.roundedRect(rightX, ty + 42, rightW, 26, 6).fill(primaryColor)
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('TOTAL (MXN):', rightX + 12, ty + 50)
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text(totalVal, rightX + 100, ty + 48, { width: 124, align: 'right' })

      // Total en Letras Box
      const totalWords = numeroALetras(pedido.total || 0)
      doc.roundedRect(rightX, ty + 72, rightW, 24, 4).fillAndStroke(lightBg, borderLineColor)
      doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(totalWords, rightX + 4, ty + 78, { width: rightW - 8, align: 'center' })

      y += 115

      // Terms & Signatures
      if (y + 90 > 730) {
        doc.addPage()
        y = 50
      }

      doc.moveTo(36, y).lineTo(576, y).strokeColor(borderLineColor).lineWidth(1).stroke()
      y += 10

      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('• Cotización válida por 15 días naturales a partir de su emisión.', 36, y)
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('• Precios expresados en Moneda Nacional con impuestos incluidos.', 36, y + 10)

      y += 35

      // Signatures
      doc.moveTo(60, y).lineTo(240, y).strokeColor('#64748b').lineWidth(1.5).stroke()
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(pedido.vendedor?.name || 'Asesor Comercial', 60, y + 4, { width: 180, align: 'center' })
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(`Asesor Comercial — ${empresa.nombre}`, 60, y + 14, { width: 180, align: 'center' })

      doc.moveTo(370, y).lineTo(550, y).strokeColor('#64748b').lineWidth(1.5).stroke()
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(pedido.cliente?.nombre || 'Cliente', 370, y + 4, { width: 180, align: 'center' })
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('Aceptado / Conformidad de Cliente', 370, y + 14, { width: 180, align: 'center' })

      // Footer
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text(`${empresa.nombre} • Documento generado por FerreColors ERP`, 36, 750, { align: 'center', width: 540 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
