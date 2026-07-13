"use client"

import { useEffect, useState, use } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Plus, Trash2, Tag, Calendar, Sparkles } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

interface OptionItem {
    id?: string
    name: string
    price_modifier: string
}

interface OptionGroup {
    id?: string
    name: string
    is_required: boolean
    min_select: number
    max_select: number
    options: OptionItem[]
}

const ALLERGENS_LIST = [
    { key: "dairy", label: "🥛 Süt Ürünü" },
    { key: "gluten", label: "🌾 Gluten" },
    { key: "nuts", label: "🥜 Kuruyemiş" },
    { key: "soy", label: "🫘 Soya" },
    { key: "eggs", label: "🥚 Yumurta" },
    { key: "fish", label: "🐟 Balık" },
    { key: "peanuts", label: "🥜 Yer Fıstığı" },
    { key: "sesame", label: "🌱 Susam" }
]

export default function ProductFormPage({ params }: PageProps) {
    const { id } = use(params)
    const isNew = id === "new"
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [storeId, setStoreId] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        category: "",
        description: "",
        image_url: ""
    })

    const [calories, setCalories] = useState("")
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
    const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])

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
                .select("store_id, role")
                .eq("user_id", session.user.id)
                .maybeSingle()

            if (memberError || !member) {
                router.push("/admin/onboarding")
                return
            }

            setStoreId(member.store_id)

            // 3. Fetch product details if editing
            if (!isNew) {
                const { data, error } = await supabase
                    .from("products")
                    .select("*")
                    .eq("id", id)
                    .eq("store_id", member.store_id) // Security check
                    .single()

                if (error || !data) {
                    toast.error("Ürün bulunamadı veya düzenleme yetkiniz yok.")
                    router.push("/admin/products")
                    return
                }

                setFormData({
                    name: data.name,
                    price: data.price.toString(),
                    category: data.category,
                    description: data.description || "",
                    image_url: data.image_url || ""
                })
                setCalories(data.calories ? data.calories.toString() : "")
                setSelectedAllergens(data.allergens || [])

                // Fetch option groups and options
                const { data: groupsData } = await supabase
                    .from("product_option_groups")
                    .select("*, product_options(*)")
                    .eq("product_id", id)
                    .order("created_at", { ascending: true })

                if (groupsData) {
                    const mapped = groupsData.map((g: any) => ({
                        id: g.id,
                        name: g.name,
                        is_required: g.is_required,
                        min_select: g.min_select,
                        max_select: g.max_select,
                        options: g.product_options.map((o: any) => ({
                            id: o.id,
                            name: o.name,
                            price_modifier: o.price_modifier.toString()
                        }))
                    }))
                    setOptionGroups(mapped)
                }
            }
        }
        init()
    }, [id, isNew, router])

    const addOptionGroup = () => {
        setOptionGroups([
            ...optionGroups,
            { name: "", is_required: false, min_select: 0, max_select: 1, options: [] }
        ])
    }

    const removeOptionGroup = (index: number) => {
        setOptionGroups(optionGroups.filter((_, i) => i !== index))
    }

    const updateOptionGroup = (index: number, fields: Partial<OptionGroup>) => {
        setOptionGroups(optionGroups.map((g, i) => i === index ? { ...g, ...fields } : g))
    }

    const addOptionToGroup = (groupIndex: number) => {
        setOptionGroups(optionGroups.map((g, i) => {
            if (i === groupIndex) {
                return {
                    ...g,
                    options: [...g.options, { name: "", price_modifier: "0" }]
                }
            }
            return g
        }))
    }

    const removeOptionFromGroup = (groupIndex: number, optionIndex: number) => {
        setOptionGroups(optionGroups.map((g, i) => {
            if (i === groupIndex) {
                return {
                    ...g,
                    options: g.options.filter((_, oi) => oi !== optionIndex)
                }
            }
            return g
        }))
    }

    const updateOptionInGroup = (groupIndex: number, optionIndex: number, fields: Partial<OptionItem>) => {
        setOptionGroups(optionGroups.map((g, i) => {
            if (i === groupIndex) {
                return {
                    ...g,
                    options: g.options.map((o, oi) => oi === optionIndex ? { ...o, ...fields } : o)
                }
            }
            return g
        }))
    }

    const toggleAllergen = (key: string) => {
        if (selectedAllergens.includes(key)) {
            setSelectedAllergens(selectedAllergens.filter(a => a !== key))
        } else {
            setSelectedAllergens([...selectedAllergens, key])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!storeId) {
            toast.error("Mağaza bilgisi alınamadı")
            return
        }

        setLoading(true)
        const payload = {
            store_id: storeId,
            name: formData.name,
            price: parseFloat(formData.price),
            category: formData.category,
            description: formData.description,
            image_url: formData.image_url,
            calories: calories ? parseInt(calories) : null,
            allergens: selectedAllergens
        }

        let productId = id
        try {
            if (isNew) {
                const { data, error: insertError } = await supabase.from("products").insert(payload).select("id").single()
                if (insertError) throw insertError
                productId = data.id
            } else {
                const { error: updateError } = await supabase.from("products").update(payload).eq("id", id)
                if (updateError) throw updateError
            }

            // Sync option groups and options (delete & bulk insert)
            const { error: deleteError } = await supabase
                .from("product_option_groups")
                .delete()
                .eq("product_id", productId)
            if (deleteError) throw deleteError

            for (const group of optionGroups) {
                const { data: insertedGroup, error: groupError } = await supabase
                    .from("product_option_groups")
                    .insert({
                        product_id: productId,
                        name: group.name,
                        is_required: group.is_required,
                        min_select: group.min_select,
                        max_select: group.max_select
                    })
                    .select("id")
                    .single()

                if (groupError) throw groupError

                if (group.options.length > 0) {
                    const optionsPayload = group.options.map(o => ({
                        group_id: insertedGroup.id,
                        name: o.name,
                        price_modifier: parseFloat(o.price_modifier) || 0
                    }))
                    const { error: optionsError } = await supabase
                        .from("product_options")
                        .insert(optionsPayload)

                    if (optionsError) throw optionsError
                }
            }

            toast.success(isNew ? "Ürün başarıyla eklendi." : "Ürün başarıyla güncellendi.")
            router.push("/admin/products")
            router.refresh()
        } catch (error: any) {
            toast.error("Hata: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-6 bg-background text-foreground font-sans">
            <div className="max-w-3xl mx-auto space-y-8 pb-20">
                {/* Back Header */}
                <div className="flex items-center gap-4">
                    <Link href="/admin/products">
                        <Button variant="outline" size="icon" className="rounded-full">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">{isNew ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}</h1>
                        <p className="text-muted-foreground">Ürün detaylarını, etiketlerini ve seçenek gruplarını buradan tanımlayın.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Card */}
                    <Card className="border-white/5 bg-card/40 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Genel Ürün Bilgileri</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ürün Adı</label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="bg-secondary/40 border-transparent h-12 text-base"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fiyat (₺)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        required
                                        className="bg-secondary/40 border-transparent h-12 text-base"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Kategori</label>
                                    <Input
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="Örn: Kahve, Tatlı, Yemek"
                                        required
                                        className="bg-secondary/40 border-transparent h-12 text-base"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Açıklama</label>
                                <Input
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="bg-secondary/40 border-transparent h-12 text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Görsel URL</label>
                                <Input
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://..."
                                    className="bg-secondary/40 border-transparent h-12 text-base font-mono"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calories & Allergens Card */}
                    <Card className="border-white/5 bg-card/40 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Besin & Alerjen Bilgileri</CardTitle>
                            <CardDescription>Müşteri arayüzünde gösterilecek sağlık ve kalori bilgileri.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Kalori (kcal)</label>
                                <Input
                                    type="number"
                                    value={calories}
                                    onChange={e => setCalories(e.target.value)}
                                    placeholder="Örn: 240"
                                    className="bg-secondary/40 border-transparent h-12 text-base max-w-xs"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Alerjen Etiketleri</label>
                                <div className="flex flex-wrap gap-2">
                                    {ALLERGENS_LIST.map(a => {
                                        const isSelected = selectedAllergens.includes(a.key)
                                        return (
                                            <button
                                                key={a.key}
                                                type="button"
                                                onClick={() => toggleAllergen(a.key)}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                                                    isSelected
                                                        ? "bg-red-500/10 border-red-500/30 text-red-400 font-bold"
                                                        : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                                                }`}
                                            >
                                                {a.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Option Groups (Modifiers) Card */}
                    <Card className="border-white/5 bg-card/40 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Ürün Seçenek Grupları (Seçenekler)</CardTitle>
                                <CardDescription>Ürün özelleştirmeleri, sos ilaveleri, boyut veya ekler ekleyin.</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addOptionGroup} className="gap-2 rounded-xl">
                                <Plus className="w-4 h-4" /> Grup Ekle
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {optionGroups.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                                    Henüz seçenek grubu eklenmemiş. "Grup Ekle" butonuna basarak ilk grubunuzu tanımlayın.
                                </div>
                            ) : (
                                optionGroups.map((group, gIdx) => (
                                    <div key={gIdx} className="p-5 border border-white/5 rounded-2xl bg-black/20 space-y-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Group Settings */}
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    placeholder="Grup İsmi (Örn: Süt Tercihi, Ekstra Soslar)"
                                                    value={group.name}
                                                    onChange={e => updateOptionGroup(gIdx, { name: e.target.value })}
                                                    required
                                                    className="bg-secondary/40 border-transparent h-10 text-sm"
                                                />
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={group.is_required}
                                                            onChange={e => updateOptionGroup(gIdx, { is_required: e.target.checked })}
                                                            className="rounded border-zinc-700 bg-zinc-950 text-green-500 focus:ring-green-500 w-4 h-4"
                                                        />
                                                        Zorunlu Seçim
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Min:</span>
                                                        <Input
                                                            type="number"
                                                            value={group.min_select}
                                                            onChange={e => updateOptionGroup(gIdx, { min_select: parseInt(e.target.value) || 0 })}
                                                            className="w-16 h-8 text-center bg-secondary/40 border-transparent text-xs"
                                                            min={0}
                                                        />
                                                        <span className="text-xs text-muted-foreground">Max:</span>
                                                        <Input
                                                            type="number"
                                                            value={group.max_select}
                                                            onChange={e => updateOptionGroup(gIdx, { max_select: parseInt(e.target.value) || 1 })}
                                                            className="w-16 h-8 text-center bg-secondary/40 border-transparent text-xs"
                                                            min={1}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOptionGroup(gIdx)} className="text-destructive hover:bg-destructive/10 rounded-xl">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Sub Options in this Group */}
                                        <div className="pl-4 border-l border-white/5 space-y-3">
                                            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-1">
                                                <span>Alt Seçenek İsmi</span>
                                                <span>Ek Ücret (+₺)</span>
                                            </div>
                                            {group.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-4">
                                                    <Input
                                                        placeholder="Örn: Yulaf Sütü, Ketçap"
                                                        value={opt.name}
                                                        onChange={e => updateOptionInGroup(gIdx, oIdx, { name: e.target.value })}
                                                        required
                                                        className="flex-1 bg-secondary/20 border-transparent h-9 text-sm"
                                                    />
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0"
                                                        value={opt.price_modifier}
                                                        onChange={e => updateOptionInGroup(gIdx, oIdx, { price_modifier: e.target.value })}
                                                        required
                                                        className="w-24 bg-secondary/20 border-transparent h-9 text-sm text-right"
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOptionFromGroup(gIdx, oIdx)} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => addOptionToGroup(gIdx)} className="gap-1.5 h-8 text-xs rounded-xl bg-transparent border-white/10 hover:bg-white/5">
                                                <Plus className="w-3.5 h-3.5" /> Seçenek Ekle
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-500 text-white rounded-2xl shadow-xl shadow-green-950/20" disabled={loading}>
                        {loading ? "Kaydediliyor..." : "Ürünü ve Değişiklikleri Kaydet"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
