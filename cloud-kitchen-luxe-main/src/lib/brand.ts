import nuggets from '@/assets/IMG_5924c0e7-31a2-4fc1-b9aa-fdf4ed11b9c3.webp.asset.json'
import platter from '@/assets/IMG_d6cbe752-3b15-44cd-998e-1a244f001960.webp.asset.json'
import kebab from '@/assets/IMG_c0f62a42-9426-4b3b-8c21-7577e4997f1a.webp.asset.json'
import poster from '@/assets/IMG_c61f02f9-d239-4eb0-9e31-f777e2589770.webp.asset.json'
import fingers from '@/assets/IMG_abc0e4f3-9bec-4289-b37b-f1bf9254bb4b.webp.asset.json'
import pizza from '@/assets/IMG_f6069cf1-748f-4e85-9de7-dbd2f2c26058.webp.asset.json'
import seafood from '@/assets/IMG_59f57a4c-bf20-4695-b749-a29039798c60.webp.asset.json'
import momos from '@/assets/IMG_61be84f7-5483-41bb-917a-f301b5d57f17.webp.asset.json'
import assortment from '@/assets/IMG_d0b04773-de9a-499d-b5da-48d53e88e98f.webp.asset.json'

export const images = { nuggets: nuggets.url, platter: platter.url, kebab: kebab.url, poster: poster.url, fingers: fingers.url, pizza: pizza.url, seafood: seafood.url, momos: momos.url, assortment: assortment.url }
export const business = {
  name: 'Fresh Frozen Food', phone: '9322605514', otherPhone: '7709486702',
  instagram: 'https://www.instagram.com/freshfrozenfood.pune/',
  maps: 'https://maps.app.goo.gl/YVzuNsHJQcuGNYSk8',
  address: 'F 207, above Al Azam Collection, Lifeline Hospital, Pune 411048',
  whatsapp: 'https://wa.me/919322605514',
}

export type MenuItem = { id: string; name: string; description: string; category: string; price: number; veg: boolean; image: string; unit: string }
// Product names are transcribed from supplied packaging; these are indicative prices, not a verified price list.
export const menu: MenuItem[] = [
  { id: 'chicken-cheese-nuggets', name: 'Chicken Cheese Nuggets', description: 'Golden crumb, tender chicken, and a cheesy centre. A little bite worth sharing.', category: 'Chicken favourites', price: 320, veg: false, image: images.nuggets, unit: 'Frozen pack' },
  { id: 'chilli-garlic-fingers', name: 'Chicken Chilli Garlic Fingers', description: 'ITC Master Chef chicken fingers with a chilli-garlic kick.', category: 'Chicken favourites', price: 350, veg: false, image: images.fingers, unit: 'Frozen pack' },
  { id: 'fish-fingers', name: 'Fish Fingers', description: 'Ready-to-cook fish fingers with a crisp breadcrumb coating.', category: 'Seafood', price: 390, veg: false, image: images.seafood, unit: 'Frozen pack' },
  { id: 'veggie-pizza-pocket', name: 'Veggie Pizza Pocket', description: 'ITC Master Chef pizza pockets. A savoury vegetable filling in a golden shell.', category: 'Vegetarian', price: 280, veg: true, image: images.pizza, unit: 'Frozen pack' },
  { id: 'veg-momos', name: 'Veg Momos', description: 'Munchrito’s bite-size veg momos, ready to steam or pan-fry.', category: 'Momos & more', price: 250, veg: true, image: images.momos, unit: 'Frozen pack' },
]
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
export function pageHead(title: string, description: string) {
  return { meta: [ { title: `${title} | Fresh Frozen Food Pune` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} | Fresh Frozen Food Pune` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' } ] }
}