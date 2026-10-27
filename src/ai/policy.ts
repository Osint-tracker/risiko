import type {BotPolicy} from '../engine/types.ts';
export const policyOptions = [
 ['weakBorders','Sfrutta i confini deboli','Cogli le conquiste convenienti.'],
 ['continents','Completa continenti','Cerca bonus anche fuori dall’obiettivo.'],
 ['defend','Difendi confini e passaggi','Proteggi gli accessi importanti.'],
 ['disruptGrowth','Ostacola il consolidamento','Intervieni prima che un avversario completi un continente.'],
 ['breakBonus','Interrompi i bonus avversari','Rompi continenti già controllati.'],
 ['containLeader','Contieni il leader','Contrasta chi domina la plancia.'],
 ['eliminate','Cerca eliminazioni vantaggiose','Valuta anche le carte acquisibili.'],
 ['reserve','Conserva una riserva','Evita di lasciare scoperti i confini.']
] as const;
export function botPolicy(value?: Partial<BotPolicy>): BotPolicy {
 return {...Object.fromEntries(policyOptions.map(([key])=>[key,typeof value?.[key]==='boolean'?value[key]:true])),graceRounds:Number.isInteger(value?.graceRounds)?Math.max(0,Math.min(3,value!.graceRounds!)):0} as BotPolicy;
}
