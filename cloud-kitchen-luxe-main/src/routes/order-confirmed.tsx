import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useShop } from '@/components/shop-shell'
import { business, money, pageHead } from '@/lib/brand'

export const Route = createFileRoute('/order-confirmed')({ head: () => pageHead('Order confirmed', 'Your Fresh Frozen Food order has been received.'), component: Confirmed })
function Confirmed() {
  const { receipt } = useShop()
  return <div className="page-intro">
    <span className="eyebrow text-primary">Thank you</span>
    {receipt ? <>
      <h1>Order {receipt.number} confirmed.</h1>
      <p>Total {money(receipt.total)}, payable cash on delivery. Estimated delivery in about {receipt.eta} minutes. Our team will call to confirm.</p>
      <div className="flex gap-3 flex-wrap mt-4">
        <Button variant="editorial" asChild><a href={`${business.whatsapp}?text=${encodeURIComponent(`Hello! I just placed order ${receipt.number}.`)}`} target="_blank" rel="noreferrer">Message us on WhatsApp</a></Button>
        <Button variant="text" asChild><Link to="/menu">Order more</Link></Button>
      </div>
    </> : <><h1>No recent order.</h1><p>Place an order from our menu to see your confirmation here.</p><Button variant="editorial" asChild><Link to="/menu">Explore the menu</Link></Button></>}
  </div>
}
