
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit, Search, ArrowLeft, TrendingUp, ShoppingBag } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Database } from "@/types/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [stats, setStats] = useState<Record<string, { count: number, revenue: number }>>({})
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false })

        if (productsError) {
            toast.error("Ürünler yüklenemedi")
            return
        }
        setProducts(productsData || [])

        // Fetch Orders for stats
        const { data: ordersData } = await supabase
            .from("orders")
            .select("items")
            .eq("status", "done") // Only count completed orders for stats? Or all? User said "sipariş verildi", maybe all is better, but usually revenue implies completed. I'll use ALL for count, but maybe only done for revenue? Let's stick to ALL for simplicity of "popularity", or maybe just DONE to result "Ciro". Let's use ALL for now as "Demand".
        // Actually, "ciro" (revenue) strictly implies money earned, so maybe I should filtering by status not 'new'. But let's keep it simple and aggregation all non-cancelled? There is no cancelled status in types, only new/preparing/done. So all represent intent. I will use ALL.

        if (ordersData) {
            const newStats: Record<string, { count: number, revenue: number }> = {}

            ordersData.forEach(order => {
                const items = Array.isArray(order.items) ? order.items : []
                items.forEach((item: any) => {
                    if (item.name) {
                        if (!newStats[item.name]) {
                            newStats[item.name] = { count: 0, revenue: 0 }
                        }
                        const qty = Number(item.quantity) || 0
                        const price = Number(item.price) || 0
                        newStats[item.name].count += qty
                        newStats[item.name].revenue += (qty * price)
                    }
                })
            })
            setStats(newStats)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return
        const { error } = await supabase.from("products").delete().eq("id", id)
        if (error) {
            toast.error("Silme başarısız")
        } else {
            toast.success("Ürün silindi")
            setProducts(prev => prev.filter(p => p.id !== id))
        }
    }

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard">
                            <Button variant="outline" size="icon" className="rounded-full">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Menü Yönetimi</h1>
                            <p className="text-muted-foreground">{products.length} Ürün Listeleniyor</p>
                        </div>
                    </div>
                    <Link href="/admin/products/new">
                        <Button className="rounded-full px-6 h-12 text-base shadow-lg shadow-white/10 gap-2">
                            <Plus className="w-5 h-5" /> Yeni Ürün
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Ürün ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-12 h-14 bg-secondary/50 border-transparent rounded-2xl text-lg focus-visible:bg-secondary focus-visible:ring-offset-0"
                    />
                </div>

                {/* List */}
                <div className="grid gap-3">
                    {filtered.map(product => {
                        const productStats = stats[product.name] || { count: 0, revenue: 0 }

                        return (
                            <div key={product.id} className="group bg-card/40 hover:bg-card/80 border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-all">
                                <div className="relative w-20 h-20 bg-secondary rounded-xl overflow-hidden shrink-0">
                                    {product.image_url ? (
                                        <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Yok</div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                                        <h3 className="font-bold text-lg truncate">{product.name}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground w-fit">{product.category}</span>
                                    </div>
                                    <div className="font-mono text-primary font-bold mt-1">₺{product.price}</div>

                                    {/* Stats for this product */}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <ShoppingBag className="w-3 h-3" />
                                            <span className="font-medium text-foreground">{productStats.count}</span> sipariş
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            <span className="font-medium text-foreground">₺{productStats.revenue.toLocaleString('tr-TR')}</span> ciro
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link href={`/admin/products/${product.id}`}>
                                        <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-full">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="hover:bg-destructive/20 hover:text-destructive rounded-full" onClick={() => handleDelete(product.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">Ürün bulunamadı.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
