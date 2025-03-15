import type { Bid } from './Bid'

export interface Player {
  name: string
  team: string
  role: string
  quotation: number
  currentBid?: Bid
  paidPrice?: number
  cost?: number
}
