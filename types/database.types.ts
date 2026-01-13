export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            stores: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    logo_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    logo_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    logo_url?: string | null
                    created_at?: string
                }
            }
            products: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    price: number
                    category: string
                    image_url: string | null
                    description: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    price: number
                    category: string
                    image_url?: string | null
                    description?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    name?: string
                    price?: number
                    category?: string
                    image_url?: string | null
                    description?: string | null
                    created_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    store_id: string
                    table_no: string
                    total_price: number
                    status: 'new' | 'preparing' | 'done'
                    items: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    table_no: string
                    total_price: number
                    status?: 'new' | 'preparing' | 'done'
                    items: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    table_no?: string
                    total_price?: number
                    status?: 'new' | 'preparing' | 'done'
                    items?: Json
                    created_at?: string
                }
            }
            calls: {
                Row: {
                    id: string
                    store_id: string
                    table_no: string
                    type: 'waiter' | 'bill'
                    active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    table_no: string
                    type: 'waiter' | 'bill'
                    active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    table_no?: string
                    type?: 'waiter' | 'bill'
                    active?: boolean
                    created_at?: string
                }
            }
        }
    }
}
