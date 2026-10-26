import {referenceShape} from './referenceGeometry.ts';
export type ContinentId = 'na' | 'sa' | 'eu' | 'af' | 'as' | 'oc';
export type Territory = {
  id: number;
  name: string;
  short: string;
  continent: ContinentId;
  points: number;
  neighbors: number[];
  x: number;
  y: number;
  path: string;
};
export const continents = [{
  id: 'na',
  name: 'Nord America',
  bonus: 5,
  color: '#89642d',
  points: 35
}, {
  id: 'sa',
  name: 'Sud America',
  bonus: 2,
  color: '#53776a',
  points: 12
}, {
  id: 'eu',
  name: 'Europa',
  bonus: 5,
  color: '#4e315c',
  points: 32
}, {
  id: 'af',
  name: 'Africa',
  bonus: 3,
  color: '#806231',
  points: 23
}, {
  id: 'as',
  name: 'Asia',
  bonus: 7,
  color: '#456737',
  points: 51
}, {
  id: 'oc',
  name: 'Oceania',
  bonus: 2,
  color: '#873d69',
  points: 11
}] as const;
// IDs remain stable across save schema versions. Geometry is an original stylized world map.
const rows: [string, string, ContinentId, number[], number, number, string][] = [['Alaska', 'Alaska', 'na', [1, 3, 29], 103, 127, 'M45 100L95 79L152 90L154 146L114 163L74 151L45 164L24 145Z'], ['Territori del Nord Ovest', 'Nord Ovest', 'na', [0, 2, 3, 4], 220, 105, 'M154 88L211 69L278 82L301 115L274 150L225 144L154 146Z'], ['Groenlandia', 'Groenlandia', 'na', [1, 4, 5, 13], 377, 83, 'M325 48L390 29L430 59L412 107L370 137L326 119L301 115Z'], ['Alberta', 'Alberta', 'na', [0, 1, 4, 6], 169, 183, 'M114 163L154 146L225 144L230 211L188 229L128 216Z'], ['Ontario', 'Ontario', 'na', [1, 2, 3, 5, 6, 7], 264, 184, 'M225 144L274 150L301 115L326 119L328 195L290 222L230 211Z'], ['Quebec', 'Québec', 'na', [2, 4, 7], 361, 179, 'M328 137L370 137L402 164L415 203L371 224L328 195Z'], ['Stati Uniti Occidentali', 'USA Ovest', 'na', [3, 4, 7, 8], 189, 267, 'M128 216L188 229L230 211L240 289L204 309L154 293Z'], ['Stati Uniti Orientali', 'USA Est', 'na', [4, 5, 6, 8], 297, 259, 'M230 211L290 222L328 195L371 224L350 258L308 280L288 311L240 289Z'], ['America Centrale', 'America Centr.', 'na', [6, 7, 9], 259, 341, 'M204 309L240 289L288 311L274 337L299 359L310 381L291 394L264 369L241 364Z'], ['Venezuela', 'Venezuela', 'sa', [8, 10, 11], 341, 399, 'M291 394L310 381L361 370L404 396L390 430L344 437L311 423Z'], ['Perù', 'Perù', 'sa', [9, 11, 12], 326, 470, 'M311 423L344 437L359 493L342 528L310 504L288 447Z'], ['Brasile', 'Brasile', 'sa', [9, 10, 12, 20], 407, 465, 'M344 437L390 430L404 396L447 416L465 456L438 501L391 529L359 493Z'], ['Argentina', 'Argentina', 'sa', [10, 11], 365, 565, 'M342 528L359 493L391 529L392 558L363 620L340 609L327 552Z'], ['Islanda', 'Islanda', 'eu', [2, 14, 15], 510, 121, 'M475 104L516 91L541 112L532 138L492 145L473 126Z'], ['Gran Bretagna', 'Gran Bretagna', 'eu', [13, 15, 16, 17], 511, 211, 'M490 167L514 156L530 181L520 210L539 234L522 252L488 243L475 215Z'], ['Scandinavia', 'Scandinavia', 'eu', [13, 14, 17, 19], 611, 130, 'M580 154L588 103L628 64L653 77L646 121L628 167L601 185Z'], ['Europa Occidentale', 'Europa Ovest', 'eu', [14, 17, 18, 20], 523, 295, 'M494 262L535 255L564 279L550 315L520 332L485 313Z'], ['Europa Settentrionale', 'Europa Nord', 'eu', [14, 15, 16, 18, 19], 606, 222, 'M557 186L601 185L628 167L660 194L650 248L601 260L564 247Z'], ['Europa Meridionale', 'Europa Sud', 'eu', [16, 17, 19, 20, 21, 34], 621, 291, 'M564 247L601 260L650 248L676 280L663 313L634 310L641 335L618 328L603 307L550 315L564 279Z'], ['Ucraina', 'Ucraina', 'eu', [15, 17, 18, 26, 33, 34], 714, 191, 'M653 77L716 84L753 129L756 216L722 260L676 280L650 248L660 194L628 167L646 121Z'], ['Africa del Nord', 'Africa Nord', 'af', [11, 16, 18, 21, 22, 23], 548, 401, 'M499 355L543 342L586 354L608 400L592 447L538 460L488 437L478 396Z'], ['Egitto', 'Egitto', 'af', [18, 20, 23, 34], 651, 377, 'M586 354L637 345L680 354L693 394L663 415L608 400Z'], ['Congo', 'Congo', 'af', [20, 23, 24], 611, 478, 'M538 460L592 447L634 458L641 511L612 534L567 510Z'], ['Africa Orientale', 'Africa Est', 'af', [20, 21, 22, 24, 25], 695, 452, 'M608 400L663 415L693 394L718 425L751 420L736 458L712 484L697 530L641 511L634 458L592 447Z'], ['Africa del Sud', 'Africa Sud', 'af', [22, 23, 25], 656, 565, 'M567 510L612 534L641 511L697 530L689 568L652 611L613 602L594 558Z'], ['Madagascar', 'Madagascar', 'af', [23, 24], 764, 548, 'M766 509L784 520L778 563L755 589L743 570L751 536Z'], ['Urali', 'Urali', 'as', [19, 27, 33, 35], 803, 168, 'M753 129L790 91L831 104L845 171L820 226L756 216Z'], ['Siberia', 'Siberia', 'as', [26, 28, 30, 31, 35], 881, 141, 'M831 104L864 70L916 79L930 129L910 180L900 226L845 171Z'], ['Jacuzia', 'Jacuzia', 'as', [27, 29, 30], 986, 104, 'M916 79L969 59L1037 73L1058 120L1023 146L980 151L930 129Z'], ['Kamchatka', 'Kamchatka', 'as', [0, 28, 30, 31, 32], 1111, 150, 'M1037 73L1096 65L1179 99L1181 135L1147 163L1141 207L1115 215L1081 165L1058 120Z'], ['Cita', 'Cita', 'as', [27, 28, 29, 31], 984, 204, 'M930 129L980 151L1023 146L1058 120L1081 165L1050 224L1000 246L950 241L910 180Z'], ['Mongolia', 'Mongolia', 'as', [27, 29, 30, 32, 35], 1020, 275, 'M900 226L950 241L1000 246L1050 224L1081 165L1115 215L1112 257L1080 301L1005 313L941 286Z'], ['Giappone', 'Giappone', 'as', [29, 31], 1166, 288, 'M1168 235L1187 242L1181 277L1167 301L1141 326L1126 315L1148 285Z'], ['Afghanistan', 'Afghanistan', 'as', [19, 26, 34, 35], 802, 280, 'M756 216L820 226L861 256L850 310L805 331L755 312L722 260Z'], ['Medio Oriente', 'Medio Oriente', 'as', [18, 19, 21, 33, 35, 36], 754, 370, 'M676 280L722 260L755 312L805 331L834 366L817 403L778 418L741 403L721 374L680 354L663 313Z'], ['Cina', 'Cina', 'as', [26, 27, 31, 33, 34, 36, 37], 935, 344, 'M845 171L900 226L941 286L1005 313L1080 301L1072 343L1028 379L985 389L946 367L908 402L869 364L834 366L805 331L850 310L861 256L820 226Z'], ['India', 'India', 'as', [34, 35, 37], 884, 431, 'M834 366L869 364L908 402L946 367L953 416L926 439L905 483L883 482L858 435L817 403Z'], ['Siam', 'Siam', 'as', [35, 36, 38], 1015, 426, 'M985 389L1028 379L1050 408L1036 438L1054 477L1034 494L1009 451L978 442L953 416L946 367Z'], ['Indonesia', 'Indonesia', 'oc', [37, 39, 40], 1007, 533, 'M950 498L981 505L1007 518L1034 494L1054 510L1064 536L1030 553L995 548L965 536Z'], ['Nuova Guinea', 'Nuova Guinea', 'oc', [38, 40, 41], 1139, 504, 'M1086 477L1124 470L1150 485L1181 490L1191 515L1150 531L1121 515L1090 512Z'], ['Australia Occidentale', 'Australia Ovest', 'oc', [38, 39, 41], 1055, 596, 'M1001 568L1049 554L1092 569L1103 628L1068 651L1010 640L985 610Z'], ['Australia Orientale', 'Australia Est', 'oc', [39, 40], 1151, 595, 'M1092 569L1140 539L1170 556L1201 614L1174 652L1133 657L1103 628Z']];
export const territories: Territory[] = rows.map(([name, short, continent, neighbors, x, y, path], id) => ({
  id,
  name,
  short,
  continent,
  neighbors,
  points: neighbors.length,
  x,
  y,
  path,
  ...referenceShape(id)
}));
export const ids = (c: ContinentId) => territories.filter(t => t.continent === c).map(t => t.id);
export const cardSymbols = ['cannone', 'fante', 'cavaliere'] as const;
export const cards = [...territories.map(t => ({
  id: t.id,
  territory: t.id,
  symbol: cardSymbols[t.id % 3] as string
})), {
  id: 42,
  territory: null,
  symbol: 'jolly'
}, {
  id: 43,
  territory: null,
  symbol: 'jolly'
}];
const NA = ids('na'),
  SA = ids('sa'),
  EU = ids('eu'),
  AF = ids('af'),
  AS = ids('as'),
  OC = ids('oc');
const objectivesData: [string, number[]][] = [['Letto', [...NA, ...SA, 20, 21, 22, 23, 34, 36, 37, 38, 39, 40]], ['Quattro in Nord', [...EU, ...AF, 2, 4, 5, 7, 26, 33, 34]], ['Ciclista', [...EU, ...AF, ...OC, 26, 33, 34, 36, 37]], ['Buco', [...NA, ...AF, ...EU.filter(id => id !== 16)]], ['Diagonale', [...NA, ...OC, 13, 15, 19, 26, 33, 34, 35, 36, 37]], ['Formula 1', [...SA, ...OC, ...EU, 20, 21, 23, 33, 34, 36, 37]], ['Tre A', [...AS, ...AF, ...SA]], ['Kamchatka e Giappone', [...NA, ...EU, ...SA, 29, 32]], ['Eurasia', [...AS, ...EU, 38]], ['Nord mondo', [...NA, ...EU, 26, 27, 28, 29, 32]], ['Siberiana', [...EU, ...AF, ...SA, 26, 27, 33, 34]], ['Tappeto', [...AS, ...AF, 18, 19]], ['Guerra fredda', [...AS, ...NA]], ['Sud mondo', [...SA, ...OC, ...AF, 16, 18, 34, 36, 37, 30, 31, 32, 35]], ['Alaska e Alberta', [...AS, ...OC, ...AF.filter(id => id !== 20), 0, 3]], ['Tre in Europa', [...NA, ...SA, ...AF, 16, 18, 19]]];
export const objectives = objectivesData.map(([name, territoryIds], i) => ({
  id: i + 1,
  name,
  territories: territoryIds.sort((a, b) => a - b)
}));
export const seaLinks = [[0, 29], [2, 13], [8, 9], [11, 20], [16, 20], [18, 20], [18, 21], [21, 34], [37, 38], [38, 39], [38, 40], [39, 40], [39, 41], [23, 25], [24, 25], [29, 32], [31, 32], [13, 14], [13, 15], [14, 15], [14, 16], [14, 17]];
export const colors = ['#2458ee', '#d91e34', '#303a3d', '#269459', '#f0d846'];
export const objectivePoints = (id: number, owned: number[]) => objectives[id - 1].territories.reduce((sum, t) => sum + (owned.includes(t) ? territories[t].points : 0), 0);
