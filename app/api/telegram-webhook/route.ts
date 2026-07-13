import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // Handle Telegram Callback Query
        if (body.callback_query) {
            const callbackQuery = body.callback_query
            const callbackData = callbackQuery.data // e.g. "on_the_way:UUID" or "delivered:UUID"
            const courierChatId = callbackQuery.from.id.toString()
            const messageId = callbackQuery.message.message_id
            const originalText = callbackQuery.message.text

            const [action, orderId] = callbackData.split(":")

            if (!orderId) {
                return NextResponse.json({ ok: true })
            }

            // Get store bot token
            const { data: order } = await supabase
                .from("orders")
                .select("*, stores(*)")
                .eq("id", orderId)
                .single()

            if (!order) {
                return NextResponse.json({ ok: true })
            }

            const currentStore = Array.isArray(order.stores) ? order.stores[0] : order.stores
            const botToken = currentStore?.payment_settings?.telegram_bot_token || "7394827110:AAHzN28392182019482910381029"

            let newStatus = ""
            let statusTextLabel = ""
            let alertText = ""

            if (action === "on_the_way") {
                newStatus = "on_the_way"
                statusTextLabel = "🚚 YOLDAYIM"
                alertText = "Sipariş durumunu 'Yolda' olarak güncellediniz."
            } else if (action === "delivered") {
                newStatus = "paid" // Closed & Paid
                statusTextLabel = "✓ TESLİM EDİLDİ"
                alertText = "Sipariş teslim edildi ve ödeme kapatıldı."
            }

            if (newStatus) {
                // Update Supabase Order Status
                await supabase
                    .from("orders")
                    .update({ 
                        status: newStatus,
                        payment_status: newStatus === 'paid' ? 'paid' : 'pending'
                    })
                    .eq("id", orderId)

                // Answer Callback Query (removes loading state on Telegram button click)
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        callback_query_id: callbackQuery.id,
                        text: alertText
                    })
                })

                // Edit Message Text to show updated status
                const newText = `${originalText}\n\n*Güncel Durum: ${statusTextLabel}*`
                
                // If yolda, keep "delivered" button. If delivered, remove all buttons.
                const newKeyboard = action === 'on_the_way' ? {
                    inline_keyboard: [
                        [
                            { text: "✓ Teslim Ettim", callback_data: `delivered:${orderId}` }
                        ]
                    ]
                } : { inline_keyboard: [] }

                await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: courierChatId,
                        message_id: messageId,
                        text: newText,
                        parse_mode: "Markdown",
                        reply_markup: newKeyboard
                    })
                })
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("Webhook processing error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
