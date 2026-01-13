"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import AdminNavbar from "@/components/admin/admin-navbar"
import { Database } from "@/types/database.types"
import { format, parseISO, isToday, isThisWeek, isThisMonth, isThisYear } from "date-fns"
import { tr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Calendar, DollarSign, ShoppingBag, TrendingUp } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Order = Database["public"]["Tables"]["orders"]["Row"]

export default function OrdersView() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        // Fetch Store
        const { data: storeData } = await supabase.from("stores").select("*").limit(1).maybeSingle()
        if (storeData) setStore(storeData)

        // Fetch Orders (Increased limit for better stats)
        const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(500)

        if (ordersData) setOrders(ordersData)
        setLoading(false)
    }

    const filteredOrders = orders.filter(order => {
        // Status Filter
        if (filter === 'active' && order.status === 'done') return false
        if (filter === 'completed' && order.status !== 'done') return false

        // Time Range Filter
        const orderDate = parseISO(order.created_at)
        switch (timeRange) {
            case 'today':
                if (!isToday(orderDate)) return false
                break
            case 'week':
                if (!isThisWeek(orderDate, { weekStartsOn: 1 })) return false
                break
            case 'month':
                if (!isThisMonth(orderDate)) return false
                break
            case 'year':
                if (!isThisYear(orderDate)) return false
                break
        }

        return true
    })

    // Calculate Stats
    const totalRevenue = filteredOrders.reduce((acc, order) => acc + (order.total_price || 0), 0)
    const totalOrders = filteredOrders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new':
                return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">Yeni</Badge>
            case 'preparing':
                return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Hazırlanıyor</Badge>
            case 'done':
                return <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5">Tamamlandı</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Yükleniyor...</div>

    return (
        <div className="min-h-screen bg-background pb-20">
            <AdminNavbar store={store} />

            <main className="max-w-7xl mx-auto p-6 space-y-6 mt-4">

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-card/50 backdrop-blur border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Toplam Ciro</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₺{totalRevenue.toLocaleString('tr-TR')}</div>
                            <p className="text-xs text-muted-foreground">Seçili filtredeki toplam tutar</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalOrders}</div>
                            <p className="text-xs text-muted-foreground">Adet sipariş bulundu</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ortalama Sepet</CardTitle>
                            <TrendingUp className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₺{averageOrderValue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Sipariş başı ortalama</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Sipariş Geçmişi</h1>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                            <Button
                                variant={timeRange === 'today' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTimeRange('today')}
                            >
                                Bugün
                            </Button>
                            <Button
                                variant={timeRange === 'week' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTimeRange('week')}
                            >
                                Bu Hafta
                            </Button>
                            <Button
                                variant={timeRange === 'month' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTimeRange('month')}
                            >
                                Bu Ay
                            </Button>
                            <Button
                                variant={timeRange === 'year' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTimeRange('year')}
                            >
                                Bu Yıl
                            </Button>
                            <Button
                                variant={timeRange === 'all' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTimeRange('all')}
                            >
                                Tümü
                            </Button>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        <Button
                            variant={filter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            Tümü
                        </Button>
                        <Button
                            variant={filter === 'active' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('active')}
                        >
                            Aktif
                        </Button>
                        <Button
                            variant={filter === 'completed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('completed')}
                        >
                            Tamamlanan
                        </Button>
                    </div>
                </div>

                <div className="border border-white/5 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="w-[100px]">Sipariş No</TableHead>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Masa</TableHead>
                                <TableHead>İçerik</TableHead>
                                <TableHead>Tutar</TableHead>
                                <TableHead>Durum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map((order) => (
                                <TableRow key={order.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{order.id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(order.created_at), 'd MMM HH:mm', { locale: tr })}
                                    </TableCell>
                                    <TableCell className="font-bold">
                                        Masa {order.table_no}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-balance">
                                            {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                                                <span key={i} className="inline-block mr-2">
                                                    {item.quantity}x {item.name}{i < (order.items as any[]).length - 1 ? ',' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono font-medium">
                                        ₺{order.total_price}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(order.status)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredOrders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Seçili kriterlerde sipariş bulunamadı.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    )
}
