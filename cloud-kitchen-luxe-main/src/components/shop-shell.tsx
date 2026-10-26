import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ShoppingBag, Menu, X, Minus, Plus, ArrowRight, MessageCircle, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { business, menu, money, type MenuItem } from '@/lib/brand'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

type CartLine = { id: string; quantity: number }
type Receipt = { number: string; total: number; eta: number }
type ShopState = { cart: CartLine[]; add: (id: string) => void; change: (id: string, delta: number) => void; clear: () => void; openCart: () => void; total: number; count: number; receipt: Receipt | null; setReceipt: (receipt: Receipt) => void }
const ShopContext = createContext<ShopState | null>(null)
export function useShop() { const context = useContext(ShopContext); if (!context) throw new Error('Shop context unavailable'); return context }
export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [receipt, setReceiptState] = useState<Receipt | null>(null)
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('fff-cart') || '[]')
      if (Array.isArray(stored)) setCart(stored.filter((line): line is CartLine => line && typeof line.id === 'string' && menu.some(item => item.id === line.id) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 20))
      const saved: unknown = JSON.parse(sessionStorage.getItem('fff-receipt') || 'null')
      if (saved && typeof saved === 'object' && 'number' in saved && 'total' in saved && 'eta' in saved && typeof saved.number === 'string' && typeof saved.total === 'number' && typeof saved.eta === 'number') setReceiptState({ number: saved.number, total: saved.total, eta: saved.eta })
    } catch { /* Invalid local state starts with an empty cart. */ }
    setLoaded(true)
  }, [])
  useEffect(() => { if (loaded) { try { localStorage.setItem('fff-cart', JSON.stringify(cart)) } catch { /* Private browsing storage may be unavailable. */ } } }, [cart, loaded])
  const change = (id: string, delta: number) => setCart(current => current.map(line => line.id === id ? { ...line, quantity: Math.min(20, line.quantity + delta) } : line).filter(line => line.quantity > 0))
  const add = (id: string) => { if (!menu.some(item => item.id === id)) return; setCart(current => current.some(line => line.id === id) ? current.map(line => line.id === id ? { ...line, quantity: Math.min(20,line.quantity + 1) } : line) : [...current, { id, quantity: 1 }]) }
  const total = cart.reduce((sum,line) => sum + (menu.find(item => item.id === line.id)?.price || 0) * line.quantity, 0)
  const setReceipt = (value: Receipt) => { setReceiptState(value); try { sessionStorage.setItem('fff-receipt', JSON.stringify(value)) } catch { /* Receipt remains in memory. */ } }
  return <ShopContext.Provider value={{ cart, add, change, clear: () => setCart([]), openCart: () => setOpen(true), count: cart.reduce((sum,line) => sum+line.quantity,0), total, receipt, setReceipt }}>
    {children}
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="cart-panel">
      <SheetTitle className="display text-3xl">Your selection</SheetTitle><SheetDescription>Good food is one step closer.</SheetDescription>
      {cart.length === 0 ? <div className="py-16 text-center"><ShoppingBag className="mx-auto mb-5 text-muted-foreground"/><p>Your cart is empty.</p><Button variant="editorial" className="mt-6" asChild><Link to="/menu" onClick={() => setOpen(false)}>Explore the menu <ArrowRight/></Link></Button></div> : <>
        {cart.map(line => <CartLineItem key={line.id} line={line}/>) }
        <div className="cart-total"><span>Subtotal</span><span>{money(total)}</span></div>
        <p className="fine-print mb-5">Indicative prices. Pack sizes, availability and delivery charges will be confirmed by the team.</p>
        <Button variant="editorial" className="w-full" asChild><Link to="/checkout" onClick={() => setOpen(false)}>Continue to checkout <ArrowRight/></Link></Button>
      </>}
    </SheetContent></Sheet>
  </ShopContext.Provider>
}
export function CartLineItem({ line }: { line: CartLine }) {
  const shop = useShop(); const item = menu.find(item => item.id === line.id); if (!item) return null
  return <div className="cart-line"><img src={item.image} alt={item.name}/><div><h3>{item.name}</h3><div className="quantity-control"><Button aria-label={`Remove one ${item.name}`} variant="ghost" size="icon" onClick={() => shop.change(item.id,-1)}><Minus className="size-3"/></Button><span className="text-xs w-4 text-center">{line.quantity}</span><Button aria-label={`Add one ${item.name}`} variant="ghost" size="icon" onClick={() => shop.change(item.id,1)} disabled={line.quantity >= 20}><Plus className="size-3"/></Button></div></div><span className="text-xs">{money(item.price * line.quantity)}</span></div>
}
export function BrandLogo() { return <span className="brand-lockup"><span className="brand-symbol">F<sup>3</sup></span><span className="brand-words">Fresh Frozen<br/>Food<span>QUALITY ALWAYS</span></span></span> }
export function SiteShell({ children }: { children: ReactNode }) {
  const shop = useShop(); const [mobileOpen,setMobileOpen] = useState(false); const router = useRouter(); const queryClient = useQueryClient()
  useEffect(() => { const { data } = supabase.auth.onAuthStateChange(event => { if (!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)) return; router.invalidate(); if (event !== 'SIGNED_OUT') queryClient.invalidateQueries() }); return () => data.subscription.unsubscribe() }, [router,queryClient])
  const links = <><Link className="nav-link" to="/" onClick={() => setMobileOpen(false)}>Home</Link><Link className="nav-link" to="/menu" onClick={() => setMobileOpen(false)}>Our Menu</Link><Link className="nav-link" to="/story" onClick={() => setMobileOpen(false)}>Our Story</Link><Link className="nav-link" to="/gallery" onClick={() => setMobileOpen(false)}>Gallery</Link><Link className="nav-link" to="/delivery" onClick={() => setMobileOpen(false)}>Delivery & Contact</Link></>
  return <><header className="site-header"><div className="header-inner"><Link to="/" aria-label="Fresh Frozen Food home"><BrandLogo/></Link><nav className="desktop-nav" aria-label="Main navigation">{links}</nav><div className="header-actions"><Button variant="ghost" size="icon" aria-label={`Open cart, ${shop.count} items`} onClick={shop.openCart}><ShoppingBag className="size-5"/>{shop.count > 0 && <span className="text-[10px]">{shop.count}</span>}</Button><Button variant="editorial" className="header-order" asChild><Link to="/menu">Order now <ArrowRight/></Link></Button><Button variant="ghost" size="icon" className="menu-toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</Button></div></div>{mobileOpen && <nav className="mobile-nav" aria-label="Mobile navigation">{links}</nav>}</header>
    <main>{children}</main>
    <footer className="footer"><div className="footer-inner"><div><Link to="/"><BrandLogo/></Link><p className="mt-5 max-w-xs">A world of flavour, closer to home.<br/>Your frozen favourites, from Pune.</p><a href={business.instagram} target="_blank" rel="noreferrer" aria-label="Fresh Frozen Food Instagram"><Instagram className="size-4"/></a></div><div><h4 className="footer-title">Explore</h4><Link to="/menu">Our menu</Link><Link to="/story">Our story</Link><Link to="/gallery">The gallery</Link><Link to="/delivery">Delivery & contact</Link></div><div><h4 className="footer-title">Get in touch</h4><a href={`tel:+91${business.phone}`}>+91 {business.phone}</a><a href={`tel:+91${business.otherPhone}`}>+91 {business.otherPhone}</a><a href={business.whatsapp} target="_blank" rel="noreferrer">Chat on WhatsApp ↗</a></div><div><h4 className="footer-title">Find us</h4><p>{business.address}</p><a href={business.maps} target="_blank" rel="noreferrer">View on Google Maps ↗</a><p>Call to confirm order timings.</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Fresh Frozen Food. All rights reserved.</span><span>Special tasty. Quality always.</span><Link to="/admin">Staff access</Link></div></footer>
    <a className="whatsapp-float" href={`${business.whatsapp}?text=${encodeURIComponent('Hello Fresh Frozen Food! I would like to know more about your menu and delivery.')}`} target="_blank" rel="noreferrer" aria-label="Chat with Fresh Frozen Food on WhatsApp" title="Chat on WhatsApp"><MessageCircle className="size-23"/></a>
  </>
}
export function MenuItemCard({ item, label }: { item: MenuItem; label?: string }) {
  const shop = useShop(); const quantity = shop.cart.find(line => line.id === item.id)?.quantity || 0
  return <article className="dish-card"><div className="dish-image"><img src={item.image} alt={item.name} loading="lazy" width="600" height="540"/>{label && <span className="dish-label">{label}</span>}</div><div className="dish-info"><h3>{item.name}</h3><p>{item.description}</p><div className="dish-bottom"><span className="dish-price"><span className={`veg-mark ${item.veg ? 'is-veg' : ''}`} aria-label={item.veg ? 'Vegetarian' : 'Non-vegetarian'}/>{money(item.price)}<small>Indicative · {item.unit}</small></span>{quantity ? <div className="quantity-control"><Button variant="outline" size="icon" aria-label={`Remove one ${item.name}`} onClick={() => shop.change(item.id,-1)}><Minus/></Button><span className="w-5 text-xs text-center">{quantity}</span><Button variant="outline" size="icon" aria-label={`Add one ${item.name}`} onClick={() => shop.add(item.id)} disabled={quantity >= 20}><Plus/></Button></div> : <Button variant="outline" size="sm" aria-label={`Add ${item.name} to cart`} onClick={() => shop.add(item.id)}>Add <Plus className="size-3"/></Button>}</div></div></article>
}