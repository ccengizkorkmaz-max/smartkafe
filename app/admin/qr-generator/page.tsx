
"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function QRGenerator() {
    const router = useRouter()
    const [tableCount, setTableCount] = useState(10)
    const [store, setStore] = useState<{ id: string, slug: string } | null>(null)
    const [qrData, setQrData] = useState<{ tableNo: string, url: string }[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchStoreAndTables = async () => {
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

            const storeData = member.stores as any
            if (!storeData) return
            setStore({ id: storeData.id, slug: storeData.slug })

            // 3. Fetch Existing Tables
            const { data: tables } = await supabase
                .from("tables")
                .select("table_no, qr_token")
                .eq("store_id", storeData.id)
                .order("table_no", { ascending: true }) // order might be text "1","10","2" etc, but good enough for now or use sort

            if (tables && tables.length > 0) {
                // Map to UI format
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                const existingQrData = tables
                    .map(t => ({
                        tableNo: t.table_no,
                        url: `${baseUrl}/${storeData.slug}?t=${t.qr_token}`
                    }))
                    // Sort numerically if possible
                    .sort((a, b) => Number(a.tableNo) - Number(b.tableNo))

                setQrData(existingQrData)

                // Update table count input to match the highest table number found (approx)
                const maxTable = Math.max(...tables.map(t => Number(t.table_no) || 0))
                if (maxTable > 0) setTableCount(maxTable)
            }
        }
        fetchStoreAndTables()
    }, [router])

    const generateQRs = async () => {
        if (!store) return

        // Safety Assessment
        if (qrData.length > 0) {
            const confirmed = window.confirm(
                "UYARI: Yeni kodlar oluşturulduğunda eski karekodlar GEÇERSİZ olacaktır.\n\nMasalardaki mevcut karekodları yenileriyle değiştirmeniz gerekecek.\nDevam etmek istiyor musunuz?"
            )
            if (!confirmed) return
        }

        setLoading(true)
        const newQrData = []
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

        for (let i = 1; i <= tableCount; i++) {
            const tableNo = i.toString()
            const newToken = self.crypto.randomUUID()

            // Upsert with new Token (Rotate)
            const { error } = await supabase
                .from("tables")
                .upsert({
                    store_id: store.id,
                    table_no: tableNo,
                    qr_token: newToken
                }, { onConflict: 'store_id, table_no' })

            if (error) {
                console.error("Error generating table:", error)
                continue
            }

            newQrData.push({
                tableNo,
                url: `${baseUrl}/${store.slug}?t=${newToken}`
            })
        }
        setQrData(newQrData)
        setLoading(false)
    }

    const rotateTokens = async () => {
        if (!store || qrData.length === 0) return

        const confirmed = window.confirm(
            "Tüm masaların karekod tokenlarını sıfırlamak (döndürmek) istiyor musunuz?\n\nBu işlem, masalardaki mevcut karekodları okutan müşterilerin menüye erişimini hemen kesecek ve yeni sipariş vermelerini engelleyecektir. Yeni karekodları tekrar yazdırmanız gerekir."
        )
        if (!confirmed) return

        setLoading(true)
        const newQrData = []
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

        // Fetch current tables of this store
        const { data: tables } = await supabase
            .from("tables")
            .select("table_no")
            .eq("store_id", store.id)

        if (tables) {
            for (const t of tables) {
                const newToken = self.crypto.randomUUID()
                const { error } = await supabase
                    .from("tables")
                    .update({ qr_token: newToken })
                    .eq("store_id", store.id)
                    .eq("table_no", t.table_no)

                if (error) {
                    console.error(`Error updating table ${t.table_no}:`, error)
                } else {
                    newQrData.push({
                        tableNo: t.table_no,
                        url: `${baseUrl}/${store.slug}?t=${newToken}`
                    })
                }
            }

            // Sort new QRs
            newQrData.sort((a, b) => Number(a.tableNo) - Number(b.tableNo))
            setQrData(newQrData)
            toast.success("Tüm masa karekod tokenları başarıyla yenilendi (döndürüldü)!")
        }
        setLoading(false)
    }

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white text-black print:p-0">
            <div className="mb-8 print:hidden flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="outline" size="icon" className="bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-black mb-2">QR Kod Oluşturucu</h1>
                        <p className="text-gray-600">Her masa için güvenli, benzersiz QR kodlar oluşturun.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium whitespace-nowrap">Masa Sayısı:</label>
                        <Input
                            type="number"
                            value={tableCount}
                            onChange={(e) => setTableCount(Number(e.target.value))}
                            className="w-24 border-gray-300 text-black bg-white"
                            min={1}
                        />
                    </div>
                    <Button onClick={generateQRs} disabled={loading || !store} className="gap-2 bg-black text-white hover:bg-gray-800">
                        {loading ? "Oluşturuluyor..." : "Kodları Oluştur"}
                    </Button>
                    {qrData.length > 0 && (
                        <>
                            <Button onClick={rotateTokens} disabled={loading || !store} className="gap-2 bg-red-600 text-white hover:bg-red-500 border-none">
                                <RefreshCw className="w-4 h-4" /> Tokenları Yenile
                            </Button>
                            <Button onClick={() => window.print()} className="gap-2 bg-black text-white hover:bg-gray-800 border-none">
                                <Printer className="w-4 h-4" /> Yazdır
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-gray-400 animate-pulse">QR Kodlar hazırlanıyor, lütfen bekleyin...</div>
            ) : qrData.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:grid-cols-3 print:gap-8">
                    {qrData.map((qr) => (
                        <div key={qr.tableNo} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl page-break-inside-avoid bg-white">
                            <QRCodeSVG value={qr.url} size={150} level="H" />
                            <div className="mt-4 text-center">
                                <div className="font-bold text-xl uppercase tracking-widest text-gray-400">MASA</div>
                                <div className="text-4xl font-black text-black">{qr.tableNo}</div>
                                <div className="text-[10px] text-gray-400 mt-2 font-mono truncate max-w-[150px]">{qr.url}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    Önce masa sayısını belirleyip "Kodları Oluştur" butonuna basın.
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white; color: black; }
                    .print\\:hidden { display: none !important; }
                    .glass, header, footer { display: none !important; }
                }
            `}</style>
        </div>
    )
}
