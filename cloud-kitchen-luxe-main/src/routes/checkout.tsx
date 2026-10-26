import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useShop } from '@/components/shop-shell'
import { menu, money, pageHead } from '@/lib/brand'
import { checkoutSchema } from '@/lib/order-schema'
import { placeOrder } from '@/lib/orders.functions'

export const Route = createFileRoute('/checkout')({ head: () => pageHead('Checkout', 'Confirm your Fresh Frozen Food order. Cash on delivery across Pune.'), component: CheckoutPage })

function CheckoutPage() {
  const shop = useShop()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '', postalCode: '', notes: '', consent: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState('')
  const [requestId] = useState(() => crypto.randomUUID())
  const lines = shop.cart.map(line => ({ line, item: menu.find(item => item.id === line.id) })).filter((entry): entry is { line: typeof entry.line; item: NonNullable<typeof entry.item> } => Boolean(entry.item))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setFailure(''); setErrors({})
    const parsed = checkoutSchema.safeParse({ requestId, name: form.name, phone: form.phone, address: form.address, postalCode: form.postalCode, notes: form.notes, items: shop.cart, paymentMethod: 'cod', consent: form.consent })
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return }
    setSubmitting(true)
    try {
      const receipt = await placeOrder({ data: parsed.data })
      shop.setReceipt(receipt); shop.clear()
      navigate({ to: '/order-confirmed' })
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Your order could not be placed. Please try again.') }
    finally { setSubmitting(false) }
  }

  if (shop.receipt && !shop.cart.length) return <div className="page-intro"><h1>Order placed.</h1><p>Order {shop.receipt.number} · {money(shop.receipt.total)} · about {shop.receipt.eta} minutes.</p><Button variant="editorial" asChild><Link to="/menu">Back to the menu</Link></Button></div>
  if (!lines.length) return <div className="page-intro"><h1>Your cart is empty.</h1><Button variant="editorial" asChild><Link to="/menu">Explore the menu</Link></Button></div>

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(current => ({ ...current, [key]: event.target.value }))
  return <><div className="page-intro"><span className="eyebrow text-primary">Almost there</span><h1>Checkout.</h1><p>Confirm your details. Pay cash on delivery.</p></div>
  <section className="section grid gap-10 md:grid-cols-2">
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div><Label htmlFor="name">Full name</Label><Input id="name" value={form.name} onChange={set('name')} autoComplete="name"/>{errors['name'] && <p className="text-sm text-destructive">{errors['name']}</p>}</div>
      <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" value={form.phone} onChange={set('phone')} inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile"/>{errors['phone'] && <p className="text-sm text-destructive">{errors['phone']}</p>}</div>
      <div><Label htmlFor="address">Delivery address</Label><Textarea id="address" value={form.address} onChange={set('address')} autoComplete="street-address"/>{errors['address'] && <p className="text-sm text-destructive">{errors['address']}</p>}</div>
      <div><Label htmlFor="postalCode">Pune postcode</Label><Input id="postalCode" value={form.postalCode} onChange={set('postalCode')} inputMode="numeric" placeholder="4110__"/>{errors['postalCode'] && <p className="text-sm text-destructive">{errors['postalCode']}</p>}</div>
      <div><Label htmlFor="notes">Notes (optional)</Label><Textarea id="notes" value={form.notes} onChange={set('notes')} placeholder="Spice level, allergies, delivery instructions"/></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.consent} onChange={event => setForm(current => ({ ...current, consent: event.target.checked }))}/>I understand prices are indicative and the team will confirm availability, final price and delivery.</label>
      {errors['consent'] && <p className="text-sm text-destructive">{errors['consent']}</p>}
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <Button variant="editorial" type="submit" disabled={submitting}>{submitting ? 'Placing your order…' : 'Place order (Cash on Delivery)'}</Button>
      <Button variant="text" asChild><Link to="/menu"><ArrowLeft className="size-3"/> Back to the menu</Link></Button>
    </form>
    <aside className="border border-border rounded-sm p-6 h-fit">
      <h2 className="text-lg font-semibold mb-4">Your order</h2>
      {lines.map(({ line, item }) => <div key={line.id} className="flex justify-between text-sm py-1"><span>{item.name} × {line.quantity}</span><span>{money(item.price * line.quantity)}</span></div>)}
      <div className="cart-total"><span>Subtotal</span><span>{money(shop.total)}</span></div>
      <p className="fine-print mt-3">Indicative prices. Delivery charges confirmed by the team. Payment: cash on delivery.</p>
    </aside>
  </section></>
}
