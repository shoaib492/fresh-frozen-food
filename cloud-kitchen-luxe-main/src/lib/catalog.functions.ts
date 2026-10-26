import { createServerFn } from '@tanstack/react-start'
import { menu, business, type MenuItem } from './brand'

const FALLBACK_CONTENT = {
  hero: { heading: 'Fresh Frozen Food.', subtitle: 'Extraordinary bites. Effortlessly yours.', image: '' },
  business: { phone: business.phone, otherPhone: business.otherPhone, whatsapp: '919322605514', address: business.address, instagram: business.instagram },
  story: { heading: 'Our story', body: 'Quality always. Fresh Frozen Food brings ready-to-cook favourites to homes across Pune.' },
}

async function resolveImage(image: string, id: string, admin: typeof import('@/integrations/supabase/client.server').supabaseAdmin): Promise<string> {
  if (!image) return menu.find(item => item.id === id)?.image || ''
  if (image.startsWith('site-assets/')) {
    const signed = await admin.storage.from('site-assets').createSignedUrl(image.replace(/^site-assets\//, ''), 60 * 60 * 24 * 7)
    return signed.data?.signedUrl || ''
  }
  return image
}

export const listPublicProducts = createServerFn({ method: 'GET' }).handler(async (): Promise<MenuItem[]> => {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const result = await supabaseAdmin.from('products').select('*').eq('available', true).order('sort').order('name')
    if (result.error || !result.data?.length) return menu
    return await Promise.all(result.data.map(async row => ({
      id: row.id, name: row.name, description: row.description, category: row.category,
      price: row.price, veg: row.veg, unit: row.unit, image: await resolveImage(row.image, row.id, supabaseAdmin),
    })))
  } catch { return menu }
})

export const getSiteContent = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const result = await supabaseAdmin.from('site_content').select('key,value')
    if (result.error) return FALLBACK_CONTENT
    const map = Object.fromEntries((result.data || []).map(row => [row.key, row.value]))
    const hero = { ...FALLBACK_CONTENT.hero, ...(map['hero'] as object || {}) }
    if (hero.image && hero.image.startsWith('site-assets/')) hero.image = await resolveImage(hero.image, 'hero', supabaseAdmin)
    return {
      hero,
      business: { ...FALLBACK_CONTENT.business, ...(map['business'] as object || {}) },
      story: { ...FALLBACK_CONTENT.story, ...(map['story'] as object || {}) },
    }
  } catch { return FALLBACK_CONTENT }
})

export const listActiveOffers = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const now = new Date().toISOString()
    const result = await supabaseAdmin.from('offers').select('id,title,description,discount_type,value,starts_at,ends_at').eq('active', true).lte('starts_at', now).gte('ends_at', now).order('created_at', { ascending: false })
    if (result.error) return []
    return result.data || []
  } catch { return [] }
})
