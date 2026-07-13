"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Image from "next/image"
import { 
    Bell, CheckCircle, Clock, Utensils, LogOut, Package, QrCode, Store, 
    Play, CreditCard, Settings, Search, X, Plus, Percent, RefreshCw, AlertTriangle,
    MapPin, User, Navigation, Loader2
} from "lucide-react"
import AdminNavbar from "@/components/admin/admin-navbar"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Types
import { Database } from "@/types/database.types"
type Order = any
type Call = Database["public"]["Tables"]["calls"]["Row"]
type Table = Database["public"]["Tables"]["tables"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

export default function DashboardView() {
    const router = useRouter()
    
    // Core States
    const [orders, setOrders] = useState<Order[]>([])
    const [calls, setCalls] = useState<Call[]>([])
    const [tablesList, setTablesList] = useState<Table[]>([])
    const [storeProducts, setStoreProducts] = useState<Product[]>([])
    const [couriers, setCouriers] = useState<any[]>([])
    const [selectedCouriers, setSelectedCouriers] = useState<Record<string, string>>({})
    const [allCategories, setAllCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'cLOSED' | 'CHANNEL_ERROR'>('CONNECTING')

    // Tab Switcher
    const [activeTab, setActiveTab] = useState<'kitchen' | 'tables' | 'dispatch' | 'staff'>('kitchen')

    // Staff Management States
    const [allStoreMembers, setAllStoreMembers] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedProfile, setSelectedProfile] = useState<any>(null)
    const [selectedRole, setSelectedRole] = useState<string>("staff")
    const [addingMember, setAddingMember] = useState(false)

    // KDS Config States
    const [showKdsSettings, setShowKdsSettings] = useState(false)
    const [kdsCategories, setKdsCategories] = useState<string[]>([])
    const [prepTimeLimit, setPrepTimeLimit] = useState<number>(15) // minutes

    // Table Operations Modal States
    const [selectedTable, setSelectedTable] = useState<Table | null>(null)
    const [showTableModal, setShowTableModal] = useState(false)
    const [searchProductQuery, setSearchProductQuery] = useState("")
    const [transferTableNo, setTransferTableNo] = useState("")
    const [mergeTableNo, setMergeTableNo] = useState("")
    const [customDiscount, setCustomDiscount] = useState("")
    const [currentTime, setCurrentTime] = useState(Date.now())

    const playSound = () => {
        audioRef.current?.play().catch(e => console.log("Audio play failed", e))
    }

    // Tick chronometers every 30s
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 30000)
        return () => clearInterval(interval)
    }, [])

    // Load Local Settings
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedCats = localStorage.getItem("kds_categories")
            if (savedCats) setKdsCategories(JSON.parse(savedCats))
            const savedLimit = localStorage.getItem("kds_prep_limit")
            if (savedLimit) setPrepTimeLimit(parseInt(savedLimit) || 15)
        }
    }, [])

    const refreshData = async (storeId?: string) => {
        const idToUse = typeof storeId === 'string' ? storeId : store?.id
        if (!idToUse) return
        setLoading(true)
        
        // 1. Fetch Orders
        const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .eq("store_id", idToUse)
            .order("created_at", { ascending: false })
            .neq("status", "paid")
            .limit(100)

        if (ordersData) setOrders(ordersData)

        // 2. Fetch Calls
        const { data: callsData } = await supabase
            .from("calls")
            .select("*")
            .eq("store_id", idToUse)
            .eq("active", true)
            .order("created_at", { ascending: false })

        if (callsData) setCalls(callsData)

        // 3. Fetch Tables
        const { data: tablesData } = await supabase
            .from("tables")
            .select("*")
            .eq("store_id", idToUse)
            .order("table_no", { ascending: true })

        if (tablesData) setTablesList(tablesData)

        // 4. Fetch Couriers
        const { data: members } = await supabase
            .from("store_members")
            .select("user_id, role, profiles(*)")
            .eq("store_id", idToUse)
            .eq("role", "courier")

        if (members) {
            const courierList = members.map((m: any) => {
                const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
                return {
                    id: m.user_id,
                    full_name: profile?.full_name || "Kurye",
                    telegram_chat_id: profile?.telegram_chat_id,
                    is_online: profile?.is_online || false
                }
            })
            setCouriers(courierList)
        }

        // 5. Fetch All Store Members
        const { data: allMembers } = await supabase
            .from("store_members")
            .select("user_id, role, profiles(*)")
            .eq("store_id", idToUse)

        if (allMembers) {
            setAllStoreMembers(allMembers.map((m: any) => {
                const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
                return {
                    id: m.user_id,
                    role: m.role,
                    full_name: profile?.full_name || "Bilinmeyen Kullanıcı",
                    telegram_chat_id: profile?.telegram_chat_id || "",
                    is_online: profile?.is_online || false
                }
            }))
        }

        setLoading(false)
        console.log("Veriler yenilendi")
    }

    const handleSearchProfiles = async (query: string) => {
        setSearchQuery(query)
        if (query.trim().length < 3) {
            setSearchResults([])
            return
        }

        const { data } = await supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", `%${query}%`)
            .limit(10)

        if (data) {
            setSearchResults(data)
        }
    }

    const handleAddMember = async () => {
        if (!selectedProfile) return
        setAddingMember(true)

        const idToUse = store?.id

        const { error } = await supabase
            .from("store_members")
            .insert({
                store_id: idToUse,
                user_id: selectedProfile.id,
                role: selectedRole
            })

        if (error) {
            toast.error("Personel eklenemedi: " + error.message)
        } else {
            toast.success(`${selectedProfile.full_name} başarıyla eklendi.`)
            setSelectedProfile(null)
            setSearchQuery("")
            setSearchResults([])
            refreshData()
        }
        setAddingMember(false)
    }

    const handleRemoveMember = async (memberIdToRemove: string) => {
        const idToUse = store?.id
        
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user.id === memberIdToRemove) {
            toast.error("Kendinizi listeden çıkaramazsınız.")
            return
        }

        const { error } = await supabase
            .from("store_members")
            .delete()
            .eq("store_id", idToUse)
            .eq("user_id", memberIdToRemove)

        if (error) {
            toast.error("Personel silinemedi: " + error.message)
        } else {
            toast.success("Personel kaldırıldı.")
            refreshData()
        }
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

            const currentStore = member.stores
            setStore(currentStore)

            // 3. Fetch categories and products for KDS and quick-add
            const { data: catData } = await supabase
                .from("products")
                .select("category")
                .eq("store_id", member.store_id)
            if (catData) {
                const uniqueCats = Array.from(new Set(catData.map((p: any) => p.category)))
                setAllCategories(uniqueCats)
            }

            const { data: productsData } = await supabase
                .from("products")
                .select("*")
                .eq("store_id", member.store_id)
                .eq("is_available", true)
                .order("name", { ascending: true })
            if (productsData) setStoreProducts(productsData)

            // 4. Fetch Initial Data
            await refreshData(member.store_id)

            // 5. Subscribe to real-time events
            channel = supabase
                .channel(`admin-dashboard-${member.store_id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'orders', 
                    filter: `store_id=eq.${member.store_id}` 
                }, (payload) => {
                    const newOrder = payload.new as Order
                    setOrders(prev => [newOrder, ...prev])
                    toast.info(`Yeni Sipariş: Masa ${newOrder.table_no}`)
                    playSound()
                })
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'orders', 
                    filter: `store_id=eq.${member.store_id}` 
                }, (payload) => {
                    const updatedOrder = payload.new as Order
                    if (updatedOrder.status === 'paid') {
                        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
                    } else {
                        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
                    }
                })
                .on('postgres_changes', { 
                    event: 'DELETE', 
                    schema: 'public', 
                    table: 'orders', 
                    filter: `store_id=eq.${member.store_id}` 
                }, (payload) => {
                    const deletedOrderId = payload.old.id
                    setOrders(prev => prev.filter(o => o.id !== deletedOrderId))
                })
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'calls', 
                    filter: `store_id=eq.${member.store_id}` 
                }, (payload) => {
                    const newCall = payload.new as Call
                    setCalls(prev => [newCall, ...prev])
                    toast.warning(`Yeni Çağrı: Masa ${newCall.table_no}`)
                    playSound()
                })
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'calls', 
                    filter: `store_id=eq.${member.store_id}` 
                }, (payload) => {
                    const updatedCall = payload.new as Call
                    if (updatedCall.active === false) {
                        setCalls(prev => prev.filter(c => c.id !== updatedCall.id))
                    } else {
                        setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c))
                    }
                })
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'tables', 
                    filter: `store_id=eq.${member.store_id}` 
                }, () => {
                    // Quick reload tables
                    supabase.from("tables").select("*").eq("store_id", member.store_id).order("table_no", { ascending: true }).then(({ data }) => {
                        if (data) setTablesList(data)
                    })
                })
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'stores', 
                    filter: `id=eq.${member.store_id}` 
                }, (payload) => {
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

    const updateOrderStatus = async (id: string, status: 'preparing' | 'done' | 'paid') => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
        const { error } = await supabase.from("orders").update({ status }).eq("id", id)
        if (error) toast.error("Güncelleme hatası")
    }

    const closeTable = async (tableNo: string) => {
        if (!confirm(`${tableNo} nolu masayı kapatmak (ödemesi alındı) istiyor musunuz?`)) return

        setLoading(true)
        const { error } = await supabase
            .from("orders")
            .update({ status: 'paid' })
            .eq("table_no", tableNo)
            .neq("status", 'paid')

        if (error) {
            console.error(error)
            toast.error("Masa kapatılamadı")
        } else {
            toast.success("Masa kapatıldı ve siparişler arşivlendi")
            setOrders(prev => prev.filter(o => o.table_no !== tableNo))

            // Dismiss active calls for this table
            const activeCalls = calls.filter(c => c.table_no === tableNo)
            for (const call of activeCalls) {
                dismissCall(call.id)
            }
            setShowTableModal(false)
        }
        setLoading(false)
    }

    const dismissCall = async (id: string) => {
        setCalls(prev => prev.filter(c => c.id !== id))
        await supabase.from("calls").update({ active: false }).eq("id", id)
    }

    // KDS Config Persistence
    const saveKdsConfig = (cats: string[], limit: number) => {
        setKdsCategories(cats)
        setPrepTimeLimit(limit)
        localStorage.setItem("kds_categories", JSON.stringify(cats))
        localStorage.setItem("kds_prep_limit", limit.toString())
        toast.success("Mutfak ekranı ayarları güncellendi.")
        setShowKdsSettings(false)
    }

    const toggleKdsCategory = (cat: string) => {
        if (kdsCategories.includes(cat)) {
            setKdsCategories(kdsCategories.filter(c => c !== cat))
        } else {
            setKdsCategories([...kdsCategories, cat])
        }
    }

    const handleAssignCourier = async (order: any, courierId: string) => {
        const courier = couriers.find(c => c.id === courierId)
        if (!courier) {
            toast.error("Kurye bulunamadı")
            return
        }

        const { error } = await supabase
            .from("orders")
            .update({ 
                status: 'on_the_way', 
                courier_id: courierId 
            })
            .eq("id", order.id)

        if (error) {
            toast.error("Kurye ataması yapılamadı: " + error.message)
            return
        }

        await triggerTelegramAlert(order, courier)
        toast.success(`Kurye ${courier.full_name} siparişe atandı!`)
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'on_the_way', courier_id: courierId } : o))
    }

    const handleMarkDelivered = async (orderId: string) => {
        const { error } = await supabase
            .from("orders")
            .update({ status: 'paid', payment_status: 'paid' })
            .eq("id", orderId)

        if (error) {
            toast.error("İşlem başarısız: " + error.message)
        } else {
            toast.success("Sipariş teslim edildi olarak kapatıldı.")
            setOrders(prev => prev.filter(o => o.id !== orderId))
        }
    }

    const triggerTelegramAlert = async (order: any, courier: any) => {
        if (!courier.telegram_chat_id) {
            toast.warning(`Kurye ${courier.full_name} için Telegram Chat ID tanımlanmamış. Bildirim gönderilemedi.`);
            return
        }

        const orderIdShort = order.id.slice(0, 4)
        const address = order.delivery_address || "Belirtilmemiş"
        const notes = order.delivery_notes ? `Not: ${order.delivery_notes}` : ""
        const totalPrice = Number(order.total_price).toFixed(2)
        
        let payMethodText = "✓ Online Ödendi"
        if (order.payment_method === 'cash_delivery') payMethodText = "💵 Kapıda Nakit"
        else if (order.payment_method === 'card_delivery') payMethodText = "💳 Kapıda Kart"

        const text = `📦 *Yeni Paket Siparişi Atandı!*\n\nSipariş: *#${orderIdShort}*\nTutar: *₺${totalPrice}*\nÖdeme: *${payMethodText}*\n\n📍 *Adres:* ${address}\n${notes}\n\n🧭 *Yol Tarifi:* [Haritada Aç](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)})`

        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: "🚚 Yoldayım", callback_data: `on_the_way:${order.id}` },
                    { text: "✓ Teslim Ettim", callback_data: `delivered:${order.id}` }
                ]
            ]
        }

        const botToken = store?.payment_settings?.telegram_bot_token || "8635446793:AAELVKXaRqWUJFNXVXqXJMyMVD3xeiZBI_Q"

        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: courier.telegram_chat_id,
                    text: text,
                    parse_mode: "Markdown",
                    reply_markup: inlineKeyboard
                })
            })
            if (!res.ok) {
                console.error("Telegram error response:", await res.text())
                toast.warning("Kuryeye Telegram bildirimi gönderilemedi (Kurye botu başlatmamış olabilir).")
            } else {
                toast.success("Kurye Telegram bildirimi gönderildi!")
            }
        } catch (err) {
            console.error("Telegram fetch error:", err)
        }
    }

    // KDS Filter Logic
    const getFilteredKdsOrders = () => {
        if (kdsCategories.length === 0) return orders

        // Filter orders that have at least one item matching KDS station categories
        return orders.filter(order => {
            const items = Array.isArray(order.items) ? order.items : []
            return items.some((item: any) => kdsCategories.includes(item.category))
        })
    }

    // Table Operations Actions
    const handleAddManualProduct = async (product: Product) => {
        if (!selectedTable) return
        const activeOrder = orders.find(o => o.table_no === selectedTable.table_no)

        if (activeOrder) {
            // Update Existing Order
            const items = Array.isArray(activeOrder.items) ? [...(activeOrder.items as any[])] : []
            const existingItemIndex = items.findIndex((i: any) => i.id === product.id && (!i.selectedOptions || i.selectedOptions.length === 0))

            if (existingItemIndex > -1) {
                items[existingItemIndex].quantity += 1
            } else {
                items.push({
                    cartKey: product.id,
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    category: product.category
                })
            }

            const newTotal = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0)
            const { error } = await supabase
                .from("orders")
                .update({ items, total_price: newTotal })
                .eq("id", activeOrder.id)

            if (error) toast.error("Ürün eklenemedi: " + error.message)
            else toast.success(`${product.name} masaya eklendi.`)
        } else {
            // Create New Order
            const newOrder = {
                store_id: store.id,
                table_no: selectedTable.table_no,
                status: 'preparing',
                payment_method: 'cash_table',
                customer_name: `Masa ${selectedTable.table_no}`,
                customer_phone: "Panel",
                items: [{
                    cartKey: product.id,
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    category: product.category
                }],
                total_price: product.price
            }

            const { error } = await supabase.from("orders").insert(newOrder)
            if (error) toast.error("Yeni sipariş oluşturulamadı: " + error.message)
            else toast.success(`Masa ${selectedTable.table_no} için yeni sipariş oluşturuldu.`)
        }
        setSearchProductQuery("")
    }

    const handleApplyDiscount = async (percent: number) => {
        if (!selectedTable) return
        const activeOrder = orders.find(o => o.table_no === selectedTable.table_no)
        if (!activeOrder) return

        const baseTotal = (Array.isArray(activeOrder.items) ? activeOrder.items : []).reduce(
            (acc: number, item: any) => acc + item.price * item.quantity, 0
        )
        const discountedTotal = baseTotal * (1 - percent / 100)

        const { error } = await supabase
            .from("orders")
            .update({ total_price: parseFloat(discountedTotal.toFixed(2)) })
            .eq("id", activeOrder.id)

        if (error) toast.error("İskonto uygulanamadı")
        else toast.success(`%${percent} indirim uygulandı. Yeni Tutar: ₺${discountedTotal.toFixed(2)}`)
    }

    const handleTransferTable = async () => {
        if (!selectedTable || !transferTableNo) return
        const activeOrder = orders.find(o => o.table_no === selectedTable.table_no)
        if (!activeOrder) return

        // 1. Move active order
        const { error: orderErr } = await supabase
            .from("orders")
            .update({ table_no: transferTableNo })
            .eq("id", activeOrder.id)

        // 2. Move active calls
        await supabase
            .from("calls")
            .update({ table_no: transferTableNo })
            .eq("table_no", selectedTable.table_no)
            .eq("active", true)

        if (orderErr) {
            toast.error("Masa taşınamadı")
        } else {
            toast.success(`Masa ${selectedTable.table_no} aktif siparişleri Masa ${transferTableNo}'e taşındı.`)
            setShowTableModal(false)
            setTransferTableNo("")
        }
    }

    const handleMergeTable = async () => {
        if (!selectedTable || !mergeTableNo) return
        const sourceOrder = orders.find(o => o.table_no === selectedTable.table_no)
        const targetOrder = orders.find(o => o.table_no === mergeTableNo)

        if (!sourceOrder) return

        if (!targetOrder) {
            // Target has no order, just transfer source
            const { error } = await supabase.from("orders").update({ table_no: mergeTableNo }).eq("id", sourceOrder.id)
            if (error) toast.error("Birleştirme başarısız")
            else {
                toast.success(`Siparişler Masa ${mergeTableNo} üzerinde birleştirildi.`)
                setShowTableModal(false)
                setMergeTableNo("")
            }
            return
        }

        // Target has order: merge items
        const mergedItems = Array.isArray(targetOrder.items) ? [...(targetOrder.items as any[])] : []
        const sourceItems = Array.isArray(sourceOrder.items) ? (sourceOrder.items as any[]) : []

        sourceItems.forEach((sItem: any) => {
            const existingIdx = mergedItems.findIndex((tItem: any) => tItem.cartKey === sItem.cartKey)
            if (existingIdx > -1) {
                mergedItems[existingIdx].quantity += sItem.quantity
            } else {
                mergedItems.push(sItem)
            }
        })

        const newTotal = mergedItems.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0)

        // Update target and delete source
        const { error: updateErr } = await supabase
            .from("orders")
            .update({ items: mergedItems, total_price: newTotal })
            .eq("id", targetOrder.id)

        if (updateErr) {
            toast.error("Birleştirme başarısız")
            return
        }

        await supabase.from("orders").delete().eq("id", sourceOrder.id)
        await supabase.from("calls").update({ active: false }).eq("table_no", selectedTable.table_no).eq("active", true)

        toast.success(`Masa ${selectedTable.table_no} siparişleri Masa ${mergeTableNo} ile birleştirildi.`)
        setShowTableModal(false)
        setMergeTableNo("")
    }

    if (loading && !store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Panel Yükleniyor...</div>

    const filteredProductsList = storeProducts.filter(p => 
        p.name.toLowerCase().includes(searchProductQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background pb-20 font-sans text-foreground">
            {/* Navbar */}
            <AdminNavbar store={store} />

            <main className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Glassmorphism Panel Tabs */}
                    <div className="flex flex-wrap bg-[#0f0f0f] p-1.5 rounded-2xl border border-white/5 shadow-inner gap-1">
                        <button
                            onClick={() => setActiveTab('kitchen')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                                activeTab === 'kitchen'
                                    ? "bg-white text-black shadow-lg"
                                    : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            🍳 Mutfak (KDS)
                        </button>
                        <button
                            onClick={() => setActiveTab('tables')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                                activeTab === 'tables'
                                    ? "bg-white text-black shadow-lg"
                                    : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            📍 Masa Haritası
                        </button>
                        <button
                            onClick={() => setActiveTab('dispatch')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                                activeTab === 'dispatch'
                                    ? "bg-white text-black shadow-lg"
                                    : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            🚚 Kurye Dağıtım
                        </button>
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                                activeTab === 'staff'
                                    ? "bg-white text-black shadow-lg"
                                    : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            👥 Personel
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`gap-1.5 h-9 px-3.5 rounded-xl ${connectionStatus === 'SUBSCRIBED' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-amber-500 border-amber-500/20 bg-amber-500/5'}`}>
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                            {connectionStatus === 'SUBSCRIBED' ? 'Canlı Bağlantı' : 'Bağlanıyor...'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => refreshData()} className="h-9 px-4 rounded-xl border-white/10 hover:bg-white/5 gap-2">
                            <RefreshCw className="w-4 h-4" /> Yenile
                        </Button>
                    </div>
                </div>

                {/* Tab Content 1: Kitchen Display System (KDS) */}
                {activeTab === 'kitchen' && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                Mutfak Takip Ekranı 
                                <Badge variant="secondary" className="ml-2 text-primary bg-primary/10 border-primary/20">{getFilteredKdsOrders().length}</Badge>
                            </h2>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setShowKdsSettings(true)} 
                                className="h-9 rounded-xl border-white/10 hover:bg-white/5 gap-2"
                            >
                                <Settings className="w-4 h-4" /> Ayarlar
                            </Button>
                        </div>

                        {/* Order Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <AnimatePresence mode="popLayout">
                                {getFilteredKdsOrders().map(order => {
                                    // Elapsed time calculation
                                    const elapsedMs = currentTime - new Date(order.created_at).getTime()
                                    const elapsedMins = Math.floor(elapsedMs / 60000)
                                    const isLate = order.status === 'preparing' && elapsedMins >= prepTimeLimit

                                    return (
                                        <motion.div
                                            layout
                                            key={order.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className={`relative group overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm p-0 flex flex-col transition-all duration-300
                                                ${isLate 
                                                    ? 'border-red-500/40 shadow-[0_0_40px_-5px_rgba(239,68,68,0.25)] animate-pulse' 
                                                    : order.status === 'preparing' 
                                                        ? 'border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)]' 
                                                        : 'border-white/5 hover:border-white/10'
                                                }
                                            `}
                                        >
                                            {/* Status Bar */}
                                            <div className={`h-1.5 w-full ${isLate ? 'bg-red-500' : order.status === 'preparing' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />

                                            <div className="p-5 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-xs font-semibold text-muted-foreground mb-1">Sipariş #{order.id.slice(0, 4)}</div>
                                                        <div className="text-3xl font-black tracking-tight">Masa {order.table_no}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <Badge variant="outline" className={
                                                            isLate 
                                                                ? "bg-red-500/10 border-red-500/20 text-red-400 font-bold" 
                                                                : order.status === 'preparing' 
                                                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                                                                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                                        }>
                                                            {isLate ? 'GECİKTİ' : order.status === 'preparing' ? 'Hazırlanıyor' : 'Yeni Sipariş'}
                                                        </Badge>
                                                        
                                                        {/* Elapsed Chronometer */}
                                                        <div className={`flex items-center gap-1 text-xs font-mono font-bold ${isLate ? 'text-red-400' : 'text-muted-foreground'}`}>
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {elapsedMins} dk önce
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Items with opacity dimming for filtered category focus */}
                                                <div className="space-y-3 mb-6 flex-1">
                                                    {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => {
                                                        const isMatchingCategory = kdsCategories.length === 0 || kdsCategories.includes(item.category)
                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                className={`flex flex-col py-2 border-b border-white/5 last:border-0 transition-opacity duration-300
                                                                    ${isMatchingCategory ? 'opacity-100' : 'opacity-25'}
                                                                `}
                                                            >
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                                                                        <span className="font-bold text-white">{item.name}</span>
                                                                    </div>
                                                                    <span className="text-zinc-500 tabular-nums">₺{item.price * item.quantity}</span>
                                                                </div>
                                                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                                    <div className="text-[11px] text-zinc-400 pl-9 mt-0.5 space-y-0.5">
                                                                        {item.selectedOptions.map((o: any, oIdx: number) => (
                                                                            <div key={oIdx}>+ {o.name}</div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                                                    <div className="text-xs text-muted-foreground">Tutar: <span className="text-base font-bold text-white ml-1">₺{order.total_price}</span></div>

                                                    <div className="flex gap-2">
                                                        {order.status === 'new' && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 gap-1.5 font-bold"
                                                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                                            >
                                                                <Play className="w-3.5 h-3.5 fill-current" /> Hazırla
                                                            </Button>
                                                        )}
                                                        {order.status === 'preparing' && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 gap-1.5 font-bold"
                                                                onClick={() => updateOrderStatus(order.id, 'done')}
                                                            >
                                                                <Utensils className="w-3.5 h-3.5" /> Servis Et
                                                            </Button>
                                                        )}
                                                        {order.status === 'done' && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-500 text-white rounded-xl shadow-lg shadow-green-500/20 gap-1.5 font-bold"
                                                                onClick={() => updateOrderStatus(order.id, 'paid')}
                                                            >
                                                                <CreditCard className="w-3.5 h-3.5" /> Kapat
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>

                            {getFilteredKdsOrders().length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl">
                                    <Utensils className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Bu istasyon filtresine uygun aktif sipariş bulunmuyor.</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Tab Content 2: Table Map & Calls Board */}
                {activeTab === 'tables' && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Masa Planı & Çağrı Paneli</h2>
                            <span className="text-xs text-muted-foreground">Masa rengine tıklayarak siparişi güncelleyebilir veya hesap kapatabilirsiniz.</span>
                        </div>

                        {/* Interactive Table Map Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {tablesList.map(table => {
                                const tableOrders = orders.filter(o => o.table_no === table.table_no)
                                const tableCalls = calls.filter(c => c.table_no === table.table_no)

                                const hasWaiterCall = tableCalls.some(c => c.type === 'waiter')
                                const hasBillCall = tableCalls.some(c => c.type === 'bill')
                                const hasActiveOrder = tableOrders.some(o => o.status !== 'done')
                                const hasServedOrder = tableOrders.length > 0 && tableOrders.every(o => o.status === 'done')

                                // Color Resolution
                                let cardColorClass = "border-white/5 bg-card/40 hover:bg-card/60"
                                let glowClass = ""
                                let statusText = "Boş"

                                if (hasWaiterCall) {
                                    cardColorClass = "border-red-500/30 bg-red-950/10 text-red-400 hover:bg-red-950/20"
                                    glowClass = "shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse"
                                    statusText = "🔔 Çağrı Var"
                                } else if (hasBillCall) {
                                    cardColorClass = "border-blue-500/30 bg-blue-950/10 text-blue-400 hover:bg-blue-950/20"
                                    glowClass = "shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-pulse"
                                    statusText = "💵 Hesap İstendi"
                                } else if (hasActiveOrder) {
                                    cardColorClass = "border-yellow-500/30 bg-yellow-950/10 text-yellow-400 hover:bg-yellow-950/20"
                                    statusText = "🍳 Sipariş Var"
                                } else if (hasServedOrder) {
                                    cardColorClass = "border-green-500/30 bg-green-950/10 text-green-400 hover:bg-green-950/20"
                                    statusText = "🍵 Servis Edildi"
                                }

                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => {
                                            setSelectedTable(table)
                                            setShowTableModal(true)
                                        }}
                                        className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all duration-300 ${cardColorClass} ${glowClass}`}
                                    >
                                        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">MASA</span>
                                        <span className="text-4xl font-black">{table.table_no}</span>
                                        <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-black/40">
                                            {statusText}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Tab Content 3: Courier Lojistik Dispatch */}
                {activeTab === 'dispatch' && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                🚚 Kurye Dağıtım & Paket Takip 
                                <Badge variant="secondary" className="ml-2 text-primary bg-primary/10 border-primary/20">
                                    {orders.filter(o => o.type === 'delivery').length}
                                </Badge>
                            </h2>
                        </div>

                        {orders.filter(o => o.type === 'delivery').length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
                                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">Aktif paket servis siparişi bulunmamaktadır.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {orders.filter(o => o.type === 'delivery').map(order => {
                                        const assignedCourier = couriers.find(c => c.id === order.courier_id)
                                        const courierVal = selectedCouriers[order.id] || ""

                                        return (
                                            <motion.div
                                                layout
                                                key={order.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-card border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="text-xs text-muted-foreground mb-1">
                                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div className="font-bold text-white text-base">Sipariş #{order.id.slice(0, 4)}</div>
                                                        </div>
                                                        <Badge variant="outline" className={cn(
                                                            order.status === 'ready' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                                                            order.status === 'on_the_way' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse" :
                                                            "bg-zinc-800 border-zinc-700 text-zinc-400"
                                                        )}>
                                                            {order.status === 'new' ? 'Yeni' :
                                                             order.status === 'preparing' ? 'Hazırlanıyor' :
                                                             order.status === 'ready' ? 'Hazır' :
                                                             order.status === 'on_the_way' ? 'Yolda' :
                                                             order.status === 'delivered' ? 'Teslim Edildi' : 'Bilinmiyor'}
                                                        </Badge>
                                                    </div>

                                                    {/* Items list */}
                                                    <div className="space-y-1 mb-4 bg-zinc-950/40 p-3 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                                                        {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => (
                                                            <div key={idx} className="text-xs text-zinc-300 flex justify-between">
                                                                <span>{item.quantity}x {item.name}</span>
                                                                <span>₺{item.price * item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Customer & Address Details */}
                                                    <div className="space-y-2.5 text-xs text-zinc-400 mb-6">
                                                        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                                                            <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">👤</span>
                                                            {order.customer_name} ({order.customer_phone})
                                                        </div>
                                                        <div className="flex items-start gap-1.5">
                                                            <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-zinc-200">{order.delivery_address}</p>
                                                                {order.delivery_notes && (
                                                                    <p className="text-[10px] text-zinc-500 italic mt-1">Not: {order.delivery_notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-white/5">
                                                            <span>Toplam Tutar:</span>
                                                            <span className="text-green-500">₺{order.total_price}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dispatcher Actions */}
                                                <div className="pt-4 border-t border-white/5 space-y-3 mt-auto">
                                                    {order.status === 'on_the_way' ? (
                                                        <div className="space-y-2">
                                                            <div className="text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 p-2.5 rounded-xl text-center font-semibold">
                                                                🚚 Kuryede: {assignedCourier?.full_name || "Bilinmeyen Kurye"}
                                                            </div>
                                                            <Button
                                                                onClick={() => handleMarkDelivered(order.id)}
                                                                className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold h-10"
                                                            >
                                                                Teslim Edildi Kapat
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={courierVal}
                                                                onChange={e => setSelectedCouriers({ ...selectedCouriers, [order.id]: e.target.value })}
                                                                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl h-10 px-3 text-xs text-white"
                                                            >
                                                                <option value="">Kurye Seçin...</option>
                                                                {couriers.map(c => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.is_online ? "🟢" : "🔴"} {c.full_name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <Button
                                                                disabled={!courierVal}
                                                                onClick={() => handleAssignCourier(order, courierVal)}
                                                                className={cn(
                                                                    "h-10 px-4 rounded-xl text-xs font-bold transition-all",
                                                                    courierVal 
                                                                        ? "bg-white text-black hover:bg-zinc-200" 
                                                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                                )}
                                                            >
                                                                Ata
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </section>
                )}

                {/* Tab Content 4: Staff & Courier Management */}
                {activeTab === 'staff' && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                Personel ve Kurye Yönetimi
                                <Badge variant="secondary" className="ml-2 text-primary bg-primary/10 border-primary/20">{allStoreMembers.length}</Badge>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left: Add Staff form */}
                            <Card className="border-white/5 bg-card/40 backdrop-blur-xl h-fit">
                                <CardHeader>
                                    <CardTitle className="text-lg">Personel Ekle</CardTitle>
                                    <CardDescription>Sisteme kayıt olmuş kullanıcıları e-posta veya isimleriyle aratarak işletmenize ekleyin.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 relative">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">İsim / E-posta ile Ara (En az 3 harf)</label>
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                value={searchQuery}
                                                onChange={e => handleSearchProfiles(e.target.value)}
                                                placeholder="Örn: ccengizkorkmaz..."
                                                className="bg-secondary/40 border-transparent pl-10 h-11"
                                            />
                                        </div>

                                        {/* Autocomplete Results Dropdown */}
                                        {searchResults.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-white/5">
                                                {searchResults.map(profile => (
                                                    <button
                                                        key={profile.id}
                                                        onClick={() => {
                                                            setSelectedProfile(profile)
                                                            setSearchQuery(profile.full_name)
                                                            setSearchResults([])
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors flex flex-col gap-0.5"
                                                    >
                                                        <span className="font-bold text-white">{profile.full_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedProfile && (
                                        <div className="p-3.5 bg-green-500/5 border border-green-500/10 rounded-xl text-xs text-green-400 flex flex-col gap-1">
                                            <span className="font-bold text-white">Seçilen Kullanıcı:</span>
                                            <span>{selectedProfile.full_name}</span>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Yetki / Rol Tanımı</label>
                                        <select
                                            value={selectedRole}
                                            onChange={e => setSelectedRole(e.target.value)}
                                            className="w-full bg-secondary/40 border border-white/5 rounded-xl h-11 px-3 text-sm text-white"
                                        >
                                            <option value="staff">Staff (Kasiyer / Garson)</option>
                                            <option value="courier">Courier (Kurye)</option>
                                            <option value="manager">Manager (Müdür)</option>
                                        </select>
                                    </div>

                                    <Button
                                        disabled={!selectedProfile || addingMember}
                                        onClick={handleAddMember}
                                        className="w-full h-11 rounded-xl font-bold bg-white text-black hover:bg-zinc-200"
                                    >
                                        {addingMember ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Personel Olarak Ekle
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Right: Staff List Table */}
                            <Card className="border-white/5 bg-card/40 backdrop-blur-xl lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-lg">Kayıtlı Personel Listesi</CardTitle>
                                    <CardDescription>İşletmenizde kayıtlı kurye, kasa görevlisi ve yöneticiler.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {allStoreMembers.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground text-sm">Hiç kayıtlı personel bulunamadı.</div>
                                    ) : (
                                        <div className="border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5 bg-black/10">
                                            {allStoreMembers.map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                                    <div className="space-y-1">
                                                        <div className="font-semibold text-sm text-white flex items-center gap-2">
                                                                {member.role === 'courier' && (
                                                                    <span className={member.is_online ? "text-green-500" : "text-zinc-600"}>●</span>
                                                                )}
                                                            {member.full_name}
                                                            {member.telegram_chat_id && (
                                                                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded-md font-mono">TG Bağlı</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">ID: {member.id}</div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <Badge className={cn(
                                                            "text-xs px-2.5 py-1 rounded-md border",
                                                            member.role === 'owner' && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                                            member.role === 'manager' && "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                                                            member.role === 'staff' && "bg-teal-500/10 text-teal-400 border-teal-500/20",
                                                            member.role === 'courier' && "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                        )}>
                                                            {member.role === 'owner' ? 'Kurucu' : 
                                                             member.role === 'manager' ? 'Müdür' : 
                                                             member.role === 'courier' ? 'Kurye' : 'Personel'}
                                                        </Badge>

                                                        {member.role !== 'owner' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveMember(member.id)}
                                                                className="rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-transparent hover:border-red-500/10"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}
            </main>

            {/* Modal: KDS Settings */}
            <AnimatePresence>
                {showKdsSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowKdsSettings(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-white">Mutfak Ekranı Ayarları</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowKdsSettings(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {/* Prep limit */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-300">Gecikme Uyarı Sınırı (Dakika)</label>
                                    <Input
                                        type="number"
                                        value={prepTimeLimit}
                                        onChange={e => setPrepTimeLimit(parseInt(e.target.value) || 5)}
                                        className="bg-zinc-950 border-white/10 h-10"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Bu süreyi aşan hazırlanıyor durumundaki sipariş kartları kırmızı renkte parlayarak uyarı verecektir.</span>
                                </div>

                                {/* Categories to watch */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-300">Bu İstasyonda İzlenecek Kategoriler</label>
                                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
                                        {allCategories.map(cat => {
                                            const isSelected = kdsCategories.includes(cat)
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => toggleKdsCategory(cat)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                        isSelected
                                                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                                                            : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">Hiçbir kategori seçilmezse tüm siparişler gösterilecektir.</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                                <Button variant="ghost" onClick={() => setShowKdsSettings(false)} className="rounded-xl">Vazgeç</Button>
                                <Button onClick={() => saveKdsConfig(kdsCategories, prepTimeLimit)} className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold">Kaydet</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Table Operations Detail */}
            <AnimatePresence>
                {showTableModal && selectedTable && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowTableModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Left Side: Table Status, Items & Bill Summary */}
                            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between overflow-y-auto">
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-3xl font-black text-white">Masa {selectedTable.table_no}</h3>
                                            <p className="text-xs text-muted-foreground">Aktif sipariş ve adisyon yönetimi.</p>
                                        </div>
                                        <Badge variant="outline" className="bg-zinc-950 border-white/10">
                                            {orders.some(o => o.table_no === selectedTable.table_no) ? "Dolu" : "Müsait"}
                                        </Badge>
                                    </div>

                                    {/* Active Calls List */}
                                    {calls.filter(c => c.table_no === selectedTable.table_no).length > 0 && (
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-6 space-y-2">
                                            <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Masadan Gelen Çağrılar var
                                            </div>
                                            {calls.filter(c => c.table_no === selectedTable.table_no).map(call => (
                                                <div key={call.id} className="flex justify-between items-center text-xs text-zinc-300">
                                                    <span>• {call.type === 'bill' ? '💵 HESAP İSTENDİ' : '🔔 GARSON ÇAĞIRDI'}</span>
                                                    <button onClick={() => dismissCall(call.id)} className="text-red-400 hover:text-red-300 font-bold hover:underline">
                                                        Kapat
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Active Order Items */}
                                    <div className="space-y-3 mb-6">
                                        <h4 className="font-bold text-sm text-zinc-300">Masa Adisyon İçeriği</h4>
                                        {orders.filter(o => o.table_no === selectedTable.table_no).length === 0 ? (
                                            <p className="text-xs text-muted-foreground py-4 italic text-center">Masada aktif sipariş bulunmuyor.</p>
                                        ) : (
                                            orders.filter(o => o.table_no === selectedTable.table_no).map(order => (
                                                <div key={order.id} className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                                    {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                                            <span className="text-zinc-300">{item.quantity}x {item.name}</span>
                                                            <span className="font-semibold text-white">₺{item.price * item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Bill Summary Footer */}
                                {orders.filter(o => o.table_no === selectedTable.table_no).length > 0 && (
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-muted-foreground">Toplam Tutar:</span>
                                            <span className="text-2xl font-black text-white">
                                                ₺{orders.find(o => o.table_no === selectedTable.table_no)?.total_price}
                                            </span>
                                        </div>
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold h-11"
                                            onClick={() => closeTable(selectedTable.table_no)}
                                        >
                                            Hesabı Kapat & Ödeme Al
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Operations Control Panel */}
                            <div className="flex-1 p-6 bg-zinc-950/60 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-sm text-zinc-100">İşlem & Müdahale Paneli</h4>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full md:hidden" onClick={() => setShowTableModal(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* 1. Add Product Section */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Masaya Manuel Ürün Ekle</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Ürün ismi ile arayın..."
                                                value={searchProductQuery}
                                                onChange={e => setSearchProductQuery(e.target.value)}
                                                className="pl-9 bg-zinc-900 border-white/5 h-10 text-sm"
                                            />
                                        </div>
                                        {searchProductQuery && (
                                            <div className="bg-black/90 border border-white/5 rounded-xl max-h-40 overflow-y-auto divide-y divide-white/5 mt-1">
                                                {filteredProductsList.map(prod => (
                                                    <button
                                                        key={prod.id}
                                                        onClick={() => handleAddManualProduct(prod)}
                                                        className="w-full px-4 py-2.5 text-left text-xs hover:bg-white/5 flex justify-between items-center"
                                                    >
                                                        <span className="font-bold text-white">{prod.name}</span>
                                                        <span className="text-zinc-500 font-bold">₺{prod.price}</span>
                                                    </button>
                                                ))}
                                                {filteredProductsList.length === 0 && (
                                                    <div className="p-3 text-center text-xs text-muted-foreground">Ürün bulunamadı.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {orders.filter(o => o.table_no === selectedTable.table_no).length > 0 && (
                                        <>
                                            {/* 2. Apply Discount Section */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">İskonto Uygula</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[10, 15, 20, 30].map(percent => (
                                                        <Button
                                                            key={percent}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleApplyDiscount(percent)}
                                                            className="rounded-lg h-9 border-white/10 hover:bg-white/5 text-xs font-bold"
                                                        >
                                                            %{percent}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 3. Transfer Table Section */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Masayı Başka Masaya Taşı</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={transferTableNo}
                                                        onChange={e => setTransferTableNo(e.target.value)}
                                                        className="flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 h-10 text-xs text-white"
                                                    >
                                                        <option value="">Hedef Masa Seçin...</option>
                                                        {tablesList
                                                            .filter(t => t.table_no !== selectedTable.table_no && !orders.some(o => o.table_no === t.table_no))
                                                            .map(t => (
                                                                <option key={t.id} value={t.table_no}>Masa {t.table_no}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    <Button 
                                                        disabled={!transferTableNo} 
                                                        onClick={handleTransferTable}
                                                        className="bg-white text-black hover:bg-zinc-200 h-10 px-4 rounded-lg font-bold text-xs"
                                                    >
                                                        Taşı
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* 4. Merge Tables Section */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Masaları Birleştir</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={mergeTableNo}
                                                        onChange={e => setMergeTableNo(e.target.value)}
                                                        className="flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 h-10 text-xs text-white"
                                                    >
                                                        <option value="">Birleştirilecek Hedef...</option>
                                                        {tablesList
                                                            .filter(t => t.table_no !== selectedTable.table_no && orders.some(o => o.table_no === t.table_no))
                                                            .map(t => (
                                                                <option key={t.id} value={t.table_no}>Masa {t.table_no}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    <Button 
                                                        disabled={!mergeTableNo} 
                                                        onClick={handleMergeTable}
                                                        className="bg-white text-black hover:bg-zinc-200 h-10 px-4 rounded-lg font-bold text-xs"
                                                    >
                                                        Birleştir
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="pt-6 mt-6 border-t border-white/5 flex justify-end">
                                    <Button variant="ghost" onClick={() => setShowTableModal(false)} className="rounded-xl h-10">Kapat</Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
