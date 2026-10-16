import type { MetricId, Region } from "@/lib/atlas-types";

export type CountryRecord = {
  id: string;
  name: string;
  region: Region;
  population: number | null;
  gdp: number | null;
  life: number | null;
  internet: number | null;
  renewable: number | null;
};

/**
 * Rounded public-style estimates for a 2023 sample.
 * Blank cells in the source table are stored as null ("no estimate").
 * ids match Natural Earth / world-atlas numeric codes, except three
 * geometries that ship without an id and are keyed by their atlas name.
 */
const RAW = `
242|Fiji|Oceania|929000|5800|67.1|68|60
834|Tanzania|Africa|67400000|1200|66.8|32|42
732|W. Sahara|Africa|580000||||
124|Canada|Americas|40000000|53000|82.3|93|68
840|United States of America|Americas|335000000|80000|77.5|92|22
398|Kazakhstan|Asia|19900000|11000|73.6|90|12
860|Uzbekistan|Asia|35700000|2500|72.0|77|12
598|Papua New Guinea|Oceania|10300000|2700|65.6|32|28
360|Indonesia|Asia|278000000|4900|71.1|66|19
032|Argentina|Americas|45700000|13000|76.8|88|30
152|Chile|Americas|19600000|17000|80.7|90|55
180|Dem. Rep. Congo|Africa|102000000|650|61.0|23|99
706|Somalia|Africa|18100000|500|56.8|20|12
404|Kenya|Africa|55100000|2100|63.6|40|90
729|Sudan|Africa|48100000|800|65.6|29|55
148|Chad|Africa|18200000|700|53.0|18|4
332|Haiti|Americas|11700000|1700|64.1|39|15
214|Dominican Rep.|Americas|11300000|10700|74.2|85|16
643|Russia|Europe|144000000|14000|73.2|88|19
044|Bahamas|Americas|410000|34000|74.0|85|1
238|Falkland Is.|Americas|3800|70000|79.5|95|30
578|Norway|Europe|5500000|88000|83.1|98|98
304|Greenland|Americas|56000|54000|73.0|70|72
260|Fr. S. Antarctic Lands|Polar|||||
626|Timor-Leste|Asia|1360000|1500|69.1|41|12
710|South Africa|Africa|60400000|6200|64.1|75|9
426|Lesotho|Africa|2310000|1100|54.3|47|100
484|Mexico|Americas|129000000|13000|75.0|76|20
858|Uruguay|Americas|3400000|21000|78.0|90|91
076|Brazil|Americas|216000000|10000|75.5|84|87
068|Bolivia|Americas|12300000|3700|68.2|70|36
604|Peru|Americas|34300000|7600|77.0|75|55
170|Colombia|Americas|52100000|6900|77.2|73|72
591|Panama|Americas|4460000|17000|78.5|74|68
188|Costa Rica|Americas|5200000|16000|80.0|83|99
558|Nicaragua|Americas|7050000|2300|74.6|55|56
340|Honduras|Americas|10600000|3200|72.9|55|48
222|El Salvador|Americas|6360000|5100|72.7|63|72
320|Guatemala|Americas|18100000|5500|72.0|50|62
084|Belize|Americas|410000|7000|73.0|62|38
862|Venezuela|Americas|28800000|3500|71.8|72|65
328|Guyana|Americas|810000|18000|70.0|80|22
740|Suriname|Americas|620000|5800|72.8|70|42
250|France|Europe|68100000|44000|82.5|92|24
218|Ecuador|Americas|18100000|6500|77.0|70|76
630|Puerto Rico|Americas|3220000|36000|80.2|78|4
388|Jamaica|Americas|2830000|6200|74.5|85|12
192|Cuba|Americas|11100000|9500|78.1|71|5
716|Zimbabwe|Africa|16600000|1700|62.0|35|58
072|Botswana|Africa|2670000|7700|65.9|75|1
516|Namibia|Africa|2600000|4800|64.0|53|32
686|Senegal|Africa|17800000|1700|68.0|60|22
466|Mali|Africa|22600000|900|59.8|40|28
478|Mauritania|Africa|4910000|2100|64.7|60|18
204|Benin|Africa|13700000|1400|61.2|34|6
562|Niger|Africa|27200000|600|62.0|22|2
566|Nigeria|Africa|223000000|2100|54.5|55|24
120|Cameroon|Africa|28600000|1700|62.4|45|62
768|Togo|Africa|9050000|1000|62.7|35|18
288|Ghana|Africa|34100000|2300|64.1|70|56
384|Côte d'Ivoire|Africa|28800000|2500|60.0|45|32
324|Guinea|Africa|14100000|1500|60.9|30|68
624|Guinea-Bissau|Africa|2150000|800|60.0|30|4
430|Liberia|Africa|5410000|750|61.1|30|12
694|Sierra Leone|Africa|8790000|500|60.1|30|72
854|Burkina Faso|Africa|23200000|900|60.2|30|16
140|Central African Rep.|Africa|5740000|480|54.0|11|14
178|Congo|Africa|6100000|2400|63.8|35|78
266|Gabon|Africa|2430000|8500|66.5|72|42
226|Eq. Guinea|Africa|1710000|7500|62.2|55|18
894|Zambia|Africa|20500000|1400|63.0|30|86
454|Malawi|Africa|20900000|600|64.0|25|85
508|Mozambique|Africa|33300000|600|61.2|21|78
748|eSwatini|Africa|1210000|4000|57.7|55|42
024|Angola|Africa|36700000|2500|62.3|33|68
108|Burundi|Africa|13200000|260|62.0|10|72
376|Israel|Asia|9800000|53000|82.6|90|8
422|Lebanon|Asia|5480000|4100|75.0|85|6
450|Madagascar|Africa|30400000|530|65.2|20|42
275|Palestine|Asia|5400000|3600|74.0|75|6
270|Gambia|Africa|2770000|800|63.4|50|4
788|Tunisia|Africa|12400000|3900|74.8|70|4
012|Algeria|Africa|45600000|4900|76.5|71|1
400|Jordan|Asia|11300000|4500|75.0|85|22
784|United Arab Emirates|Asia|9510000|49000|79.0|100|8
634|Qatar|Asia|2710000|82000|80.4|100|0
414|Kuwait|Asia|4310000|37000|80.0|100|0
368|Iraq|Asia|45500000|5500|71.8|75|4
512|Oman|Asia|4640000|21000|73.9|95|1
548|Vanuatu|Oceania|335000|3300|70.4|40|22
116|Cambodia|Asia|16900000|1800|70.0|60|52
764|Thailand|Asia|71800000|7200|79.3|85|15
418|Laos|Asia|7640000|2100|68.1|60|72
104|Myanmar|Asia|54500000|1200|66.8|44|48
704|Vietnam|Asia|98900000|4300|74.5|79|42
408|North Korea|Asia|26200000|640|73.0|0|55
410|South Korea|Asia|51700000|34000|83.5|97|8
496|Mongolia|Asia|3450000|5000|71.0|80|8
356|India|Asia|1428000000|2500|72.0|52|22
050|Bangladesh|Asia|173000000|2700|73.8|39|2
064|Bhutan|Asia|787000|3700|72.2|86|100
524|Nepal|Asia|30800000|1400|70.5|50|98
586|Pakistan|Asia|240000000|1600|66.4|45|28
004|Afghanistan|Asia|42200000|400|63.2|18|82
762|Tajikistan|Asia|10100000|1200|71.2|36|90
417|Kyrgyzstan|Asia|7010000|1700|71.8|70|90
795|Turkmenistan|Asia|6510000|8000|69.1|30|0
364|Iran|Asia|89200000|4500|75.0|79|6
760|Syria|Asia|23200000|850|72.0|45|10
051|Armenia|Asia|2780000|7000|75.1|78|32
752|Sweden|Europe|10500000|56000|83.1|96|68
112|Belarus|Europe|9200000|7800|74.0|85|6
804|Ukraine|Europe|37000000|4800|73.0|80|10
616|Poland|Europe|37700000|19000|77.8|87|22
040|Austria|Europe|9100000|54000|81.6|93|80
348|Hungary|Europe|9600000|19000|76.0|88|16
498|Moldova|Europe|2500000|5700|71.2|80|8
642|Romania|Europe|19100000|16000|75.3|86|46
440|Lithuania|Europe|2830000|25000|76.0|88|70
428|Latvia|Europe|1880000|21000|75.0|91|65
233|Estonia|Europe|1340000|28000|78.2|92|40
276|Germany|Europe|84400000|52000|81.0|92|52
100|Bulgaria|Europe|6500000|14000|74.5|75|20
300|Greece|Europe|10400000|22000|81.0|83|46
792|Turkey|Asia|85800000|11000|77.6|83|42
008|Albania|Europe|2810000|6800|78.0|80|100
191|Croatia|Europe|3860000|19000|78.0|82|66
756|Switzerland|Europe|8850000|100000|83.9|96|72
442|Luxembourg|Europe|660000|128000|82.6|98|16
056|Belgium|Europe|11700000|50000|81.9|93|26
528|Netherlands|Europe|17800000|58000|81.9|95|42
620|Portugal|Europe|10400000|26000|81.8|85|62
724|Spain|Europe|48000000|33000|83.2|94|50
372|Ireland|Europe|5200000|103000|82.4|93|40
540|New Caledonia|Oceania|292000|35000|78.0|82|20
090|Solomon Is.|Oceania|740000|2300|70.3|30|12
554|New Zealand|Oceania|5200000|48000|82.3|94|85
036|Australia|Oceania|26600000|65000|83.2|96|32
144|Sri Lanka|Asia|22000000|3800|76.6|50|42
156|China|Asia|1411000000|12600|78.0|76|31
158|Taiwan|Asia|23500000|33000|80.8|90|8
380|Italy|Europe|58900000|37000|83.0|85|40
208|Denmark|Europe|5940000|68000|81.6|98|80
826|United Kingdom|Europe|68000000|47000|81.2|95|45
352|Iceland|Europe|390000|79000|82.6|100|100
031|Azerbaijan|Asia|10200000|7000|73.5|86|8
268|Georgia|Asia|3700000|6700|72.8|80|78
608|Philippines|Asia|117000000|3800|72.2|70|22
458|Malaysia|Asia|34300000|12000|76.3|97|20
096|Brunei|Asia|453000|32000|75.9|98|0
705|Slovenia|Europe|2110000|32000|81.3|89|36
246|Finland|Europe|5560000|53000|81.7|93|52
703|Slovakia|Europe|5430000|22000|77.2|90|23
203|Czechia|Europe|10500000|28000|79.0|85|15
232|Eritrea|Africa|3750000|600|67.0|20|12
392|Japan|Asia|124000000|34000|84.7|85|22
600|Paraguay|Americas|6860000|6000|73.8|77|100
887|Yemen|Asia|34500000|700|65.0|27|10
682|Saudi Arabia|Asia|36900000|28000|77.9|100|1
010|Antarctica|Polar|||||
N. Cyprus|N. Cyprus|Asia|382000|15000|78.0|80|6
196|Cyprus|Europe|1260000|32000|81.2|90|18
504|Morocco|Africa|37800000|3800|74.8|88|20
818|Egypt|Africa|112000000|3700|70.9|72|12
434|Libya|Africa|6880000|7000|72.2|80|0
231|Ethiopia|Africa|126000000|1000|66.6|20|96
262|Djibouti|Africa|1130000|3500|64.8|60|0
Somaliland|Somaliland|Africa|5700000|700|65.0|25|8
800|Uganda|Africa|48500000|1000|66.2|20|92
646|Rwanda|Africa|14100000|1000|67.1|30|52
070|Bosnia and Herz.|Europe|3210000|7500|77.0|75|42
807|Macedonia|Europe|1830000|7000|75.7|83|28
688|Serbia|Europe|6640000|11000|75.5|84|32
499|Montenegro|Europe|617000|10000|76.8|83|56
Kosovo|Kosovo|Europe|1760000|5400|76.8|90|8
780|Trinidad and Tobago|Americas|1400000|18000|73.5|80|0
728|S. Sudan|Africa|11500000|400|56.0|8|5
`;

const METRIC_KEYS = ["population", "gdp", "life", "internet", "renewable"] as const;

function num(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parse(raw: string): CountryRecord[] {
  return raw
    .trim()
    .split("\n")
    .map((line) => {
      const [id, name, region, population, gdp, life, internet, renewable] = line.split("|");
      return {
        id,
        name,
        region: region as Region,
        population: num(population),
        gdp: num(gdp),
        life: num(life),
        internet: num(internet),
        renewable: num(renewable),
      };
    });
}

export const COUNTRIES: CountryRecord[] = parse(RAW);

export const COUNTRY_BY_ID: ReadonlyMap<string, CountryRecord> = new Map(
  COUNTRIES.map((country) => [country.id, country]),
);

export function metricValue(country: CountryRecord | undefined, metric: MetricId): number | null {
  if (!country) return null;
  const value = country[metric];
  return value;
}

export const SEARCH_ALIASES: Record<string, string[]> = {
  "840": ["usa", "us", "america", "united states"],
  "826": ["uk", "britain", "great britain", "england"],
  "156": ["prc", "people's republic"],
  "643": ["russian federation"],
  "408": ["dprk", "north korea"],
  "410": ["korea", "south korea", "republic of korea"],
  "180": ["drc", "dr congo", "congo kinshasa"],
  "178": ["congo brazzaville", "republic of the congo"],
  "203": ["czech republic"],
  "807": ["north macedonia", "macedonia"],
  "748": ["swaziland", "eswatini"],
  "384": ["ivory coast", "cote divoire", "cote d ivoire"],
  "704": ["viet nam"],
  "418": ["lao", "laos"],
  "104": ["burma", "myanmar"],
  "784": ["uae", "emirates"],
  "158": ["taiwan"],
  "792": ["turkiye", "turkey"],
  "070": ["bosnia", "herzegovina"],
  "214": ["dominican republic", "dominicana"],
  "140": ["car", "central african republic"],
  "729": ["sudan"],
  "728": ["south sudan"],
  "275": ["palestine", "west bank", "gaza"],
  "732": ["western sahara"],
};

void METRIC_KEYS;
