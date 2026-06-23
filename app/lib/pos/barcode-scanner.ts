import { useEffect, useRef } from 'react';

/**
 * Hook para detectar lecturas del escáner de código de barras USB (HID Keyboard Wedge).
 * Un escáner USB HID emula un teclado enviando caracteres a alta velocidad (<30ms)
 * y finalizando con la tecla 'Enter'.
 * 
 * @param onScan Callback que se ejecuta cuando se lee un código válido.
 */
export function useBarcodeScanner(onScan: (code: string) => void) {
  const bufferRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Evitar procesar si el usuario está enfocado en un campo de texto interactivo,
      // A MENOS que sea el campo de búsqueda de productos del POS.
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      
      // Permitir la lectura del scanner si es un input de búsqueda general del POS
      const isPOSSearchInput = activeEl?.id === 'pos-search-input';

      if (isInput && !isPOSSearchInput) {
        // Si el usuario escribe en un campo de texto normal (ej: un modal de pago),
        // no debemos interceptar la tecla globalmente.
        return;
      }

      const key = event.key;

      // Ignorar teclas de control o modificadores
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(key)) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Si transcurre mucho tiempo, asumimos entrada humana y vaciamos el buffer
      // Un escáner envía cada carácter en menos de 30-40ms.
      const isScannerSpeed = timeDiff < 50;

      if (key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          const barcode = bufferRef.current.join('');
          
          // Prevenir comportamiento por defecto de Enter si es un escaneo
          event.preventDefault();
          event.stopPropagation();
          
          onScan(barcode);
        }
        bufferRef.current = [];
      } else {
        // Si hay una demora y el buffer no está vacío, asumimos tecleo manual y limpiamos
        if (bufferRef.current.length > 0 && !isScannerSpeed) {
          bufferRef.current = [];
        }

        // Registrar solo caracteres imprimibles de longitud 1
        if (key.length === 1) {
          bufferRef.current.push(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan]);
}
