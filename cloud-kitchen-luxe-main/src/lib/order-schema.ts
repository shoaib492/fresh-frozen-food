import { z } from 'zod'
export const checkoutSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2, 'Please enter your full name.').max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  address: z.string().trim().min(12, 'Enter a complete delivery address.').max(500),
  postalCode: z.string().regex(/^411\d{3}$/, 'Please enter a Pune postcode starting with 411.'),
  notes: z.string().trim().max(1000).default(''),
  items: z.array(z.object({ id: z.string().max(80), quantity: z.number().int().min(1).max(20) })).min(1, 'Your cart is empty.').max(30),
  paymentMethod: z.literal('cod'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm the indicative prices and delivery terms.' }) }),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>