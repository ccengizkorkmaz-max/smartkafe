
"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function QRGenerator() {
    const [tableCount, setTableCount] = useState(10)
    const [store, setStore] = useState<{ id: string, slug: string } | null>(null)
    const [qrData, setQrData] = useState<{ tableNo: string, url: string }[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchStoreAndTables = async () => {
            // 1. Fetch Store
            const { data: storeData } = await supabase.from("stores").select("id, slug").single()
            if (!storeData) return
            setStore(storeData)

            // 2. Fetch Existing Tables
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
    }, [])

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
                        <Button onClick={() => window.print()} variant="outline" className="gap-2 border-gray-300">
                            <Printer className="w-4 h-4" /> Yazdır
                        </Button>
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
