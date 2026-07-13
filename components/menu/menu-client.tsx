"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag, Bell, Search, Utensils, Home, Clock, Receipt, Trash2, Globe, Sparkles, CreditCard, X, Users, CheckSquare, Plus, Minus, MapPin, Navigation } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useCart } from "@/hooks/use-cart"
import { supabase } from "@/lib/supabase"
import { isPointInPolygon } from "@/lib/geo"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ProductOption {
    id: string
    name: string
    price_modifier: number
    is_available: boolean
}

interface ProductOptionGroup {
    id: string
    name: string
    is_required: boolean
    min_select: number
    max_select: number
    product_options: ProductOption[]
}

interface Product {
    id: string
    name: string
    price: number
    description: string | null
    image_url: string | null
    category: string
    calories: number | null
    allergens: string[] | null
    product_option_groups: ProductOptionGroup[]
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

interface OrderItem {
    cartKey: string
    id: string
    name: string
    quantity: number
    price: number
    selectedOptions?: { name: string, price: number }[]
}

interface CustomerOrder {
    id: string
    status: 'new' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled' | 'paid'
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
        confirmOrder: "Siparişi Onayla",
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
        orderSuccess: "Siparişiniz başarıyla alındı!",
        paymentSuccess: "Ödeme alındı, sipariş oluşturuldu!",
        statusPreparing: "Hazırlanıyor",
        statusDone: "Tamamlandı",
        statusUnknown: "Bilinmiyor",
        callWaiterSuccess: "Garson çağrıldı.",
        callBillSuccess: "Hesap istendi.",
        error: "Bir hata oluştu.",
        add: "Ekle",
        poweredBy: "SmartKafe Altyapısı ile Hazırlanmıştır",
        required: "Zorunlu",
        selectMinMax: "En az {min}, en fazla {max} seçim yapın.",
        selectOption: "Seçenekleri Belirleyin",
        addToCartPrice: "Sepete Ekle - ₺{price}",
        splitBill: "Hesabı Bölüş",
        splitHeadcount: "Kişi Sayısına Göre Bölüş",
        splitItems: "Ürün Seçerek Öde",
        splitHeadcountDesc: "Toplam tutarı masadaki kişi sayısına bölün.",
        splitItemsDesc: "Sadece kendi yediğiniz ürünleri adisyondan seçip ödeyin.",
        payMyShare: "Kendi Payımı Öde (₺{amount})",
        paySelectedItems: "Seçilenleri Öde (₺{amount})"
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
        confirmOrder: "Place Order",
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
        poweredBy: "Powered by SmartKafe",
        required: "Required",
        selectMinMax: "Select min {min}, max {max} choices.",
        selectOption: "Customize Product",
        addToCartPrice: "Add to Cart - ₺{price}",
        splitBill: "Split Bill",
        splitHeadcount: "Split by Headcount",
        splitItems: "Split by Items",
        splitHeadcountDesc: "Divide total table bill by headcount.",
        splitItemsDesc: "Select and pay only the items you consumed.",
        payMyShare: "Pay My Share (₺{amount})",
        paySelectedItems: "Pay Selected (₺{amount})"
    }
}

const ALLERGEN_MAP: Record<string, string> = {
    dairy: "🥛 Süt",
    gluten: "🌾 Gluten",
    nuts: "🥜 Kuruyemiş",
    soy: "🫘 Soya",
    eggs: "🥚 Yumurta",
    fish: "🐟 Balık",
    peanuts: "🥜 Fıstık",
    sesame: "🌱 Susam"
}

// Kadıköy Center Polygon Zone representation
const DEFAULT_DELIVERY_ZONE_POLY: [number, number][] = [
    [40.970, 29.020],
    [40.995, 29.015],
    [40.998, 29.040],
    [40.972, 29.055]
]

// Neighborhood Suggestions simulator
const SIMULATED_ADDRESSES = [
    { name: "Caferağa Mh. Moda Cd. No:12, Kadıköy, İstanbul", coords: [40.9856, 29.0264] as [number, number], min: 120, fee: 0, time: 25 },
    { name: "Fenerbahçe Mh. Bağdat Cd. No:110, Kadıköy, İstanbul", coords: [40.9734, 29.0489] as [number, number], min: 150, fee: 20, time: 35 },
    { name: "Osmanağa Mh. Söğütlüçeşme Cd. No:44, Kadıköy, İstanbul", coords: [40.9912, 29.0287] as [number, number], min: 100, fee: 15, time: 30 },
    { name: "Acıbadem Mh. Acıbadem Cd. No:200, Üsküdar, İstanbul", coords: [41.0085, 29.0433] as [number, number], min: 300, fee: 50, time: 50 },
    { name: "Bebek Mh. Cevdet Paşa Cd. No:80, Beşiktaş, İstanbul", coords: [41.0772, 29.0436] as [number, number], min: 500, fee: 100, time: 60 }
]

export default function MenuClient({ store, products, initialTableNo }: MenuClientProps) {
    const tableNo = initialTableNo
    const { items, addItem, removeItem, clearCart, total } = useCart()
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders'>('menu')
    const [isCallingWaiter, setIsCallingWaiter] = useState(false)
    const [activeCategory, setActiveCategory] = useState<string>("All")
    const [searchQuery, setSearchQuery] = useState("")
    const [myOrders, setMyOrders] = useState<CustomerOrder[]>([])
    
    // Lang state
    const [lang, setLang] = useState<'tr' | 'en'>('tr')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)

    // Option Modal States
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [showOptionsModal, setShowOptionsModal] = useState(false)
    const [selections, setSelections] = useState<Record<string, { id: string, name: string, price: number }[]>>({})

    // Split Bill States
    const [showSplitModal, setShowSplitModal] = useState(false)
    const [splitType, setSplitType] = useState<'headcount' | 'items' | null>(null)
    const [headcount, setHeadcount] = useState(2)
    const [selectedSplitItems, setSelectedSplitItems] = useState<Record<string, number>>({})
    const [paymentPurpose, setPaymentPurpose] = useState<{ 
        type: 'order' | 'headcount' | 'items', 
        amount: number, 
        selectedItems?: Record<string, number>,
        orderType?: 'table' | 'takeaway' | 'delivery',
        checkoutData?: any
    } | null>(null)

    // Checkout Details
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [orderType, setOrderType] = useState<'table' | 'takeaway' | 'delivery'>(tableNo ? 'table' : 'delivery')
    const [customerName, setCustomerName] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [deliveryAddress, setDeliveryAddress] = useState("")
    const [deliveryNotes, setDeliveryNotes] = useState("")
    const [addressQuery, setAddressQuery] = useState("")
    const [selectedAddressCoords, setSelectedAddressCoords] = useState<[number, number] | null>(null)
    const [deliveryZoneInfo, setDeliveryZoneInfo] = useState<{ min: number, fee: number, time: number } | null>(null)
    const [addressValid, setAddressValid] = useState<boolean | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<'cash_table' | 'card_table' | 'cash_delivery' | 'card_delivery' | 'online_pay'>('online_pay')

    const t = TRANSLATIONS[lang]

    // Categories
    const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))]

    // Filtering
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
            .neq("status", "paid")
            .order("created_at", { ascending: false })

        if (data) setMyOrders(data as unknown as CustomerOrder[])
    }, [tableNo, store.id])

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
                            if (prev.some(o => o.id === newOrder.id)) return prev
                            return [newOrder, ...prev]
                        })
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `table_no=eq.${tableNo}` },
                (payload) => {
                    const updatedOrder = payload.new as CustomerOrder
                    if (updatedOrder.status === 'paid') {
                        setMyOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
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

    const handlePlaceOrder = async (
        isPaidOnline = false, 
        overrideMethod?: any, 
        overrideType?: any, 
        checkoutData?: any
    ) => {
        try {
            const targetType = overrideType || (tableNo ? 'table' : 'takeaway')
            const finalMethod = overrideMethod || (isPaidOnline ? 'online_pay' : 'cash_table')
            
            const deliveryFee = targetType === 'delivery' && deliveryZoneInfo ? deliveryZoneInfo.fee : 0
            const orderTotal = total() + deliveryFee

            const orderData = {
                store_id: store.id,
                table_no: targetType === 'table' ? tableNo : null,
                type: targetType,
                total_price: orderTotal,
                status: isPaidOnline ? 'paid' : 'new',
                customer_name: checkoutData?.name || customerName || `Masa ${tableNo}`,
                customer_phone: checkoutData?.phone || customerPhone || "QR Sipariş",
                payment_method: finalMethod,
                payment_status: isPaidOnline ? 'paid' : 'pending',
                delivery_address: targetType === 'delivery' ? (checkoutData?.address || deliveryAddress) : null,
                delivery_notes: targetType === 'delivery' ? (checkoutData?.notes || deliveryNotes) : null,
                delivery_coordinates: targetType === 'delivery' && selectedAddressCoords ? { lat: selectedAddressCoords[0], lng: selectedAddressCoords[1] } : null,
                items: JSON.parse(JSON.stringify(items))
            }

            const { data, error } = await supabase
                .from("orders")
                .insert(orderData)
                .select()
                .single()

            if (error) throw error

            if (data) {
                if (!isPaidOnline && targetType === 'table') {
                    const newOrder = data as unknown as CustomerOrder
                    setMyOrders(prev => [newOrder, ...prev])
                }
                toast.success(isPaidOnline ? t.paymentSuccess : t.orderSuccess)
                clearCart()
                setShowPaymentModal(false)
                setShowCheckoutModal(false)
                
                // Clear fields
                setCustomerName("")
                setCustomerPhone("")
                setDeliveryAddress("")
                setDeliveryNotes("")
                setAddressQuery("")
                setSelectedAddressCoords(null)
                setDeliveryZoneInfo(null)
                setAddressValid(null)

                if (targetType === 'table') setActiveTab('orders')
                else toast.info(lang === 'tr' ? "Siparişinizi 'Siparişlerim' sekmesinden takip edebilirsiniz." : "You can track your order in the 'Orders' tab.")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(t.error)
        }
    }

    const simulatePayment = async () => {
        setIsProcessingPayment(true)
        setTimeout(async () => {
            if (!paymentPurpose) return

            try {
                if (paymentPurpose.type === 'order') {
                    await handlePlaceOrder(true, 'online_pay', paymentPurpose.orderType, paymentPurpose.checkoutData)
                } else if (paymentPurpose.type === 'headcount') {
                    // Headcount Split
                    let remainingPayment = paymentPurpose.amount
                    for (const order of myOrders) {
                        if (remainingPayment <= 0) break
                        const orderTotal = Number(order.total_price)
                        if (orderTotal <= remainingPayment) {
                            remainingPayment -= orderTotal
                            await supabase.from("orders").update({ status: 'paid', total_price: 0 }).eq("id", order.id)
                        } else {
                            const newPrice = orderTotal - remainingPayment
                            remainingPayment = 0
                            await supabase.from("orders").update({ total_price: parseFloat(newPrice.toFixed(2)) }).eq("id", order.id)
                        }
                    }
                    toast.success(lang === 'tr' ? "Payınız başarıyla ödendi!" : "Your share has been successfully paid!")
                    fetchOrders()
                } else if (paymentPurpose.type === 'items') {
                    // Items Split
                    const remainingItemsToDeduct = { ...paymentPurpose.selectedItems }
                    for (const order of myOrders) {
                        let orderChanged = false
                        const updatedItems = (order.items as any[]).map(item => {
                            const qtyToDeduct = remainingItemsToDeduct[item.cartKey] || 0
                            if (qtyToDeduct > 0) {
                                const deduct = Math.min(qtyToDeduct, item.quantity)
                                remainingItemsToDeduct[item.cartKey] -= deduct
                                item.quantity -= deduct
                                orderChanged = true
                            }
                            return item
                        }).filter(item => item.quantity > 0)

                        if (orderChanged) {
                            const newTotal = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                            if (updatedItems.length === 0) {
                                await supabase.from("orders").update({ status: 'paid', items: [], total_price: 0 }).eq("id", order.id)
                            } else {
                                await supabase.from("orders").update({ items: updatedItems, total_price: parseFloat(newTotal.toFixed(2)) }).eq("id", order.id)
                            }
                        }
                    }
                    toast.success(lang === 'tr' ? "Seçilen ürünler başarıyla ödendi!" : "Selected items have been successfully paid!")
                    fetchOrders()
                }
            } catch (error) {
                console.error("Payment Sync Error:", error)
                toast.error(t.error)
            } finally {
                setIsProcessingPayment(false)
                setShowPaymentModal(false)
                setShowSplitModal(false)
                setSplitType(null)
                setSelectedSplitItems({})
            }
        }, 2000)
    }

    // Add item helper
    const handleProductAddClick = (product: Product) => {
        const hasOptions = product.product_option_groups && product.product_option_groups.length > 0
        if (hasOptions) {
            setSelectedProduct(product)
            setSelections({})
            setShowOptionsModal(true)
        } else {
            const cartKey = `${product.id}`
            addItem({
                cartKey,
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                category: product.category
            })
            toast.success(`${product.name} ${t.addedToCart}`)
        }
    }

    // Toggle options in modal
    const handleOptionToggle = (groupId: string, option: ProductOption, isRequired: boolean, min: number, max: number) => {
        const currentGroupSelections = selections[groupId] || []
        const isSelected = currentGroupSelections.some(s => s.id === option.id)

        let newSelections = [...currentGroupSelections]

        if (isSelected) {
            newSelections = newSelections.filter(s => s.id !== option.id)
        } else {
            if (max === 1) {
                newSelections = [{ id: option.id, name: option.name, price: option.price_modifier }]
            } else {
                if (newSelections.length < max) {
                    newSelections.push({ id: option.id, name: option.name, price: option.price_modifier })
                } else {
                    toast.info(lang === 'tr' 
                        ? `En fazla ${max} adet seçim yapabilirsiniz.` 
                        : `You can select a maximum of ${max} options.`
                    )
                    return
                }
            }
        }

        setSelections({
            ...selections,
            [groupId]: newSelections
        })
    }

    // Validate options
    const isSelectionValid = () => {
        if (!selectedProduct) return false
        for (const group of selectedProduct.product_option_groups) {
            const numSelected = (selections[group.id] || []).length
            if (group.is_required && (numSelected < group.min_select || numSelected > group.max_select)) {
                return false
            }
        }
        return true
    }

    const getModalUnitPrice = () => {
        if (!selectedProduct) return 0
        let total = selectedProduct.price
        Object.values(selections).forEach(opts => {
            opts.forEach(o => {
                total += o.price
            })
        })
        return total
    }

    const addCustomProductToCart = () => {
        if (!selectedProduct) return

        const selectedOptionsList: { name: string, price: number }[] = []
        Object.values(selections).forEach(opts => {
            opts.forEach(o => {
                selectedOptionsList.push({ name: o.name, price: o.price })
            })
        })

        const sortedOptions = [...selectedOptionsList].sort((a, b) => a.name.localeCompare(b.name))
        const cartKeyOptionsStr = sortedOptions.map(o => o.name).join(",")
        const cartKey = cartKeyOptionsStr ? `${selectedProduct.id}-${cartKeyOptionsStr}` : `${selectedProduct.id}`

        addItem({
            cartKey,
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: getModalUnitPrice(),
            quantity: 1,
            category: selectedProduct.category,
            selectedOptions: selectedOptionsList
        })

        toast.success(`${selectedProduct.name} ${t.addedToCart}`)
        setShowOptionsModal(false)
        setSelectedProduct(null)
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
            case 'new': return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Yeni Sipariş</Badge>
            case 'preparing': return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 animate-pulse">Hazırlanıyor</Badge>
            case 'ready': return <Badge variant="secondary" className="bg-purple-500/20 text-purple-500 hover:bg-purple-500/30">Hazır</Badge>
            case 'on_the_way': return <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30 animate-pulse">Kuryede / Yolda</Badge>
            case 'delivered': return <Badge variant="secondary" className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Teslim Edildi</Badge>
            default: return <Badge variant="outline">Bilinmiyor</Badge>
        }
    }

    const getActiveBillItems = () => {
        const activeItemsMap: Record<string, { id: string, name: string, price: number, quantity: number, cartKey: string }> = {}
        myOrders.forEach(order => {
            const orderItems = Array.isArray(order.items) ? order.items : []
            orderItems.forEach((item: any) => {
                const key = item.cartKey
                if (activeItemsMap[key]) {
                    activeItemsMap[key].quantity += item.quantity
                } else {
                    activeItemsMap[key] = {
                        cartKey: key,
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    }
                }
            })
        })
        return Object.values(activeItemsMap)
    }

    const tableBillTotal = myOrders.reduce((acc, o) => acc + Number(o.total_price), 0)

    const getSelectedSplitTotal = () => {
        const billItems = getActiveBillItems()
        return billItems.reduce((acc, item) => {
            const qty = selectedSplitItems[item.cartKey] || 0
            return acc + (item.price * qty)
        }, 0)
    }

    const handleSplitQtyChange = (cartKey: string, delta: number, maxQty: number) => {
        const currentQty = selectedSplitItems[cartKey] || 0
        const newQty = Math.max(0, Math.min(maxQty, currentQty + delta))
        setSelectedSplitItems({
            ...selectedSplitItems,
            [cartKey]: newQty
        })
    }

    // Address verification helper
    const checkAddressContainment = async (coords: [number, number], addrInfo: any) => {
        setSelectedAddressCoords(coords)
        setDeliveryAddress(addrInfo.name)
        
        // 1. Fetch store's delivery zones from DB
        const { data: dbZones } = await supabase
            .from("delivery_zones")
            .select("*")
            .eq("store_id", store.id)

        let matchingZone = null

        if (dbZones && dbZones.length > 0) {
            for (const zone of dbZones) {
                const polyCoords = Array.isArray(zone.coordinates) ? zone.coordinates : []
                if (isPointInPolygon(coords, polyCoords as [number, number][])) {
                    matchingZone = zone
                    break
                }
            }
        } else {
            // Fallback: Check default polygon for simulator
            if (isPointInPolygon(coords, DEFAULT_DELIVERY_ZONE_POLY)) {
                matchingZone = { min_order_price: addrInfo.min, delivery_fee: addrInfo.fee, estimated_minutes: addrInfo.time }
            }
        }

        if (matchingZone) {
            setDeliveryZoneInfo({
                min: Number(matchingZone.min_order_price),
                fee: Number(matchingZone.delivery_fee),
                time: Number(matchingZone.estimated_minutes)
            })
            setAddressValid(true)
            toast.success(lang === 'tr' ? "Adres teslimat bölgesi içerisinde!" : "Address is inside our delivery zone!")
        } else {
            setDeliveryZoneInfo(null)
            setAddressValid(false)
            toast.error(lang === 'tr' ? "Bu adres teslimat bölgesi dışındadır." : "Address is outside our delivery zone.")
        }
    }

    // Filter address queries
    const getAddressSuggestions = () => {
        if (!addressQuery) return []
        return SIMULATED_ADDRESSES.filter(addr => 
            addr.name.toLowerCase().includes(addressQuery.toLowerCase())
        )
    }

    const suggestions = getAddressSuggestions()

    const deliveryFee = orderType === 'delivery' && deliveryZoneInfo ? deliveryZoneInfo.fee : 0
    const finalTotal = total() + deliveryFee

    const canSubmitCheckout = () => {
        if (!customerName || !customerPhone) return false
        if (orderType === 'delivery') {
            if (!addressValid || !selectedAddressCoords || !deliveryZoneInfo) return false
            if (total() < deliveryZoneInfo.min) return false
        }
        return true
    }

    const handleCheckoutSubmit = () => {
        const checkoutData = {
            name: customerName,
            phone: customerPhone,
            address: orderType === 'delivery' ? deliveryAddress : null,
            notes: orderType === 'delivery' ? deliveryNotes : null
        }

        if (paymentMethod === 'online_pay') {
            setPaymentPurpose({
                type: 'order',
                amount: finalTotal,
                orderType: orderType,
                checkoutData: checkoutData
            })
            setShowPaymentModal(true)
        } else {
            handlePlaceOrder(false, paymentMethod, orderType, checkoutData)
        }
    }

    return (
        <div className="pb-28 min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-20 glass-dock backdrop-blur-xl border-b border-white/5 bg-background/85">
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
                        {tableNo && (
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-secondary/50" onClick={() => handleCallWaiter('waiter')}>
                                <Bell className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {activeTab === 'menu' && (
                    <div className="px-4 pb-4 max-w-md mx-auto space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t.searchMenu}
                                className="pl-9 bg-secondary/50 border-transparent rounded-xl h-11 focus-visible:ring-offset-0 focus-visible:bg-secondary text-white"
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
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                                        activeCategory === cat
                                            ? "bg-white text-black shadow-lg scale-105 font-bold"
                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    )}
                                >
                                    {cat === 'All' ? t.all : cat}
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

                                        {/* Calories Badge Overlay */}
                                        {product.calories && (
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                                🔥 {product.calories} kcal
                                            </div>
                                        )}

                                        {/* Add Button Overlay */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleProductAddClick(product)
                                            }}
                                            className="absolute bottom-3 right-3 w-10 h-10 bg-white/95 backdrop-blur text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                        >
                                            <span className="text-xl font-bold">+</span>
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-base leading-tight text-white">{product.name}</h3>
                                            <span className="font-bold text-white shrink-0 ml-1">₺{product.price}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 opacity-70">{product.description}</p>
                                        
                                        {/* Allergens badges list */}
                                        {product.allergens && product.allergens.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5 pt-1">
                                                {product.allergens.map(a => (
                                                    <span key={a} className="text-[9px] bg-red-950/20 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">
                                                        {ALLERGEN_MAP[a] || a}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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
                            className="space-y-6"
                        >
                            {/* Outstanding Active Table Orders */}
                            {tableNo && myOrders.length > 0 && (
                                <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-950/5 space-y-4 shadow-xl">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-1.5">
                                                <span>📍 Masa {tableNo} Aktif Adisyon</span>
                                            </h3>
                                            <p className="text-[11px] text-zinc-400">Masaya servis edilmiş, ödeme bekleyen tutar.</p>
                                        </div>
                                        <Badge variant="outline" className="bg-zinc-950 border-white/10 text-blue-400 font-bold font-mono">
                                            ₺{tableBillTotal.toFixed(2)}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-white/10 hover:bg-white/5 font-semibold text-xs h-10"
                                            onClick={() => handleCallWaiter('bill')}
                                        >
                                            Hesap İste (Masada)
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 shadow-lg shadow-blue-500/10"
                                            onClick={() => {
                                                setSplitType(null)
                                                setSelectedSplitItems({})
                                                setShowSplitModal(true)
                                            }}
                                        >
                                            🍕 Hesabı Bölüşerek Öde
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Sipariş Sepetim</h2>
                                {items.length > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:bg-destructive/10 text-xs">
                                        {t.clear}
                                    </Button>
                                )}
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
                                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">{t.emptyCart}</p>
                                    <Button variant="link" onClick={() => setActiveTab('menu')} className="text-xs">{t.backToMenu}</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {items.map(item => (
                                            <div key={item.cartKey} className="flex gap-4 items-start bg-card/50 p-4 rounded-xl border border-white/5">
                                                <div className="flex-1 space-y-1">
                                                    <div className="font-semibold text-white">{item.name}</div>
                                                    
                                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                        <div className="text-[11px] text-zinc-400 space-y-0.5 pl-2 border-l border-white/10">
                                                            {item.selectedOptions.map((o, idx) => (
                                                                <div key={idx}>+ {o.name} {o.price > 0 && `(+₺${o.price})`}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="text-xs text-muted-foreground">₺{item.price} x {item.quantity}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-base text-white">₺{item.price * item.quantity}</div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                        onClick={() => removeItem(item.cartKey)}
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
                                                            <div className="font-medium text-sm leading-tight mb-1 text-white">{up.name}</div>
                                                            <div className="font-bold text-sm text-yellow-500">₺{up.price}</div>
                                                        </div>
                                                        <Button size="sm" className="w-full mt-3 h-8 text-xs bg-white text-black hover:bg-gray-200" onClick={() => handleProductAddClick(up)}>
                                                            {t.add}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-8 p-6 bg-secondary/30 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex justify-between text-lg font-bold text-white">
                                            <span>{t.total}</span>
                                            <span>₺{total()}</span>
                                        </div>
                                        <Button 
                                            size="lg" 
                                            className="w-full text-sm font-bold h-12 rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20" 
                                            onClick={() => setShowCheckoutModal(true)}
                                        >
                                            Siparişi Onayla & Ödeme Seç
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
                            <h2 className="text-2xl font-bold text-white mb-6">{t.myOrders}</h2>
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
                                                    <div className="font-bold text-white">Sipariş #{order.id.slice(0, 4)}</div>
                                                </div>
                                                {getStatusBadge(order.status)}
                                            </div>

                                            <div className="space-y-3 mb-4">
                                                {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => (
                                                    <div key={idx} className="text-sm text-muted-foreground flex flex-col gap-0.5">
                                                        <div className="flex justify-between text-white">
                                                            <span>{item.quantity}x {item.name}</span>
                                                            <span>₺{item.price * item.quantity}</span>
                                                        </div>
                                                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                            <div className="text-[11px] text-zinc-500 pl-3">
                                                                {item.selectedOptions.map((o: any, oi: number) => (
                                                                    <div key={oi}>+ {o.name}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex justify-between font-bold text-white">
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
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1.5 rounded-full glass-dock shadow-2xl shadow-black/50 border border-white/10 bg-background/90 backdrop-blur-md">
                <button
                    onClick={() => setActiveTab('menu')}
                    className={cn(
                        "relative px-6 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300",
                        activeTab === 'menu' ? "bg-white text-black" : "hover:bg-white/5 text-muted-foreground"
                    )}
                >
                    <Utensils className="w-5 h-5" />
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

                {tableNo && (
                    <>
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
                    </>
                )}
            </nav >

            {/* Product Options Modal */}
            <AnimatePresence>
                {showOptionsModal && selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4" onClick={() => setShowOptionsModal(false)}>
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="w-full max-w-md bg-[#0a0a0a] border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative max-h-[85vh] md:max-h-[90vh] overflow-y-auto flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl text-white">{selectedProduct.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>₺{selectedProduct.price}</span>
                                        {selectedProduct.calories && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-0.5 text-zinc-300">🔥 {selectedProduct.calories} kcal</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground" onClick={() => setShowOptionsModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {selectedProduct.description && (
                                <p className="text-xs text-muted-foreground mb-6 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                                    {selectedProduct.description}
                                </p>
                            )}

                            <div className="flex-1 space-y-6 overflow-y-auto mb-6 pr-1">
                                {selectedProduct.product_option_groups.map((group) => {
                                    const groupSelections = selections[group.id] || []
                                    return (
                                        <div key={group.id} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                                                    {group.name}
                                                    {group.is_required && (
                                                        <span className="text-[9px] bg-red-950/30 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full font-bold">
                                                            {t.required}
                                                        </span>
                                                    )}
                                                </h4>
                                                <span className="text-[10px] text-zinc-500 font-medium">
                                                    {group.max_select === 1 
                                                        ? (lang === 'tr' ? '1 Seçim yapın' : 'Select 1')
                                                        : (lang === 'tr' ? `En fazla ${group.max_select} seçim` : `Max ${group.max_select} selections`)
                                                    }
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                {group.product_options.map((opt) => {
                                                    const isChecked = groupSelections.some(s => s.id === opt.id)
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => handleOptionToggle(group.id, opt, group.is_required, group.min_select, group.max_select)}
                                                            className={cn(
                                                                "flex justify-between items-center px-4 py-3 rounded-xl text-left text-sm transition-all border",
                                                                isChecked
                                                                    ? "bg-green-950/10 border-green-500/20 text-white font-medium"
                                                                    : "bg-secondary/20 border-transparent text-muted-foreground hover:bg-secondary/40"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-4.5 h-4.5 border flex items-center justify-center transition-all",
                                                                    group.max_select === 1 ? "rounded-full" : "rounded",
                                                                    isChecked 
                                                                        ? "border-green-500 bg-green-600 text-black" 
                                                                        : "border-zinc-700 bg-zinc-950"
                                                                )}>
                                                                    {isChecked && <span className="text-[9px] font-black">✓</span>}
                                                                </div>
                                                                <span>{opt.name}</span>
                                                            </div>
                                                            {opt.price_modifier > 0 && (
                                                                <span className="font-semibold text-green-500 font-mono text-xs">+ ₺{opt.price_modifier}</span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="pt-4 border-t border-white/10 mt-auto">
                                <Button
                                    className={cn(
                                        "w-full h-12 font-bold rounded-xl text-sm transition-all duration-300",
                                        isSelectionValid() 
                                            ? "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-950/20" 
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    )}
                                    disabled={!isSelectionValid()}
                                    onClick={addCustomProductToCart}
                                >
                                    {isSelectionValid()
                                        ? t.addToCartPrice.replace("{price}", getModalUnitPrice().toString())
                                        : t.selectOption
                                    }
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Split Bill Modal */}
            <AnimatePresence>
                {showSplitModal && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4" onClick={() => setShowSplitModal(false)}>
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="w-full max-w-md bg-[#0a0a0a] border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2">🍕 {t.splitBill}</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowSplitModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {!splitType ? (
                                <div className="space-y-4 py-4">
                                    <button
                                        onClick={() => setSplitType('headcount')}
                                        className="w-full p-5 rounded-2xl border border-white/5 hover:border-blue-500/20 bg-secondary/10 hover:bg-secondary/20 transition-all text-left flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-zinc-100">{t.splitHeadcount}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{t.splitHeadcountDesc}</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setSplitType('items')}
                                        className="w-full p-5 rounded-2xl border border-white/5 hover:border-green-500/20 bg-secondary/10 hover:bg-secondary/20 transition-all text-left flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
                                            <CheckSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-zinc-100">{t.splitItems}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{t.splitItemsDesc}</p>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col justify-between space-y-6 overflow-y-auto">
                                    <Button variant="link" size="sm" onClick={() => setSplitType(null)} className="text-xs text-muted-foreground hover:text-white self-start px-0">
                                        ← Yöntem Değiştir
                                    </Button>

                                    {splitType === 'headcount' && (
                                        <div className="space-y-6">
                                            <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 rounded-2xl border border-white/5 gap-3">
                                                <span className="text-xs text-zinc-400">Kişi Başı Düşen Tutar</span>
                                                <span className="text-4xl font-black text-white">₺{(tableBillTotal / headcount).toFixed(2)}</span>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block text-center">Masadaki Kişi Sayısı</label>
                                                <div className="flex items-center justify-center gap-5">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full bg-zinc-950 border-white/10"
                                                        onClick={() => setHeadcount(Math.max(2, headcount - 1))}
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </Button>
                                                    <span className="text-2xl font-black font-mono w-8 text-center text-white">{headcount}</span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full bg-zinc-950 border-white/10"
                                                        onClick={() => setHeadcount(Math.min(10, headcount + 1))}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl mt-6"
                                                onClick={() => {
                                                    const share = parseFloat((tableBillTotal / headcount).toFixed(2))
                                                    setPaymentPurpose({ type: 'headcount', amount: share })
                                                    setShowPaymentModal(true)
                                                }}
                                            >
                                                {t.payMyShare.replace("{amount}", (tableBillTotal / headcount).toFixed(2))}
                                            </Button>
                                        </div>
                                    )}

                                    {splitType === 'items' && (
                                        <div className="space-y-6 flex-1 flex flex-col justify-between overflow-y-auto">
                                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[45vh] pr-1">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Kendi Ürünlerinizi Seçin</label>
                                                
                                                {getActiveBillItems().map((item) => {
                                                    const selectedQty = selectedSplitItems[item.cartKey] || 0
                                                    return (
                                                        <div key={item.cartKey} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 text-sm">
                                                            <div className="space-y-0.5">
                                                                <div className="font-bold text-zinc-200">{item.name}</div>
                                                                <div className="text-xs text-muted-foreground">₺{item.price} <span className="text-[10px] text-zinc-500">(Maks: {item.quantity})</span></div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-full hover:bg-white/5"
                                                                    onClick={() => handleSplitQtyChange(item.cartKey, -1, item.quantity)}
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <span className="font-bold font-mono text-white text-sm w-4 text-center">{selectedQty}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-full hover:bg-white/5"
                                                                    onClick={() => handleSplitQtyChange(item.cartKey, 1, item.quantity)}
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="pt-4 border-t border-white/10 mt-auto space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-xs text-muted-foreground">Seçilen Tutar:</span>
                                                    <span className="text-2xl font-black text-white">₺{getSelectedSplitTotal().toFixed(2)}</span>
                                                </div>
                                                <Button
                                                    disabled={getSelectedSplitTotal() === 0}
                                                    className={cn(
                                                        "w-full h-12 font-bold rounded-xl text-sm transition-all duration-300",
                                                        getSelectedSplitTotal() > 0 
                                                            ? "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-950/20" 
                                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                    )}
                                                    onClick={() => {
                                                        setPaymentPurpose({
                                                            type: 'items',
                                                            amount: getSelectedSplitTotal(),
                                                            selectedItems: selectedSplitItems
                                                        })
                                                        setShowPaymentModal(true)
                                                    }}
                                                >
                                                    {t.paySelectedItems.replace("{amount}", getSelectedSplitTotal().toFixed(2))}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Checkout Options Modal (Faz 4 Checkout) */}
            <AnimatePresence>
                {showCheckoutModal && (
                    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4" onClick={() => setShowCheckoutModal(false)}>
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="w-full max-w-md bg-[#0a0a0a] border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2">📦 Sipariş Onay Formu</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowCheckoutModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Order Type Tabs */}
                            <div className="grid grid-cols-3 gap-2 mb-6 bg-zinc-950 p-1 rounded-xl border border-white/5">
                                {tableNo && (
                                    <button 
                                        onClick={() => { setOrderType('table'); setPaymentMethod('cash_table') }}
                                        className={cn("py-2 text-xs font-bold rounded-lg transition-all", orderType === 'table' ? "bg-white text-black" : "text-muted-foreground")}
                                    >
                                        Masaya
                                    </button>
                                )}
                                <button 
                                    onClick={() => { setOrderType('takeaway'); setPaymentMethod('cash_table') }}
                                    className={cn("py-2 text-xs font-bold rounded-lg transition-all", orderType === 'takeaway' ? "bg-white text-black" : "text-muted-foreground")}
                                >
                                    Gel Al (Paket)
                                </button>
                                <button 
                                    onClick={() => { setOrderType('delivery'); setPaymentMethod('online_pay') }}
                                    className={cn("py-2 text-xs font-bold rounded-lg transition-all", orderType === 'delivery' ? "bg-white text-black" : "text-muted-foreground")}
                                >
                                    Adrese Teslim
                                </button>
                            </div>

                            {/* Checkout Form fields */}
                            <div className="space-y-4 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">İsim Soyisim</label>
                                    <Input 
                                        placeholder="Mert Yılmaz" 
                                        value={customerName} 
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="bg-zinc-900 border-white/5 h-11 text-white text-sm" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Telefon Numarası</label>
                                    <Input 
                                        placeholder="0555 *** ** **" 
                                        value={customerPhone} 
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        className="bg-zinc-900 border-white/5 h-11 text-white text-sm" 
                                    />
                                </div>

                                {/* Address simulated autocompleter fields */}
                                {orderType === 'delivery' && (
                                    <div className="space-y-4 pt-2 border-t border-white/5">
                                        <div className="space-y-2 relative">
                                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5 text-red-500" /> Teslimat Adresi
                                            </label>
                                            <Input 
                                                placeholder="Kadıköy Mh. sokak veya cadde ara..." 
                                                value={addressQuery} 
                                                onChange={e => {
                                                    setAddressQuery(e.target.value)
                                                    setAddressValid(null)
                                                }}
                                                className="bg-zinc-900 border-white/5 h-11 text-white text-sm" 
                                            />
                                            {/* Suggestions list */}
                                            {suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-50 bg-[#111] border border-white/10 rounded-xl mt-1 shadow-2xl divide-y divide-white/5 max-h-[180px] overflow-y-auto">
                                                    {suggestions.map((addr, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddressQuery(addr.name)
                                                                checkAddressContainment(addr.coords, addr)
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
                                                        >
                                                            <Navigation className="w-3 h-3 text-blue-500 shrink-0" />
                                                            <span>{addr.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Check badge alerts */}
                                        {addressValid === true && deliveryZoneInfo && (
                                            <div className="p-3 bg-green-950/20 border border-green-500/20 text-green-400 rounded-xl text-xs space-y-1">
                                                <div className="font-bold flex items-center gap-1">✓ Teslimat Alanındasınız</div>
                                                <div>Tahmini Teslim Süresi: <strong>{deliveryZoneInfo.time} dk</strong></div>
                                                <div>Minimum Sepet Tutarı: <strong>₺{deliveryZoneInfo.min}</strong></div>
                                                <div>Teslimat Ücreti: <strong>{deliveryZoneInfo.fee === 0 ? "Ücretsiz" : `₺${deliveryZoneInfo.fee}`}</strong></div>
                                            </div>
                                        )}
                                        {addressValid === false && (
                                            <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs">
                                                <strong>✕ Servis Bölgesi Dışı:</strong> Bu adrese paket servis gönderimi yapamamaktayız.
                                            </div>
                                        )}
                                        {deliveryZoneInfo && total() < deliveryZoneInfo.min && (
                                            <div className="p-3 bg-yellow-950/20 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs">
                                                <strong>Sepet Tutarı Yetersiz:</strong> Bu bölgeye teslimat için en az <strong>₺{deliveryZoneInfo.min}</strong> tutarında sepet oluşturmalısınız (Eksik: ₺{deliveryZoneInfo.min - total()}).
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Bina / Daire / Adres Notu</label>
                                            <Input 
                                                placeholder="Blok no, Daire no veya zil adı..." 
                                                value={deliveryNotes} 
                                                onChange={e => setDeliveryNotes(e.target.value)}
                                                className="bg-zinc-900 border-white/5 h-11 text-white text-sm" 
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Payment Methods selector */}
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Ödeme Yöntemi</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setPaymentMethod('online_pay')}
                                            className={cn(
                                                "py-3 rounded-xl border text-xs font-bold transition-all",
                                                paymentMethod === 'online_pay' 
                                                    ? "bg-blue-950/20 border-blue-500 text-white" 
                                                    : "bg-zinc-900 border-transparent text-muted-foreground"
                                            )}
                                        >
                                            Kartla Online Öde
                                        </button>
                                        
                                        {orderType === 'delivery' ? (
                                            <>
                                                <button
                                                    onClick={() => setPaymentMethod('cash_delivery')}
                                                    className={cn(
                                                        "py-3 rounded-xl border text-xs font-bold transition-all",
                                                        paymentMethod === 'cash_delivery' 
                                                            ? "bg-green-950/20 border-green-500 text-white" 
                                                            : "bg-zinc-900 border-transparent text-muted-foreground"
                                                    )}
                                                >
                                                    Kapıda Nakit
                                                </button>
                                                <button
                                                    onClick={() => setPaymentMethod('card_delivery')}
                                                    className={cn(
                                                        "py-3 rounded-xl border text-xs font-bold transition-all",
                                                        paymentMethod === 'card_delivery' 
                                                            ? "bg-zinc-950/20 border-zinc-500 text-white" 
                                                            : "bg-zinc-900 border-transparent text-muted-foreground"
                                                    )}
                                                >
                                                    Kapıda Kredi Kartı
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setPaymentMethod('cash_table')}
                                                className={cn(
                                                    "py-3 rounded-xl border text-xs font-bold transition-all",
                                                    paymentMethod === 'cash_table' 
                                                        ? "bg-zinc-950/20 border-zinc-500 text-white" 
                                                        : "bg-zinc-900 border-transparent text-muted-foreground"
                                                )}
                                            >
                                                Kasada/Masada Öde
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Summary & Place Order */}
                            <div className="pt-4 border-t border-white/10 mt-auto space-y-4">
                                <div className="space-y-1.5 text-xs text-zinc-400">
                                    <div className="flex justify-between">
                                        <span>Sepet Toplamı:</span>
                                        <span className="font-bold text-white">₺{total()}</span>
                                    </div>
                                    {orderType === 'delivery' && (
                                        <div className="flex justify-between text-zinc-400">
                                            <span>Teslimat Ücreti:</span>
                                            <span className="font-bold text-white">₺{deliveryFee}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/5">
                                        <span>Genel Toplam:</span>
                                        <span className="text-green-500">₺{finalTotal}</span>
                                    </div>
                                </div>

                                <Button
                                    disabled={!canSubmitCheckout()}
                                    onClick={handleCheckoutSubmit}
                                    className={cn(
                                        "w-full h-12 text-sm font-bold rounded-xl transition-all duration-300",
                                        canSubmitCheckout() 
                                            ? "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-950/20" 
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    )}
                                >
                                    {paymentMethod === 'online_pay' ? "Ödemeye Geç" : "Siparişi Tamamla"}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
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
                                <h3 className="font-bold text-lg flex items-center gap-2 text-white"><CreditCard className="w-5 h-5 text-blue-400" /> {t.paymentTitle}</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={() => setShowPaymentModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">{t.cardNumber}</label>
                                    <Input placeholder="**** **** **** ****" className="bg-black/50 border-white/10 h-12 text-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">{t.expiry}</label>
                                        <Input placeholder="AA/YY" className="bg-black/50 border-white/10 h-12 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">{t.cvv}</label>
                                        <Input type="password" placeholder="***" className="bg-black/50 border-white/10 h-12 text-white" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 mt-6">
                                    <Button className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl" disabled={isProcessingPayment} onClick={simulatePayment}>
                                        {isProcessingPayment ? "İşleniyor..." : `${t.pay} (₺${paymentPurpose?.amount.toFixed(2)})`}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
