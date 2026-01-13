"use client"

import { LogOut, Package, QrCode, Store, ClipboardList } from "lucide-react"
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

    return (
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

                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}
