import { useState, useEffect } from "react"
import { LogOut, Package, QrCode, Store, ClipboardList } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface AdminNavbarProps {
    store?: any
}

export default function AdminNavbar({ store }: AdminNavbarProps) {
    const pathname = usePathname()

    const isActive = (path: string) => pathname === path

    const [showQr, setShowQr] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Ensure client-side only for window access
    useEffect(() => {
        setMounted(true)
    }, [])

    const dashboardUrl = mounted ? `${window.location.origin}/admin/dashboard` : ''

    return (
        <>
            <nav className="sticky top-0 z-30 glass-dock border-b border-white/5 backdrop-blur-xl bg-background/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {store?.logo_url ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20">
                                <Image
                                    src={store.logo_url}
                                    alt="Logo"
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                />
                            </div>
                        ) : (
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-bold">SK</div>
                        )}
                        <h1 className="font-bold text-lg hidden sm:block">{store?.name || 'Yönetim Paneli'}</h1>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                        <Link href="/admin/dashboard">
                            <Button
                                variant={isActive("/admin/dashboard") ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                            >
                                <Store className="w-4 h-4" /> <span className="hidden sm:inline">Panel</span>
                            </Button>
                        </Link>

                        <Link href="/admin/orders">
                            <Button
                                variant={isActive("/admin/orders") ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                            >
                                <ClipboardList className="w-4 h-4" /> <span className="hidden sm:inline">Siparişler</span>
                            </Button>
                        </Link>

                        <Link href="/admin/products">
                            <Button
                                variant={isActive("/admin/products") ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                            >
                                <Package className="w-4 h-4" /> <span className="hidden sm:inline">Menü</span>
                            </Button>
                        </Link>

                        <Link href="/admin/profile">
                            <Button
                                variant={isActive("/admin/profile") ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                            >
                                <Store className="w-4 h-4" /> <span className="hidden sm:inline">İşletme</span>
                            </Button>
                        </Link>

                        <Link href="/admin/qr-generator">
                            <Button
                                variant={isActive("/admin/qr-generator") ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                            >
                                <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">QR</span>
                            </Button>
                        </Link>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            onClick={() => setShowQr(true)}
                        >
                            <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Mobilden Bağlan</span>
                        </Button>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors">
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* QR Code Modal Overlay */}
            {showQr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowQr(false)}>
                    <div className="bg-white text-black p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-2">Mutfak Tabletini Eşle</h2>
                        <p className="text-gray-500 mb-6 text-sm">Bu QR kodu mutfak tabletinizden okutarak paneli hızlıca açabilirsiniz.</p>

                        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 inline-block mb-6">
                            {mounted && <QRCodeSVG value={dashboardUrl} size={200} level="H" />}
                        </div>

                        <div className="text-xs text-gray-400 break-all family-mono mb-6 bg-gray-50 p-2 rounded">
                            {dashboardUrl}
                        </div>

                        <Button className="w-full" size="lg" onClick={() => setShowQr(false)}>
                            Kapat
                        </Button>
                    </div>
                </div>
            )}
        </>
    )
}
