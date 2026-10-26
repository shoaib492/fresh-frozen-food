import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { checkoutSchema } from './order-schema'
import { menu } from './brand'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const placeOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data }) => {
    const items = data.items.map(line => {
      const item = menu.find(item => item.id === line.id)
      if (!item) throw new Error('An item is no longer available. Please refresh your cart.')
      return { id: item.id, name: item.name, price: item.price, quantity: line.quantity }
    })
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate cart items are not allowed.')
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    // Guest checkout is intentionally public. Never return stored customer data; validate and price every line server-side.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const existing = await supabaseAdmin.from('orders').select('order_number,total,eta_minutes').eq('request_id', data.requestId).maybeSingle()
    if (existing.error) throw new Error('We could not check your order. Please try again.')
    if (existing.data) return { number: existing.data.order_number, total: existing.data.total, eta: existing.data.eta_minutes }
    const number = `FFF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const result = await supabaseAdmin.from('orders').insert({
      request_id: data.requestId, order_number: number, customer_name: data.name, phone: data.phone,
      address: data.address, postal_code: data.postalCode, notes: data.notes, items, total,
      payment_method: 'cod', payment_status: 'unpaid', eta_minutes: 60,
    })
    if (result.error) {
      if (result.error.code === '23505') {
        const retry = await supabaseAdmin.from('orders').select('order_number,total,eta_minutes').eq('request_id', data.requestId).single()
        if (retry.data) return { number: retry.data.order_number, total: retry.data.total, eta: retry.data.eta_minutes }
      }
      throw new Error('Your order could not be saved. Please try again; no payment has been taken.')
    }
    return { number, total, eta: 60 }
  })

export const getStaffOrders = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const roles = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId)
  if (roles.error || !roles.data?.some(row => row.role === 'admin' || row.role === 'staff')) throw new Error('This account does not have staff access. Ask the owner to grant access.')
  const result = await context.supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
  if (result.error) throw new Error('Orders could not be loaded. Please try again.')
  return result.data
})

export const updateOrderStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(['received','preparing','out_for_delivery','delivered','cancelled']) }).parse(input))
  .handler(async ({ data, context }) => {
    const roles = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId)
    if (roles.error || !roles.data?.some(row => row.role === 'admin' || row.role === 'staff')) throw new Error('Staff access required.')
    const result = await context.supabase.from('orders').update({ status: data.status }).eq('id', data.id).select('id').single()
    if (result.error) throw new Error('The order status could not be updated.')
    return { ok: true }
  })