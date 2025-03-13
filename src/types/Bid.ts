import type { Player } from './Player'

export interface Bid {
  playerId: string
  bidderTeamName: string
  bidderParticipantId: string
  amount: number
  replacedPlayer?: Player
  expiresAt: Date
  createdAt: Date
}
