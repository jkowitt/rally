import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function main() {
  console.log('Seeding Rally database...');

  // =====================
  // SCHOOLS & TEAMS
  // =====================
  const schools = [
    // ── College - SEC ──
    { id: 'sch-alabama', name: 'Alabama', mascot: 'Crimson Tide', conference: 'SEC', primaryColor: '#9E1B32', secondaryColor: '#FFFFFF' },
    { id: 'sch-georgia', name: 'Georgia', mascot: 'Bulldogs', conference: 'SEC', primaryColor: '#BA0C2F', secondaryColor: '#000000' },
    { id: 'sch-lsu', name: 'LSU', mascot: 'Tigers', conference: 'SEC', primaryColor: '#461D7C', secondaryColor: '#FDD023' },
    { id: 'sch-tennessee', name: 'Tennessee', mascot: 'Volunteers', conference: 'SEC', primaryColor: '#FF8200', secondaryColor: '#FFFFFF' },
    { id: 'sch-texas', name: 'Texas', mascot: 'Longhorns', conference: 'SEC', primaryColor: '#BF5700', secondaryColor: '#FFFFFF' },
    { id: 'sch-florida', name: 'Florida', mascot: 'Gators', conference: 'SEC', primaryColor: '#0021A5', secondaryColor: '#FA4616' },
    { id: 'sch-texas-am', name: 'Texas A&M', mascot: 'Aggies', conference: 'SEC', primaryColor: '#500000', secondaryColor: '#FFFFFF' },
    // ── College - Big Ten ──
    { id: 'sch-ohio-state', name: 'Ohio State', mascot: 'Buckeyes', conference: 'Big Ten', primaryColor: '#BB0000', secondaryColor: '#666666' },
    { id: 'sch-michigan', name: 'Michigan', mascot: 'Wolverines', conference: 'Big Ten', primaryColor: '#00274C', secondaryColor: '#FFCB05' },
    { id: 'sch-penn-state', name: 'Penn State', mascot: 'Nittany Lions', conference: 'Big Ten', primaryColor: '#041E42', secondaryColor: '#FFFFFF' },
    { id: 'sch-usc', name: 'USC', mascot: 'Trojans', conference: 'Big Ten', primaryColor: '#990000', secondaryColor: '#FFC72C' },
    { id: 'sch-illinois', name: 'Illinois', mascot: 'Fighting Illini', conference: 'Big Ten', primaryColor: '#E84A27', secondaryColor: '#13294B' },
    { id: 'sch-nebraska', name: 'Nebraska', mascot: 'Cornhuskers', conference: 'Big Ten', primaryColor: '#E41C38', secondaryColor: '#FFFFFF' },
    { id: 'sch-indiana', name: 'Indiana', mascot: 'Hoosiers', conference: 'Big Ten', primaryColor: '#990000', secondaryColor: '#FFFFFF' },
    // ── College - Big 12 ──
    { id: 'sch-kansas', name: 'Kansas', mascot: 'Jayhawks', conference: 'Big 12', primaryColor: '#0051BA', secondaryColor: '#E8000D' },
    { id: 'sch-byu', name: 'BYU', mascot: 'Cougars', conference: 'Big 12', primaryColor: '#002E5D', secondaryColor: '#FFFFFF' },
    { id: 'sch-arizona', name: 'Arizona', mascot: 'Wildcats', conference: 'Big 12', primaryColor: '#CC0033', secondaryColor: '#003366' },
    { id: 'sch-iowa-state', name: 'Iowa State', mascot: 'Cyclones', conference: 'Big 12', primaryColor: '#C8102E', secondaryColor: '#F1BE48' },
    { id: 'sch-houston', name: 'Houston', mascot: 'Cougars', conference: 'Big 12', primaryColor: '#C8102E', secondaryColor: '#FFFFFF' },
    { id: 'sch-tcu', name: 'TCU', mascot: 'Horned Frogs', conference: 'Big 12', primaryColor: '#4D1979', secondaryColor: '#A3A9AC' },
    // ── College - ACC ──
    { id: 'sch-clemson', name: 'Clemson', mascot: 'Tigers', conference: 'ACC', primaryColor: '#F56600', secondaryColor: '#522D80' },
    { id: 'sch-miami', name: 'Miami', mascot: 'Hurricanes', conference: 'ACC', primaryColor: '#F47321', secondaryColor: '#005030' },
    { id: 'sch-duke', name: 'Duke', mascot: 'Blue Devils', conference: 'ACC', primaryColor: '#003087', secondaryColor: '#FFFFFF' },
    { id: 'sch-nc-state', name: 'NC State', mascot: 'Wolfpack', conference: 'ACC', primaryColor: '#CC0000', secondaryColor: '#000000' },
    { id: 'sch-virginia', name: 'Virginia', mascot: 'Cavaliers', conference: 'ACC', primaryColor: '#232D4B', secondaryColor: '#F84C1E' },
    { id: 'sch-unc', name: 'North Carolina', mascot: 'Tar Heels', conference: 'ACC', primaryColor: '#7BAFD4', secondaryColor: '#FFFFFF' },
    { id: 'sch-notre-dame', name: 'Notre Dame', mascot: 'Fighting Irish', conference: 'ACC', primaryColor: '#0C2340', secondaryColor: '#C99700' },
    { id: 'sch-fsu', name: 'Florida State', mascot: 'Seminoles', conference: 'ACC', primaryColor: '#782F40', secondaryColor: '#CEB888' },
    // ── College - Big East ──
    { id: 'sch-uconn', name: 'UConn', mascot: 'Huskies', conference: 'Big East', primaryColor: '#000E2F', secondaryColor: '#FFFFFF' },
    // ── College - Other ──
    { id: 'sch-maryland', name: 'Maryland', mascot: 'Terrapins', conference: 'Big Ten', primaryColor: '#E03A3E', secondaryColor: '#FFD520' },
    { id: 'sch-syracuse', name: 'Syracuse', mascot: 'Orange', conference: 'ACC', primaryColor: '#F76900', secondaryColor: '#FFFFFF' },
    // ── NCAA / Conference Tournament entries ──
    { id: 'ncaa-mbb', name: 'NCAA Basketball', mascot: 'March Madness', conference: 'NCAA', primaryColor: '#003DA5', secondaryColor: '#FFFFFF' },
    { id: 'ncaa-baseball', name: 'NCAA Baseball', mascot: 'College World Series', conference: 'NCAA', primaryColor: '#003DA5', secondaryColor: '#FFFFFF' },

    // ── NBA ──
    { id: 'nba-lakers', name: 'Los Angeles Lakers', mascot: 'Lakers', conference: 'NBA - Western', primaryColor: '#552583', secondaryColor: '#FDB927' },
    { id: 'nba-celtics', name: 'Boston Celtics', mascot: 'Celtics', conference: 'NBA - Eastern', primaryColor: '#007A33', secondaryColor: '#BA9653' },
    { id: 'nba-warriors', name: 'Golden State Warriors', mascot: 'Warriors', conference: 'NBA - Western', primaryColor: '#1D428A', secondaryColor: '#FFC72C' },
    { id: 'nba-knicks', name: 'New York Knicks', mascot: 'Knicks', conference: 'NBA - Eastern', primaryColor: '#006BB6', secondaryColor: '#F58426' },
    { id: 'nba-rockets', name: 'Houston Rockets', mascot: 'Rockets', conference: 'NBA - Western', primaryColor: '#CE1141', secondaryColor: '#000000' },
    { id: 'nba-thunder', name: 'Oklahoma City Thunder', mascot: 'Thunder', conference: 'NBA - Western', primaryColor: '#007AC1', secondaryColor: '#EF6100' },
    { id: 'nba-cavaliers', name: 'Cleveland Cavaliers', mascot: 'Cavaliers', conference: 'NBA - Eastern', primaryColor: '#860038', secondaryColor: '#FDBB30' },
    { id: 'nba-nuggets', name: 'Denver Nuggets', mascot: 'Nuggets', conference: 'NBA - Western', primaryColor: '#0E2240', secondaryColor: '#FEC524' },
    { id: 'nba-spurs', name: 'San Antonio Spurs', mascot: 'Spurs', conference: 'NBA - Western', primaryColor: '#C4CED4', secondaryColor: '#000000' },
    { id: 'nba-mavericks', name: 'Dallas Mavericks', mascot: 'Mavericks', conference: 'NBA - Western', primaryColor: '#00538C', secondaryColor: '#002B5E' },
    { id: 'nba-pistons', name: 'Detroit Pistons', mascot: 'Pistons', conference: 'NBA - Eastern', primaryColor: '#C8102E', secondaryColor: '#1D42BA' },
    { id: 'nba-magic', name: 'Orlando Magic', mascot: 'Magic', conference: 'NBA - Eastern', primaryColor: '#0077C0', secondaryColor: '#C4CED4' },
    { id: 'nba-hawks', name: 'Atlanta Hawks', mascot: 'Hawks', conference: 'NBA - Eastern', primaryColor: '#E03A3E', secondaryColor: '#C1D32F' },
    { id: 'nba-bucks', name: 'Milwaukee Bucks', mascot: 'Bucks', conference: 'NBA - Eastern', primaryColor: '#00471B', secondaryColor: '#EEE1C6' },
    { id: 'nba-timberwolves', name: 'Minnesota Timberwolves', mascot: 'Timberwolves', conference: 'NBA - Western', primaryColor: '#0C2340', secondaryColor: '#236192' },
    { id: 'nba-clippers', name: 'Los Angeles Clippers', mascot: 'Clippers', conference: 'NBA - Western', primaryColor: '#C8102E', secondaryColor: '#1D428A' },

    // ── NFL ──
    { id: 'nfl-chiefs', name: 'Kansas City Chiefs', mascot: 'Chiefs', conference: 'NFL - AFC', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
    { id: 'nfl-cowboys', name: 'Dallas Cowboys', mascot: 'Cowboys', conference: 'NFL - NFC', primaryColor: '#003594', secondaryColor: '#869397' },
    { id: 'nfl-eagles', name: 'Philadelphia Eagles', mascot: 'Eagles', conference: 'NFL - NFC', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
    { id: 'nfl-49ers', name: 'San Francisco 49ers', mascot: '49ers', conference: 'NFL - NFC', primaryColor: '#AA0000', secondaryColor: '#B3995D' },
    { id: 'nfl-raiders', name: 'Las Vegas Raiders', mascot: 'Raiders', conference: 'NFL - AFC', primaryColor: '#000000', secondaryColor: '#A5ACAF' },

    // ── MLB ──
    { id: 'mlb-yankees', name: 'New York Yankees', mascot: 'Yankees', conference: 'MLB - AL East', primaryColor: '#003087', secondaryColor: '#E4002C' },
    { id: 'mlb-dodgers', name: 'Los Angeles Dodgers', mascot: 'Dodgers', conference: 'MLB - NL West', primaryColor: '#005A9C', secondaryColor: '#EF3E42' },
    { id: 'mlb-giants', name: 'San Francisco Giants', mascot: 'Giants', conference: 'MLB - NL West', primaryColor: '#FD5A1E', secondaryColor: '#27251F' },
    { id: 'mlb-mets', name: 'New York Mets', mascot: 'Mets', conference: 'MLB - NL East', primaryColor: '#002D72', secondaryColor: '#FF5910' },
    { id: 'mlb-pirates', name: 'Pittsburgh Pirates', mascot: 'Pirates', conference: 'MLB - NL Central', primaryColor: '#27251F', secondaryColor: '#FDB827' },
    { id: 'mlb-braves', name: 'Atlanta Braves', mascot: 'Braves', conference: 'MLB - NL East', primaryColor: '#CE1141', secondaryColor: '#13274F' },
    { id: 'mlb-royals', name: 'Kansas City Royals', mascot: 'Royals', conference: 'MLB - AL Central', primaryColor: '#004687', secondaryColor: '#BD9B60' },
    { id: 'mlb-orioles', name: 'Baltimore Orioles', mascot: 'Orioles', conference: 'MLB - AL East', primaryColor: '#DF4601', secondaryColor: '#000000' },
    { id: 'mlb-twins', name: 'Minnesota Twins', mascot: 'Twins', conference: 'MLB - AL Central', primaryColor: '#002B5C', secondaryColor: '#D31145' },
    { id: 'mlb-cubs', name: 'Chicago Cubs', mascot: 'Cubs', conference: 'MLB - NL Central', primaryColor: '#0E3386', secondaryColor: '#CC3433' },
    { id: 'mlb-redsox', name: 'Boston Red Sox', mascot: 'Red Sox', conference: 'MLB - AL East', primaryColor: '#BD3039', secondaryColor: '#0C2340' },
    { id: 'mlb-reds', name: 'Cincinnati Reds', mascot: 'Reds', conference: 'MLB - NL Central', primaryColor: '#C6011F', secondaryColor: '#000000' },
    { id: 'mlb-angels', name: 'Los Angeles Angels', mascot: 'Angels', conference: 'MLB - AL West', primaryColor: '#BA0021', secondaryColor: '#003263' },
    { id: 'mlb-astros', name: 'Houston Astros', mascot: 'Astros', conference: 'MLB - AL West', primaryColor: '#002D62', secondaryColor: '#EB6E1F' },
    { id: 'mlb-dbacks', name: 'Arizona Diamondbacks', mascot: 'D-backs', conference: 'MLB - NL West', primaryColor: '#A71930', secondaryColor: '#E3D4AD' },
    { id: 'mlb-phillies', name: 'Philadelphia Phillies', mascot: 'Phillies', conference: 'MLB - NL East', primaryColor: '#E81828', secondaryColor: '#002D72' },
    { id: 'mlb-rangers', name: 'Texas Rangers', mascot: 'Rangers', conference: 'MLB - AL West', primaryColor: '#003278', secondaryColor: '#C0111F' },
    { id: 'mlb-cardinals', name: 'St. Louis Cardinals', mascot: 'Cardinals', conference: 'MLB - NL Central', primaryColor: '#C41E3A', secondaryColor: '#0C2340' },
    { id: 'mlb-whitesox', name: 'Chicago White Sox', mascot: 'White Sox', conference: 'MLB - AL Central', primaryColor: '#27251F', secondaryColor: '#C4CED4' },
    { id: 'mlb-brewers', name: 'Milwaukee Brewers', mascot: 'Brewers', conference: 'MLB - NL Central', primaryColor: '#FFC52F', secondaryColor: '#12284B' },
    { id: 'mlb-padres', name: 'San Diego Padres', mascot: 'Padres', conference: 'MLB - NL West', primaryColor: '#2F241D', secondaryColor: '#FFC425' },
    { id: 'mlb-guardians', name: 'Cleveland Guardians', mascot: 'Guardians', conference: 'MLB - AL Central', primaryColor: '#00385D', secondaryColor: '#E50022' },
    { id: 'mlb-mariners', name: 'Seattle Mariners', mascot: 'Mariners', conference: 'MLB - AL West', primaryColor: '#0C2C56', secondaryColor: '#005C5C' },
    { id: 'mlb-tigers', name: 'Detroit Tigers', mascot: 'Tigers', conference: 'MLB - AL Central', primaryColor: '#0C2340', secondaryColor: '#FA4616' },

    // ── NHL ──
    { id: 'nhl-bruins', name: 'Boston Bruins', mascot: 'Bruins', conference: 'NHL - Eastern', primaryColor: '#FCB514', secondaryColor: '#000000' },
    { id: 'nhl-rangers', name: 'New York Rangers', mascot: 'Rangers', conference: 'NHL - Eastern', primaryColor: '#0038A8', secondaryColor: '#CE1126' },
    { id: 'nhl-golden-knights', name: 'Vegas Golden Knights', mascot: 'Golden Knights', conference: 'NHL - Western', primaryColor: '#B4975A', secondaryColor: '#333F42' },
    { id: 'nhl-kings', name: 'Los Angeles Kings', mascot: 'Kings', conference: 'NHL - Western', primaryColor: '#111111', secondaryColor: '#A2AAAD' },
    { id: 'nhl-penguins', name: 'Pittsburgh Penguins', mascot: 'Penguins', conference: 'NHL - Eastern', primaryColor: '#FCB514', secondaryColor: '#000000' },
    { id: 'nhl-flyers', name: 'Philadelphia Flyers', mascot: 'Flyers', conference: 'NHL - Eastern', primaryColor: '#F74902', secondaryColor: '#000000' },
    { id: 'nhl-oilers', name: 'Edmonton Oilers', mascot: 'Oilers', conference: 'NHL - Western', primaryColor: '#041E42', secondaryColor: '#FF4C00' },
    { id: 'nhl-maple-leafs', name: 'Toronto Maple Leafs', mascot: 'Maple Leafs', conference: 'NHL - Eastern', primaryColor: '#00205B', secondaryColor: '#FFFFFF' },
    { id: 'nhl-canadiens', name: 'Montreal Canadiens', mascot: 'Canadiens', conference: 'NHL - Eastern', primaryColor: '#AF1E2D', secondaryColor: '#192168' },
    { id: 'nhl-senators', name: 'Ottawa Senators', mascot: 'Senators', conference: 'NHL - Eastern', primaryColor: '#C52032', secondaryColor: '#C2912C' },
    { id: 'nhl-avalanche', name: 'Colorado Avalanche', mascot: 'Avalanche', conference: 'NHL - Western', primaryColor: '#6F263D', secondaryColor: '#236192' },
    { id: 'nhl-blackhawks', name: 'Chicago Blackhawks', mascot: 'Blackhawks', conference: 'NHL - Western', primaryColor: '#CF0A2C', secondaryColor: '#000000' },
    { id: 'nhl-lightning', name: 'Tampa Bay Lightning', mascot: 'Lightning', conference: 'NHL - Eastern', primaryColor: '#002868', secondaryColor: '#FFFFFF' },
    { id: 'nhl-hurricanes', name: 'Carolina Hurricanes', mascot: 'Hurricanes', conference: 'NHL - Eastern', primaryColor: '#CC0000', secondaryColor: '#000000' },
    { id: 'nhl-stars', name: 'Dallas Stars', mascot: 'Stars', conference: 'NHL - Western', primaryColor: '#006847', secondaryColor: '#8F8F8C' },
    { id: 'nhl-predators', name: 'Nashville Predators', mascot: 'Predators', conference: 'NHL - Western', primaryColor: '#FFB81C', secondaryColor: '#041E42' },
    { id: 'nhl-kraken', name: 'Seattle Kraken', mascot: 'Kraken', conference: 'NHL - Western', primaryColor: '#001628', secondaryColor: '#99D9D9' },
    { id: 'nhl-canucks', name: 'Vancouver Canucks', mascot: 'Canucks', conference: 'NHL - Western', primaryColor: '#00205B', secondaryColor: '#00843D' },
    { id: 'nhl-panthers', name: 'Florida Panthers', mascot: 'Panthers', conference: 'NHL - Eastern', primaryColor: '#041E42', secondaryColor: '#C8102E' },
    { id: 'nhl-islanders', name: 'New York Islanders', mascot: 'Islanders', conference: 'NHL - Eastern', primaryColor: '#00539B', secondaryColor: '#F47D30' },
    { id: 'nhl-devils', name: 'New Jersey Devils', mascot: 'Devils', conference: 'NHL - Eastern', primaryColor: '#CE1126', secondaryColor: '#000000' },
    { id: 'nhl-blues', name: 'St. Louis Blues', mascot: 'Blues', conference: 'NHL - Western', primaryColor: '#002F87', secondaryColor: '#FCB514' },
    { id: 'nhl-blue-jackets', name: 'Columbus Blue Jackets', mascot: 'Blue Jackets', conference: 'NHL - Eastern', primaryColor: '#002654', secondaryColor: '#CE1141' },
    { id: 'nhl-capitals', name: 'Washington Capitals', mascot: 'Capitals', conference: 'NHL - Eastern', primaryColor: '#C8102E', secondaryColor: '#041E42' },
    { id: 'nhl-red-wings', name: 'Detroit Red Wings', mascot: 'Red Wings', conference: 'NHL - Eastern', primaryColor: '#CE1126', secondaryColor: '#FFFFFF' },
    { id: 'nhl-flames', name: 'Calgary Flames', mascot: 'Flames', conference: 'NHL - Western', primaryColor: '#D2001C', secondaryColor: '#FAAF19' },
    { id: 'nhl-sabres', name: 'Buffalo Sabres', mascot: 'Sabres', conference: 'NHL - Eastern', primaryColor: '#002654', secondaryColor: '#FCB514' },
    { id: 'nhl-wild', name: 'Minnesota Wild', mascot: 'Wild', conference: 'NHL - Western', primaryColor: '#154734', secondaryColor: '#DDCBA4' },
    { id: 'nhl-jets', name: 'Winnipeg Jets', mascot: 'Jets', conference: 'NHL - Western', primaryColor: '#041E42', secondaryColor: '#004C97' },
    { id: 'nhl-sharks', name: 'San Jose Sharks', mascot: 'Sharks', conference: 'NHL - Western', primaryColor: '#006D75', secondaryColor: '#EA7200' },
    { id: 'nhl-ducks', name: 'Anaheim Ducks', mascot: 'Ducks', conference: 'NHL - Western', primaryColor: '#F47A38', secondaryColor: '#B9975B' },
    { id: 'nhl-utah', name: 'Utah Hockey Club', mascot: 'Utah HC', conference: 'NHL - Western', primaryColor: '#71AFE5', secondaryColor: '#000000' },

    // ── MLS ──
    { id: 'mls-lafc', name: 'LAFC', mascot: 'LAFC', conference: 'MLS - Western', primaryColor: '#C39E6D', secondaryColor: '#000000' },
    { id: 'mls-atlanta', name: 'Atlanta United', mascot: 'Atlanta United', conference: 'MLS - Eastern', primaryColor: '#80000A', secondaryColor: '#221F1F' },
    { id: 'mls-inter-miami', name: 'Inter Miami CF', mascot: 'Inter Miami', conference: 'MLS - Eastern', primaryColor: '#F7B5CD', secondaryColor: '#231F20' },
    { id: 'mls-galaxy', name: 'LA Galaxy', mascot: 'Galaxy', conference: 'MLS - Western', primaryColor: '#00245D', secondaryColor: '#FFD200' },
    { id: 'mls-nycfc', name: 'New York City FC', mascot: 'NYCFC', conference: 'MLS - Eastern', primaryColor: '#6CACE4', secondaryColor: '#041E42' },
    { id: 'mls-seattle', name: 'Seattle Sounders', mascot: 'Sounders', conference: 'MLS - Western', primaryColor: '#005595', secondaryColor: '#658D1B' },
    { id: 'mls-portland', name: 'Portland Timbers', mascot: 'Timbers', conference: 'MLS - Western', primaryColor: '#004812', secondaryColor: '#D69A00' },
    { id: 'mls-fcc', name: 'FC Cincinnati', mascot: 'FC Cincinnati', conference: 'MLS - Eastern', primaryColor: '#F05323', secondaryColor: '#263B80' },
    { id: 'mls-stl-city', name: 'St. Louis CITY SC', mascot: 'CITY SC', conference: 'MLS - Western', primaryColor: '#D22630', secondaryColor: '#0A1E2C' },
    { id: 'mls-charlotte', name: 'Charlotte FC', mascot: 'Charlotte FC', conference: 'MLS - Eastern', primaryColor: '#1A85C8', secondaryColor: '#000000' },
    { id: 'mls-orlando', name: 'Orlando City SC', mascot: 'Orlando City', conference: 'MLS - Eastern', primaryColor: '#633492', secondaryColor: '#FFFFFF' },
    { id: 'mls-columbus', name: 'Columbus Crew', mascot: 'Crew', conference: 'MLS - Eastern', primaryColor: '#000000', secondaryColor: '#FFD100' },
    { id: 'mls-dc-united', name: 'D.C. United', mascot: 'D.C. United', conference: 'MLS - Eastern', primaryColor: '#000000', secondaryColor: '#EF3E42' },
    { id: 'mls-colorado', name: 'Colorado Rapids', mascot: 'Rapids', conference: 'MLS - Western', primaryColor: '#960A2C', secondaryColor: '#9CC2EA' },
    { id: 'mls-san-diego', name: 'San Diego FC', mascot: 'San Diego FC', conference: 'MLS - Western', primaryColor: '#00B4D8', secondaryColor: '#1B1B1B' },
    { id: 'mls-philly', name: 'Philadelphia Union', mascot: 'Union', conference: 'MLS - Eastern', primaryColor: '#071B2C', secondaryColor: '#B18500' },

    // ── WNBA ──
    { id: 'wnba-liberty', name: 'New York Liberty', mascot: 'Liberty', conference: 'WNBA - Eastern', primaryColor: '#6ECEB2', secondaryColor: '#000000' },
    { id: 'wnba-sun', name: 'Connecticut Sun', mascot: 'Sun', conference: 'WNBA - Eastern', primaryColor: '#F05023', secondaryColor: '#0A2240' },
    { id: 'wnba-storm', name: 'Seattle Storm', mascot: 'Storm', conference: 'WNBA - Western', primaryColor: '#2C5234', secondaryColor: '#FBE122' },
    { id: 'wnba-valkyries', name: 'Golden State Valkyries', mascot: 'Valkyries', conference: 'WNBA - Western', primaryColor: '#583EA4', secondaryColor: '#FFD200' },
    { id: 'wnba-mystics', name: 'Washington Mystics', mascot: 'Mystics', conference: 'WNBA - Eastern', primaryColor: '#E03A3E', secondaryColor: '#002B5C' },
    { id: 'wnba-tempo', name: 'Toronto Tempo', mascot: 'Tempo', conference: 'WNBA - Eastern', primaryColor: '#5B2D8E', secondaryColor: '#C8A951' },
    { id: 'wnba-fever', name: 'Indiana Fever', mascot: 'Fever', conference: 'WNBA - Eastern', primaryColor: '#002D62', secondaryColor: '#E03A3E' },
    { id: 'wnba-wings', name: 'Dallas Wings', mascot: 'Wings', conference: 'WNBA - Western', primaryColor: '#C4D600', secondaryColor: '#002B5C' },
    { id: 'wnba-aces', name: 'Las Vegas Aces', mascot: 'Aces', conference: 'WNBA - Western', primaryColor: '#A7A8AA', secondaryColor: '#000000' },
    { id: 'wnba-mercury', name: 'Phoenix Mercury', mascot: 'Mercury', conference: 'WNBA - Western', primaryColor: '#CB6015', secondaryColor: '#1D1160' },
    { id: 'wnba-fire', name: 'Portland Fire', mascot: 'Fire', conference: 'WNBA - Western', primaryColor: '#CE1141', secondaryColor: '#000000' },
    { id: 'wnba-sky', name: 'Chicago Sky', mascot: 'Sky', conference: 'WNBA - Western', primaryColor: '#418FDE', secondaryColor: '#FFCD00' },
    { id: 'wnba-sparks', name: 'Los Angeles Sparks', mascot: 'Sparks', conference: 'WNBA - Western', primaryColor: '#552583', secondaryColor: '#FDB927' },
    { id: 'wnba-dream', name: 'Atlanta Dream', mascot: 'Dream', conference: 'WNBA - Eastern', primaryColor: '#E31837', secondaryColor: '#418FDE' },
    { id: 'wnba-lynx', name: 'Minnesota Lynx', mascot: 'Lynx', conference: 'WNBA - Western', primaryColor: '#236192', secondaryColor: '#0C2340' },

    // ── PGA Tour ──
    { id: 'pga-tour', name: 'PGA Tour', mascot: 'PGA', conference: 'Golf', primaryColor: '#003865', secondaryColor: '#FFFFFF' },

    // ── NWSL ──
    { id: 'nwsl-gotham', name: 'Gotham FC', mascot: 'Gotham', conference: 'NWSL', primaryColor: '#001532', secondaryColor: '#D4AF37' },
    { id: 'nwsl-thorns', name: 'Portland Thorns', mascot: 'Thorns', conference: 'NWSL', primaryColor: '#981D1F', secondaryColor: '#004812' },
  ];

  for (const school of schools) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: school,
      create: school,
    });
  }
  console.log(`Seeded ${schools.length} schools/teams`);

  // =====================
  // DEMO USERS
  // =====================
  const demoPassword = await bcrypt.hash('Rally2026!', 10);

  // Developer (you — full control)
  const admin = await prisma.rallyUser.upsert({
    where: { email: 'jason@rally.com' },
    update: { password: demoPassword, role: 'DEVELOPER' },
    create: {
      email: 'jason@rally.com',
      password: demoPassword,
      name: 'Jason Kowitt',
      handle: 'jkowitt',
      role: 'DEVELOPER',
      schoolId: 'sch-georgia',
      favoriteSchool: 'sch-georgia',
      supportingSchools: ['sch-georgia', 'sch-tennessee'],
      emailVerified: true,
      acceptedTerms: true,
      userType: 'general_fan',
      points: 3200,
      tier: 'Gold',
    },
  });

  // Admin demo user
  await prisma.rallyUser.upsert({
    where: { email: 'admin@rally.com' },
    update: { password: demoPassword, role: 'ADMIN' },
    create: {
      email: 'admin@rally.com',
      password: demoPassword,
      name: 'Rally Admin',
      handle: 'rally-admin',
      role: 'ADMIN',
      schoolId: 'sch-alabama',
      favoriteSchool: 'sch-alabama',
      supportingSchools: ['sch-alabama', 'sch-georgia'],
      emailVerified: true,
      acceptedTerms: true,
      userType: 'general_fan',
      points: 1500,
      tier: 'Silver',
    },
  });

  // Regular user
  const fan = await prisma.rallyUser.upsert({
    where: { email: 'user@rally.com' },
    update: { password: demoPassword, role: 'USER' },
    create: {
      email: 'user@rally.com',
      password: demoPassword,
      name: 'Demo Fan',
      handle: 'demo-fan',
      role: 'USER',
      schoolId: 'sch-alabama',
      favoriteSchool: 'sch-alabama',
      supportingSchools: ['sch-alabama', 'sch-lsu'],
      emailVerified: true,
      acceptedTerms: true,
      userType: 'student',
      birthYear: 2002,
      residingCity: 'Tuscaloosa',
      residingState: 'AL',
      favoriteSports: ['Football', 'Basketball'],
      points: 750,
      tier: 'Bronze',
    },
  });

  console.log('Seeded demo users:');
  console.log('  Developer: jason@rally.com / Rally2026! (full control)');
  console.log('  Admin:     admin@rally.com / Rally2026!');
  console.log('  User:      user@rally.com  / Rally2026!');

  // =====================
  // EVENTS — Real 2026 schedules
  // =====================
  // Helper: date builder for 2026 (month is 0-indexed)
  const d = (month: number, day: number, hour = 19, minute = 0) =>
    new Date(2026, month, day, hour, minute);

  const events = [

    // ──────────────────────────────────────────
    // MLB — 2026 Season (Opening Night Mar 25)
    // ──────────────────────────────────────────
    {
      id: 'mlb-opening-night',
      title: 'Yankees at Giants — Opening Night',
      sport: 'Baseball',
      homeSchoolId: 'mlb-giants',
      homeTeam: 'San Francisco Giants',
      awaySchoolId: 'mlb-yankees',
      awayTeam: 'New York Yankees',
      venue: 'Oracle Park',
      city: 'San Francisco, CA',
      dateTime: d(2, 25, 20, 5),  // Mar 25, 8:05 PM ET
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-1',
      title: 'Pirates at Mets — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-mets',
      homeTeam: 'New York Mets',
      awaySchoolId: 'mlb-pirates',
      awayTeam: 'Pittsburgh Pirates',
      venue: 'Citi Field',
      city: 'New York, NY',
      dateTime: d(2, 26, 13, 15),  // Mar 26, 1:15 PM
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-2',
      title: 'Royals at Braves — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-braves',
      homeTeam: 'Atlanta Braves',
      awaySchoolId: 'mlb-royals',
      awayTeam: 'Kansas City Royals',
      venue: 'Truist Park',
      city: 'Atlanta, GA',
      dateTime: d(2, 26, 15, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-3',
      title: 'D-backs at Dodgers — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-dodgers',
      homeTeam: 'Los Angeles Dodgers',
      awaySchoolId: 'mlb-dbacks',
      awayTeam: 'Arizona Diamondbacks',
      venue: 'Dodger Stadium',
      city: 'Los Angeles, CA',
      dateTime: d(2, 26, 20, 0),  // 8 PM
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-4',
      title: 'Rangers at Phillies — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-phillies',
      homeTeam: 'Philadelphia Phillies',
      awaySchoolId: 'mlb-rangers',
      awayTeam: 'Texas Rangers',
      venue: 'Citizens Bank Park',
      city: 'Philadelphia, PA',
      dateTime: d(2, 26, 16, 15),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-5',
      title: 'Twins at Orioles — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-orioles',
      homeTeam: 'Baltimore Orioles',
      awaySchoolId: 'mlb-twins',
      awayTeam: 'Minnesota Twins',
      venue: 'Camden Yards',
      city: 'Baltimore, MD',
      dateTime: d(2, 26, 15, 5),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-6',
      title: 'Red Sox at Reds — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-reds',
      homeTeam: 'Cincinnati Reds',
      awaySchoolId: 'mlb-redsox',
      awayTeam: 'Boston Red Sox',
      venue: 'Great American Ball Park',
      city: 'Cincinnati, OH',
      dateTime: d(2, 26, 16, 10),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-7',
      title: 'Angels at Astros — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-astros',
      homeTeam: 'Houston Astros',
      awaySchoolId: 'mlb-angels',
      awayTeam: 'Los Angeles Angels',
      venue: 'Minute Maid Park',
      city: 'Houston, TX',
      dateTime: d(2, 26, 19, 10),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-opening-day-8',
      title: 'White Sox at Brewers — Opening Day',
      sport: 'Baseball',
      homeSchoolId: 'mlb-brewers',
      homeTeam: 'Milwaukee Brewers',
      awaySchoolId: 'mlb-whitesox',
      awayTeam: 'Chicago White Sox',
      venue: 'American Family Field',
      city: 'Milwaukee, WI',
      dateTime: d(2, 26, 14, 10),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-rivalry-subway',
      title: 'Yankees at Mets — Subway Series',
      sport: 'Baseball',
      homeSchoolId: 'mlb-mets',
      homeTeam: 'New York Mets',
      awaySchoolId: 'mlb-yankees',
      awayTeam: 'New York Yankees',
      venue: 'Citi Field',
      city: 'New York, NY',
      dateTime: d(4, 15, 19, 10),  // May 15
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-rivalry-crosstown',
      title: 'Cubs at White Sox — Crosstown Classic',
      sport: 'Baseball',
      homeSchoolId: 'mlb-whitesox',
      homeTeam: 'Chicago White Sox',
      awaySchoolId: 'mlb-cubs',
      awayTeam: 'Chicago Cubs',
      venue: 'Guaranteed Rate Field',
      city: 'Chicago, IL',
      dateTime: d(4, 15, 19, 10),  // May 15
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-rivalry-freeway',
      title: 'Dodgers at Angels — Freeway Series',
      sport: 'Baseball',
      homeSchoolId: 'mlb-angels',
      homeTeam: 'Los Angeles Angels',
      awaySchoolId: 'mlb-dodgers',
      awayTeam: 'Los Angeles Dodgers',
      venue: 'Angel Stadium',
      city: 'Anaheim, CA',
      dateTime: d(4, 15, 21, 38),  // May 15
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-snb-yanks-sox',
      title: 'Yankees at Red Sox — Sunday Night Baseball',
      sport: 'Baseball',
      homeSchoolId: 'mlb-redsox',
      homeTeam: 'Boston Red Sox',
      awaySchoolId: 'mlb-yankees',
      awayTeam: 'New York Yankees',
      venue: 'Fenway Park',
      city: 'Boston, MA',
      dateTime: d(5, 28, 19, 0),  // Jun 28
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-allstar',
      title: 'MLB All-Star Game',
      sport: 'Baseball',
      homeSchoolId: 'mlb-phillies',
      homeTeam: 'National League',
      awayTeam: 'American League',
      venue: 'Citizens Bank Park',
      city: 'Philadelphia, PA',
      dateTime: d(6, 14, 20, 0),  // Jul 14
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-snb-dodgers-yanks',
      title: 'Dodgers at Yankees — Sunday Night Baseball',
      sport: 'Baseball',
      homeSchoolId: 'mlb-yankees',
      homeTeam: 'New York Yankees',
      awaySchoolId: 'mlb-dodgers',
      awayTeam: 'Los Angeles Dodgers',
      venue: 'Yankee Stadium',
      city: 'Bronx, NY',
      dateTime: d(6, 19, 19, 0),  // Jul 19
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-field-of-dreams',
      title: 'Phillies at Twins — Field of Dreams Game',
      sport: 'Baseball',
      homeSchoolId: 'mlb-twins',
      homeTeam: 'Minnesota Twins',
      awaySchoolId: 'mlb-phillies',
      awayTeam: 'Philadelphia Phillies',
      venue: 'Field of Dreams',
      city: 'Dyersville, IA',
      dateTime: d(7, 13, 19, 0),  // Aug 13
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mlb-911-memorial',
      title: 'Mets at Yankees — 9/11 25th Anniversary',
      sport: 'Baseball',
      homeSchoolId: 'mlb-yankees',
      homeTeam: 'New York Yankees',
      awaySchoolId: 'mlb-mets',
      awayTeam: 'New York Mets',
      venue: 'Yankee Stadium',
      city: 'Bronx, NY',
      dateTime: d(8, 11, 19, 5),  // Sep 11
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // NBA — 2025-26 Season (Post All-Star Break)
    // ──────────────────────────────────────────
    {
      id: 'nba-rockets-knicks',
      title: 'Rockets at Knicks',
      sport: 'Basketball',
      homeSchoolId: 'nba-knicks',
      homeTeam: 'New York Knicks',
      awaySchoolId: 'nba-rockets',
      awayTeam: 'Houston Rockets',
      venue: 'Madison Square Garden',
      city: 'New York, NY',
      dateTime: d(1, 21, 20, 30),  // Feb 21
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-cavs-thunder',
      title: 'Cavaliers at Thunder',
      sport: 'Basketball',
      homeSchoolId: 'nba-thunder',
      homeTeam: 'Oklahoma City Thunder',
      awaySchoolId: 'nba-cavaliers',
      awayTeam: 'Cleveland Cavaliers',
      venue: 'Paycom Center',
      city: 'Oklahoma City, OK',
      dateTime: d(1, 22, 13, 0),  // Feb 22
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-nuggets-warriors',
      title: 'Nuggets at Warriors',
      sport: 'Basketball',
      homeSchoolId: 'nba-warriors',
      homeTeam: 'Golden State Warriors',
      awaySchoolId: 'nba-nuggets',
      awayTeam: 'Denver Nuggets',
      venue: 'Chase Center',
      city: 'San Francisco, CA',
      dateTime: d(1, 22, 15, 30),  // Feb 22
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-celtics-lakers',
      title: 'Celtics at Lakers — Sunday Night Basketball',
      sport: 'Basketball',
      homeSchoolId: 'nba-lakers',
      homeTeam: 'Los Angeles Lakers',
      awaySchoolId: 'nba-celtics',
      awayTeam: 'Boston Celtics',
      venue: 'Crypto.com Arena',
      city: 'Los Angeles, CA',
      dateTime: d(1, 22, 18, 30),  // Feb 22
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-lakers-warriors',
      title: 'Lakers at Warriors — Saturday Primetime',
      sport: 'Basketball',
      homeSchoolId: 'nba-warriors',
      homeTeam: 'Golden State Warriors',
      awaySchoolId: 'nba-lakers',
      awayTeam: 'Los Angeles Lakers',
      venue: 'Chase Center',
      city: 'San Francisco, CA',
      dateTime: d(1, 28, 20, 30),  // Feb 28
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-thunder-mavs',
      title: 'Thunder at Mavericks',
      sport: 'Basketball',
      homeSchoolId: 'nba-mavericks',
      homeTeam: 'Dallas Mavericks',
      awaySchoolId: 'nba-thunder',
      awayTeam: 'Oklahoma City Thunder',
      venue: 'American Airlines Center',
      city: 'Dallas, TX',
      dateTime: d(2, 1, 20, 0),  // Mar 1
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-warriors-knicks',
      title: 'Warriors at Knicks — Sunday Night Basketball',
      sport: 'Basketball',
      homeSchoolId: 'nba-knicks',
      homeTeam: 'New York Knicks',
      awaySchoolId: 'nba-warriors',
      awayTeam: 'Golden State Warriors',
      venue: 'Madison Square Garden',
      city: 'New York, NY',
      dateTime: d(2, 15, 20, 0),  // Mar 15
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-wolves-celtics',
      title: 'Timberwolves at Celtics',
      sport: 'Basketball',
      homeSchoolId: 'nba-celtics',
      homeTeam: 'Boston Celtics',
      awaySchoolId: 'nba-timberwolves',
      awayTeam: 'Minnesota Timberwolves',
      venue: 'TD Garden',
      city: 'Boston, MA',
      dateTime: d(2, 22, 20, 0),  // Mar 22
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-spurs-bucks',
      title: 'Spurs at Bucks — Wemby vs Giannis',
      sport: 'Basketball',
      homeSchoolId: 'nba-bucks',
      homeTeam: 'Milwaukee Bucks',
      awaySchoolId: 'nba-spurs',
      awayTeam: 'San Antonio Spurs',
      venue: 'Fiserv Forum',
      city: 'Milwaukee, WI',
      dateTime: d(2, 28, 15, 30),  // Mar 28
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-knicks-thunder',
      title: 'Knicks at Thunder',
      sport: 'Basketball',
      homeSchoolId: 'nba-thunder',
      homeTeam: 'Oklahoma City Thunder',
      awaySchoolId: 'nba-knicks',
      awayTeam: 'New York Knicks',
      venue: 'Paycom Center',
      city: 'Oklahoma City, OK',
      dateTime: d(2, 29, 19, 30),  // Mar 29
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nba-lakers-mavs',
      title: 'Lakers at Mavericks — Doncic Trade Revenge Game',
      sport: 'Basketball',
      homeSchoolId: 'nba-mavericks',
      homeTeam: 'Dallas Mavericks',
      awaySchoolId: 'nba-lakers',
      awayTeam: 'Los Angeles Lakers',
      venue: 'American Airlines Center',
      city: 'Dallas, TX',
      dateTime: d(3, 5, 19, 30),  // Apr 5
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // NHL — 2025-26 Season (Post-Olympic Return)
    // ──────────────────────────────────────────
    {
      id: 'nhl-vgk-lak',
      title: 'Golden Knights at Kings — NHL Returns',
      sport: 'Hockey',
      homeSchoolId: 'nhl-kings',
      homeTeam: 'Los Angeles Kings',
      awaySchoolId: 'nhl-golden-knights',
      awayTeam: 'Vegas Golden Knights',
      venue: 'Crypto.com Arena',
      city: 'Los Angeles, CA',
      dateTime: d(1, 25, 22, 0),  // Feb 25
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-pit-nyr',
      title: 'Penguins at Rangers',
      sport: 'Hockey',
      homeSchoolId: 'nhl-rangers',
      homeTeam: 'New York Rangers',
      awaySchoolId: 'nhl-penguins',
      awayTeam: 'Pittsburgh Penguins',
      venue: 'Madison Square Garden',
      city: 'New York, NY',
      dateTime: d(1, 28, 12, 30),  // Feb 28
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-bos-phi',
      title: 'Bruins at Flyers',
      sport: 'Hockey',
      homeSchoolId: 'nhl-flyers',
      homeTeam: 'Philadelphia Flyers',
      awaySchoolId: 'nhl-bruins',
      awayTeam: 'Boston Bruins',
      venue: 'Wells Fargo Center',
      city: 'Philadelphia, PA',
      dateTime: d(1, 28, 15, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-edm-sjs',
      title: 'Oilers at Sharks',
      sport: 'Hockey',
      homeSchoolId: 'nhl-sharks',
      homeTeam: 'San Jose Sharks',
      awaySchoolId: 'nhl-oilers',
      awayTeam: 'Edmonton Oilers',
      venue: 'SAP Center',
      city: 'San Jose, CA',
      dateTime: d(1, 28, 16, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-ott-tor',
      title: 'Senators at Maple Leafs — Battle of Ontario',
      sport: 'Hockey',
      homeSchoolId: 'nhl-maple-leafs',
      homeTeam: 'Toronto Maple Leafs',
      awaySchoolId: 'nhl-senators',
      awayTeam: 'Ottawa Senators',
      venue: 'Scotiabank Arena',
      city: 'Toronto, ON',
      dateTime: d(1, 28, 19, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-wsh-mtl',
      title: 'Capitals at Canadiens',
      sport: 'Hockey',
      homeSchoolId: 'nhl-canadiens',
      homeTeam: 'Montreal Canadiens',
      awaySchoolId: 'nhl-capitals',
      awayTeam: 'Washington Capitals',
      venue: 'Bell Centre',
      city: 'Montreal, QC',
      dateTime: d(1, 28, 19, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-chi-col',
      title: 'Blackhawks at Avalanche',
      sport: 'Hockey',
      homeSchoolId: 'nhl-avalanche',
      homeTeam: 'Colorado Avalanche',
      awaySchoolId: 'nhl-blackhawks',
      awayTeam: 'Chicago Blackhawks',
      venue: 'Ball Arena',
      city: 'Denver, CO',
      dateTime: d(1, 28, 18, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-nsh-dal',
      title: 'Predators at Stars',
      sport: 'Hockey',
      homeSchoolId: 'nhl-stars',
      homeTeam: 'Dallas Stars',
      awaySchoolId: 'nhl-predators',
      awayTeam: 'Nashville Predators',
      venue: 'American Airlines Center',
      city: 'Dallas, TX',
      dateTime: d(1, 28, 20, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-van-sea',
      title: 'Canucks at Kraken',
      sport: 'Hockey',
      homeSchoolId: 'nhl-kraken',
      homeTeam: 'Seattle Kraken',
      awaySchoolId: 'nhl-canucks',
      awayTeam: 'Vancouver Canucks',
      venue: 'Climate Pledge Arena',
      city: 'Seattle, WA',
      dateTime: d(1, 28, 22, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-fla-nyi',
      title: 'Panthers at Islanders',
      sport: 'Hockey',
      homeSchoolId: 'nhl-islanders',
      homeTeam: 'New York Islanders',
      awaySchoolId: 'nhl-panthers',
      awayTeam: 'Florida Panthers',
      venue: 'UBS Arena',
      city: 'Elmont, NY',
      dateTime: d(2, 1, 18, 30),  // Mar 1
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nhl-det-car',
      title: 'Red Wings at Hurricanes',
      sport: 'Hockey',
      homeSchoolId: 'nhl-hurricanes',
      homeTeam: 'Carolina Hurricanes',
      awaySchoolId: 'nhl-red-wings',
      awayTeam: 'Detroit Red Wings',
      venue: 'PNC Arena',
      city: 'Raleigh, NC',
      dateTime: d(1, 28, 19, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // MLS — 2026 Season (Opening Weekend Feb 21-22)
    // ──────────────────────────────────────────
    {
      id: 'mls-lafc-miami',
      title: 'LAFC vs Inter Miami — Messi vs Son',
      sport: 'Soccer',
      homeSchoolId: 'mls-lafc',
      homeTeam: 'LAFC',
      awaySchoolId: 'mls-inter-miami',
      awayTeam: 'Inter Miami CF',
      venue: 'LA Memorial Coliseum',
      city: 'Los Angeles, CA',
      dateTime: d(1, 21, 21, 30),  // Feb 21
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-fcc-atl',
      title: 'FC Cincinnati vs Atlanta United',
      sport: 'Soccer',
      homeSchoolId: 'mls-fcc',
      homeTeam: 'FC Cincinnati',
      awaySchoolId: 'mls-atlanta',
      awayTeam: 'Atlanta United',
      venue: 'TQL Stadium',
      city: 'Cincinnati, OH',
      dateTime: d(1, 21, 16, 30),  // Feb 21
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-stl-clt',
      title: 'St. Louis CITY vs Charlotte FC — Season Opener',
      sport: 'Soccer',
      homeSchoolId: 'mls-stl-city',
      homeTeam: 'St. Louis CITY SC',
      awaySchoolId: 'mls-charlotte',
      awayTeam: 'Charlotte FC',
      venue: 'Energizer Park',
      city: 'St. Louis, MO',
      dateTime: d(1, 21, 14, 30),  // Feb 21
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-dc-cls',
      title: 'D.C. United vs Columbus Crew',
      sport: 'Soccer',
      homeSchoolId: 'mls-dc-united',
      homeTeam: 'D.C. United',
      awaySchoolId: 'mls-columbus',
      awayTeam: 'Columbus Crew',
      venue: 'Audi Field',
      city: 'Washington, DC',
      dateTime: d(1, 21, 19, 30),  // Feb 21
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-orl-rsl',
      title: 'Orlando City vs Real Salt Lake',
      sport: 'Soccer',
      homeSchoolId: 'mls-orlando',
      homeTeam: 'Orlando City SC',
      venue: 'Exploria Stadium',
      city: 'Orlando, FL',
      dateTime: d(1, 21, 19, 30),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-sd-mtl',
      title: 'San Diego FC vs CF Montréal — Expansion Debut',
      sport: 'Soccer',
      homeSchoolId: 'mls-san-diego',
      homeTeam: 'San Diego FC',
      venue: 'Snapdragon Stadium',
      city: 'San Diego, CA',
      dateTime: d(1, 21, 22, 30),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-ptl-phi',
      title: 'Portland Timbers vs Philadelphia Union',
      sport: 'Soccer',
      homeSchoolId: 'mls-portland',
      homeTeam: 'Portland Timbers',
      awaySchoolId: 'mls-philly',
      awayTeam: 'Philadelphia Union',
      venue: 'Providence Park',
      city: 'Portland, OR',
      dateTime: d(1, 21, 22, 30),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-lag-nyc',
      title: 'LA Galaxy vs NYCFC — Sunday Night Soccer',
      sport: 'Soccer',
      homeSchoolId: 'mls-galaxy',
      homeTeam: 'LA Galaxy',
      awaySchoolId: 'mls-nycfc',
      awayTeam: 'New York City FC',
      venue: 'Dignity Health Sports Park',
      city: 'Carson, CA',
      dateTime: d(1, 22, 19, 0),  // Feb 22
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'mls-sea-col',
      title: 'Seattle Sounders vs Colorado Rapids',
      sport: 'Soccer',
      homeSchoolId: 'mls-seattle',
      homeTeam: 'Seattle Sounders',
      awaySchoolId: 'mls-colorado',
      awayTeam: 'Colorado Rapids',
      venue: 'Lumen Field',
      city: 'Seattle, WA',
      dateTime: d(1, 22, 21, 0),  // Feb 22
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // WNBA — 2026 Season (30th Anniversary, Opens May 8)
    // ──────────────────────────────────────────
    {
      id: 'wnba-sun-liberty',
      title: 'Sun at Liberty — Season Opener',
      sport: 'Basketball',
      homeSchoolId: 'wnba-liberty',
      homeTeam: 'New York Liberty',
      awaySchoolId: 'wnba-sun',
      awayTeam: 'Connecticut Sun',
      venue: 'Barclays Center',
      city: 'Brooklyn, NY',
      dateTime: d(4, 8, 19, 30),  // May 8
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'wnba-mystics-tempo',
      title: 'Mystics at Tempo — Toronto Franchise Debut',
      sport: 'Basketball',
      homeSchoolId: 'wnba-tempo',
      homeTeam: 'Toronto Tempo',
      awaySchoolId: 'wnba-mystics',
      awayTeam: 'Washington Mystics',
      venue: 'Scotiabank Arena',
      city: 'Toronto, ON',
      dateTime: d(4, 8, 19, 30),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'wnba-valkyries-storm',
      title: 'Valkyries at Storm',
      sport: 'Basketball',
      homeSchoolId: 'wnba-storm',
      homeTeam: 'Seattle Storm',
      awaySchoolId: 'wnba-valkyries',
      awayTeam: 'Golden State Valkyries',
      venue: 'Climate Pledge Arena',
      city: 'Seattle, WA',
      dateTime: d(4, 8, 22, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'wnba-wings-fever',
      title: 'Wings at Fever — Clark vs Bueckers',
      sport: 'Basketball',
      homeSchoolId: 'wnba-fever',
      homeTeam: 'Indiana Fever',
      awaySchoolId: 'wnba-wings',
      awayTeam: 'Dallas Wings',
      venue: 'Gainbridge Fieldhouse',
      city: 'Indianapolis, IN',
      dateTime: d(4, 9, 13, 0),  // May 9
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'wnba-mercury-aces',
      title: 'Mercury at Aces — Finals Rematch',
      sport: 'Basketball',
      homeSchoolId: 'wnba-aces',
      homeTeam: 'Las Vegas Aces',
      awaySchoolId: 'wnba-mercury',
      awayTeam: 'Phoenix Mercury',
      venue: 'Michelob Ultra Arena',
      city: 'Las Vegas, NV',
      dateTime: d(4, 9, 15, 30),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'wnba-sky-fire',
      title: 'Sky at Fire — Portland Franchise Debut',
      sport: 'Basketball',
      homeSchoolId: 'wnba-fire',
      homeTeam: 'Portland Fire',
      awaySchoolId: 'wnba-sky',
      awayTeam: 'Chicago Sky',
      venue: 'Moda Center',
      city: 'Portland, OR',
      dateTime: d(4, 9, 21, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'wnba-anniversary',
      title: 'Sparks vs Liberty — 30th Anniversary Game',
      sport: 'Basketball',
      homeSchoolId: 'wnba-sparks',
      homeTeam: 'Los Angeles Sparks',
      awaySchoolId: 'wnba-liberty',
      awayTeam: 'New York Liberty',
      venue: 'Crypto.com Arena',
      city: 'Los Angeles, CA',
      dateTime: d(5, 21, 15, 0),  // Jun 21
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // College Basketball — March Madness 2026
    // ──────────────────────────────────────────
    {
      id: 'cbb-acc-tournament',
      title: 'ACC Tournament',
      sport: 'Basketball',
      homeSchoolId: 'sch-duke',
      homeTeam: 'ACC Teams',
      venue: 'Spectrum Center',
      city: 'Charlotte, NC',
      dateTime: d(2, 10, 12, 0),  // Mar 10
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-bigten-tournament',
      title: 'Big Ten Tournament',
      sport: 'Basketball',
      homeSchoolId: 'sch-michigan',
      homeTeam: 'Big Ten Teams',
      venue: 'United Center',
      city: 'Chicago, IL',
      dateTime: d(2, 10, 12, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-sec-tournament',
      title: 'SEC Tournament',
      sport: 'Basketball',
      homeSchoolId: 'sch-alabama',
      homeTeam: 'SEC Teams',
      venue: 'Bridgestone Arena',
      city: 'Nashville, TN',
      dateTime: d(2, 11, 12, 0),  // Mar 11
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-big12-tournament',
      title: 'Big 12 Tournament',
      sport: 'Basketball',
      homeSchoolId: 'sch-arizona',
      homeTeam: 'Big 12 Teams',
      venue: 'T-Mobile Center',
      city: 'Kansas City, MO',
      dateTime: d(2, 10, 12, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-bigeast-tournament',
      title: 'Big East Tournament',
      sport: 'Basketball',
      homeSchoolId: 'sch-uconn',
      homeTeam: 'Big East Teams',
      venue: 'Madison Square Garden',
      city: 'New York, NY',
      dateTime: d(2, 11, 12, 0),
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-selection-sunday',
      title: 'Selection Sunday',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'CBS Studios',
      city: 'New York, NY',
      dateTime: d(2, 15, 18, 0),  // Mar 15
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-first-four',
      title: 'NCAA Tournament — First Four',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'UD Arena',
      city: 'Dayton, OH',
      dateTime: d(2, 17, 18, 30),  // Mar 17
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-first-round-1',
      title: 'NCAA Tournament — First Round Day 1',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'Multiple Venues',
      city: 'Buffalo, Greenville, OKC, Portland',
      dateTime: d(2, 19, 12, 0),  // Mar 19
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-first-round-2',
      title: 'NCAA Tournament — First Round Day 2',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'Multiple Venues',
      city: 'Tampa, Philly, San Diego, St. Louis',
      dateTime: d(2, 20, 12, 0),  // Mar 20
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-sweet-16',
      title: 'NCAA Tournament — Sweet 16',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'Regional Sites',
      city: 'Houston, San Jose, Chicago, D.C.',
      dateTime: d(2, 26, 19, 0),  // Mar 26
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-elite-eight',
      title: 'NCAA Tournament — Elite Eight',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'Regional Sites',
      city: 'Houston, San Jose, Chicago, D.C.',
      dateTime: d(2, 28, 18, 0),  // Mar 28
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-final-four',
      title: 'NCAA Final Four',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'Lucas Oil Stadium',
      city: 'Indianapolis, IN',
      dateTime: d(3, 4, 18, 0),  // Apr 4
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cbb-championship',
      title: 'NCAA Championship Game',
      sport: 'Basketball',
      homeSchoolId: 'ncaa-mbb',
      homeTeam: 'NCAA',
      venue: 'Lucas Oil Stadium',
      city: 'Indianapolis, IN',
      dateTime: d(3, 6, 20, 30),  // Apr 6
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // College Football — 2026 Season
    // ──────────────────────────────────────────
    {
      id: 'cfb-brazil',
      title: 'NC State vs Virginia — Brazil Kickoff',
      sport: 'Football',
      homeSchoolId: 'sch-virginia',
      homeTeam: 'Virginia Cavaliers',
      awaySchoolId: 'sch-nc-state',
      awayTeam: 'NC State Wolfpack',
      venue: 'Nilton Santos Stadium',
      city: 'Rio de Janeiro, Brazil',
      dateTime: d(7, 29, 19, 0),  // Aug 29
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cfb-dublin',
      title: 'North Carolina vs TCU — Dublin Classic',
      sport: 'Football',
      homeSchoolId: 'sch-tcu',
      homeTeam: 'TCU Horned Frogs',
      awaySchoolId: 'sch-unc',
      awayTeam: 'North Carolina Tar Heels',
      venue: 'Aviva Stadium',
      city: 'Dublin, Ireland',
      dateTime: d(7, 29, 12, 30),  // Aug 29
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cfb-clemson-lsu',
      title: 'Clemson at LSU',
      sport: 'Football',
      homeSchoolId: 'sch-lsu',
      homeTeam: 'LSU Tigers',
      awaySchoolId: 'sch-clemson',
      awayTeam: 'Clemson Tigers',
      venue: 'Tiger Stadium',
      city: 'Baton Rouge, LA',
      dateTime: d(8, 5, 19, 0),  // Sep 5
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cfb-osu-texas',
      title: 'Ohio State at Texas',
      sport: 'Football',
      homeSchoolId: 'sch-texas',
      homeTeam: 'Texas Longhorns',
      awaySchoolId: 'sch-ohio-state',
      awayTeam: 'Ohio State Buckeyes',
      venue: 'Darrell K Royal Stadium',
      city: 'Austin, TX',
      dateTime: d(8, 12, 15, 30),  // Sep 12
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'cfb-lonestar',
      title: 'Texas A&M vs Texas — Lone Star Showdown',
      sport: 'Football',
      homeSchoolId: 'sch-texas',
      homeTeam: 'Texas Longhorns',
      awaySchoolId: 'sch-texas-am',
      awayTeam: 'Texas A&M Aggies',
      venue: 'Darrell K Royal Stadium',
      city: 'Austin, TX',
      dateTime: d(10, 27, 15, 30),  // Nov 27
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // College Baseball — 2026
    // ──────────────────────────────────────────
    {
      id: 'cba-cws',
      title: 'Men\'s College World Series',
      sport: 'Baseball',
      homeSchoolId: 'ncaa-baseball',
      homeTeam: 'NCAA',
      venue: 'Charles Schwab Field',
      city: 'Omaha, NE',
      dateTime: d(5, 12, 14, 0),  // Jun 12
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // PGA Tour — 2026 Major Championships
    // ──────────────────────────────────────────
    {
      id: 'pga-players',
      title: 'THE PLAYERS Championship',
      sport: 'Golf',
      homeSchoolId: 'pga-tour',
      homeTeam: 'PGA Tour',
      venue: 'TPC Sawgrass',
      city: 'Ponte Vedra Beach, FL',
      dateTime: d(2, 9, 10, 0),  // Mar 9
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'pga-masters',
      title: 'The Masters',
      sport: 'Golf',
      homeSchoolId: 'pga-tour',
      homeTeam: 'PGA Tour',
      venue: 'Augusta National Golf Club',
      city: 'Augusta, GA',
      dateTime: d(3, 9, 8, 0),  // Apr 9
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'pga-championship',
      title: 'PGA Championship',
      sport: 'Golf',
      homeSchoolId: 'pga-tour',
      homeTeam: 'PGA Tour',
      venue: 'Aronimink Golf Club',
      city: 'Newtown Square, PA',
      dateTime: d(4, 14, 8, 0),  // May 14
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'pga-us-open',
      title: 'U.S. Open',
      sport: 'Golf',
      homeSchoolId: 'pga-tour',
      homeTeam: 'PGA Tour',
      venue: 'Shinnecock Hills Golf Club',
      city: 'Southampton, NY',
      dateTime: d(5, 18, 8, 0),  // Jun 18
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },

    // ──────────────────────────────────────────
    // NFL — 2026 Offseason Events
    // ──────────────────────────────────────────
    {
      id: 'nfl-combine',
      title: 'NFL Scouting Combine',
      sport: 'Football',
      homeSchoolId: 'nfl-chiefs',
      homeTeam: 'NFL',
      venue: 'Lucas Oil Stadium',
      city: 'Indianapolis, IN',
      dateTime: d(1, 23, 9, 0),  // Feb 23
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
    {
      id: 'nfl-draft',
      title: '2026 NFL Draft',
      sport: 'Football',
      homeSchoolId: 'nfl-chiefs',
      homeTeam: 'NFL',
      venue: 'Acrisure Stadium',
      city: 'Pittsburgh, PA',
      dateTime: d(3, 23, 20, 0),  // Apr 23
      status: 'UPCOMING' as const,
      createdBy: admin.id,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: event,
      create: event,
    });
  }
  console.log(`Seeded ${events.length} events`);

  // =====================
  // ACTIVATIONS (for each event)
  // =====================
  const activationTemplates = [
    { type: 'checkin', name: 'Game Day Check-In', points: 50, description: 'Check in when you arrive at the venue' },
    { type: 'trivia', name: 'Pre-Game Trivia', points: 25, description: 'Answer 5 trivia questions about the teams' },
    { type: 'prediction', name: 'Score Prediction', points: 30, description: 'Predict the final score' },
    { type: 'noise_meter', name: 'Crowd Noise Challenge', points: 15, description: 'Help make some noise during key moments' },
    { type: 'photo', name: 'Fan Photo', points: 20, description: 'Share your gameday photo' },
    { type: 'poll', name: 'MVP Vote', points: 10, description: 'Vote for the game MVP' },
  ];

  for (const event of events) {
    // Delete existing activations to avoid duplicates
    await prisma.eventActivation.deleteMany({ where: { eventId: event.id } });

    for (const tmpl of activationTemplates) {
      await prisma.eventActivation.create({
        data: {
          eventId: event.id,
          ...tmpl,
        },
      });
    }
  }
  console.log(`Seeded activations for all events`);

  // =====================
  // SAMPLE REWARDS
  // =====================
  const rewardsBySchool = [
    { schoolId: 'sch-georgia', rewards: [
      { name: '10% Off Team Store', pointsCost: 200, description: 'Get 10% off your next purchase at the Georgia team store' },
      { name: 'Free Concession Drink', pointsCost: 150, description: 'Redeem for a free drink at any concession stand' },
      { name: 'Meet & Greet Entry', pointsCost: 2000, description: 'Entry into a drawing for a player meet & greet' },
      { name: 'VIP Parking Pass', pointsCost: 1500, description: 'VIP parking for one home game' },
    ]},
    { schoolId: 'sch-alabama', rewards: [
      { name: 'Bama Team Poster', pointsCost: 100, description: 'Autographed team poster' },
      { name: 'Free Nachos', pointsCost: 125, description: 'Free nachos at any Bryant-Denny concession' },
      { name: 'Sideline Pass', pointsCost: 5000, description: 'Pre-game sideline experience' },
    ]},
    { schoolId: 'nba-lakers', rewards: [
      { name: 'Lakers Mini Basketball', pointsCost: 300, description: 'Official Lakers mini basketball' },
      { name: 'Courtside Upgrade Entry', pointsCost: 3000, description: 'Entry into courtside seat upgrade drawing' },
    ]},
    { schoolId: 'nfl-chiefs', rewards: [
      { name: 'Chiefs Rally Towel', pointsCost: 150, description: 'Limited edition rally towel' },
      { name: 'Tailgate Party Access', pointsCost: 1000, description: 'Access to the official pre-game tailgate' },
    ]},
  ];

  for (const { schoolId, rewards } of rewardsBySchool) {
    for (const reward of rewards) {
      await prisma.reward.create({
        data: { schoolId, ...reward },
      });
    }
  }
  console.log('Seeded rewards');

  // =====================
  // SAMPLE POINTS HISTORY (for demo fan)
  // =====================
  const pointsEntries = [
    { userId: fan.id, eventId: 'mlb-opening-day-2', activationName: 'Game Day Check-In', points: 50, schoolId: 'mlb-braves' },
    { userId: fan.id, eventId: 'mlb-opening-day-2', activationName: 'Pre-Game Trivia', points: 25, schoolId: 'mlb-braves' },
    { userId: fan.id, eventId: 'mlb-opening-day-2', activationName: 'Score Prediction', points: 30, schoolId: 'mlb-braves' },
    { userId: fan.id, activationName: 'Daily Login', points: 5, schoolId: 'sch-alabama' },
    { userId: fan.id, activationName: 'Profile Complete', points: 100, schoolId: 'sch-alabama' },
    { userId: fan.id, activationName: 'Referred a Friend', points: 200, schoolId: 'sch-alabama' },
    { userId: admin.id, activationName: 'Game Day Check-In', points: 50, schoolId: 'sch-georgia' },
    { userId: admin.id, activationName: 'Pre-Game Trivia', points: 25, schoolId: 'sch-georgia' },
  ];

  for (const entry of pointsEntries) {
    await prisma.pointsEntry.create({
      data: {
        ...entry,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
      },
    });
  }
  console.log('Seeded points history');

  // =====================
  // SAMPLE CONTENT
  // =====================
  const contentItems = [
    { type: 'article', title: 'Welcome to Rally!', body: 'Rally is the sports community app where fans earn rewards for showing up, engaging, and being loyal. Start earning points today!', author: 'Rally Team' },
    { type: 'highlight', title: 'This Week\'s Top Fans', body: 'Congratulations to our top earners this week! Check the leaderboard to see where you rank.', author: 'Rally Team' },
    { type: 'update', title: 'New Rewards Available', body: 'We\'ve added new rewards across multiple teams. Check your rewards page to see what\'s new!', author: 'Rally Team' },
  ];

  for (const item of contentItems) {
    await prisma.contentItem.create({ data: item });
  }
  console.log('Seeded content');

  // =====================
  // SAMPLE BONUS OFFER
  // =====================
  const now = new Date();
  await prisma.bonusOffer.create({
    data: {
      schoolId: 'sch-georgia',
      name: 'Double Points Weekend',
      description: 'Earn 2x points on all check-ins this weekend',
      bonusMultiplier: 2,
      activationType: 'checkin',
      startsAt: now,
      expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdBy: admin.id,
    },
  });
  console.log('Seeded bonus offer');

  // =====================
  // AFFILIATE OFFERS — Real sports-adjacent brands
  // =====================
  // NOTE: Replace placeholder affiliate URLs with your actual affiliate links
  // after signing up for each program. All listed programs are self-serve.
  const affiliateOffers = [
    // ── Merchandise ──
    {
      id: 'aff-fanatics',
      brand: 'Fanatics',
      title: 'Up to 65% Off Team Gear',
      description: 'Official jerseys, hats, and apparel for every team. Rally fans get exclusive markdowns on gameday gear.',
      category: 'MERCHANDISE' as const,
      affiliateUrl: 'https://www.fanatics.com/?_s=affiliate&utm_source=rally',
      imageUrl: '/affiliates/fanatics.png',
      commissionType: 'rev_share',
      commissionValue: '8% on all sales',
      priority: 100,
    },
    {
      id: 'aff-nike',
      brand: 'Nike',
      title: 'Team Sideline Collection',
      description: 'Official Nike team gear — the same styles worn on the sidelines. Dri-FIT jerseys, shoes, and training apparel.',
      category: 'MERCHANDISE' as const,
      affiliateUrl: 'https://www.nike.com/fan-gear?cp=rally_affiliate',
      imageUrl: '/affiliates/nike.png',
      commissionType: 'rev_share',
      commissionValue: '7% on all sales',
      priority: 90,
    },
    {
      id: 'aff-dicks',
      brand: "Dick's Sporting Goods",
      title: 'Tailgate & Fan Essentials',
      description: 'Everything for gameday — coolers, chairs, cornhole, team tents, and fan gear from every league.',
      category: 'MERCHANDISE' as const,
      affiliateUrl: 'https://www.dickssportinggoods.com/c/fan-shop?affiliate=rally',
      imageUrl: '/affiliates/dicks.png',
      commissionType: 'rev_share',
      commissionValue: '5% on all sales',
      priority: 60,
    },

    // ── Tickets ──
    {
      id: 'aff-seatgeek',
      brand: 'SeatGeek',
      title: '$20 Off Your First Ticket Purchase',
      description: 'Find the best seats at the best prices. Use Rally to discover events, then grab tickets on SeatGeek.',
      category: 'TICKETS' as const,
      affiliateUrl: 'https://seatgeek.com/?aid=rally&promo=RALLY20',
      imageUrl: '/affiliates/seatgeek.png',
      commissionType: 'CPA',
      commissionValue: '$5 per first purchase',
      priority: 95,
    },
    {
      id: 'aff-stubhub',
      brand: 'StubHub',
      title: 'Sold-Out Games? We Got You.',
      description: 'Access tickets to every game, even sold-out ones. Verified tickets with StubHub\'s FanProtect guarantee.',
      category: 'TICKETS' as const,
      affiliateUrl: 'https://www.stubhub.com/?gcid=rally_affiliate',
      imageUrl: '/affiliates/stubhub.png',
      commissionType: 'rev_share',
      commissionValue: '6% on ticket sales',
      priority: 85,
    },
    {
      id: 'aff-vividseats',
      brand: 'Vivid Seats',
      title: '10% Reward Credit on Tickets',
      description: 'Buy tickets, earn Vivid Seats reward credit. Stack with your Rally points for the ultimate fan savings.',
      category: 'TICKETS' as const,
      affiliateUrl: 'https://www.vividseats.com/?utm_source=rally_affiliate',
      imageUrl: '/affiliates/vividseats.png',
      commissionType: 'CPA',
      commissionValue: '$4 per transaction',
      priority: 70,
    },

    // ── Betting ──
    {
      id: 'aff-draftkings',
      brand: 'DraftKings',
      title: 'Bet $5, Get $200 in Bonus Bets',
      description: 'Put your predictions where your mouth is. DraftKings Sportsbook — bet on the games you\'re already watching.',
      category: 'BETTING' as const,
      affiliateUrl: 'https://www.draftkings.com/sportsbook?ref=rally',
      imageUrl: '/affiliates/draftkings.png',
      commissionType: 'CPA',
      commissionValue: '$50-$100 per depositing user',
      priority: 92,
    },
    {
      id: 'aff-fanduel',
      brand: 'FanDuel',
      title: 'Bet $5, Win $150 in Bonus Bets',
      description: 'America\'s #1 sportsbook. Same-game parlays, live betting, and daily fantasy sports.',
      category: 'BETTING' as const,
      affiliateUrl: 'https://www.fanduel.com/sportsbook?ref=rally',
      imageUrl: '/affiliates/fanduel.png',
      commissionType: 'CPA',
      commissionValue: '$50-$100 per depositing user',
      priority: 88,
    },
    {
      id: 'aff-espnbet',
      brand: 'ESPN BET',
      title: 'First Bet Reset Up to $1,000',
      description: 'Bet with ESPN BET. Integrated with the ESPN ecosystem — stats, scores, and bets in one place.',
      category: 'BETTING' as const,
      affiliateUrl: 'https://www.espnbet.com/?ref=rally',
      imageUrl: '/affiliates/espnbet.png',
      commissionType: 'CPA',
      commissionValue: '$40-$80 per depositing user',
      priority: 75,
    },

    // ── Streaming ──
    {
      id: 'aff-espnplus',
      brand: 'ESPN+',
      title: 'Stream Live Sports — $11.99/mo',
      description: 'Thousands of live games, 30 for 30 documentaries, and exclusive ESPN originals. Bundle with Disney+ and Hulu.',
      category: 'STREAMING' as const,
      affiliateUrl: 'https://plus.espn.com/?src=rally_affiliate',
      imageUrl: '/affiliates/espnplus.png',
      commissionType: 'CPA',
      commissionValue: '$8 per subscription',
      priority: 80,
    },
    {
      id: 'aff-peacock',
      brand: 'Peacock',
      title: 'Sunday Night Football + NBA on NBC',
      description: 'Stream NFL Sunday Night Football, Premier League, NBA, and more. Plans start at $7.99/mo.',
      category: 'STREAMING' as const,
      affiliateUrl: 'https://www.peacocktv.com/?cid=rally_affiliate',
      imageUrl: '/affiliates/peacock.png',
      commissionType: 'CPA',
      commissionValue: '$6 per subscription',
      priority: 78,
    },
    {
      id: 'aff-prime-video',
      brand: 'Amazon Prime Video',
      title: 'Thursday Night Football + NBA',
      description: 'Watch Thursday Night Football, NBA games, and Prime Video originals. Included with Prime membership.',
      category: 'STREAMING' as const,
      affiliateUrl: 'https://www.amazon.com/primevideo?tag=rally-affiliate',
      imageUrl: '/affiliates/primevideo.png',
      commissionType: 'CPA',
      commissionValue: '$3 per trial signup',
      priority: 76,
    },

    // ── Food Delivery (Gameday) ──
    {
      id: 'aff-ubereats',
      brand: 'Uber Eats',
      title: '$10 Off Gameday Delivery',
      description: 'Order food to the tailgate or your couch. Wings, pizza, and everything you need for the big game.',
      category: 'FOOD_DELIVERY' as const,
      affiliateUrl: 'https://www.ubereats.com/?utm_source=rally_affiliate',
      imageUrl: '/affiliates/ubereats.png',
      commissionType: 'CPA',
      commissionValue: '$3 per first order',
      priority: 65,
    },
    {
      id: 'aff-doordash',
      brand: 'DoorDash',
      title: '25% Off Your First 3 Orders',
      description: 'Gameday grub delivered. Order from local spots or chains — DoorDash delivers in 45 minutes or less.',
      category: 'FOOD_DELIVERY' as const,
      affiliateUrl: 'https://www.doordash.com/?utm_source=rally_affiliate',
      imageUrl: '/affiliates/doordash.png',
      commissionType: 'CPA',
      commissionValue: '$4 per first order',
      priority: 62,
    },

    // ── Travel (Away Games) ──
    {
      id: 'aff-hotelscom',
      brand: 'Hotels.com',
      title: 'Away Game Hotels — Collect 10 Nights, Get 1 Free',
      description: 'Heading to an away game? Book hotels through Hotels.com and earn a free night after 10 stays.',
      category: 'TRAVEL' as const,
      affiliateUrl: 'https://www.hotels.com/?affcid=rally',
      imageUrl: '/affiliates/hotelscom.png',
      commissionType: 'rev_share',
      commissionValue: '4% on bookings',
      priority: 55,
    },

    // ── Sports Equipment ──
    {
      id: 'aff-underarmour',
      brand: 'Under Armour',
      title: 'Performance Gear for Every Sport',
      description: 'Train like a pro. Under Armour athletic gear, shoes, and college team collections.',
      category: 'SPORTS_EQUIPMENT' as const,
      affiliateUrl: 'https://www.underarmour.com/?iref=rally_affiliate',
      imageUrl: '/affiliates/underarmour.png',
      commissionType: 'rev_share',
      commissionValue: '5% on all sales',
      priority: 58,
    },
  ];

  for (const offer of affiliateOffers) {
    await prisma.affiliateOffer.upsert({
      where: { id: offer.id },
      update: offer,
      create: offer,
    });
  }
  console.log(`Seeded ${affiliateOffers.length} affiliate offers`);

  // =====================
  // MONETIZATION SETTINGS (defaults)
  // =====================
  await prisma.monetizationSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      affiliatesEnabled: true,
      affiliateMaxPerPage: 6,
      admobEnabled: false,           // Off by default — developer enters ad unit IDs to enable
      admobBannerEnabled: false,
      admobInterstitialEnabled: false,
      admobRewardedVideoEnabled: true,
      admobRewardedPoints: 50,
    },
  });
  console.log('Seeded monetization settings');

  // =====================
  // SOCIAL IDENTITY — Fan Profiles
  // =====================
  const fanProfiles = [
    {
      userId: admin.id,
      totalCheckins: 47,
      totalPredictions: 38,
      correctPredictions: 29,
      totalTrivia: 32,
      correctTrivia: 24,
      totalPhotos: 15,
      totalPolls: 22,
      totalNoiseMeter: 18,
      eventsAttended: 42,
      uniqueVenues: 12,
      currentStreak: 8,
      longestStreak: 15,
      verifiedLevel: 'DEDICATED' as const,
      isPublic: true,
      tagline: 'Die-hard Dawg since \'09. If it barks, I back it.',
      sportBreakdown: { Football: 18, Basketball: 12, Baseball: 8, Hockey: 4 },
    },
    {
      userId: fan.id,
      totalCheckins: 12,
      totalPredictions: 9,
      correctPredictions: 5,
      totalTrivia: 8,
      correctTrivia: 6,
      totalPhotos: 4,
      totalPolls: 7,
      totalNoiseMeter: 3,
      eventsAttended: 10,
      uniqueVenues: 4,
      currentStreak: 3,
      longestStreak: 5,
      verifiedLevel: 'CASUAL' as const,
      isPublic: true,
      tagline: 'Roll Tide. Points collector. Tailgate connoisseur.',
      sportBreakdown: { Football: 5, Basketball: 3, Baseball: 2 },
    },
  ];

  for (const profile of fanProfiles) {
    await prisma.fanProfile.upsert({
      where: { userId: profile.userId },
      update: profile,
      create: profile,
    });
  }
  console.log('Seeded fan profiles');

  // =====================
  // SOCIAL IDENTITY — Crews
  // =====================
  const sampleCrews = [
    {
      id: 'crew-dawg-pound',
      name: 'The Dawg Pound',
      slug: 'dawg-pound',
      description: 'Georgia faithful. Gameday isn\'t gameday without the Dawg Pound.',
      schoolId: 'sch-georgia',
      sport: 'Football',
      avatarEmoji: '🐶',
      color: '#BA0C2F',
      memberCount: 2,
      totalPoints: 485,
      totalCheckins: 59,
      totalEvents: 52,
      isPublic: true,
    },
    {
      id: 'crew-tide-tailgate',
      name: 'Tide Tailgate Crew',
      slug: 'tide-tailgate',
      description: 'Bama fans who show up early and stay late. Tailgate kings.',
      schoolId: 'sch-alabama',
      sport: 'Football',
      avatarEmoji: '🏈',
      color: '#9E1B32',
      memberCount: 1,
      totalPoints: 410,
      totalCheckins: 12,
      totalEvents: 10,
      isPublic: true,
    },
    {
      id: 'crew-baseline-ballers',
      name: 'Baseline Ballers',
      slug: 'baseline-ballers',
      description: 'NBA court-side energy, every night. Multi-team basketball crew.',
      sport: 'Basketball',
      avatarEmoji: '🏀',
      color: '#1D428A',
      memberCount: 1,
      totalPoints: 410,
      totalCheckins: 12,
      totalEvents: 10,
      isPublic: true,
    },
    {
      id: 'crew-diamond-diehards',
      name: 'Diamond Diehards',
      slug: 'diamond-diehards',
      description: '162 games? We\'re at every single one. Baseball season is our season.',
      sport: 'Baseball',
      avatarEmoji: '⚾',
      color: '#003087',
      memberCount: 0,
      totalPoints: 0,
      totalCheckins: 0,
      totalEvents: 0,
      isPublic: true,
    },
  ];

  for (const crew of sampleCrews) {
    await prisma.crew.upsert({
      where: { id: crew.id },
      update: crew,
      create: crew,
    });
  }

  // Add crew memberships
  const crewMemberships = [
    { crewId: 'crew-dawg-pound', userId: admin.id, role: 'CAPTAIN' as const },
    { crewId: 'crew-dawg-pound', userId: fan.id, role: 'MEMBER' as const },
    { crewId: 'crew-tide-tailgate', userId: fan.id, role: 'CAPTAIN' as const },
    { crewId: 'crew-baseline-ballers', userId: admin.id, role: 'CAPTAIN' as const },
  ];

  for (const membership of crewMemberships) {
    await prisma.crewMember.upsert({
      where: { crewId_userId: { crewId: membership.crewId, userId: membership.userId } },
      update: { role: membership.role },
      create: membership,
    });
  }
  console.log('Seeded crews and memberships');

  // =====================
  // SOCIAL IDENTITY — Milestones
  // =====================
  const milestones = [
    // Admin milestones
    { userId: admin.id, type: 'FIRST_CHECKIN' as const, title: 'First Check-in', description: 'Checked in to your first event', icon: '📍', stat: '1 check-in' },
    { userId: admin.id, type: 'EVENTS_5' as const, title: '5 Events', description: 'Attended 5 events', icon: '🎟️', stat: '42 events' },
    { userId: admin.id, type: 'EVENTS_25' as const, title: '25 Events', description: 'Attended 25 events', icon: '🏟️', stat: '42 events' },
    { userId: admin.id, type: 'CHECKIN_STREAK_5' as const, title: '5-Game Streak', description: 'Maintained a 5-game check-in streak', icon: '🔥', stat: '15 streak' },
    { userId: admin.id, type: 'CHECKIN_STREAK_10' as const, title: '10-Game Streak', description: 'Maintained a 10-game check-in streak', icon: '⚡', stat: '15 streak' },
    { userId: admin.id, type: 'VENUE_COLLECTOR_5' as const, title: '5 Venues', description: 'Visited 5 unique venues', icon: '🗺️', stat: '12 venues' },
    { userId: admin.id, type: 'VENUE_COLLECTOR_10' as const, title: '10 Venues', description: 'Visited 10 unique venues', icon: '🌎', stat: '12 venues' },
    { userId: admin.id, type: 'MULTI_SPORT' as const, title: 'Multi-Sport Fan', description: 'Attended events in 3+ sports', icon: '🏅', stat: '4 sports' },
    { userId: admin.id, type: 'PREDICTION_ACCURACY_75' as const, title: 'Oracle', description: '75%+ prediction accuracy', icon: '🔮', stat: '76% accuracy' },
    { userId: admin.id, type: 'CREW_FOUNDER' as const, title: 'Crew Founder', description: 'Founded your first crew', icon: '👥', stat: 'The Dawg Pound' },
    // Fan milestones
    { userId: fan.id, type: 'FIRST_CHECKIN' as const, title: 'First Check-in', description: 'Checked in to your first event', icon: '📍', stat: '1 check-in' },
    { userId: fan.id, type: 'EVENTS_5' as const, title: '5 Events', description: 'Attended 5 events', icon: '🎟️', stat: '10 events' },
    { userId: fan.id, type: 'CHECKIN_STREAK_5' as const, title: '5-Game Streak', description: 'Maintained a 5-game check-in streak', icon: '🔥', stat: '5 streak' },
  ];

  for (const milestone of milestones) {
    await prisma.fanMilestone.create({
      data: {
        ...milestone,
        earnedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('Seeded milestones');

  console.log('\nSeed complete!');
  console.log('---');
  console.log(`Total: ${schools.length} teams, ${events.length} events across MLB, NBA, NHL, MLS, WNBA, College, NFL, PGA`);
  console.log('Developer: jason@rally.com / Rally2026! (full control, only role that can grant admin)');
  console.log('Admin:     admin@rally.com / Rally2026!');
  console.log('User:      user@rally.com  / Rally2026!');
}

// Run directly when invoked as a script (not when imported)
const isDirectRun = process.argv[1]?.includes('seed');
if (isDirectRun) {
  main()
    .catch(e => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
