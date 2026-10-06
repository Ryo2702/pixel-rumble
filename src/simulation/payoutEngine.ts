import { payoutFor, roundMoney } from '../economy/money';
import { recordResult } from './leaderboardEngine';
import type { AudienceBet, RoundOutcomes, RoundResults, Spectator } from './types';
import type { Prediction } from '../types';

export function predictionWon(bet: Pick<Prediction, 'type' | 'fighterId'>, outcomes: RoundOutcomes): boolean {
  return bet.fighterId === outcomes[bet.type === 'winner' ? 'winner' : bet.type];
}
export function settleAudience(bets: AudienceBet[], people: Map<string, Spectator>, outcomes: RoundOutcomes, now: number) {
  for (const bet of bets) {
    if (bet.status !== 'pending' || bet.isUser) continue;
    const person = people.get(bet.spectatorId);
    if (!person) continue;
    const won = predictionWon(bet, outcomes);
    bet.status = won ? 'won' : 'lost';
    bet.payout = won ? payoutFor(bet.amount, bet.odds) : 0;
    person.balance = roundMoney(person.balance + bet.payout);
    recordResult(person, bet, now);
  }
}
export function resultSummary(round: number, winnerId: string, winnerName: string, odds: number, bets: AudienceBet[]): RoundResults {
  const winners = bets.filter(b => b.status === 'won');
  const best = (score: (b: AudienceBet) => number) => winners.length ? { ...winners.reduce((a, b) => score(a) > score(b) ? a : b) } : null;
  return { round, winnerId, winnerName, odds, winningBets: winners.length, paid: roundMoney(winners.reduce((sum, b) => sum + b.payout, 0)), winners: [...winners].sort((a, b) => b.payout - a.payout).slice(0, 20).map(b => ({ ...b })), biggestWin: best(b => b.payout), highestOdds: best(b => b.odds), biggestProfit: best(b => b.payout - b.amount), user: bets.find(b => b.isUser) ? { ...bets.find(b => b.isUser)! } : null };
}
