import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

type StaffContext = { supabase: any; userId: string }
async function assertStaff(context: StaffContext) {
  const roles = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId)
  if (roles.error || !roles.data?.some((row: { role: string }) => row.role === 'admin' || row.role === 'staff')) throw new Error('Staff access required.')
  return { isAdmin: roles.data.some((row: { role: string }) => row.role === 'admin') }
}

export const getAdminRole = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const roles = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId)
  const role = roles.data?.find(row => row.role === 'admin')?.role || roles.data?.find(row => row.role === 'staff')?.role || null
  if (!role) throw new Error('This account does not have staff access.')
  return { role }
})

const productSchema = z.object({
  id: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.'),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  category: z.string().trim().min(2).max(60),
  price: z.number().int().min(0).max(1000000),
  veg: z.boolean(),
  image: z.string().trim().max(500).default(''),
  unit: z.string().trim().max(40).default('Frozen pack'),
  available: z.boolean(),
  featured: z.boolean(),
  sort: z.number().int().min(0).max(10000).default(0),
})

export const listAdminProducts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertStaff(context)
  const result = await context.supabase.from('products').select('*').order('sort').order('name')
  if (result.error) throw new Error('Products could not be loaded.')
  return result.data
})

export const upsertProduct = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context)
    const result = await context.supabase.from('products').upsert(data).select('id').single()
    if (result.error) throw new Error('The product could not be saved.')
    return { ok: true }
  })

export const deleteProduct = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertStaff(context)
    if (!isAdmin) throw new Error('Only an admin can delete products.')
    const result = await context.supabase.from('products').delete().eq('id', data.id)
    if (result.error) throw new Error('The product could not be deleted.')
    return { ok: true }
  })

export const updatePaymentStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), payment_status: z.enum(['unpaid','paid','failed','refunded']) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context)
    const result = await context.supabase.from('orders').update({ payment_status: data.payment_status }).eq('id', data.id).select('id').single()
    if (result.error) throw new Error('The payment status could not be updated.')
    return { ok: true }
  })

export const getDashboardStats = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertStaff(context)
  const orders = await context.supabase.from('orders').select('id,order_number,customer_name,phone,total,status,payment_status,items,created_at').order('created_at', { ascending: false }).limit(500)
  if (orders.error) throw new Error('Dashboard data could not be loaded.')
  const products = await context.supabase.from('products').select('id', { count: 'exact', head: true })
  const rows = orders.data || []
  const revenue = rows.filter(row => row.status !== 'cancelled' && row.payment_status === 'paid').reduce((sum, row) => sum + row.total, 0)
  const best = new Map<string, { name: string; quantity: number }>()
  for (const row of rows) for (const line of (Array.isArray(row.items) ? row.items : []) as { id?: string; name?: string; quantity?: number }[]) {
    if (!line?.name) continue
    const entry = best.get(line.name) || { name: line.name, quantity: 0 }
    entry.quantity += line.quantity || 0
    best.set(line.name, entry)
  }
  return {
    totalOrders: rows.length,
    pending: rows.filter(row => row.status === 'received').length,
    processing: rows.filter(row => row.status === 'preparing' || row.status === 'out_for_delivery').length,
    completed: rows.filter(row => row.status === 'delivered').length,
    revenue,
    totalProducts: products.count || 0,
    totalCustomers: new Set(rows.map(row => row.phone)).size,
    recent: rows.slice(0, 8),
    bestSellers: [...best.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  }
})

export const getCustomers = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertStaff(context)
  const orders = await context.supabase.from('orders').select('customer_name,phone,total,status,created_at').order('created_at', { ascending: false }).limit(1000)
  if (orders.error) throw new Error('Customers could not be loaded.')
  const map = new Map<string, { name: string; phone: string; orders: number; spent: number; lastOrder: string }>()
  for (const row of orders.data || []) {
    const entry = map.get(row.phone) || { name: row.customer_name, phone: row.phone, orders: 0, spent: 0, lastOrder: row.created_at }
    entry.orders += 1
    if (row.status !== 'cancelled') entry.spent += row.total
    map.set(row.phone, entry)
  }
  return [...map.values()].sort((a, b) => b.spent - a.spent)
})

const contentSchema = z.object({ key: z.enum(['hero','business','story']), value: z.record(z.string(), z.unknown()).transform(v => v as import('@/integrations/supabase/types').Json) })
export const updateSiteContent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => contentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context)
    const result = await context.supabase.from('site_content').upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() })
    if (result.error) throw new Error('The content could not be saved.')
    return { ok: true }
  })

const offerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).default(''),
  discount_type: z.enum(['percent','flat']),
  value: z.number().int().min(0).max(100000),
  starts_at: z.string(),
  ends_at: z.string(),
  active: z.boolean(),
})
export const listAdminOffers = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertStaff(context)
  const result = await context.supabase.from('offers').select('*').order('created_at', { ascending: false })
  if (result.error) throw new Error('Offers could not be loaded.')
  return result.data
})
export const upsertOffer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => offerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context)
    const { id, ...offer } = data
    const result = await context.supabase.from('offers').upsert({ ...offer, ...(id ? { id } : { id: crypto.randomUUID() }) }).select('id').single()
    if (result.error) throw new Error('The offer could not be saved.')
    return { ok: true }
  })
export const deleteOffer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context)
    const result = await context.supabase.from('offers').delete().eq('id', data.id)
    if (result.error) throw new Error('The offer could not be deleted.')
    return { ok: true }
  })
