export function numeroALetras(monto: number): string {
  if (isNaN(monto) || monto < 0) return 'CERO PESOS 00/100 M.N.';

  const enteros = Math.floor(monto);
  const centavos = Math.round((monto - enteros) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');

  function Unidades(num: number): string {
    switch(num){
      case 1: return "UN";
      case 2: return "DOS";
      case 3: return "TRES";
      case 4: return "CUATRO";
      case 5: return "CINCO";
      case 6: return "SEIS";
      case 7: return "SIETE";
      case 8: return "OCHO";
      case 9: return "NUEVE";
    }
    return "";
  }

  function Decenas(num: number): string {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);

    switch(decena){
      case 1:
        switch(unidad){
          case 0: return "DIEZ";
          case 1: return "ONCE";
          case 2: return "DOCE";
          case 3: return "TRECE";
          case 4: return "CATORCE";
          case 5: return "QUINCE";
          default: return "DIECI" + Unidades(unidad);
        }
      case 2:
        switch(unidad){
          case 0: return "VEINTE";
          default: return "VEINTI" + Unidades(unidad);
        }
      case 3: return DecenasY("TREINTA", unidad);
      case 4: return DecenasY("CUARENTA", unidad);
      case 5: return DecenasY("CINCUENTA", unidad);
      case 6: return DecenasY("SESENTA", unidad);
      case 7: return DecenasY("SETENTA", unidad);
      case 8: return DecenasY("OCHENTA", unidad);
      case 9: return DecenasY("NOVENTA", unidad);
      case 0: return Unidades(unidad);
    }
    return "";
  }

  function DecenasY(strSin: string, numUnidades: number): string {
    if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);
    return strSin;
  }

  function Centenas(num: number): string {
    const centenas = Math.floor(num / 100);
    const decenas = num - (centenas * 100);

    switch(centenas){
      case 1:
        if (decenas > 0) return "CIENTO " + Decenas(decenas);
        return "CIEN";
      case 2: return "DOSCIENTOS " + Decenas(decenas);
      case 3: return "TRESCIENTOS " + Decenas(decenas);
      case 4: return "CUATROCIENTOS " + Decenas(decenas);
      case 5: return "QUINIENTOS " + Decenas(decenas);
      case 6: return "SEISCIENTOS " + Decenas(decenas);
      case 7: return "SETECIENTOS " + Decenas(decenas);
      case 8: return "OCHOCIENTOS " + Decenas(decenas);
      case 9: return "NOVECIENTOS " + Decenas(decenas);
    }
    return Decenas(decenas);
  }

  function Miles(num: number): string {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);

    let strMiles = "";
    if (cientos > 0) {
      if (cientos === 1) {
        strMiles = "UN MIL";
      } else {
        strMiles = Centenas(cientos) + " MIL";
      }
    }
    const strCentenas = Centenas(resto);

    if (strMiles === "") return strCentenas;
    if (strCentenas === "") return strMiles;
    return strMiles + " " + strCentenas;
  }

  if (enteros === 0) return `CERO PESOS ${centavosStr}/100 M.N.`;
  return `${Miles(enteros)} PESOS ${centavosStr}/100 M.N.`;
}
