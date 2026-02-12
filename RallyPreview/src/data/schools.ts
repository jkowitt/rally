/**
 * Van Wagner Sports & Entertainment — Collegiate Properties.
 * Complete list of confirmed MMR (Multimedia Rights) partnerships.
 *
 * Sources: Van Wagner press releases, school athletic department announcements,
 * and confirmed partnership disclosures (2017-2026).
 *
 * Note: Van Wagner has NO confirmed D3 partnerships. D3 filter retained for future use.
 */

export type Division = 'D1' | 'D2' | 'D3';

export interface School {
  id: string;
  name: string;
  shortName: string;
  mascot: string;
  division: Division;
  conference: string;
  primaryColor: string;
  secondaryColor: string;
  city: string;
  state: string;
}

export const SCHOOLS: School[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — ACC (Power Conference)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'boston-college',
    name: 'Boston College',
    shortName: 'BC',
    mascot: 'Eagles',
    division: 'D1',
    conference: 'ACC',
    primaryColor: '#8C2633',
    secondaryColor: '#B29D6C',
    city: 'Chestnut Hill',
    state: 'MA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Big 12 (National Sales)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'arizona-state',
    name: 'Arizona State University',
    shortName: 'ASU',
    mascot: 'Sun Devils',
    division: 'D1',
    conference: 'Big 12',
    primaryColor: '#8C1D40',
    secondaryColor: '#FFC627',
    city: 'Tempe',
    state: 'AZ',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — AAC
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'temple',
    name: 'Temple University',
    shortName: 'Temple',
    mascot: 'Owls',
    division: 'D1',
    conference: 'AAC',
    primaryColor: '#9D2235',
    secondaryColor: '#FFFFFF',
    city: 'Philadelphia',
    state: 'PA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Mid-American Conference (MAC)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'central-michigan',
    name: 'Central Michigan University',
    shortName: 'CMU',
    mascot: 'Chippewas',
    division: 'D1',
    conference: 'MAC',
    primaryColor: '#6A0032',
    secondaryColor: '#FFC82E',
    city: 'Mount Pleasant',
    state: 'MI',
  },
  {
    id: 'kent-state',
    name: 'Kent State University',
    shortName: 'Kent St.',
    mascot: 'Golden Flashes',
    division: 'D1',
    conference: 'MAC',
    primaryColor: '#002664',
    secondaryColor: '#EAAB00',
    city: 'Kent',
    state: 'OH',
  },
  {
    id: 'miami-oh',
    name: 'Miami University',
    shortName: 'Miami (OH)',
    mascot: 'RedHawks',
    division: 'D1',
    conference: 'MAC',
    primaryColor: '#C3142D',
    secondaryColor: '#FFFFFF',
    city: 'Oxford',
    state: 'OH',
  },
  {
    id: 'northern-illinois',
    name: 'Northern Illinois University',
    shortName: 'NIU',
    mascot: 'Huskies',
    division: 'D1',
    conference: 'MAC',
    primaryColor: '#BA0C2F',
    secondaryColor: '#000000',
    city: 'DeKalb',
    state: 'IL',
  },
  {
    id: 'western-michigan',
    name: 'Western Michigan University',
    shortName: 'WMU',
    mascot: 'Broncos',
    division: 'D1',
    conference: 'MAC',
    primaryColor: '#362215',
    secondaryColor: '#B5A36A',
    city: 'Kalamazoo',
    state: 'MI',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Sun Belt Conference
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'coastal-carolina',
    name: 'Coastal Carolina University',
    shortName: 'CCU',
    mascot: 'Chanticleers',
    division: 'D1',
    conference: 'Sun Belt',
    primaryColor: '#006F71',
    secondaryColor: '#A27752',
    city: 'Conway',
    state: 'SC',
  },
  {
    id: 'georgia-state',
    name: 'Georgia State University',
    shortName: 'Georgia St.',
    mascot: 'Panthers',
    division: 'D1',
    conference: 'Sun Belt',
    primaryColor: '#0039A6',
    secondaryColor: '#CC0000',
    city: 'Atlanta',
    state: 'GA',
  },
  {
    id: 'ulm',
    name: 'University of Louisiana Monroe',
    shortName: 'ULM',
    mascot: 'Warhawks',
    division: 'D1',
    conference: 'Sun Belt',
    primaryColor: '#840029',
    secondaryColor: '#B3985A',
    city: 'Monroe',
    state: 'LA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Conference USA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'fiu',
    name: 'Florida International University',
    shortName: 'FIU',
    mascot: 'Panthers',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#002F65',
    secondaryColor: '#B6862C',
    city: 'Miami',
    state: 'FL',
  },
  {
    id: 'kennesaw-state',
    name: 'Kennesaw State University',
    shortName: 'Kennesaw St.',
    mascot: 'Owls',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#231F20',
    secondaryColor: '#FDBB30',
    city: 'Kennesaw',
    state: 'GA',
  },
  {
    id: 'liberty',
    name: 'Liberty University',
    shortName: 'Liberty',
    mascot: 'Flames',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#002D62',
    secondaryColor: '#C41230',
    city: 'Lynchburg',
    state: 'VA',
  },
  {
    id: 'mtsu',
    name: 'Middle Tennessee State University',
    shortName: 'MTSU',
    mascot: 'Blue Raiders',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#0066CC',
    secondaryColor: '#FFFFFF',
    city: 'Murfreesboro',
    state: 'TN',
  },
  {
    id: 'nm-state',
    name: 'New Mexico State University',
    shortName: 'NM State',
    mascot: 'Aggies',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#891216',
    secondaryColor: '#FFFFFF',
    city: 'Las Cruces',
    state: 'NM',
  },
  {
    id: 'sam-houston',
    name: 'Sam Houston State University',
    shortName: 'Sam Houston',
    mascot: 'Bearkats',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#F58025',
    secondaryColor: '#FFFFFF',
    city: 'Huntsville',
    state: 'TX',
  },
  {
    id: 'utep',
    name: 'University of Texas at El Paso',
    shortName: 'UTEP',
    mascot: 'Miners',
    division: 'D1',
    conference: 'CUSA',
    primaryColor: '#FF8200',
    secondaryColor: '#041E42',
    city: 'El Paso',
    state: 'TX',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — CAA (Colonial Athletic Association)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'stony-brook',
    name: 'Stony Brook University',
    shortName: 'Stony Brook',
    mascot: 'Seawolves',
    division: 'D1',
    conference: 'CAA',
    primaryColor: '#990000',
    secondaryColor: '#003DA5',
    city: 'Stony Brook',
    state: 'NY',
  },
  {
    id: 'towson',
    name: 'Towson University',
    shortName: 'Towson',
    mascot: 'Tigers',
    division: 'D1',
    conference: 'CAA',
    primaryColor: '#FFB81C',
    secondaryColor: '#000000',
    city: 'Towson',
    state: 'MD',
  },
  {
    id: 'william-mary',
    name: 'College of William & Mary',
    shortName: 'W&M',
    mascot: 'Tribe',
    division: 'D1',
    conference: 'CAA',
    primaryColor: '#115740',
    secondaryColor: '#B0A36F',
    city: 'Williamsburg',
    state: 'VA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — SoCon (Southern Conference)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'etsu',
    name: 'East Tennessee State University',
    shortName: 'ETSU',
    mascot: 'Buccaneers',
    division: 'D1',
    conference: 'SoCon',
    primaryColor: '#041E42',
    secondaryColor: '#FFC72C',
    city: 'Johnson City',
    state: 'TN',
  },
  {
    id: 'furman',
    name: 'Furman University',
    shortName: 'Furman',
    mascot: 'Paladins',
    division: 'D1',
    conference: 'SoCon',
    primaryColor: '#582C83',
    secondaryColor: '#FFFFFF',
    city: 'Greenville',
    state: 'SC',
  },
  {
    id: 'samford',
    name: 'Samford University',
    shortName: 'Samford',
    mascot: 'Bulldogs',
    division: 'D1',
    conference: 'SoCon',
    primaryColor: '#002855',
    secondaryColor: '#CC0000',
    city: 'Birmingham',
    state: 'AL',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Patriot League
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'american',
    name: 'American University',
    shortName: 'American',
    mascot: 'Eagles',
    division: 'D1',
    conference: 'Patriot League',
    primaryColor: '#ED1B34',
    secondaryColor: '#00205C',
    city: 'Washington',
    state: 'DC',
  },
  {
    id: 'loyola-md',
    name: 'Loyola University Maryland',
    shortName: 'Loyola MD',
    mascot: 'Greyhounds',
    division: 'D1',
    conference: 'Patriot League',
    primaryColor: '#00694E',
    secondaryColor: '#A0A0A3',
    city: 'Baltimore',
    state: 'MD',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — WCC (West Coast Conference)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'loyola-marymount',
    name: 'Loyola Marymount University',
    shortName: 'LMU',
    mascot: 'Lions',
    division: 'D1',
    conference: 'WCC',
    primaryColor: '#00355F',
    secondaryColor: '#8B2131',
    city: 'Los Angeles',
    state: 'CA',
  },
  {
    id: 'pepperdine',
    name: 'Pepperdine University',
    shortName: 'Pepperdine',
    mascot: 'Waves',
    division: 'D1',
    conference: 'WCC',
    primaryColor: '#00205C',
    secondaryColor: '#F68B1F',
    city: 'Malibu',
    state: 'CA',
  },
  {
    id: 'portland',
    name: 'University of Portland',
    shortName: 'Portland',
    mascot: 'Pilots',
    division: 'D1',
    conference: 'WCC',
    primaryColor: '#3E2080',
    secondaryColor: '#FFFFFF',
    city: 'Portland',
    state: 'OR',
  },
  {
    id: 'san-francisco',
    name: 'University of San Francisco',
    shortName: 'USF',
    mascot: 'Dons',
    division: 'D1',
    conference: 'WCC',
    primaryColor: '#00543C',
    secondaryColor: '#FDBB30',
    city: 'San Francisco',
    state: 'CA',
  },
  {
    id: 'santa-clara',
    name: 'Santa Clara University',
    shortName: 'Santa Clara',
    mascot: 'Broncos',
    division: 'D1',
    conference: 'WCC',
    primaryColor: '#862633',
    secondaryColor: '#FFFFFF',
    city: 'Santa Clara',
    state: 'CA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — A-10 (Atlantic 10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'la-salle',
    name: 'La Salle University',
    shortName: 'La Salle',
    mascot: 'Explorers',
    division: 'D1',
    conference: 'A-10',
    primaryColor: '#003DA5',
    secondaryColor: '#FFB81C',
    city: 'Philadelphia',
    state: 'PA',
  },
  {
    id: 'saint-josephs',
    name: "Saint Joseph's University",
    shortName: "Saint Joe's",
    mascot: 'Hawks',
    division: 'D1',
    conference: 'A-10',
    primaryColor: '#9E1B34',
    secondaryColor: '#A0A0A3',
    city: 'Philadelphia',
    state: 'PA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — MAAC (Metro Atlantic Athletic Conference)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'canisius',
    name: 'Canisius University',
    shortName: 'Canisius',
    mascot: 'Golden Griffins',
    division: 'D1',
    conference: 'MAAC',
    primaryColor: '#0038A8',
    secondaryColor: '#FFB81C',
    city: 'Buffalo',
    state: 'NY',
  },
  {
    id: 'fairfield',
    name: 'Fairfield University',
    shortName: 'Fairfield',
    mascot: 'Stags',
    division: 'D1',
    conference: 'MAAC',
    primaryColor: '#CC0000',
    secondaryColor: '#FFFFFF',
    city: 'Fairfield',
    state: 'CT',
  },
  {
    id: 'niagara',
    name: 'Niagara University',
    shortName: 'Niagara',
    mascot: 'Purple Eagles',
    division: 'D1',
    conference: 'MAAC',
    primaryColor: '#582C83',
    secondaryColor: '#FFFFFF',
    city: 'Lewiston',
    state: 'NY',
  },
  {
    id: 'rider',
    name: 'Rider University',
    shortName: 'Rider',
    mascot: 'Broncs',
    division: 'D1',
    conference: 'MAAC',
    primaryColor: '#841B2D',
    secondaryColor: '#A0A0A3',
    city: 'Lawrenceville',
    state: 'NJ',
  },
  {
    id: 'saint-peters',
    name: "Saint Peter's University",
    shortName: "Saint Peter's",
    mascot: 'Peacocks',
    division: 'D1',
    conference: 'MAAC',
    primaryColor: '#003DA5',
    secondaryColor: '#FFFFFF',
    city: 'Jersey City',
    state: 'NJ',
  },
  {
    id: 'siena',
    name: 'Siena College',
    shortName: 'Siena',
    mascot: 'Saints',
    division: 'D1',
    conference: 'MAAC',
    primaryColor: '#006747',
    secondaryColor: '#FDBB30',
    city: 'Loudonville',
    state: 'NY',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — America East
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'maine',
    name: 'University of Maine',
    shortName: 'Maine',
    mascot: 'Black Bears',
    division: 'D1',
    conference: 'America East',
    primaryColor: '#003263',
    secondaryColor: '#FFFFFF',
    city: 'Orono',
    state: 'ME',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — ASUN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'jacksonville',
    name: 'Jacksonville University',
    shortName: 'JU',
    mascot: 'Dolphins',
    division: 'D1',
    conference: 'ASUN',
    primaryColor: '#006747',
    secondaryColor: '#FFFFFF',
    city: 'Jacksonville',
    state: 'FL',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Big South
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'longwood',
    name: 'Longwood University',
    shortName: 'Longwood',
    mascot: 'Lancers',
    division: 'D1',
    conference: 'Big South',
    primaryColor: '#003DA5',
    secondaryColor: '#FFFFFF',
    city: 'Farmville',
    state: 'VA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — Missouri Valley (MVC)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'valparaiso',
    name: 'Valparaiso University',
    shortName: 'Valpo',
    mascot: 'Beacons',
    division: 'D1',
    conference: 'MVC',
    primaryColor: '#613318',
    secondaryColor: '#FDBB30',
    city: 'Valparaiso',
    state: 'IN',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — OVC (Ohio Valley Conference)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'little-rock',
    name: 'UA Little Rock',
    shortName: 'Little Rock',
    mascot: 'Trojans',
    division: 'D1',
    conference: 'OVC',
    primaryColor: '#8B0000',
    secondaryColor: '#A0A0A3',
    city: 'Little Rock',
    state: 'AR',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D1 — WAC (Western Athletic Conference)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'southern-utah',
    name: 'Southern Utah University',
    shortName: 'SUU',
    mascot: 'Thunderbirds',
    division: 'D1',
    conference: 'WAC',
    primaryColor: '#CC0000',
    secondaryColor: '#000000',
    city: 'Cedar City',
    state: 'UT',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D2 — CIAA (Central Intercollegiate Athletic Association) — HBCUs
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'bluefield-state',
    name: 'Bluefield State University',
    shortName: 'Bluefield St.',
    mascot: 'Big Blues',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#003DA5',
    secondaryColor: '#FFFFFF',
    city: 'Bluefield',
    state: 'WV',
  },
  {
    id: 'bowie-state',
    name: 'Bowie State University',
    shortName: 'Bowie St.',
    mascot: 'Bulldogs',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#000000',
    secondaryColor: '#FFB81C',
    city: 'Bowie',
    state: 'MD',
  },
  {
    id: 'claflin',
    name: 'Claflin University',
    shortName: 'Claflin',
    mascot: 'Panthers',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#800020',
    secondaryColor: '#F47920',
    city: 'Orangeburg',
    state: 'SC',
  },
  {
    id: 'ecsu',
    name: 'Elizabeth City State University',
    shortName: 'ECSU',
    mascot: 'Vikings',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#003DA5',
    secondaryColor: '#FFFFFF',
    city: 'Elizabeth City',
    state: 'NC',
  },
  {
    id: 'fayetteville-state',
    name: 'Fayetteville State University',
    shortName: 'Fayetteville St.',
    mascot: 'Broncos',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#003DA5',
    secondaryColor: '#FFFFFF',
    city: 'Fayetteville',
    state: 'NC',
  },
  {
    id: 'johnson-c-smith',
    name: 'Johnson C. Smith University',
    shortName: 'JCSU',
    mascot: 'Golden Bulls',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#002855',
    secondaryColor: '#FFB81C',
    city: 'Charlotte',
    state: 'NC',
  },
  {
    id: 'lincoln-pa',
    name: 'Lincoln University',
    shortName: 'Lincoln (PA)',
    mascot: 'Lions',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#F47920',
    secondaryColor: '#003DA5',
    city: 'Lincoln University',
    state: 'PA',
  },
  {
    id: 'livingstone',
    name: 'Livingstone College',
    shortName: 'Livingstone',
    mascot: 'Blue Bears',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#003DA5',
    secondaryColor: '#000000',
    city: 'Salisbury',
    state: 'NC',
  },
  {
    id: 'shaw',
    name: 'Shaw University',
    shortName: 'Shaw',
    mascot: 'Bears',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#841B2D',
    secondaryColor: '#FFFFFF',
    city: 'Raleigh',
    state: 'NC',
  },
  {
    id: 'virginia-state',
    name: 'Virginia State University',
    shortName: 'Virginia St.',
    mascot: 'Trojans',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#F47920',
    secondaryColor: '#003DA5',
    city: 'Petersburg',
    state: 'VA',
  },
  {
    id: 'virginia-union',
    name: 'Virginia Union University',
    shortName: 'Virginia Union',
    mascot: 'Panthers',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#841B2D',
    secondaryColor: '#C0C0C0',
    city: 'Richmond',
    state: 'VA',
  },
  {
    id: 'winston-salem-state',
    name: 'Winston-Salem State University',
    shortName: 'WSSU',
    mascot: 'Rams',
    division: 'D2',
    conference: 'CIAA',
    primaryColor: '#CC0000',
    secondaryColor: '#FFFFFF',
    city: 'Winston-Salem',
    state: 'NC',
  },
];

/** All unique divisions present in the data. */
export const DIVISIONS: Division[] = ['D1', 'D2'];

/** All unique conferences, sorted alphabetically. */
export function getConferences(division?: Division): string[] {
  const filtered = division ? SCHOOLS.filter((s) => s.division === division) : SCHOOLS;
  const set = new Set(filtered.map((s) => s.conference));
  return [...set].sort();
}

/** Search/filter schools by query string. */
export function searchSchools(
  query: string,
  division?: Division,
): School[] {
  const q = query.toLowerCase().trim();
  let results = division ? SCHOOLS.filter((s) => s.division === division) : SCHOOLS;
  if (q.length > 0) {
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        s.mascot.toLowerCase().includes(q) ||
        s.conference.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q),
    );
  }
  return results;
}
