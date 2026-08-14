/**
 * Generador de folios con serie y numeración secuencial corta de nivel empresarial.
 * Ejemplos:
 *   - Pedidos:          PED-00001, PED-00002...
 *   - Ventas:           VTA-00001, VTA-00002...
 *   - Pagos / Recibos:  PAG-00001, PAG-00002...
 *   - Pagarés:          PAG-00001, PAG-00002...
 *   - Notas de Crédito: NCR-000001...
 *   - Notas de Cargo:   NC-000001...
 *   - Garantías:        GAR-000001...
 *   - Consignaciones:   CON-00001...
 *   - Compras:          OC-00001...
 *   - Reestructuras:    REE-00001...
 */

export type ModelosConFolio =
  | 'pedido'
  | 'venta'
  | 'pago'
  | 'pagare'
  | 'notaCredito'
  | 'notaCargo'
  | 'garantia'
  | 'consignacion'
  | 'compra'
  | 'reestructuraCredito'

export async function generarFolioSecuencial(
  prefix: string,
  modelName: ModelosConFolio,
  prismaClientOrTx: any,
  digits: number = 5
): Promise<string> {
  try {
    // Buscar el último registro ordenado por createdAt o folio descendente
    const ultimoRegistro = await prismaClientOrTx[modelName].findFirst({
      where: {
        folio: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { folio: true },
    })

    let numeroSecuencial = 1

    if (ultimoRegistro?.folio) {
      const partes = ultimoRegistro.folio.split('-')
      const ultimoNumero = parseInt(partes[partes.length - 1], 10)
      if (!isNaN(ultimoNumero)) {
        numeroSecuencial = ultimoNumero + 1
      }
    }

    let candidato = `${prefix}-${numeroSecuencial.toString().padStart(digits, '0')}`

    // Garantizar unicidad comprobando existencia en base de datos
    let existente = await prismaClientOrTx[modelName].findFirst({
      where: { folio: candidato },
      select: { id: true }
    })

    let intentos = 0
    while (existente && intentos < 100) {
      numeroSecuencial++
      candidato = `${prefix}-${numeroSecuencial.toString().padStart(digits, '0')}`
      existente = await prismaClientOrTx[modelName].findFirst({
        where: { folio: candidato },
        select: { id: true }
      })
      intentos++
    }

    return candidato
  } catch (error) {
    console.error(`Error al generar folio secuencial para ${prefix} en ${modelName}:`, error)
    // Fallback con timestamp y dígito aleatorio para prevenir colisiones en situaciones de falla
    const timestampShort = String(Date.now()).slice(-4)
    const randomHex = Math.floor(Math.random() * 90 + 10)
    return `${prefix}-${timestampShort}${randomHex}`
  }
}
