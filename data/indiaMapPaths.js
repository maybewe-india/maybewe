// ============================================================================
// MaybeWe — India States & Union Territories Map Geometry
// Clean, bundled SVG paths for all 28 Indian States & 8 Union Territories
// ViewBox: 0 0 650 720
// ============================================================================

export const INDIA_MAP_VIEWBOX = '0 0 650 720';

export const INDIA_MAP_REGIONS = [
  // --- NORTH ---
  {
    id: 'ladakh',
    name: 'Ladakh',
    type: 'UT',
    center: [280, 80],
    path: 'M230,45 L280,30 L350,55 L375,95 L345,130 L290,135 L260,115 L225,95 Z',
  },
  {
    id: 'jammu-kashmir',
    name: 'Jammu & Kashmir',
    type: 'UT',
    center: [200, 110],
    path: 'M170,80 L225,95 L260,115 L245,150 L195,155 L165,125 Z',
  },
  {
    id: 'himachal-pradesh',
    name: 'Himachal Pradesh',
    type: 'State',
    center: [240, 160],
    path: 'M200,150 L245,145 L275,175 L255,200 L210,195 L200,165 Z',
  },
  {
    id: 'punjab',
    name: 'Punjab',
    type: 'State',
    center: [180, 185],
    path: 'M160,160 L205,160 L205,210 L160,215 L150,185 Z',
  },
  {
    id: 'chandigarh',
    name: 'Chandigarh',
    type: 'UT',
    center: [204, 180],
    path: 'M200,176 L208,176 L208,184 L200,184 Z',
  },
  {
    id: 'uttarakhand',
    name: 'Uttarakhand',
    type: 'State',
    center: [265, 205],
    path: 'M245,185 L285,185 L300,225 L265,240 L240,215 Z',
  },
  {
    id: 'haryana',
    name: 'Haryana',
    type: 'State',
    center: [195, 230],
    path: 'M185,205 L225,205 L225,255 L175,250 L175,225 Z',
  },
  {
    id: 'delhi',
    name: 'Delhi (NCT)',
    type: 'UT',
    center: [215, 238],
    path: 'M210,233 L220,233 L220,243 L210,243 Z',
  },

  // --- WEST & DESERT ---
  {
    id: 'rajasthan',
    name: 'Rajasthan',
    type: 'State',
    center: [140, 275],
    path: 'M95,230 L175,225 L215,255 L215,310 L165,345 L115,340 L85,285 Z',
  },
  {
    id: 'gujarat',
    name: 'Gujarat',
    type: 'State',
    center: [95, 385],
    path: 'M55,345 L125,340 L150,380 L145,430 L85,435 L45,395 Z',
  },
  {
    id: 'dadra-nagar-haveli-daman-diu',
    name: 'Dadra & Nagar Haveli and Daman & Diu',
    type: 'UT',
    center: [100, 428],
    path: 'M96,424 L104,424 L104,432 L96,432 Z',
  },

  // --- CENTRAL & NORTH PLAINS ---
  {
    id: 'uttar-pradesh',
    name: 'Uttar Pradesh',
    type: 'State',
    center: [270, 280],
    path: 'M220,245 L280,235 L350,265 L365,320 L300,345 L230,315 L220,265 Z',
  },
  {
    id: 'madhya-pradesh',
    name: 'Madhya Pradesh',
    type: 'State',
    center: [225, 365],
    path: 'M155,335 L245,320 L315,345 L320,405 L245,435 L175,410 L150,365 Z',
  },
  {
    id: 'chhattisgarh',
    name: 'Chhattisgarh',
    type: 'State',
    center: [305, 430],
    path: 'M285,380 L325,370 L340,430 L320,485 L285,465 L285,405 Z',
  },

  // --- EAST ---
  {
    id: 'bihar',
    name: 'Bihar',
    type: 'State',
    center: [370, 290],
    path: 'M345,265 L415,265 L415,315 L345,315 Z',
  },
  {
    id: 'jharkhand',
    name: 'Jharkhand',
    type: 'State',
    center: [370, 350],
    path: 'M340,315 L415,315 L410,380 L350,375 Z',
  },
  {
    id: 'odisha',
    name: 'Odisha',
    type: 'State',
    center: [355, 435],
    path: 'M325,395 L395,390 L405,445 L345,475 L325,435 Z',
  },
  {
    id: 'west-bengal',
    name: 'West Bengal',
    type: 'State',
    center: [415, 345],
    path: 'M400,270 L425,260 L435,330 L450,390 L415,415 L405,345 Z',
  },

  // --- NORTH-EAST ---
  {
    id: 'sikkim',
    name: 'Sikkim',
    type: 'State',
    center: [425, 235],
    path: 'M418,225 L432,225 L432,245 L418,245 Z',
  },
  {
    id: 'assam',
    name: 'Assam',
    type: 'State',
    center: [505, 275],
    path: 'M455,270 L535,245 L565,265 L525,305 L465,305 Z',
  },
  {
    id: 'arunachal-pradesh',
    name: 'Arunachal Pradesh',
    type: 'State',
    center: [545, 215],
    path: 'M485,215 L565,195 L615,235 L565,255 L505,255 Z',
  },
  {
    id: 'nagaland',
    name: 'Nagaland',
    type: 'State',
    center: [565, 280],
    path: 'M550,265 L580,265 L580,305 L550,305 Z',
  },
  {
    id: 'manipur',
    name: 'Manipur',
    type: 'State',
    center: [555, 325],
    path: 'M545,305 L575,305 L570,350 L540,345 Z',
  },
  {
    id: 'mizoram',
    name: 'Mizoram',
    type: 'State',
    center: [530, 365],
    path: 'M520,345 L545,345 L540,395 L515,385 Z',
  },
  {
    id: 'tripura',
    name: 'Tripura',
    type: 'State',
    center: [490, 355],
    path: 'M480,345 L505,345 L500,380 L475,375 Z',
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    type: 'State',
    center: [475, 295],
    path: 'M450,290 L505,290 L505,315 L450,315 Z',
  },

  // --- DECCAN & WEST COAST ---
  {
    id: 'maharashtra',
    name: 'Maharashtra',
    type: 'State',
    center: [175, 455],
    path: 'M120,415 L225,410 L275,445 L255,510 L175,515 L135,465 Z',
  },
  {
    id: 'goa',
    name: 'Goa',
    type: 'State',
    center: [142, 535],
    path: 'M138,528 L148,528 L148,542 L138,542 Z',
  },

  // --- SOUTH ---
  {
    id: 'telangana',
    name: 'Telangana',
    type: 'State',
    center: [245, 485],
    path: 'M215,455 L285,445 L295,505 L235,535 L215,485 Z',
  },
  {
    id: 'andhra-pradesh',
    name: 'Andhra Pradesh',
    type: 'State',
    center: [275, 545],
    path: 'M275,475 L335,455 L350,510 L295,595 L245,565 L275,525 Z',
  },
  {
    id: 'karnataka',
    name: 'Karnataka',
    type: 'State',
    center: [180, 560],
    path: 'M145,505 L215,505 L230,580 L185,620 L150,565 Z',
  },
  {
    id: 'puducherry',
    name: 'Puducherry',
    type: 'UT',
    center: [265, 620],
    path: 'M260,615 L270,615 L270,625 L260,625 Z',
  },
  {
    id: 'tamil-nadu',
    name: 'Tamil Nadu',
    type: 'State',
    center: [225, 640],
    path: 'M195,595 L265,585 L265,655 L205,685 L185,635 Z',
  },
  {
    id: 'kerala',
    name: 'Kerala',
    type: 'State',
    center: [175, 645],
    path: 'M155,595 L185,595 L195,675 L170,685 L150,625 Z',
  },

  // --- ISLANDS ---
  {
    id: 'lakshadweep',
    name: 'Lakshadweep',
    type: 'UT',
    center: [105, 645],
    path: 'M100,635 L110,635 L110,655 L100,655 Z',
  },
  {
    id: 'andaman-nicobar',
    name: 'Andaman & Nicobar Islands',
    type: 'UT',
    center: [555, 560],
    path: 'M550,520 L560,520 L560,600 L550,600 Z',
  },
];
