
"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Image from "next/image"
import { Bell, CheckCircle, Clock, Utensils, LogOut, Package, QrCode, Store, Play } from "lucide-react"
import AdminNavbar from "@/components/admin/admin-navbar"

// Types
import { Database } from "@/types/database.types"
type Order = Database["public"]["Tables"]["orders"]["Row"]
type Call = Database["public"]["Tables"]["calls"]["Row"]

export default function DashboardView() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [calls, setCalls] = useState<Call[]>([])
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const playSound = () => {
        audioRef.current?.play().catch(e => console.log("Audio play failed", e))
    }


    const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'cLOSED' | 'CHANNEL_ERROR'>('CONNECTING')

    const refreshData = async () => {
        setLoading(true)
        const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .neq("status", "paid") // Show all orders except paid ones
            .limit(100)

        if (ordersData) setOrders(ordersData)
        setLoading(false)
        console.log("Veriler yenilendi")
    }

    useEffect(() => {
        let channel: any = null

        const init = async () => {
            // 1. Check Auth & Wait for Session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/admin/login")
                return
            }

            // 2. Fetch Initial Data
            await refreshData()

            // Calls data fetch... (keep if separate or merge into refreshData?) 
            // I will keep calls fetch separately valid or merge it. 
            // In replacement content I must provide everything properly.
            // I'll re-fetch Calls in init() manually or add to refreshData. Lets add to init for now to minimize change diff complexity if I can.
            // Actually, I can just copy the Calls fetch logic here.
            const { data: callsData } = await supabase
                .from("calls")
                .select("*")
                .eq("active", true)
                .order("created_at", { ascending: false })

            if (callsData) setCalls(callsData)


            // 3. Subscribe ONLY after authenticating
            channel = supabase
                .channel('admin-dashboard')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                    const newOrder = payload.new as Order
                    console.log("Realtime INSERT:", newOrder)
                    setOrders(prev => [newOrder, ...prev])
                    toast.info(`Yeni Sipariş: Masa ${newOrder.table_no}`)
                    playSound()
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                    const updatedOrder = payload.new as Order
                    console.log("Realtime UPDATE:", updatedOrder)
                    if (updatedOrder.status === 'paid') {
                        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
                    } else {
                        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
                    }
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
                    console.log("Realtime DELETE:", payload.old)
                    const deletedOrderId = payload.old.id
                    setOrders(prev => prev.filter(o => o.id !== deletedOrderId))
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, (payload) => {
                    const newCall = payload.new as Call
                    setCalls(prev => [newCall, ...prev])
                    toast.warning(`Yeni Çağrı: Masa ${newCall.table_no}`)
                    playSound()
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores' }, (payload) => {
                    setStore(payload.new)
                })
                .subscribe((status) => {
                    console.log("Subscription status:", status)
                    setConnectionStatus(status as any)
                })
        }

        init()
        audioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg")

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [router])

    const updateOrderStatus = async (id: string, status: 'preparing' | 'done') => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))

        // No longer removing 'done' orders automatically. They stay until table is closed (paid).

        const { error } = await supabase.from("orders").update({ status }).eq("id", id)
        if (error) toast.error("Güncelleme hatası")
    }

    const closeTable = async (tableNo: string) => {
        if (!confirm(`${tableNo} nolu masayı kapatmak (ödemesi alındı) istiyor musunuz?`)) return

        setLoading(true)
        // Update all active orders for this table to 'paid'
        const { error } = await supabase
            .from("orders")
            .update({ status: 'paid' })
            .eq("table_no", tableNo)
            .neq("status", 'paid') // Update all non-paid orders

        if (error) {
            console.error(error)
            toast.error("Masa kapatılamadı")
        } else {
            toast.success("Masa kapatıldı ve siparişler arşivlendi")
            // Remove local orders for this table
            setOrders(prev => prev.filter(o => o.table_no !== tableNo))

            // Also dismiss any active calls for this table
            const activeCalls = calls.filter(c => c.table_no === tableNo)
            for (const call of activeCalls) {
                dismissCall(call.id)
            }
        }
        setLoading(false)
    }

    const dismissCall = async (id: string) => {
        setCalls(prev => prev.filter(c => c.id !== id))
        await supabase.from("calls").update({ active: false }).eq("id", id)
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Panel Yükleniyor...</div>


    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Navbar */}
            <AdminNavbar store={store} />

            <main className="max-w-7xl mx-auto p-6 space-y-10 mt-4">
                {/* Status Indicator */}
                {/* Connection Status & Refresh Header */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            Mutfak Takip <Badge variant="secondary" className="ml-2 text-primary">{orders.length}</Badge>
                        </h2>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Badge variant="outline" className={`gap-1 ${connectionStatus === 'SUBSCRIBED' ? 'text-green-500 border-green-500/20' : 'text-amber-500 border-amber-500/20'}`}>
                                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                {connectionStatus === 'SUBSCRIBED' ? 'Canlı' : '...'}
                            </Badge>

                            <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
                                Yenile
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {orders.map(order => (
                                <motion.div
                                    layout
                                    key={order.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className={`relative group overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm p-0 flex flex-col
                                        ${order.status === 'preparing' ? 'border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]' : 'border-white/5'}
                                    `}
                                >
                                    {/* Status Bar */}
                                    <div className={`h-1.5 w-full ${order.status === 'preparing' ? 'bg-blue-500 animate-pulse' : 'bg-green-500/50'}`} />

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Sipariş #{order.id.slice(0, 4)}</div>
                                                <div className="text-3xl font-black tracking-tight">Masa {order.table_no}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant={order.status === 'preparing' ? 'secondary' : 'default'} className={order.status === 'preparing' ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" : ""}>
                                                    {order.status === 'preparing' ? 'Hazırlanıyor' : 'Yeni'}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6 flex-1">
                                            {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0 group-hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                                                        <span className="font-medium text-white/90">{item.name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground tabular-nums">₺{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                                            <div className="text-xs text-muted-foreground">Toplam Tutar: <span className="text-lg font-bold text-white ml-2">₺{order.total_price}</span></div>

                                            <div className="flex gap-2">
                                                {order.status === 'new' && (
                                                    <Button
                                                        size="icon"
                                                        className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/20"
                                                        title="Hazırlamaya Başla"
                                                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                                                    >
                                                        <Play className="w-4 h-4 fill-current" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    className="bg-green-600 hover:bg-green-500 text-white border-none shadow-lg shadow-green-500/20"
                                                    title="Tamamla"
                                                    onClick={() => updateOrderStatus(order.id, 'done')}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {orders.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl">
                                <Utensils className="w-12 h-12 mb-4 opacity-20" />
                                <p>Şu an bekleyen sipariş yok.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
