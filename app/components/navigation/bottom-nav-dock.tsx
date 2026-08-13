'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDeviceMode } from '@/components/providers/device-mode-provider'
import { 
  HomeIcon, 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  QrCodeIcon,
  DocumentPlusIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'

export function BottomNavDock() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, isPWA } = useDeviceMode()
  const [showQuickMenu, setShowQuickMenu] = useState(false)

  // Render bottom dock on mobile, PWA, or narrow screens
  if (!isMobile && !isPWA) return null

  const navItems = [
    { label: 'Inicio', href: '/dashboard', icon: HomeIcon },
    { label: 'Cobrar', href: '/cobranza-movil', icon: CurrencyDollarIcon },
    { label: 'Pedidos', href: '/pedidos', icon: ShoppingCartIcon },
    { label: 'Clientes', href: '/clientes', icon: UserGroupIcon },
  ]

  const handleQuickAction = (href: string) => {
    setShowQuickMenu(false)
    router.push(href)
  }

  return (
    <>
      {/* Quick Action Overlay Menu */}
      {showQuickMenu && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col justify-end p-4 animate-in fade-in duration-200"
          onClick={() => setShowQuickMenu(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 mb-16 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Acción Rápida de Campo</span>
              <button 
                type="button" 
                onClick={() => setShowQuickMenu(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickAction('/cobranza-movil')}
                className="flex items-center gap-3 p-3 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/50 rounded-2xl text-left transition-all"
              >
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <CurrencyDollarIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-emerald-300 block">Registrar Cobro</span>
                  <span className="text-[10px] text-emerald-500">Cobro en ruta</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('/pedidos/nuevo')}
                className="flex items-center gap-3 p-3 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/50 rounded-2xl text-left transition-all"
              >
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <DocumentPlusIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-blue-300 block">Nuevo Pedido</span>
                  <span className="text-[10px] text-blue-500">Cotización rápida</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('/pos')}
                className="flex items-center gap-3 p-3 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-2xl text-left transition-all"
              >
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <BuildingStorefrontIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-indigo-300 block">Venta POS</span>
                  <span className="text-[10px] text-indigo-500">Cobro mostrador</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('/productos')}
                className="flex items-center gap-3 p-3 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/50 rounded-2xl text-left transition-all"
              >
                <div className="p-2 bg-amber-600 text-white rounded-xl">
                  <QrCodeIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-amber-300 block">Catálogo</span>
                  <span className="text-[10px] text-amber-500">Consultar stock</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-blue-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          )
        })}

        {/* Center Floating Action Button (FAB) */}
        <button
          type="button"
          onClick={() => setShowQuickMenu(!showQuickMenu)}
          className="relative -top-3 p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
          title="Acciones rápidas"
        >
          <PlusIcon className={`w-6 h-6 transition-transform duration-200 ${showQuickMenu ? 'rotate-45' : ''}`} />
        </button>

        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-blue-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
