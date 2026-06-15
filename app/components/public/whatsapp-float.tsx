'use client';

import { motion } from 'framer-motion';

export function WhatsAppFloat() {
  const phoneNumber = '524611824584'; // Celaya, Gto number
  const message = 'Hola, me gustaría recibir información sobre pinturas e insumos industriales de FerreColors.';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 bg-[#2da53d] hover:bg-[#2da53d]/90 text-white rounded-full shadow-2xl p-3 md:p-3.5 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 select-none group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulsing ring background */}
        <span className="absolute inset-0 rounded-full bg-[#2da53d] -z-10 animate-ping opacity-25" />

        {/* Official WhatsApp Logo SVG */}
        <svg
          className="h-6 w-6 shrink-0 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.63 2.023 14.152.99 11.53.99c-5.437 0-9.863 4.373-9.867 9.803-.001 1.73.457 3.419 1.32 4.937L1.875 21.89l6.32-1.644zm12.18-5.64c-.31-.155-1.838-.891-2.126-1.002-.288-.11-.497-.166-.708.155-.21.32-.815 1.002-.997 1.205-.183.205-.365.23-.675.076-1.393-.687-2.39-1.2-3.234-2.613-.223-.374.223-.347.637-1.155.07-.14.035-.262-.017-.367-.052-.105-.497-1.18-.68-1.62-.18-.431-.376-.374-.516-.381-.132-.007-.284-.008-.437-.008-.153 0-.4-.056-.61.18-.21.236-.8.781-.8 1.905 0 1.125.82 2.212.933 2.368.113.156 1.614 2.428 3.91 3.4c.546.23 1.025.378 1.38.49.548.172 1.047.148 1.4.095.395-.058 1.838-.737 2.097-1.452.26-.715.26-1.329.184-1.453-.076-.123-.288-.178-.598-.334z" />
        </svg>

        {/* Expandable text */}
        <motion.span
          className="overflow-hidden whitespace-nowrap text-sm font-bold max-w-0 group-hover:max-w-[150px] transition-all duration-300 ease-out pr-0 group-hover:pr-1"
          initial={false}
        >
          ¿Necesitas ayuda?
        </motion.span>
      </motion.a>
    </div>
  );
}
