
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag, Bell, Search, Utensils, Home, Clock, CheckCircle, Receipt } from "lucide-react"
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


export default function MenuClient({ store, products }: MenuClientProps) {
    const searchParams = useSearchParams()
    const tableNo = searchParams.get("table")
    const { items, addItem, removeItem, clearCart, total } = useCart()
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders'>('menu')
    const [isCallingWaiter, setIsCallingWaiter] = useState(false)
    const [activeCategory, setActiveCategory] = useState<string>("All")
    const [searchQuery, setSearchQuery] = useState("")
    const [myOrders, setMyOrders] = useState<CustomerOrder[]>([])

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
                    fetchOrders() // Refresh to get full data safely
                    toast.success("Siparişiniz alındı!")
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
            toast.error("Masa numarası bulunamadı. Lütfen QR kodu tekrar taratın.")
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
            toast.success(type === 'bill' ? "Hesap istendi." : "Garson çağrıldı.")
        } catch (error) {
            console.error(error)
            toast.error("Bir hata oluştu.")
        } finally {
            setIsCallingWaiter(false)
        }
    }

    const handlePlaceOrder = async () => {
        if (!tableNo) {
            toast.error("Masa numarası bulunamadı.")
            return
        }
        try {
            const orderData = {
                store_id: store.id,
                table_no: tableNo,
                total_price: total(),
                status: 'new' as const,
                items: JSON.parse(JSON.stringify(items))
            }
            const { error } = await supabase.from("orders").insert(orderData)
            if (error) throw error

            // Immediate refresh
            await fetchOrders()

            toast.success("Siparişiniz alındı!")
            clearCart()
            setActiveTab('orders') // Switch to orders tab
        } catch (error) {
            console.error(error)
            toast.error("Hata oluştu.")
        }
    }

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
                    <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50" onClick={() => handleCallWaiter('waiter')}>
                        <Bell className="w-5 h-5" />
                    </Button>
                </div>

                {activeTab === 'menu' && (
                    <div className="px-4 pb-4 max-w-md mx-auto space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Ne yemek istersin?"
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
                                    {cat}
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
                                                toast("Sepete eklendi", {
                                                    description: product.name,
                                                    action: { label: "Geri Al", onClick: () => removeItem(product.id) }
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
                                            <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
                                            <span className="font-bold">₺{product.price}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 opacity-70">{product.description}</p>
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
                                <h2 className="text-2xl font-bold">Sepetim</h2>
                                <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:bg-destructive/10">Temizle</Button>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Sepetiniz boş.</p>
                                    <Button variant="link" onClick={() => setActiveTab('menu')}>Menüye Dön</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {items.map(item => (
                                            <div key={item.id} className="flex gap-4 items-center bg-card/50 p-4 rounded-xl border border-white/5">
                                                <div className="flex-1">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-sm text-muted-foreground">₺{item.price} x {item.quantity}</div>
                                                </div>
                                                <div className="font-bold text-lg">₺{item.price * item.quantity}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 p-6 bg-secondary/30 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Toplam Tutar</span>
                                            <span>₺{total()}</span>
                                        </div>
                                        <Button size="lg" className="w-full text-lg font-bold py-6 rounded-xl shadow-lg shadow-white/5" onClick={handlePlaceOrder}>
                                            Siparişi Onayla
                                        </Button>
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
                            <h2 className="text-2xl font-bold mb-6">Siparişlerim</h2>
                            {myOrders.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Henüz siparişiniz yok.</p>
                                    <Button variant="link" onClick={() => setActiveTab('menu')}>Menüye Göz At</Button>
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
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span>₺{item.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex justify-between font-bold">
                                                <span>Toplam</span>
                                                <span>₺{order.total_price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
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
                    <span className="text-[10px] font-bold">Menü</span>
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
                    <span className="text-[10px] font-bold">Sepet</span>
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
                    <span className="text-[10px] font-bold">Sipariş</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                    onClick={() => handleCallWaiter('bill')}
                    className="relative px-6 py-3 rounded-full flex flex-col items-center gap-1 hover:bg-white/5 text-muted-foreground transition-all"
                >
                    <Receipt className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Hesap</span>
                </button>
            </nav >
        </div >
    )
}
