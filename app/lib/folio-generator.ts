/**
 * Generador de folios con serie y numeración secuencial corta.
 * Ejemplos:
 *   - Pedidos: PED-00001, PED-00002...
 *   - Ventas:  VTA-00001, VTA-00002...
 *   - Pagos:   PAG-00001, PAG-00002...
 */

export async function generarFolioSecuencial(
  prefix: string,
  modelName: 'pedido' | 'venta' | 'pago' | 'notaCredito' | 'notaCargo' | 'garantia' | 'consignacion',
  prismaClientOrTx: any,
  digits: number = 5
): Promise<string> {
  try {
    // Buscar el último folio registrado con ese prefijo de serie
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

    // Garantizar unicidad comprobando existencia
    let existente = await prismaClientOrTx[modelName].findUnique({
      where: { folio: candidato },
      select: { id: true }
    })

    while (existente) {
      numeroSecuencial++
      candidato = `${prefix}-${numeroSecuencial.toString().padStart(digits, '0')}`
      existente = await prismaClientOrTx[modelName].findUnique({
        where: { folio: candidato },
        select: { id: true }
      })
    }

    return candidato
  } catch (error) {
    console.error(`Error al generar folio secuencial para ${prefix}:`, error)
    // Fallback de emergencia por si la consulta falla
    const timestampShort = String(Date.now()).slice(-5)
    return `${prefix}-${timestampShort}`
  }
}
