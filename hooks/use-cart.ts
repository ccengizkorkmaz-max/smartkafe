import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartOption {
    name: string
    price: number
}

export interface CartItem {
    cartKey: string     // Unique key for product + options combo
    id: string          // Product ID
    name: string
    price: number       // Dynamic total unit price (base + options)
    quantity: number
    category?: string   // Category of the product
    selectedOptions?: CartOption[]
}

interface CartState {
    items: CartItem[]
    addItem: (item: CartItem) => void
    removeItem: (cartKey: string) => void
    clearCart: () => void
    total: () => number
}

export const useCart = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (item) =>
                set((state) => {
                    const existingItem = state.items.find((i) => i.cartKey === item.cartKey)
                    if (existingItem) {
                        return {
                            items: state.items.map((i) =>
                                i.cartKey === item.cartKey
                                    ? { ...i, quantity: i.quantity + item.quantity }
                                    : i
                            ),
                        }
                    }
                    return { items: [...state.items, item] }
                }),
            removeItem: (cartKey) =>
                set((state) => ({
                    items: state.items.filter((i) => i.cartKey !== cartKey),
                })),
            clearCart: () => set({ items: [] }),
            total: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
        }),
        {
            name: 'smartkafe-cart',
        }
    )
)
