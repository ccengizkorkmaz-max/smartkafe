
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag, Bell, Search, Utensils, Home, Clock, CheckCircle, Receipt, Trash2, Globe, Sparkles, CreditCard, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useCart } from "@/hooks/use-cart"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Product {
    id: string
    name: string
    price: number
    description: string | null
    image_url: string | null
    category: string
}

interface Store {
    id: string
    name: string
    logo_url: string | null
}

interface MenuClientProps {
    store: Store
    products: Product[]
    initialTableNo?: string
}

// Types for Orders
interface OrderItem {
    id: string
    name: string
    quantity: number
    price: number
}

interface CustomerOrder {
    id: string
    status: 'new' | 'preparing' | 'done' | 'paid'
    total_price: number
    items: OrderItem[]
    created_at: string
}

const TRANSLATIONS = {
    tr: {
        searchMenu: "Ne yemek istersin?",
        all: "Tümü",
        addedToCart: "Sepete eklendi",
        undo: "Geri Al",
        myCart: "Sepetim",
        clear: "Temizle",
        emptyCart: "Sepetiniz boş.",
        backToMenu: "Menüye Dön",
        total: "Toplam Tutar",
        confirmOrder: "Siparişi Onayla (Masada Öde)",
        payOnline: "Online Öde",
        myOrders: "Siparişlerim",
        noOrders: "Henüz siparişiniz yok.",
        browseMenu: "Menüye Göz At",
        orderTotal: "Toplam",
        waiter: "Garson",
        bill: "Hesap",
        menu: "Menü",
        cart: "Sepet",
        orders: "Sipariş",
        aiSuggestTitle: "Bunların yanına ne dersiniz?",
        paymentTitle: "Güvenli Online Ödeme",
        cardNumber: "Kart Numarası",
        expiry: "Son Kullanma (AA/YY)",
        cvv: "CVV",
        pay: "Ödemeyi Tamamla",
        orderSuccess: "Siparişiniz alındı!",
        paymentSuccess: "Ödeme alındı, sipariş oluşturuldu!",
        statusPreparing: "Hazırlanıyor",
        statusDone: "Tamamlandı",
        statusUnknown: "Bilinmiyor",
        callWaiterSuccess: "Garson çağrıldı.",
        callBillSuccess: "Hesap istendi.",
        error: "Bir hata oluştu.",
        add: "Ekle",
        poweredBy: "SmartKafe Altyapısı ile Hazırlanmıştır"
    },
    en: {
        searchMenu: "What would you like?",
        all: "All",
        addedToCart: "Added to cart",
        undo: "Undo",
        myCart: "My Cart",
        clear: "Clear",
        emptyCart: "Your cart is empty.",
        backToMenu: "Back to Menu",
        total: "Total Amount",
        confirmOrder: "Place Order (Pay at Table)",
        payOnline: "Pay Online",
        myOrders: "My Orders",
        noOrders: "No orders yet.",
        browseMenu: "Browse Menu",
        orderTotal: "Total",
        waiter: "Waiter",
        bill: "Bill",
        menu: "Menu",
        cart: "Cart",
        orders: "Orders",
        aiSuggestTitle: "You might also like",
        paymentTitle: "Secure Online Payment",
        cardNumber: "Card Number",
        expiry: "Expiry (MM/YY)",
        cvv: "CVV",
        pay: "Complete Payment",
        orderSuccess: "Order successfully placed!",
        paymentSuccess: "Payment successful!",
        statusPreparing: "Preparing",
        statusDone: "Done",
        statusUnknown: "Unknown",
        callWaiterSuccess: "Waiter called.",
        callBillSuccess: "Bill requested.",
        error: "An error occurred.",
        add: "Add",
        poweredBy: "Powered by SmartKafe"
    }
}

// Demo amaçlı veritabanı verilerini çeviren basit sözlük
const DB_DICTIONARY: Record<string, string> = {
    "Kahveler": "Coffees",
    "Tatlılar": "Desserts",
    "Soğuk İçecekler": "Cold Beverages",
    "Sıcak İçecekler": "Hot Beverages",
    "Ana Yemekler": "Main Courses",
    "Atıştırmalıklar": "Snacks",
    "Kahvaltı": "Breakfast",
    "İçecekler": "Drinks",
    "Filtre Kahve": "Filter Coffee",
    "Türk Kahvesi": "Turkish Coffee",
    "Çay": "Tea",
    "Su": "Water",
    "Maden Suyu": "Mineral Water",
    "Limonata": "Lemonade",
    "San Sebastian": "San Sebastian Cheesecake",
    "Latte": "Caffe Latte",
    "Tiramisu": "Tiramisu"
}

const translateDb = (text: string | null | undefined, lang: 'tr' | 'en') => {
    if (!text) return ""
    if (lang === 'tr') return text
    const found = Object.keys(DB_DICTIONARY).find(k => k.toLowerCase() === text.trim().toLowerCase())
    return found ? DB_DICTIONARY[found] : text
}


export default function MenuClient({ store, products, initialTableNo }: MenuClientProps) {
    const searchParams = useSearchParams()
    // Prefer the secure server-resolved table number, fallback to legacy URL param
    const tableNo = initialTableNo || searchParams.get("table")
    const { items, addItem, removeItem, clearCart, total } = useCart()
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders'>('menu')
    const [isCallingWaiter, setIsCallingWaiter] = useState(false)
    const [activeCategory, setActiveCategory] = useState<string>("All")
    const [searchQuery, setSearchQuery] = useState("")
    const [myOrders, setMyOrders] = useState<CustomerOrder[]>([])
    
    // New Feature States
    const [lang, setLang] = useState<'tr' | 'en'>('tr')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)

    const t = TRANSLATIONS[lang]

    // Unique Categories
    const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))]

    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesCategory = activeCategory === "All" || p.category === activeCategory
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    const fetchOrders = useCallback(async () => {
        if (!tableNo) return
        const { data } = await supabase
            .from("orders")
            .select("*")
            .eq("store_id", store.id)
            .eq("table_no", tableNo)
            .neq("status", "paid") // Don't show paid (closed) orders
            .order("created_at", { ascending: false })

        if (data) setMyOrders(data as unknown as CustomerOrder[])
    }, [tableNo, store.id])

    // Subscribe to Orders for this Table
    useEffect(() => {
        if (!tableNo) return

        fetchOrders()

        const channel = supabase
            .channel(`table-${tableNo}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `table_no=eq.${tableNo}` },
                (payload) => {
                    const newOrder = payload.new as CustomerOrder
                    if (newOrder.status !== 'paid') {
                        setMyOrders(prev => {
                            // Deduplicate: Don't add if already exists (e.g. from immediate insert response)
                            if (prev.some(o => o.id === newOrder.id)) return prev
                            return [newOrder, ...prev]
                        })
                        // Optional: toast here might be redundant if we already toasted on placeOrder, 
                        // but good for other devices. 
                        // toast.success("Siparişiniz alındı!") 
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `table_no=eq.${tableNo}` },
                (payload) => {
                    const updatedOrder = payload.new as CustomerOrder
                    if (updatedOrder.status === 'paid') {
                        setMyOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
                        toast.info("Sipariş ödemesi alındı.")
                    } else {
                        setMyOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
                    }
                }
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'orders', filter: `table_no=eq.${tableNo}` },
                (payload) => {
                    setMyOrders(prev => prev.filter(o => o.id !== payload.old.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableNo, fetchOrders])


    const handleCallWaiter = async (type: 'waiter' | 'bill') => {
        if (!tableNo) {
            toast.error(t.error)
            return
        }
        setIsCallingWaiter(true)
        try {
            const { error } = await supabase.from("calls").insert({
                store_id: store.id,
                table_no: tableNo,
                type: type,
            })
            if (error) throw error
            toast.success(type === 'bill' ? t.callBillSuccess : t.callWaiterSuccess)
        } catch (error) {
            console.error(error)
            toast.error(t.error)
        } finally {
            setIsCallingWaiter(false)
        }
    }

    const handlePlaceOrder = async (isPaidOnline = false) => {
        if (!tableNo) {
            toast.error(t.error)
            return
        }
        try {
            const orderData = {
                store_id: store.id,
                table_no: tableNo,
                total_price: total(),
                status: isPaidOnline ? 'paid' : 'new',
                items: JSON.parse(JSON.stringify(items))
            }
            const { data, error } = await supabase
                .from("orders")
                .insert(orderData)
                .select()
                .single()

            if (error) throw error

            if (data) {
                if (!isPaidOnline) {
                    const newOrder = data as unknown as CustomerOrder
                    setMyOrders(prev => [newOrder, ...prev])
                }
                toast.success(isPaidOnline ? t.paymentSuccess : t.orderSuccess)
                clearCart()
                setShowPaymentModal(false)
                if (!isPaidOnline) setActiveTab('orders')
                else setActiveTab('menu')
            }
        } catch (error: any) {
            console.error(error)
            toast.error(t.error)
        }
    }

    const simulatePayment = () => {
        setIsProcessingPayment(true)
        setTimeout(() => {
            handlePlaceOrder(true)
            setIsProcessingPayment(false)
        }, 2000)
    }

    const getUpsellProducts = () => {
        if (items.length === 0) return []
        const cartCategoryIds = items.map(i => products.find(p => p.id === i.id)?.category)
        const suggested = products.filter(p => !items.some(i => i.id === p.id) && !cartCategoryIds.includes(p.category)).slice(0, 2)
        if (suggested.length === 0) {
            return products.filter(p => !items.some(i => i.id === p.id)).slice(0, 2)
        }
        return suggested
    }
    const upsellProducts = getUpsellProducts()

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Hazırlanıyor</Badge> // Using 'Hazırlanıyor' generically for customer or 'Sıraya Alındı'
            case 'preparing': return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 animate-pulse">Hazırlanıyor</Badge>
            case 'done': return <Badge variant="secondary" className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Tamamlandı</Badge>
            default: return <Badge variant="outline">Bilinmiyor</Badge>
        }
    }

    return (
        <div className="pb-28 min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-20 glass-dock backdrop-blur-xl border-b border-white/5">
                <div className="max-w-md mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {store.logo_url && (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-lg leading-tight">{store.name}</h1>
                            {tableNo && <p className="text-xs text-muted-foreground">Masa {tableNo}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="rounded-full px-3 h-10 bg-secondary/50" onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}>
                            <Globe className="w-4 h-4 mr-1.5" /> {lang.toUpperCase()}
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-secondary/50" onClick={() => handleCallWaiter('waiter')}>
                            <Bell className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {activeTab === 'menu' && (
                    <div className="px-4 pb-4 max-w-md mx-auto space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t.searchMenu}
                                className="pl-9 bg-secondary/50 border-transparent rounded-xl h-11 focus-visible:ring-offset-0 focus-visible:bg-secondary"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    // FIXED: Changed text color for active state to 'text-primary' (white) for better contrast
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                                        activeCategory === cat
                                            ? "bg-white text-black shadow-lg shadow-white/10 scale-105 font-bold"
                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    )}
                                >
                                    {cat === 'All' ? t.all : translateDb(cat, lang)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto p-4">
                <AnimatePresence mode="wait">
                    {activeTab === 'menu' && (
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            {filteredProducts.map((product) => (
                                <motion.div
                                    key={product.id}
                                    whileTap={{ scale: 0.95 }}
                                    className="group relative flex flex-col gap-3"
                                >
                                    {/* Image Card */}
                                    <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-secondary">
                                        {product.image_url ? (
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No Img</div>
                                        )}
                                        {/* Add Button Overlay */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                addItem({ id: product.id, name: product.name, price: product.price, quantity: 1 })
                                                toast(t.addedToCart, {
                                                    description: product.name,
                                                    action: { label: t.undo, onClick: () => removeItem(product.id) }
                                                })
                                            }}
                                            className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                        >
                                            <span className="text-xl font-medium">+</span>
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-base leading-tight">{translateDb(product.name, lang)}</h3>
                                            <span className="font-bold">₺{product.price}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 opacity-70">{translateDb(product.description, lang)}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'cart' && (
                        <motion.div
                            key="cart"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{t.myCart}</h2>
                                <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:bg-destructive/10">{t.clear}</Button>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>{t.emptyCart}</p>
                                    <Button variant="link" onClick={() => setActiveTab('menu')}>{t.backToMenu}</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {items.map(item => (
                                            <div key={item.id} className="flex gap-4 items-center bg-card/50 p-4 rounded-xl border border-white/5">
                                                <div className="flex-1">
                                                    <div className="font-medium">{translateDb(item.name, lang)}</div>
                                                    <div className="text-sm text-muted-foreground">₺{item.price} x {item.quantity}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-lg">₺{item.price * item.quantity}</div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {upsellProducts.length > 0 && (
                                        <div className="mt-8">
                                            <div className="flex items-center gap-2 mb-4 text-yellow-500">
                                                <Sparkles className="w-5 h-5" />
                                                <h3 className="font-bold text-sm uppercase tracking-wider">{t.aiSuggestTitle}</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {upsellProducts.map(up => (
                                                    <div key={up.id} className="bg-secondary/30 rounded-xl p-3 border border-yellow-500/20 relative overflow-hidden flex flex-col justify-between">
                                                        <div>
                                                            <div className="font-medium text-sm leading-tight mb-1">{translateDb(up.name, lang)}</div>
                                                            <div className="font-bold text-sm text-yellow-500">₺{up.price}</div>
                                                        </div>
                                                        <Button size="sm" className="w-full mt-3 h-8 text-xs bg-white text-black hover:bg-gray-200" onClick={() => addItem({ id: up.id, name: up.name, price: up.price, quantity: 1 })}>
                                                            {t.add}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-8 p-6 bg-secondary/30 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>{t.total}</span>
                                            <span>₺{total()}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <Button size="lg" variant="outline" className="w-full text-sm font-bold h-12 rounded-xl border-white/10 hover:bg-white/5" onClick={() => handlePlaceOrder(false)}>
                                                {t.confirmOrder}
                                            </Button>
                                            <Button size="lg" className="w-full text-sm font-bold h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20" onClick={() => setShowPaymentModal(true)}>
                                                <CreditCard className="w-4 h-4 mr-2" /> {t.payOnline}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'orders' && (
                        <motion.div
                            key="orders"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h2 className="text-2xl font-bold mb-6">{t.myOrders}</h2>
                            {myOrders.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>{t.noOrders}</p>
                                    <Button variant="link" onClick={() => setActiveTab('menu')}>{t.browseMenu}</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {myOrders.map(order => (
                                        <div key={order.id} className="bg-card border border-white/5 rounded-2xl p-5 shadow-lg">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">
                                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="font-bold">Sipariş #{order.id.slice(0, 4)}</div>
                                                </div>
                                                {getStatusBadge(order.status)}
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                                                        <span>{item.quantity}x {translateDb(item.name, lang)}</span>
                                                        <span>₺{item.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex justify-between font-bold">
                                                <span>{t.orderTotal}</span>
                                                <span>₺{order.total_price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-12 pb-8 text-center opacity-40 flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] font-medium tracking-widest uppercase">{t.poweredBy}</span>
                    <span className="text-xs font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-500" /> SmartKafe
                    </span>
                </div>
            </main>

            {/* Bottom Navigation Dock */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1.5 rounded-full glass-dock shadow-2xl shadow-black/50 border border-white/10">
                <button
                    onClick={() => setActiveTab('menu')}
                    className={cn(
                        "relative px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300",
                        activeTab === 'menu' ? "bg-white text-black" : "hover:bg-white/5 text-muted-foreground"
                    )}
                >
                    <Home className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{t.menu}</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                    onClick={() => setActiveTab('cart')}
                    className={cn(
                        "relative px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300",
                        activeTab === 'cart' ? "bg-white text-black" : "hover:bg-white/5 text-muted-foreground"
                    )}
                >
                    <div className="relative">
                        <ShoppingBag className="w-5 h-5" />
                        {items.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />}
                    </div>
                    <span className="text-[10px] font-bold">{t.cart}</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                    onClick={() => setActiveTab('orders')}
                    className={cn(
                        "relative px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300",
                        activeTab === 'orders' ? "bg-white text-black" : "hover:bg-white/5 text-muted-foreground"
                    )}
                >
                    <Clock className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{t.orders}</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                    onClick={() => handleCallWaiter('bill')}
                    className="relative px-6 py-3 rounded-full flex flex-col items-center gap-1 hover:bg-white/5 text-muted-foreground transition-all"
                >
                    <Receipt className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{t.bill}</span>
                </button>
            </nav >

            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-400" /> {t.paymentTitle}</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={() => setShowPaymentModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">{t.cardNumber}</label>
                                    <Input placeholder="**** **** **** ****" className="bg-black/50 border-white/10 h-12" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">{t.expiry}</label>
                                        <Input placeholder="AA/YY" className="bg-black/50 border-white/10 h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">{t.cvv}</label>
                                        <Input type="password" placeholder="***" className="bg-black/50 border-white/10 h-12" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 mt-6">
                                    <Button className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl" disabled={isProcessingPayment} onClick={simulatePayment}>
                                        {isProcessingPayment ? "İşleniyor..." : `${t.pay} (₺${total()})`}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    )
}
