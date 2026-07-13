"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import AdminNavbar from "@/components/admin/admin-navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
    TrendingUp, ShoppingBag, CreditCard, Users, DollarSign, Calendar, 
    Printer, ArrowLeft, BarChart3, Clock, PieChart, Sparkles, X
} from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface OrderItem {
    id: string
    name: string
    quantity: number
    price: number
}

interface Order {
    id: string
    total_price: number
    payment_method: string
    items: OrderItem[]
    created_at: string
}

export default function ReportsPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const [showZModal, setShowZModal] = useState(false)

    useEffect(() => {
        const init = async () => {
            // 1. Check Auth & Wait for Session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/admin/login")
                return
            }

            // 2. Fetch Store Membership
            const { data: member, error: memberError } = await supabase
                .from("store_members")
                .select("store_id, role, stores(*)")
                .eq("user_id", session.user.id)
                .maybeSingle()

            if (memberError || !member) {
                router.push("/admin/onboarding")
                return
            }

            const currentStore = Array.isArray(member.stores) ? member.stores[0] : member.stores
            setStore(currentStore)

            // 3. Fetch Completed Paid Orders
            const { data: ordersData, error: ordersError } = await supabase
                .from("orders")
                .select("*")
                .eq("store_id", member.store_id)
                .eq("status", "paid")
                .order("created_at", { ascending: false })

            if (ordersError) {
                toast.error("Rapor verileri yüklenemedi")
            } else if (ordersData) {
                setOrders(ordersData as any)
            }
            setLoading(false)
        }
        init()
    }, [router])

    // Calculations
    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_price), 0)
    const totalOrdersCount = orders.length
    const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0

    // Payment split
    const onlinePayments = orders.filter(o => o.payment_method === 'online_pay').reduce((acc, o) => acc + Number(o.total_price), 0)
    const tablePayments = orders.filter(o => o.payment_method !== 'online_pay').reduce((acc, o) => acc + Number(o.total_price), 0)

    // Top Selling Products Aggregator
    const getTopSelling = () => {
        const stats: Record<string, { count: number, revenue: number }> = {}
        orders.forEach(order => {
            const items = Array.isArray(order.items) ? order.items : []
            items.forEach((item: any) => {
                if (item.name) {
                    if (!stats[item.name]) {
                        stats[item.name] = { count: 0, revenue: 0 }
                    }
                    const qty = Number(item.quantity) || 0
                    const price = Number(item.price) || 0
                    stats[item.name].count += qty
                    stats[item.name].revenue += (qty * price)
                }
            })
        })

        return Object.entries(stats)
            .map(([name, val]) => ({ name, ...val }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
    }

    const topSelling = getTopSelling()

    const handlePrintZReport = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse bg-background">
                Raporlar Yükleniyor...
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-20 font-sans text-foreground">
            {/* Custom Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-ticket, #print-ticket * {
                        visibility: visible;
                    }
                    #print-ticket {
                        position: absolute;
                        left: 50%;
                        top: 0;
                        transform: translateX(-50%);
                        width: 80mm;
                        padding: 10px;
                        background: white !important;
                        color: black !important;
                        font-family: 'Courier New', Courier, monospace !important;
                    }
                    #print-ticket button, #print-ticket .no-print {
                        display: none !important;
                    }
                }
            `}} />

            {/* Navbar */}
            <AdminNavbar store={store} />

            <main className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard">
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10 hover:bg-white/5">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">Günlük Ciro Raporu</h1>
                            <p className="text-muted-foreground">Kasa hareketleri, ürün popülerlik oranları ve satış özetleri.</p>
                        </div>
                    </div>

                    <Button 
                        onClick={() => setShowZModal(true)} 
                        className="bg-white text-black hover:bg-zinc-200 h-11 px-6 rounded-xl font-bold shadow-lg shadow-white/5 gap-2"
                    >
                        <Printer className="w-4 h-4" /> Z-Raporu Çıkar
                    </Button>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-white/5 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <DollarSign className="w-24 h-24 text-white" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">Toplam Ciro</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight">₺{totalRevenue.toFixed(2)}</div>
                            <p className="text-[11px] text-zinc-500 mt-1">Ödemesi tamamlanmış siparişlerin toplamı.</p>
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <ShoppingBag className="w-24 h-24 text-white" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">Tamamlanan Siparişler</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight">{totalOrdersCount} adet</div>
                            <p className="text-[11px] text-zinc-500 mt-1">Kapatılmış sipariş fişi sayısı.</p>
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <TrendingUp className="w-24 h-24 text-white" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">Ortalama Sepet Tutarı (AOV)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight">₺{aov.toFixed(2)}</div>
                            <p className="text-[11px] text-zinc-500 mt-1">Sipariş başına ortalama adisyon tutarı.</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Top Products */}
                    <Card className="border-white/5 bg-card/40 backdrop-blur-sm p-6">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-base font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> En Popüler 5 Ürün</CardTitle>
                            <CardDescription>Müşteriler tarafından en çok adet sipariş verilen ürünler.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 space-y-4">
                            {topSelling.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground italic">Henüz satış verisi bulunmuyor.</div>
                            ) : (
                                topSelling.map((prod, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[11px] font-black flex items-center justify-center text-zinc-400">{idx + 1}</span>
                                            <span className="font-bold text-white text-sm">{prod.name}</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs text-muted-foreground">{prod.count} adet</span>
                                            <span className="text-sm font-bold text-white font-mono">₺{prod.revenue.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Payment split */}
                    <Card className="border-white/5 bg-card/40 backdrop-blur-sm p-6 flex flex-col justify-between">
                        <div>
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="text-base font-bold flex items-center gap-2"><PieChart className="w-4 h-4 text-blue-400" /> Ödeme Dağılımı</CardTitle>
                                <CardDescription>Online kredi kartı ve masada (nakit/POS) ödeme payları.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 space-y-6 pt-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-blue-400">💳 Online Ödeme</span>
                                        <span className="font-mono text-white font-bold">₺{onlinePayments.toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500" 
                                            style={{ width: `${totalRevenue > 0 ? (onlinePayments / totalRevenue) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-yellow-400">💵 Masada Ödeme (Nakit/Kart)</span>
                                        <span className="font-mono text-white font-bold">₺{tablePayments.toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-yellow-500" 
                                            style={{ width: `${totalRevenue > 0 ? (tablePayments / totalRevenue) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </div>

                        <div className="mt-8 p-4 rounded-xl bg-zinc-950/40 border border-white/5 text-[11px] text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                            Veriler gerçek zamanlı olup, tamamlanmış ve kasadan onaylanmış ödeme hareketlerini temsil eder.
                        </div>
                    </Card>
                </div>
            </main>

            {/* Z-Report Printable Slip Modal */}
            <AnimatePresence>
                {showZModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setShowZModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white text-black p-6 rounded-2xl shadow-2xl max-w-sm w-full relative flex flex-col max-h-[85vh] justify-between"
                            onClick={(e: any) => e.stopPropagation()}
                        >
                            {/* Z-Report Slip Container */}
                            <div id="print-ticket" className="overflow-y-auto pr-1 flex-1 flex flex-col items-center">
                                {/* Close Button (No print) */}
                                <button 
                                    className="no-print absolute top-3 right-3 text-gray-400 hover:text-gray-600 rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100"
                                    onClick={() => setShowZModal(false)}
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="text-center w-full space-y-1 mb-4">
                                    <h3 className="font-bold text-lg leading-tight uppercase tracking-wider">{store?.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">*** Z - RAPORU ***</p>
                                    <div className="text-[9px] text-gray-400 font-mono">
                                        TARİH: {new Date().toLocaleDateString("tr-TR")} | SAAT: {new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div className="w-full border-b border-dashed border-gray-300 my-2" />

                                {/* Cirolar */}
                                <div className="w-full space-y-1.5 text-xs font-mono">
                                    <div className="flex justify-between font-bold">
                                        <span>TOPLAM SATIS</span>
                                        <span>₺{totalRevenue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Siparis Fisi Sayisi</span>
                                        <span>{totalOrdersCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Ortalama Sepet</span>
                                        <span>₺{aov.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="w-full border-b border-dashed border-gray-300 my-2" />

                                {/* Ödemeler */}
                                <div className="w-full space-y-1.5 text-xs font-mono">
                                    <div className="flex justify-between">
                                        <span>💳 Kredi Karti (Online)</span>
                                        <span>₺{onlinePayments.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>💵 Masa Odeme (Nakit/Kart)</span>
                                        <span>₺{tablePayments.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="w-full border-b border-dashed border-gray-300 my-2" />

                                {/* Popüler Ürünler */}
                                <div className="w-full space-y-1.5 text-xs font-mono">
                                    <div className="font-bold text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Urun Satis Detaylari</div>
                                    {topSelling.map((prod, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px]">
                                            <span>{prod.name.slice(0, 18)} (x{prod.count})</span>
                                            <span>₺{prod.revenue.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full border-b border-dashed border-gray-300 my-4" />

                                <div className="text-center text-[9px] text-gray-400 font-mono">
                                    SmartKafe POS Sistemleri Altyapisiyla Olusturulmustur.<br />
                                    Z-Raporu Kayit No: Z-{store?.slug.slice(0,3).toUpperCase()}-{Math.floor(Math.random() * 10000)}
                                </div>
                            </div>

                            {/* Action Print Button */}
                            <Button 
                                onClick={handlePrintZReport} 
                                className="w-full mt-6 bg-black text-white hover:bg-zinc-800 rounded-xl font-bold h-11 no-print gap-2"
                            >
                                <Printer className="w-4 h-4" /> Z-Raporunu Yazdır (Termal Slip)
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
