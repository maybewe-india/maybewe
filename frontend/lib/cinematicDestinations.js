// ============================================================================
// MaybeWe — Cinematic Destination Transition Data & Resolver
// Supports continuous Google Earth style geographic camera transitions:
// WORLD → REGION → COUNTRY → STATE/AREA → DESTINATION
// Covers all Indian States, Union Territories, Major Cities, and Districts
// ============================================================================

export const SATELLITE_IMAGE = require('../assets/images/india_realistic_satellite.png');

/**
 * Calibrated geographic projection formula:
 * Converts real latitude & longitude across the Indian subcontinent
 * into percentage coordinates (x%, y%) on the 2:3 India satellite perspective map.
 */
export function latLngToCoords(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { x: 50.0, y: 50.0 };
  }
  // Latitude spans ~37N (y=10%) down to 8N (y=80%)
  const y = 99.7 - (lat * 2.395);
  // Longitude spans ~68E (x=22%) to 97E (x=88%) with conic perspective correction
  const x = 33.5 + (lng - 72.88) * 2.22 - (24 - lat) * 0.18;
  const clampedX = Math.max(12, Math.min(88, Math.round(x * 10) / 10));
  const clampedY = Math.max(10, Math.min(85, Math.round(y * 10) / 10));
  return { x: clampedX, y: clampedY };
}

// ----------------------------------------------------------------------------
// PRIMARY CINEMATIC DESTINATIONS (With Dedicated Bundled 4K Photography)
// ----------------------------------------------------------------------------
export const CINEMATIC_DESTINATIONS = [
  {
    id: 'goa',
    name: 'Goa',
    district: 'North Goa / South Goa',
    state: 'Goa',
    region: 'Western India',
    subRegion: 'Konkan Coast & Arabian Sea',
    lat: 15.2993,
    lng: 73.9876,
    coords: { x: 33.0, y: 62.0 },
    dates: 'Oct 15 – Oct 25',
    season: 'Peak Coastal Season',
    styles: ['Beach', 'Food', 'Culture', 'Nightlife'],
    tagline: 'Sun-kissed Arabian Sea beaches, palm fringed shores, and lively night markets.',
    image: require('../assets/images/dest_goa.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • INDIAN OCEAN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'WESTERN INDIA • KONKAN' },
      { level: 'STATE', label: 'GOA' },
      { level: 'DESTINATION', label: 'PANAJI & VAGATOR BEACH' },
    ],
  },
  {
    id: 'manali',
    name: 'Manali',
    district: 'Kullu',
    state: 'Himachal Pradesh',
    region: 'Northern Himalayas',
    subRegion: 'Kullu Valley & Pir Panjal',
    lat: 32.2432,
    lng: 77.1892,
    coords: { x: 44.5, y: 22.0 },
    dates: 'Nov 01 – Nov 10',
    season: 'Autumn Snow Season',
    styles: ['Adventure', 'Nature', 'Backpacking', 'Photography'],
    tagline: 'Snow-capped Himalayan peaks, pine-scented valleys, and mountain passes.',
    image: require('../assets/images/dest_manali.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • HIMALAYAS' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'NORTHERN HIMALAYAS' },
      { level: 'STATE', label: 'HIMACHAL PRADESH' },
      { level: 'DESTINATION', label: 'SOLANG VALLEY & MANALI' },
    ],
  },
  {
    id: 'kashmir',
    name: 'Kashmir',
    district: 'Srinagar',
    state: 'Jammu & Kashmir',
    region: 'Northern Himalayas',
    subRegion: 'Kashmir Valley & Dal Lake',
    lat: 34.0837,
    lng: 74.7973,
    coords: { x: 38.0, y: 18.0 },
    dates: 'Oct 12 – Oct 22',
    season: 'Golden Chinar Season',
    styles: ['Photography', 'Culture', 'Adventure', 'Nature'],
    tagline: 'Mist rising over Dal Lake, Mughal houseboats, and snow-dusted ridges.',
    image: require('../assets/images/dest_kashmir.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • NORTHERN FRONTIER' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'PIR PANJAL & KASHMIR VALLEY' },
      { level: 'STATE', label: 'JAMMU & KASHMIR' },
      { level: 'DESTINATION', label: 'SRINAGAR & DAL LAKE' },
    ],
  },
  {
    id: 'kerala',
    name: 'Kerala',
    district: 'Alappuzha / Ernakulam',
    state: 'Kerala',
    region: 'South India',
    subRegion: 'Malabar Coast & Backwaters',
    lat: 10.0889,
    lng: 77.0595,
    coords: { x: 39.5, y: 75.5 },
    dates: 'Nov 05 – Nov 15',
    season: 'Backwater Retreat Season',
    styles: ['Wellness', 'Nature', 'Culture', 'Food'],
    tagline: 'Tranquil emerald backwaters, misty Munnar tea hills, and Ayurvedic sanctuaries.',
    image: require('../assets/images/dest_kerala.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • INDIAN OCEAN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTHERN PENINSULA' },
      { level: 'STATE', label: 'KERALA' },
      { level: 'DESTINATION', label: 'ALLEPPEY & MUNNAR' },
    ],
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    district: 'Jaipur',
    state: 'Rajasthan',
    region: 'Northwest India',
    subRegion: 'Aravalli Hills & Desert Heritage',
    lat: 26.9124,
    lng: 75.7873,
    coords: { x: 40.5, y: 35.2 },
    dates: 'Oct 20 – Oct 30',
    season: 'Royal Heritage Season',
    styles: ['Culture', 'Photography', 'Heritage', 'Food'],
    tagline: 'The timeless Pink City, terracotta sandstone fortresses, and royal palace courtyards.',
    image: require('../assets/images/dest_jaipur.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • THAR DESERT' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'WESTERN REGION' },
      { level: 'STATE', label: 'RAJASTHAN' },
      { level: 'DESTINATION', label: 'JAIPUR • PINK CITY' },
    ],
  },
  {
    id: 'guntur',
    name: 'Guntur',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Krishna-Godavari Basin & Amaravati',
    lat: 16.3067,
    lng: 80.4365,
    coords: { x: 48.9, y: 60.6 },
    dates: 'Oct 15 – Oct 28',
    season: 'Pleasant Autumn Season',
    styles: ['Culture', 'Heritage', 'Food', 'Nature'],
    tagline: 'Historic district famous for Kondaveedu fortresses, spicy Andhra culinary traditions, and Buddhist heritage.',
    image: require('../assets/images/dest_guntur.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • BAY OF BENGAL' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH INDIA • COASTAL' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'GUNTUR DISTRICT' },
    ],
  },
  {
    id: 'visakhapatnam',
    name: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Eastern Ghats & Coastal Coromandel',
    lat: 17.6868,
    lng: 83.2185,
    coords: { x: 55.3, y: 57.3 },
    dates: 'Oct 18 – Oct 28',
    season: 'Coastal Breeze Season',
    styles: ['Beach', 'Nature', 'Adventure', 'Food'],
    tagline: 'Jewel of the East Coast: dramatic Rishikonda beaches, Dolphin’s Nose headland, and Araku Valley coffee hills.',
    image: require('../assets/images/dest_visakhapatnam.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • BAY OF BENGAL' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'EAST COAST' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'VISAKHAPATNAM • VIZAG' },
    ],
  },
  {
    id: 'tirupati',
    name: 'Tirupati',
    district: 'Tirupati',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Seshachalam Hills & Rayalaseema',
    lat: 13.6288,
    lng: 79.4192,
    coords: { x: 47.0, y: 67.0 },
    dates: 'Oct 10 – Oct 20',
    season: 'Brahmotsavam Festive Season',
    styles: ['Spirituality', 'Culture', 'Heritage', 'Nature'],
    tagline: 'World-renowned sacred city nestled in the misty Seshachalam ranges at the foothills of Tirumala.',
    image: require('../assets/images/dest_tirupati.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • PENINSULAR INDIA' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SESHACHALAM HILLS' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'TIRUPATI & TIRUMALA' },
    ],
  },
  {
    id: 'chittoor',
    name: 'Chittoor',
    district: 'Chittoor',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Horsley Hills & Kaundinya Sanctuary',
    lat: 13.2172,
    lng: 79.1003,
    coords: { x: 46.2, y: 68.0 },
    dates: 'Oct 20 – Oct 30',
    season: 'Hill Retreat Season',
    styles: ['Nature', 'Heritage', 'Adventure'],
    tagline: 'Scenic southern Andhra haven, lush mango orchards, cool Horsley Hills vistas, and wildlife sanctuaries.',
    image: require('../assets/images/dest_chittoor.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • SOUTHERN PLATEAU' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH INDIA' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'CHITTOOR & HORSLEY HILLS' },
    ],
  },
  {
    id: 'anantapur',
    name: 'Anantapur',
    district: 'Anantapur',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Lepakshi & Rayalaseema Plains',
    lat: 14.6819,
    lng: 77.6006,
    coords: { x: 42.5, y: 64.5 },
    dates: 'Nov 01 – Nov 12',
    season: 'Heritage Exploration Season',
    styles: ['Culture', 'Heritage', 'Photography'],
    tagline: 'Land of architectural marvels including the hanging pillar of Lepakshi and historic Vijayanagara fortresses.',
    image: require('../assets/images/dest_anantapur.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • DECCAN PLATEAU' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'RAYALASEEMA' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'ANANTAPUR & LEPAKSHI' },
    ],
  },
  {
    id: 'kurnool',
    name: 'Kurnool',
    district: 'Kurnool',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Tungabhadra River & Belum Caves',
    lat: 15.8281,
    lng: 78.0373,
    coords: { x: 43.8, y: 61.8 },
    dates: 'Oct 25 – Nov 05',
    season: 'Cave Expedition Season',
    styles: ['Adventure', 'Heritage', 'Nature'],
    tagline: 'Gateway to Rayalaseema, home to ancient Konda Reddy Buruju and the subterranean passages of Belum Caves.',
    image: require('../assets/images/dest_kurnool.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • TUNGABHADRA BASIN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'RAYALASEEMA' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'KURNOOL & BELUM CAVES' },
    ],
  },
  {
    id: 'kadapa',
    name: 'Kadapa',
    district: 'YSR Kadapa',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Gandikota Grand Canyon & Pennar Gorge',
    lat: 14.4673,
    lng: 78.8242,
    coords: { x: 45.8, y: 65.1 },
    dates: 'Nov 05 – Nov 15',
    season: 'Canyon Trekking Season',
    styles: ['Adventure', 'Photography', 'Nature'],
    tagline: 'India’s own Grand Canyon at Gandikota gorge, ancient red granite fortresses, and Pennar river sunrises.',
    image: require('../assets/images/dest_kadapa.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • PENNAR GORGE' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH INDIA' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'KADAPA & GANDIKOTA' },
    ],
  },
  {
    id: 'nellore',
    name: 'Nellore',
    district: 'SPSR Nellore',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Pulicat Lake & Coastal Flamingos',
    lat: 14.4426,
    lng: 79.9865,
    coords: { x: 48.4, y: 65.1 },
    dates: 'Nov 10 – Nov 20',
    season: 'Migratory Bird Season',
    styles: ['Nature', 'Food', 'Beach'],
    tagline: 'Coastal bird sanctuary paradise where thousands of migratory pink flamingos gather on Pulicat Lake.',
    image: require('../assets/images/dest_nellore.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • COROMANDEL COAST' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH COAST' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'NELLORE & PULICAT' },
    ],
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Krishna River & Undavalli Caves',
    lat: 16.5062,
    lng: 80.6480,
    coords: { x: 49.6, y: 60.2 },
    dates: 'Oct 15 – Oct 25',
    season: 'Riverfront Breeze Season',
    styles: ['Culture', 'Food', 'Heritage'],
    tagline: 'Vibrant cultural metropolis on the sacred Krishna river, famous for Kanaka Durga temple and rock-cut Undavalli caves.',
    image: require('../assets/images/dest_vijayawada.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • KRISHNA BASIN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'COASTAL ANDHRA' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'VIJAYAWADA & PRAKASAM' },
    ],
  },
  {
    id: 'kakinada',
    name: 'Kakinada',
    district: 'Kakinada',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Coringa Mangroves & Hope Island',
    lat: 16.9891,
    lng: 82.2475,
    coords: { x: 53.2, y: 59.0 },
    dates: 'Nov 01 – Nov 12',
    season: 'Mangrove Boating Season',
    styles: ['Nature', 'Beach', 'Food'],
    tagline: 'Serene coastal town flanked by Coringa Wildlife Sanctuary’s emerald mangroves and secluded Hope Island.',
    image: require('../assets/images/dest_kakinada.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • GODAVARI DELTA' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'COASTAL ANDHRA' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'KAKINADA & CORINGA' },
    ],
  },
  {
    id: 'rajahmundry',
    name: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    region: 'South India',
    subRegion: 'Akhanda Godavari & Papikondalu',
    lat: 17.0005,
    lng: 81.8040,
    coords: { x: 52.2, y: 59.0 },
    dates: 'Oct 20 – Oct 30',
    season: 'Godavari River Cruise Season',
    styles: ['Nature', 'Culture', 'Photography'],
    tagline: 'The cultural capital of Andhra Pradesh, legendary for majestic Godavari sunset cruises through Papikondalu hills.',
    image: require('../assets/images/dest_rajahmundry.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • GODAVARI RIVER' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'EAST GODAVARI' },
      { level: 'STATE', label: 'ANDHRA PRADESH' },
      { level: 'DESTINATION', label: 'RAJAHMUNDRY & PAPIKONDALU' },
    ],
  },
  {
    id: 'varanasi',
    name: 'Varanasi',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    region: 'North India',
    subRegion: 'Sacred Ganga Basin',
    lat: 25.3176,
    lng: 82.9739,
    coords: { x: 56.1, y: 39.1 },
    dates: 'Oct 25 – Nov 05',
    season: 'Spiritual Aarti Season',
    styles: ['Culture', 'Spirituality', 'Photography', 'Food'],
    tagline: 'Sacred riverfront stone ghats, mesmerizing twilight Ganga aartis, and timeless spiritual rituals.',
    image: require('../assets/images/dest_varanasi.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • GANGA BASIN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'NORTHERN HERITAGE' },
      { level: 'STATE', label: 'UTTAR PRADESH' },
      { level: 'DESTINATION', label: 'VARANASI GHATS & SARNATH' },
    ],
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    district: 'Dehradun / Tehri Garhwal',
    state: 'Uttarakhand',
    region: 'North India',
    subRegion: 'Garhwal Himalayas & Holy Ganga',
    lat: 30.0869,
    lng: 78.2676,
    coords: { x: 46.2, y: 27.6 },
    dates: 'Oct 18 – Oct 28',
    season: 'Yoga & Rafting Season',
    styles: ['Adventure', 'Wellness', 'Food', 'Culture'],
    tagline: 'Global yoga capital nestled where emerald rapids emerge from the majestic Himalayan foothills.',
    image: require('../assets/images/dest_manali.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • HIMALAYAN FOOTHILLS' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'GARHWAL HIMALAYAS' },
      { level: 'STATE', label: 'UTTARAKHAND' },
      { level: 'DESTINATION', label: 'RISHIKESH & LAXMAN JHULA' },
    ],
  },
  {
    id: 'udaipur',
    name: 'Udaipur',
    district: 'Udaipur',
    state: 'Rajasthan',
    region: 'Northwest India',
    subRegion: 'Lake Pichola & Aravalli Ranges',
    lat: 24.5854,
    lng: 73.7125,
    coords: { x: 35.5, y: 40.8 },
    dates: 'Oct 22 – Nov 02',
    season: 'Lakeside Autumn Season',
    styles: ['Luxury', 'Photography', 'Culture', 'Food'],
    tagline: 'City of Lakes: shimmering Lake Pichola, gleaming white marble palaces, and romantic rooftop cafes.',
    image: require('../assets/images/dest_udaipur.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • RAJASTHAN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'MEWAR REGION' },
      { level: 'STATE', label: 'RAJASTHAN' },
      { level: 'DESTINATION', label: 'UDAIPUR • LAKE PICHOLA' },
    ],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    district: 'Mumbai City / Suburban',
    state: 'Maharashtra',
    region: 'Western India',
    subRegion: 'Salsette Island & Arabian Sea',
    lat: 19.0760,
    lng: 72.8777,
    coords: { x: 32.6, y: 54.0 },
    dates: 'Nov 01 – Nov 10',
    season: 'Winter Breeze Season',
    styles: ['Food', 'Culture', 'Nightlife', 'Photography'],
    tagline: 'The bustling Maximum City: Marine Drive Queen’s Necklace, heritage Victorian architecture, and street food.',
    image: require('../assets/images/dest_mumbai.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • ARABIAN SEA' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'WEST COAST' },
      { level: 'STATE', label: 'MAHARASHTRA' },
      { level: 'DESTINATION', label: 'MUMBAI • MARINE DRIVE' },
    ],
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    region: 'South India',
    subRegion: 'Mysore Plateau & Tech Hub',
    lat: 12.9716,
    lng: 77.5946,
    coords: { x: 42.0, y: 68.6 },
    dates: 'Oct 15 – Oct 25',
    season: 'Pleasant Plateau Season',
    styles: ['Culture', 'Food', 'Nightlife', 'Nature'],
    tagline: 'The Garden City: lush Cubbon Park, world-class microbreweries, and thriving tech & cafe culture.',
    image: require('../assets/images/dest_bengaluru.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • DECCAN PLATEAU' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH INDIA' },
      { level: 'STATE', label: 'KARNATAKA' },
      { level: 'DESTINATION', label: 'BENGALURU • GARDEN CITY' },
    ],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    district: 'Central Delhi',
    state: 'Delhi (NCT)',
    region: 'North India',
    subRegion: 'Yamuna River & National Capital',
    lat: 28.6139,
    lng: 77.2090,
    coords: { x: 43.9, y: 31.2 },
    dates: 'Nov 05 – Nov 15',
    season: 'Pleasant Autumn Season',
    styles: ['Culture', 'Food', 'Heritage', 'Photography'],
    tagline: 'Heart of India: historic Red Fort, bustling Chandni Chowk lanes, and majestic Mughal monuments.',
    image: require('../assets/images/dest_delhi.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • NORTHERN PLAINS' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'NATIONAL CAPITAL REGION' },
      { level: 'STATE', label: 'DELHI (NCT)' },
      { level: 'DESTINATION', label: 'NEW DELHI & OLD DELHI' },
    ],
  },
  {
    id: 'ladakh',
    name: 'Ladakh',
    district: 'Leh',
    state: 'Ladakh',
    region: 'Northern Himalayas',
    subRegion: 'Trans-Himalayan Cold Desert',
    lat: 34.1526,
    lng: 77.5771,
    coords: { x: 44.5, y: 18.0 },
    dates: 'Oct 01 – Oct 10',
    season: 'Crisp Autumn Passes Season',
    styles: ['Adventure', 'Backpacking', 'Photography', 'Culture'],
    tagline: 'Land of High Passes: surreal azure Pangong Tso, Buddhist cliffside gompas, and stark moonscapes.',
    image: require('../assets/images/dest_ladakh.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • TRANS-HIMALAYAS' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'LADAKH RANGE' },
      { level: 'STATE', label: 'LADAKH (UT)' },
      { level: 'DESTINATION', label: 'LEH & PANGONG TSO' },
    ],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    region: 'South India',
    subRegion: 'Musi River & Deccan Plateau',
    lat: 17.3850,
    lng: 78.4867,
    coords: { x: 44.8, y: 58.1 },
    dates: 'Oct 20 – Oct 30',
    season: 'Biryani & Nizami Season',
    styles: ['Food', 'Heritage', 'Culture', 'Photography'],
    tagline: 'City of Pearls: majestic Golconda Fort, illuminated Charminar, and world-famous Hyderabadi biryani.',
    image: require('../assets/images/dest_hyderabad.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • DECCAN PLATEAU' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'TELANGANA PLATEAU' },
      { level: 'STATE', label: 'TELANGANA' },
      { level: 'DESTINATION', label: 'HYDERABAD • CHARMINAR' },
    ],
  },
  {
    id: 'agra',
    name: 'Agra',
    district: 'Agra',
    state: 'Uttar Pradesh',
    region: 'North India',
    subRegion: 'Yamuna River & Mughal Heritage',
    lat: 27.1767,
    lng: 78.0081,
    coords: { x: 45.4, y: 34.6 },
    dates: 'Oct 25 – Nov 05',
    season: 'Autumn Marble Sunrise Season',
    styles: ['Heritage', 'Photography', 'Culture'],
    tagline: 'Home of the sublime Taj Mahal, red sandstone Agra Fort, and grand Mughal architectural legacy.',
    image: require('../assets/images/dest_agra.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • NORTHERN PLAINS' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'BRAJ REGION' },
      { level: 'STATE', label: 'UTTAR PRADESH' },
      { level: 'DESTINATION', label: 'AGRA • TAJ MAHAL' },
    ],
  },
  {
    id: 'amritsar',
    name: 'Amritsar',
    district: 'Amritsar',
    state: 'Punjab',
    region: 'North India',
    subRegion: 'Majha Region & Golden Heritage',
    lat: 31.6340,
    lng: 74.8723,
    coords: { x: 39.4, y: 24.0 },
    dates: 'Oct 20 – Oct 30',
    season: 'Golden Temple Sunrise Season',
    styles: ['Spirituality', 'Food', 'Culture', 'Heritage'],
    tagline: 'Spiritual sanctuary of the Golden Temple (Harmandir Sahib), community langar, and rich Punjabi hospitality.',
    image: require('../assets/images/dest_amritsar.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • PUNJAB PLAINS' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'MAJHA' },
      { level: 'STATE', label: 'PUNJAB' },
      { level: 'DESTINATION', label: 'AMRITSAR • GOLDEN TEMPLE' },
    ],
  },
  {
    id: 'madurai',
    name: 'Madurai',
    district: 'Madurai',
    state: 'Tamil Nadu',
    region: 'South India',
    subRegion: 'Vaigai River & Temple Heritage',
    lat: 9.9252,
    lng: 78.1198,
    coords: { x: 42.6, y: 75.9 },
    dates: 'Nov 05 – Nov 15',
    season: 'Temple Festival Season',
    styles: ['Culture', 'Heritage', 'Spirituality', 'Food'],
    tagline: 'Ancient temple city of towering sculpted gopurams at Meenakshi Amman Temple and fragrant jasmine bazaars.',
    image: require('../assets/images/dest_madurai.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • TAMIL COUNTRY' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH INDIA' },
      { level: 'STATE', label: 'TAMIL NADU' },
      { level: 'DESTINATION', label: 'MADURAI • MEENAKSHI' },
    ],
  },
  {
    id: 'mysuru',
    name: 'Mysuru',
    district: 'Mysuru',
    state: 'Karnataka',
    region: 'South India',
    subRegion: 'Chamundi Hills & Royal Heritage',
    lat: 12.2958,
    lng: 76.6394,
    coords: { x: 40.0, y: 70.2 },
    dates: 'Oct 15 – Oct 25',
    season: 'Dasara Festival Season',
    styles: ['Heritage', 'Culture', 'Food'],
    tagline: 'Royal heritage city renowned for the illuminated Mysore Palace, sandalwood aroma, and fragrant silk markets.',
    image: require('../assets/images/dest_mysuru.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • DECCAN PLATEAU' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH KARNATAKA' },
      { level: 'STATE', label: 'KARNATAKA' },
      { level: 'DESTINATION', label: 'MYSURU • ROYAL PALACE' },
    ],
  },
  {
    id: 'puri',
    name: 'Puri',
    district: 'Puri',
    state: 'Odisha',
    region: 'East India',
    subRegion: 'Golden Beach & Jagannath Dham',
    lat: 19.8135,
    lng: 85.8312,
    coords: { x: 61.5, y: 52.3 },
    dates: 'Oct 18 – Oct 28',
    season: 'Beach & Pilgrimage Season',
    styles: ['Spirituality', 'Beach', 'Culture'],
    tagline: 'Holy coastal Dham, majestic Jagannath Temple, and sweeping golden beaches on the Bay of Bengal.',
    image: require('../assets/images/dest_puri.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • BAY OF BENGAL' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'ODISHA COAST' },
      { level: 'STATE', label: 'ODISHA' },
      { level: 'DESTINATION', label: 'PURI & GOLDEN BEACH' },
    ],
  },
  {
    id: 'konark',
    name: 'Konark',
    district: 'Puri',
    state: 'Odisha',
    region: 'East India',
    subRegion: 'Sun Temple & Chandrabhaga',
    lat: 19.8876,
    lng: 86.0945,
    coords: { x: 62.1, y: 52.1 },
    dates: 'Oct 20 – Oct 30',
    season: 'Heritage Shore Season',
    styles: ['Heritage', 'Photography', 'Culture'],
    tagline: 'UNESCO 13th-century stone chariot Sun Temple, intricate erotic stone carvings, and pristine coastal sands.',
    image: require('../assets/images/dest_konark.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • EAST COAST' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'EAST INDIA' },
      { level: 'STATE', label: 'ODISHA' },
      { level: 'DESTINATION', label: 'KONARK • SUN TEMPLE' },
    ],
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    district: 'Kolkata',
    state: 'West Bengal',
    region: 'East India',
    subRegion: 'Hooghly River & Bengal Delta',
    lat: 22.5726,
    lng: 88.3639,
    coords: { x: 67.6, y: 45.6 },
    dates: 'Oct 18 – Oct 28',
    season: 'Durga Puja & Autumn Season',
    styles: ['Culture', 'Food', 'Heritage', 'Photography'],
    tagline: 'City of Joy: colonial Victoria Memorial, vintage yellow taxis, Howrah Bridge, and famous Bengali sweets.',
    image: require('../assets/images/dest_kolkata.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • GANGES DELTA' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'EAST INDIA' },
      { level: 'STATE', label: 'WEST BENGAL' },
      { level: 'DESTINATION', label: 'KOLKATA • VICTORIA MEMORIAL' },
    ],
  },
  {
    id: 'andaman',
    name: 'Andaman',
    district: 'South Andaman',
    state: 'Andaman & Nicobar Islands',
    region: 'Islands',
    subRegion: 'Havelock & Radhanagar Beach',
    lat: 11.9761,
    lng: 92.9876,
    coords: { x: 78.5, y: 71.0 },
    dates: 'Nov 10 – Nov 20',
    season: 'Scuba & Island Season',
    styles: ['Beach', 'Adventure', 'Nature', 'Wellness'],
    tagline: 'Turquoise lagoons, vibrant coral reefs, and world-renowned white sands of Radhanagar Beach.',
    image: require('../assets/images/dest_andaman.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • BAY OF BENGAL' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'ISLAND TERRITORIES' },
      { level: 'STATE', label: 'ANDAMAN & NICOBAR' },
      { level: 'DESTINATION', label: 'HAVELOCK & RADHANAGAR' },
    ],
  },
  {
    id: 'chennai',
    name: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    region: 'South India',
    subRegion: 'Coromandel Coast & Marina Beach',
    lat: 13.0827,
    lng: 80.2707,
    coords: { x: 48.2, y: 68.4 },
    dates: 'Oct 20 – Nov 10',
    season: 'Pleasant Coastal Winter Season',
    styles: ['Culture', 'Beach', 'Food', 'Heritage'],
    tagline: 'Historic Coromandel gateway: golden Marina Beach sunrises, ancient Kapaleeshwarar temples, and authentic South Indian cuisine.',
    image: require('../assets/images/dest_chennai.jpg'),
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • BAY OF BENGAL' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'SOUTH INDIA • COROMANDEL' },
      { level: 'STATE', label: 'TAMIL NADU' },
      { level: 'DESTINATION', label: 'CHENNAI • MARINA COAST' },
    ],
  },
];

// ----------------------------------------------------------------------------
// COMPREHENSIVE INDIAN DISTRICTS REPOSITORY
// Maps districts across all 28 states & UTs with precise coordinates & regional hierarchy
// ----------------------------------------------------------------------------
export const INDIAN_DISTRICTS_DATA = [
  // --- ANDHRA PRADESH DISTRICTS ---
  { name: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', region: 'South India', lat: 16.3067, lng: 80.4365, imageKey: 'guntur', styles: ['Culture', 'Heritage', 'Food'] },
  { name: 'Krishna', district: 'Krishna', state: 'Andhra Pradesh', region: 'South India', lat: 16.1875, lng: 81.1389, imageKey: 'vijayawada', styles: ['Nature', 'Culture', 'Food'] },
  { name: 'NTR District', district: 'NTR District', state: 'Andhra Pradesh', region: 'South India', lat: 16.5062, lng: 80.6480, imageKey: 'vijayawada', styles: ['Culture', 'Food', 'Heritage'] },
  { name: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', region: 'South India', lat: 17.6868, lng: 83.2185, imageKey: 'visakhapatnam', styles: ['Beach', 'Nature', 'Adventure'] },
  { name: 'Anakapalli', district: 'Anakapalli', state: 'Andhra Pradesh', region: 'South India', lat: 17.6913, lng: 83.0039, imageKey: 'visakhapatnam', styles: ['Nature', 'Culture'] },
  { name: 'Alluri Sitharama Raju', district: 'Alluri Sitharama Raju', state: 'Andhra Pradesh', region: 'South India', lat: 18.0667, lng: 82.5333, imageKey: 'visakhapatnam', styles: ['Nature', 'Adventure'] },
  { name: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh', region: 'South India', lat: 13.6288, lng: 79.4192, imageKey: 'tirupati', styles: ['Spirituality', 'Culture', 'Heritage'] },
  { name: 'Chittoor', district: 'Chittoor', state: 'Andhra Pradesh', region: 'South India', lat: 13.2172, lng: 79.1003, imageKey: 'chittoor', styles: ['Nature', 'Heritage', 'Adventure'] },
  { name: 'Annamayya', district: 'Annamayya', state: 'Andhra Pradesh', region: 'South India', lat: 14.1500, lng: 78.8000, imageKey: 'chittoor', styles: ['Culture', 'Nature'] },
  { name: 'YSR Kadapa', district: 'YSR Kadapa', state: 'Andhra Pradesh', region: 'South India', lat: 14.4673, lng: 78.8242, imageKey: 'kadapa', styles: ['Adventure', 'Photography', 'Heritage'] },
  { name: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh', region: 'South India', lat: 14.6819, lng: 77.6006, imageKey: 'anantapur', styles: ['Culture', 'Heritage'] },
  { name: 'Sri Sathya Sai', district: 'Sri Sathya Sai', state: 'Andhra Pradesh', region: 'South India', lat: 14.1672, lng: 77.8117, imageKey: 'anantapur', styles: ['Spirituality', 'Culture'] },
  { name: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh', region: 'South India', lat: 15.8281, lng: 78.0373, imageKey: 'kurnool', styles: ['Adventure', 'Heritage'] },
  { name: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh', region: 'South India', lat: 15.4833, lng: 78.4833, imageKey: 'kurnool', styles: ['Heritage', 'Nature'] },
  { name: 'SPSR Nellore', district: 'SPSR Nellore', state: 'Andhra Pradesh', region: 'South India', lat: 14.4426, lng: 79.9865, imageKey: 'nellore', styles: ['Nature', 'Beach', 'Food'] },
  { name: 'Prakasam', district: 'Prakasam', state: 'Andhra Pradesh', region: 'South India', lat: 15.5057, lng: 80.0499, imageKey: 'nellore', styles: ['Beach', 'Culture'] },
  { name: 'Bapatla', district: 'Bapatla', state: 'Andhra Pradesh', region: 'South India', lat: 15.9042, lng: 80.4676, imageKey: 'guntur', styles: ['Beach', 'Nature'] },
  { name: 'Palnadu', district: 'Palnadu', state: 'Andhra Pradesh', region: 'South India', lat: 16.2333, lng: 80.0500, imageKey: 'guntur', styles: ['Heritage', 'Nature'] },
  { name: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh', region: 'South India', lat: 16.9891, lng: 82.2475, imageKey: 'kakinada', styles: ['Beach', 'Nature'] },
  { name: 'East Godavari', district: 'East Godavari', state: 'Andhra Pradesh', region: 'South India', lat: 17.0005, lng: 81.8040, imageKey: 'rajahmundry', styles: ['Nature', 'Culture'] },
  { name: 'Dr. B.R. Ambedkar Konaseema', district: 'Konaseema', state: 'Andhra Pradesh', region: 'South India', lat: 16.5700, lng: 81.9900, imageKey: 'rajahmundry', styles: ['Nature', 'Culture'] },
  { name: 'West Godavari', district: 'West Godavari', state: 'Andhra Pradesh', region: 'South India', lat: 16.5449, lng: 81.5212, imageKey: 'rajahmundry', styles: ['Nature', 'Food'] },
  { name: 'Eluru', district: 'Eluru', state: 'Andhra Pradesh', region: 'South India', lat: 16.7107, lng: 81.0952, imageKey: 'rajahmundry', styles: ['Nature', 'Heritage'] },
  { name: 'Vizianagaram', district: 'Vizianagaram', state: 'Andhra Pradesh', region: 'South India', lat: 18.1167, lng: 83.4167, imageKey: 'visakhapatnam', styles: ['Heritage', 'Culture'] },
  { name: 'Srikakulam', district: 'Srikakulam', state: 'Andhra Pradesh', region: 'South India', lat: 18.2969, lng: 83.8967, imageKey: 'visakhapatnam', styles: ['Beach', 'Culture'] },
  { name: 'Parvathipuram Manyam', district: 'Parvathipuram Manyam', state: 'Andhra Pradesh', region: 'South India', lat: 18.7833, lng: 83.4333, imageKey: 'visakhapatnam', styles: ['Nature', 'Adventure'] },

  // --- TELANGANA DISTRICTS ---
  { name: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', region: 'South India', lat: 17.3850, lng: 78.4867, imageKey: 'hyderabad', styles: ['Food', 'Heritage', 'Culture'] },
  { name: 'Warangal', district: 'Warangal', state: 'Telangana', region: 'South India', lat: 17.9689, lng: 79.5941, imageKey: 'hyderabad', styles: ['Heritage', 'Culture', 'Architecture'] },
  { name: 'Hanamkonda', district: 'Hanamkonda', state: 'Telangana', region: 'South India', lat: 18.0138, lng: 79.5449, imageKey: 'hyderabad', styles: ['Heritage', 'Culture'] },
  { name: 'Karimnagar', district: 'Karimnagar', state: 'Telangana', region: 'South India', lat: 18.4386, lng: 79.1288, imageKey: 'hyderabad', styles: ['Heritage', 'Culture'] },
  { name: 'Nizamabad', district: 'Nizamabad', state: 'Telangana', region: 'South India', lat: 18.6725, lng: 78.0941, imageKey: 'hyderabad', styles: ['Nature', 'Heritage'] },
  { name: 'Khammam', district: 'Khammam', state: 'Telangana', region: 'South India', lat: 17.2473, lng: 80.1514, imageKey: 'hyderabad', styles: ['Heritage', 'Nature'] },
  { name: 'Bhadradri Kothagudem', district: 'Bhadradri Kothagudem', state: 'Telangana', region: 'South India', lat: 17.5500, lng: 80.6200, imageKey: 'hyderabad', styles: ['Spirituality', 'Nature'] },
  { name: 'Mahbubnagar', district: 'Mahbubnagar', state: 'Telangana', region: 'South India', lat: 16.7488, lng: 78.0035, imageKey: 'hyderabad', styles: ['Nature', 'Heritage'] },
  { name: 'Nalgonda', district: 'Nalgonda', state: 'Telangana', region: 'South India', lat: 17.0500, lng: 79.2700, imageKey: 'hyderabad', styles: ['Heritage', 'Nature'] },
  { name: 'Ranga Reddy', district: 'Ranga Reddy', state: 'Telangana', region: 'South India', lat: 17.3000, lng: 78.5000, imageKey: 'hyderabad', styles: ['Nature', 'Culture'] },
  { name: 'Medchal-Malkajgiri', district: 'Medchal-Malkajgiri', state: 'Telangana', region: 'South India', lat: 17.6300, lng: 78.4800, imageKey: 'hyderabad', styles: ['Culture', 'Nature'] },
  { name: 'Adilabad', district: 'Adilabad', state: 'Telangana', region: 'South India', lat: 19.6667, lng: 78.5333, imageKey: 'hyderabad', styles: ['Waterfalls', 'Nature'] },

  // --- KERALA DISTRICTS ---
  { name: 'Wayanad', district: 'Wayanad', state: 'Kerala', region: 'South India', lat: 11.6854, lng: 76.1320, imageKey: 'kerala', styles: ['Nature', 'Adventure', 'Wellness', 'Trek'] },
  { name: 'Idukki', district: 'Idukki', state: 'Kerala', region: 'South India', lat: 9.8500, lng: 76.9400, imageKey: 'kerala', styles: ['Nature', 'Mountains', 'Trek'] },
  { name: 'Alappuzha', district: 'Alappuzha', state: 'Kerala', region: 'South India', lat: 9.4981, lng: 76.3388, imageKey: 'kerala', styles: ['Backwaters', 'Culture', 'Food'] },
  { name: 'Ernakulam', district: 'Ernakulam', state: 'Kerala', region: 'South India', lat: 9.9816, lng: 76.2999, imageKey: 'kerala', styles: ['Culture', 'Food', 'Heritage'] },
  { name: 'Kozhikode', district: 'Kozhikode', state: 'Kerala', region: 'South India', lat: 11.2588, lng: 75.7804, imageKey: 'kerala', styles: ['Food', 'Beach', 'Culture'] },
  { name: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', region: 'South India', lat: 8.5241, lng: 76.9366, imageKey: 'kerala', styles: ['Beach', 'Culture', 'Heritage'] },
  { name: 'Kottayam', district: 'Kottayam', state: 'Kerala', region: 'South India', lat: 9.5916, lng: 76.5222, imageKey: 'kerala', styles: ['Backwaters', 'Nature'] },
  { name: 'Thrissur', district: 'Thrissur', state: 'Kerala', region: 'South India', lat: 10.5276, lng: 76.2144, imageKey: 'kerala', styles: ['Culture', 'Heritage', 'Festivals'] },
  { name: 'Palakkad', district: 'Palakkad', state: 'Kerala', region: 'South India', lat: 10.7867, lng: 76.6548, imageKey: 'kerala', styles: ['Nature', 'Heritage'] },
  { name: 'Malappuram', district: 'Malappuram', state: 'Kerala', region: 'South India', lat: 11.0732, lng: 76.0740, imageKey: 'kerala', styles: ['Nature', 'Culture'] },
  { name: 'Kannur', district: 'Kannur', state: 'Kerala', region: 'South India', lat: 11.8745, lng: 75.3704, imageKey: 'kerala', styles: ['Beach', 'Culture', 'Theyyam'] },
  { name: 'Kasaragod', district: 'Kasaragod', state: 'Kerala', region: 'South India', lat: 12.5102, lng: 74.9852, imageKey: 'kerala', styles: ['Beach', 'Forts', 'Nature'] },
  { name: 'Kollam', district: 'Kollam', state: 'Kerala', region: 'South India', lat: 8.8932, lng: 76.6141, imageKey: 'kerala', styles: ['Backwaters', 'Beach'] },
  { name: 'Pathanamthitta', district: 'Pathanamthitta', state: 'Kerala', region: 'South India', lat: 9.2648, lng: 76.7870, imageKey: 'kerala', styles: ['Spirituality', 'Nature'] },

  // --- KARNATAKA DISTRICTS ---
  { name: 'Kodagu', district: 'Kodagu (Coorg)', state: 'Karnataka', region: 'South India', lat: 12.3375, lng: 75.8069, imageKey: 'coorg', styles: ['Nature', 'Coffee', 'Trek', 'Wellness'] },
  { name: 'Coorg', district: 'Kodagu (Coorg)', state: 'Karnataka', region: 'South India', lat: 12.3375, lng: 75.8069, imageKey: 'coorg', styles: ['Nature', 'Coffee', 'Trek', 'Wellness'] },
  { name: 'Dakshina Kannada', district: 'Dakshina Kannada', state: 'Karnataka', region: 'South India', lat: 12.9141, lng: 74.8560, imageKey: 'goa', styles: ['Beach', 'Food', 'Culture'] },
  { name: 'Udupi', district: 'Udupi', state: 'Karnataka', region: 'South India', lat: 13.3409, lng: 74.7421, imageKey: 'goa', styles: ['Beach', 'Spirituality', 'Food'] },
  { name: 'Uttara Kannada', district: 'Uttara Kannada', state: 'Karnataka', region: 'South India', lat: 14.5479, lng: 74.3188, imageKey: 'goa', styles: ['Beach', 'Nature', 'Waterfalls'] },
  { name: 'Gokarna', district: 'Uttara Kannada', state: 'Karnataka', region: 'South India', lat: 14.5479, lng: 74.3188, imageKey: 'goa', styles: ['Beach', 'Spirituality', 'Trek'] },
  { name: 'Chikkamagaluru', district: 'Chikkamagaluru', state: 'Karnataka', region: 'South India', lat: 13.3161, lng: 75.7720, imageKey: 'coorg', styles: ['Mountains', 'Coffee', 'Trek'] },
  { name: 'Shivamogga', district: 'Shivamogga (Shimoga)', state: 'Karnataka', region: 'South India', lat: 13.9299, lng: 75.5681, imageKey: 'kerala', styles: ['Waterfalls', 'Nature'] },
  { name: 'Shimoga', district: 'Shivamogga (Shimoga)', state: 'Karnataka', region: 'South India', lat: 13.9299, lng: 75.5681, imageKey: 'kerala', styles: ['Waterfalls', 'Nature'] },
  { name: 'Mysuru', district: 'Mysuru', state: 'Karnataka', region: 'South India', lat: 12.2958, lng: 76.6394, imageKey: 'mysuru', styles: ['Heritage', 'Palace', 'Culture'] },
  { name: 'Hassan', district: 'Hassan', state: 'Karnataka', region: 'South India', lat: 13.0033, lng: 76.1004, imageKey: 'mysuru', styles: ['Heritage', 'Architecture'] },
  { name: 'Belagavi', district: 'Belagavi', state: 'Karnataka', region: 'South India', lat: 15.8497, lng: 74.4977, imageKey: 'mysuru', styles: ['Forts', 'Culture'] },
  { name: 'Dharwad', district: 'Dharwad', state: 'Karnataka', region: 'South India', lat: 15.4589, lng: 75.0078, imageKey: 'mysuru', styles: ['Culture', 'Heritage'] },
  { name: 'Ballari', district: 'Ballari (Hampi)', state: 'Karnataka', region: 'South India', lat: 15.3350, lng: 76.4600, imageKey: 'hampi', styles: ['Heritage', 'Ruins', 'Architecture'] },
  { name: 'Hampi', district: 'Vijayanagara (Hampi)', state: 'Karnataka', region: 'South India', lat: 15.3350, lng: 76.4600, imageKey: 'hampi', styles: ['Heritage', 'Ruins', 'Architecture'] },
  { name: 'Vijayapura', district: 'Vijayapura', state: 'Karnataka', region: 'South India', lat: 16.8302, lng: 75.7100, imageKey: 'mysuru', styles: ['Heritage', 'Architecture'] },

  // --- TAMIL NADU DISTRICTS ---
  { name: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', region: 'South India', lat: 13.0827, lng: 80.2707, imageKey: 'chennai', styles: ['Culture', 'Beach', 'Food'] },
  { name: 'Nilgiris', district: 'The Nilgiris (Ooty)', state: 'Tamil Nadu', region: 'South India', lat: 11.4102, lng: 76.6950, imageKey: 'ooty', styles: ['Hills', 'Tea', 'Nature'] },
  { name: 'Ooty', district: 'The Nilgiris (Ooty)', state: 'Tamil Nadu', region: 'South India', lat: 11.4102, lng: 76.6950, imageKey: 'ooty', styles: ['Hills', 'Tea', 'Nature'] },
  { name: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', region: 'South India', lat: 9.9252, lng: 78.1198, imageKey: 'madurai', styles: ['Culture', 'Heritage', 'Spirituality'] },
  { name: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', region: 'South India', lat: 11.0168, lng: 76.9558, imageKey: 'kerala', styles: ['Nature', 'Culture'] },
  { name: 'Dindigul', district: 'Dindigul (Kodaikanal)', state: 'Tamil Nadu', region: 'South India', lat: 10.2381, lng: 77.4892, imageKey: 'ooty', styles: ['Hills', 'Nature'] },
  { name: 'Kodaikanal', district: 'Dindigul (Kodaikanal)', state: 'Tamil Nadu', region: 'South India', lat: 10.2381, lng: 77.4892, imageKey: 'ooty', styles: ['Hills', 'Nature'] },
  { name: 'Kanniyakumari', district: 'Kanniyakumari', state: 'Tamil Nadu', region: 'South India', lat: 8.0883, lng: 77.5385, imageKey: 'goa', styles: ['Ocean', 'Sunrise', 'Spirituality'] },
  { name: 'Thanjavur', district: 'Thanjavur', state: 'Tamil Nadu', region: 'South India', lat: 10.7870, lng: 79.1378, imageKey: 'chennai', styles: ['Heritage', 'Temples', 'Architecture'] },
  { name: 'Ramanathapuram', district: 'Ramanathapuram (Rameswaram)', state: 'Tamil Nadu', region: 'South India', lat: 9.2876, lng: 79.3129, imageKey: 'goa', styles: ['Island', 'Spirituality'] },
  { name: 'Rameswaram', district: 'Ramanathapuram (Rameswaram)', state: 'Tamil Nadu', region: 'South India', lat: 9.2876, lng: 79.3129, imageKey: 'goa', styles: ['Island', 'Spirituality'] },
  { name: 'Tiruchirappalli', district: 'Tiruchirappalli', state: 'Tamil Nadu', region: 'South India', lat: 10.7905, lng: 78.7047, imageKey: 'chennai', styles: ['Heritage', 'Temples'] },
  { name: 'Salem', district: 'Salem', state: 'Tamil Nadu', region: 'South India', lat: 11.6643, lng: 78.1460, imageKey: 'ooty', styles: ['Hills', 'Nature'] },

  // --- RAJASTHAN DISTRICTS ---
  { name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', region: 'Northwest India', lat: 26.9124, lng: 75.7873, imageKey: 'jaipur', styles: ['Culture', 'Heritage', 'Food'] },
  { name: 'Udaipur', district: 'Udaipur', state: 'Rajasthan', region: 'Northwest India', lat: 24.5854, lng: 73.7125, imageKey: 'udaipur', styles: ['Lakes', 'Palace', 'Luxury'] },
  { name: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', region: 'Northwest India', lat: 26.2389, lng: 73.0243, imageKey: 'jaipur', styles: ['Blue City', 'Forts', 'Heritage'] },
  { name: 'Jaisalmer', district: 'Jaisalmer', state: 'Rajasthan', region: 'Northwest India', lat: 26.9157, lng: 70.9083, imageKey: 'jaipur', styles: ['Desert', 'Dunes', 'Forts'] },
  { name: 'Bikaner', district: 'Bikaner', state: 'Rajasthan', region: 'Northwest India', lat: 28.0229, lng: 73.3119, imageKey: 'jaipur', styles: ['Heritage', 'Desert'] },
  { name: 'Ajmer', district: 'Ajmer (Pushkar)', state: 'Rajasthan', region: 'Northwest India', lat: 26.4499, lng: 74.6399, imageKey: 'jaipur', styles: ['Spirituality', 'Lakes'] },
  { name: 'Pushkar', district: 'Ajmer (Pushkar)', state: 'Rajasthan', region: 'Northwest India', lat: 26.4899, lng: 74.5511, imageKey: 'jaipur', styles: ['Spirituality', 'Desert', 'Culture'] },
  { name: 'Alwar', district: 'Alwar (Sariska)', state: 'Rajasthan', region: 'Northwest India', lat: 27.5530, lng: 76.6346, imageKey: 'jaipur', styles: ['Wildlife', 'Forts'] },
  { name: 'Sawai Madhopur', district: 'Sawai Madhopur (Ranthambore)', state: 'Rajasthan', region: 'Northwest India', lat: 25.9928, lng: 76.3644, imageKey: 'jaipur', styles: ['Tigers', 'Safari', 'Nature'] },
  { name: 'Ranthambore', district: 'Sawai Madhopur (Ranthambore)', state: 'Rajasthan', region: 'Northwest India', lat: 25.9928, lng: 76.3644, imageKey: 'jaipur', styles: ['Tigers', 'Safari', 'Nature'] },
  { name: 'Chittorgarh', district: 'Chittorgarh', state: 'Rajasthan', region: 'Northwest India', lat: 24.8887, lng: 74.6269, imageKey: 'jaipur', styles: ['Forts', 'Heritage'] },
  { name: 'Sirohi', district: 'Sirohi (Mount Abu)', state: 'Rajasthan', region: 'Northwest India', lat: 24.5926, lng: 72.7156, imageKey: 'jaipur', styles: ['Hill Station', 'Temples'] },
  { name: 'Mount Abu', district: 'Sirohi (Mount Abu)', state: 'Rajasthan', region: 'Northwest India', lat: 24.5926, lng: 72.7156, imageKey: 'jaipur', styles: ['Hill Station', 'Temples'] },

  // --- HIMACHAL PRADESH DISTRICTS ---
  { name: 'Kullu', district: 'Kullu (Manali)', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 31.9579, lng: 77.1095, imageKey: 'manali', styles: ['Himalayas', 'Adventure', 'Nature'] },
  { name: 'Manali', district: 'Kullu (Manali)', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 32.2432, lng: 77.1892, imageKey: 'manali', styles: ['Snow', 'Adventure', 'Nature'] },
  { name: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 31.1048, lng: 77.1734, imageKey: 'manali', styles: ['Colonial Hills', 'Nature'] },
  { name: 'Kangra', district: 'Kangra (Dharamshala)', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 32.0998, lng: 76.2691, imageKey: 'manali', styles: ['Tibetan Culture', 'Trek'] },
  { name: 'Dharamshala', district: 'Kangra (Dharamshala)', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 32.2190, lng: 76.3234, imageKey: 'manali', styles: ['Tibetan Culture', 'Trek'] },
  { name: 'Lahaul and Spiti', district: 'Lahaul and Spiti', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 32.2461, lng: 78.0349, imageKey: 'ladakh', styles: ['Cold Desert', 'Monasteries', 'Trek'] },
  { name: 'Spiti Valley', district: 'Lahaul and Spiti', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 32.2461, lng: 78.0349, imageKey: 'ladakh', styles: ['Cold Desert', 'Monasteries', 'Trek'] },
  { name: 'Kinnaur', district: 'Kinnaur', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 31.6510, lng: 78.4752, imageKey: 'manali', styles: ['Valleys', 'Apple Orchards', 'Trek'] },
  { name: 'Chamba', district: 'Chamba (Dalhousie)', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 32.5345, lng: 75.9879, imageKey: 'manali', styles: ['Meadows', 'Heritage'] },
  { name: 'Mandi', district: 'Mandi', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 31.5892, lng: 76.9182, imageKey: 'manali', styles: ['Temples', 'River'] },
  { name: 'Solan', district: 'Solan (Kasauli)', state: 'Himachal Pradesh', region: 'Northern Himalayas', lat: 30.9045, lng: 76.9649, imageKey: 'manali', styles: ['Pine Forests', 'Hills'] },

  // --- JAMMU & KASHMIR & LADAKH DISTRICTS ---
  { name: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.0837, lng: 74.7973, imageKey: 'kashmir', styles: ['Dal Lake', 'Gardens', 'Culture'] },
  { name: 'Baramulla', district: 'Baramulla (Gulmarg)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.0484, lng: 74.3805, imageKey: 'kashmir', styles: ['Skiing', 'Snow', 'Gondola'] },
  { name: 'Gulmarg', district: 'Baramulla (Gulmarg)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.0484, lng: 74.3805, imageKey: 'kashmir', styles: ['Skiing', 'Snow', 'Gondola'] },
  { name: 'Anantnag', district: 'Anantnag (Pahalgam)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.0163, lng: 75.3150, imageKey: 'kashmir', styles: ['Valleys', 'Lidder River', 'Nature'] },
  { name: 'Pahalgam', district: 'Anantnag (Pahalgam)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.0163, lng: 75.3150, imageKey: 'kashmir', styles: ['Valleys', 'Lidder River', 'Nature'] },
  { name: 'Ganderbal', district: 'Ganderbal (Sonamarg)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.3000, lng: 75.2900, imageKey: 'kashmir', styles: ['Glaciers', 'Trek'] },
  { name: 'Sonamarg', district: 'Ganderbal (Sonamarg)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 34.3000, lng: 75.2900, imageKey: 'kashmir', styles: ['Glaciers', 'Trek'] },
  { name: 'Jammu', district: 'Jammu', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 32.7266, lng: 74.8570, imageKey: 'kashmir', styles: ['Temples', 'Heritage'] },
  { name: 'Reasi', district: 'Reasi (Vaishno Devi)', state: 'Jammu & Kashmir', region: 'Northern Himalayas', lat: 33.0800, lng: 74.8300, imageKey: 'kashmir', styles: ['Spirituality', 'Hills'] },
  { name: 'Leh', district: 'Leh', state: 'Ladakh', region: 'Northern Himalayas', lat: 34.1526, lng: 77.5771, imageKey: 'ladakh', styles: ['High Altitude', 'Pangong', 'Desert'] },
  { name: 'Kargil', district: 'Kargil', state: 'Ladakh', region: 'Northern Himalayas', lat: 34.5539, lng: 76.1349, imageKey: 'ladakh', styles: ['Mountain Passes', 'Heritage'] },

  // --- UTTARAKHAND DISTRICTS ---
  { name: 'Dehradun', district: 'Dehradun (Mussoorie)', state: 'Uttarakhand', region: 'North India', lat: 30.3165, lng: 78.0322, imageKey: 'manali', styles: ['Hills', 'Nature'] },
  { name: 'Mussoorie', district: 'Dehradun (Mussoorie)', state: 'Uttarakhand', region: 'North India', lat: 30.4598, lng: 78.0644, imageKey: 'manali', styles: ['Queen of Hills', 'Waterfalls'] },
  { name: 'Haridwar', district: 'Haridwar', state: 'Uttarakhand', region: 'North India', lat: 29.9457, lng: 78.1642, imageKey: 'varanasi', styles: ['Ganga Aarti', 'Spirituality'] },
  { name: 'Rishikesh', district: 'Tehri Garhwal (Rishikesh)', state: 'Uttarakhand', region: 'North India', lat: 30.0869, lng: 78.2676, imageKey: 'manali', styles: ['Yoga', 'Rafting', 'Adventure'] },
  { name: 'Nainital', district: 'Nainital', state: 'Uttarakhand', region: 'North India', lat: 29.3919, lng: 79.4542, imageKey: 'manali', styles: ['Lakes', 'Boating', 'Hills'] },
  { name: 'Almora', district: 'Almora (Ranikhet)', state: 'Uttarakhand', region: 'North India', lat: 29.5971, lng: 79.6591, imageKey: 'manali', styles: ['Himalayan Peaks', 'Pine Forests'] },
  { name: 'Chamoli', district: 'Chamoli (Badrinath)', state: 'Uttarakhand', region: 'North India', lat: 30.5574, lng: 79.3479, imageKey: 'manali', styles: ['Valley of Flowers', 'Spirituality'] },
  { name: 'Rudraprayag', district: 'Rudraprayag (Kedarnath)', state: 'Uttarakhand', region: 'North India', lat: 30.2850, lng: 78.9800, imageKey: 'manali', styles: ['Spirituality', 'Glaciers'] },
  { name: 'Uttarkashi', district: 'Uttarkashi (Gangotri)', state: 'Uttarakhand', region: 'North India', lat: 30.7268, lng: 78.4354, imageKey: 'manali', styles: ['Trek', 'Ganga Source'] },

  // --- MAHARASHTRA DISTRICTS ---
  { name: 'Pune', district: 'Pune', state: 'Maharashtra', region: 'Western India', lat: 18.5204, lng: 73.8567, imageKey: 'mumbai', styles: ['Culture', 'Forts', 'Food'] },
  { name: 'Thane', district: 'Thane', state: 'Maharashtra', region: 'Western India', lat: 19.2183, lng: 72.9781, imageKey: 'mumbai', styles: ['Lakes', 'Nature'] },
  { name: 'Raigad', district: 'Raigad (Alibaug)', state: 'Maharashtra', region: 'Western India', lat: 18.6414, lng: 72.8722, imageKey: 'mumbai', styles: ['Beach', 'Forts'] },
  { name: 'Alibaug', district: 'Raigad (Alibaug)', state: 'Maharashtra', region: 'Western India', lat: 18.6414, lng: 72.8722, imageKey: 'mumbai', styles: ['Beach', 'Forts'] },
  { name: 'Ratnagiri', district: 'Ratnagiri', state: 'Maharashtra', region: 'Western India', lat: 16.9902, lng: 73.3120, imageKey: 'goa', styles: ['Konkan Coast', 'Mangoes', 'Forts'] },
  { name: 'Sindhudurg', district: 'Sindhudurg (Malvan)', state: 'Maharashtra', region: 'Western India', lat: 16.1150, lng: 73.6900, imageKey: 'goa', styles: ['Scuba', 'Sea Forts', 'Beaches'] },
  { name: 'Nashik', district: 'Nashik', state: 'Maharashtra', region: 'Western India', lat: 19.9975, lng: 73.7898, imageKey: 'mumbai', styles: ['Vineyards', 'Spirituality'] },
  { name: 'Chhatrapati Sambhajinagar', district: 'Chhatrapati Sambhajinagar (Aurangabad)', state: 'Maharashtra', region: 'Western India', lat: 19.8762, lng: 75.3433, imageKey: 'mumbai', styles: ['Ajanta & Ellora', 'Caves', 'UNESCO'] },
  { name: 'Aurangabad', district: 'Chhatrapati Sambhajinagar (Aurangabad)', state: 'Maharashtra', region: 'Western India', lat: 19.8762, lng: 75.3433, imageKey: 'mumbai', styles: ['Ajanta & Ellora', 'Caves', 'UNESCO'] },
  { name: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', region: 'Western India', lat: 16.7050, lng: 74.2433, imageKey: 'mumbai', styles: ['Heritage', 'Food', 'Culture'] },
  { name: 'Satara', district: 'Satara (Mahabaleshwar)', state: 'Maharashtra', region: 'Western India', lat: 17.9237, lng: 73.6586, imageKey: 'mumbai', styles: ['Plateau', 'Strawberry', 'Hills'] },
  { name: 'Mahabaleshwar', district: 'Satara (Mahabaleshwar)', state: 'Maharashtra', region: 'Western India', lat: 17.9237, lng: 73.6586, imageKey: 'mumbai', styles: ['Plateau', 'Strawberry', 'Hills'] },
  { name: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', region: 'Western India', lat: 21.1458, lng: 79.0882, imageKey: 'mumbai', styles: ['Tiger Capital', 'Oranges'] },
  { name: 'Chandrapur', district: 'Chandrapur (Tadoba)', state: 'Maharashtra', region: 'Western India', lat: 19.9615, lng: 79.2961, imageKey: 'mumbai', styles: ['Tigers', 'Safari', 'Wildlife'] },

  // --- GUJARAT DISTRICTS ---
  { name: 'Kutch', district: 'Kutch', state: 'Gujarat', region: 'Western India', lat: 23.7337, lng: 69.8597, imageKey: 'jaipur', styles: ['White Rann', 'Desert', 'Handicrafts'] },
  { name: 'Rann of Kutch', district: 'Kutch', state: 'Gujarat', region: 'Western India', lat: 23.7337, lng: 69.8597, imageKey: 'jaipur', styles: ['White Rann', 'Desert', 'Handicrafts'] },
  { name: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', region: 'Western India', lat: 23.0225, lng: 72.5714, imageKey: 'jaipur', styles: ['UNESCO City', 'Food', 'Textiles'] },
  { name: 'Gir Somnath', district: 'Gir Somnath', state: 'Gujarat', region: 'Western India', lat: 20.9000, lng: 70.4000, imageKey: 'jaipur', styles: ['Asiatic Lions', 'Somnath Temple'] },
  { name: 'Junagadh', district: 'Junagadh (Gir)', state: 'Gujarat', region: 'Western India', lat: 21.5222, lng: 70.4579, imageKey: 'jaipur', styles: ['Lions', 'Forts', 'Hills'] },
  { name: 'Devbhumi Dwarka', district: 'Devbhumi Dwarka', state: 'Gujarat', region: 'Western India', lat: 22.2442, lng: 68.9685, imageKey: 'jaipur', styles: ['Coastal Temple', 'Spirituality'] },
  { name: 'Surat', district: 'Surat', state: 'Gujarat', region: 'Western India', lat: 21.1702, lng: 72.8311, imageKey: 'mumbai', styles: ['Food', 'Diamonds', 'Textiles'] },
  { name: 'Vadodara', district: 'Vadodara', state: 'Gujarat', region: 'Western India', lat: 22.3072, lng: 73.1812, imageKey: 'jaipur', styles: ['Laxmi Vilas Palace', 'Culture'] },
  { name: 'Narmada', district: 'Narmada (Statue of Unity)', state: 'Gujarat', region: 'Western India', lat: 21.8380, lng: 73.7191, imageKey: 'jaipur', styles: ['Statue of Unity', 'Dam', 'Nature'] },

  // --- WEST BENGAL DISTRICTS ---
  { name: 'Darjeeling', district: 'Darjeeling', state: 'West Bengal', region: 'East India', lat: 27.0410, lng: 88.2663, imageKey: 'kolkata', styles: ['Tea Gardens', 'Kanchenjunga', 'Toy Train'] },
  { name: 'Kalimpong', district: 'Kalimpong', state: 'West Bengal', region: 'East India', lat: 27.0667, lng: 88.4667, imageKey: 'kolkata', styles: ['Hills', 'Monasteries', 'Flowers'] },
  { name: 'South 24 Parganas', district: 'South 24 Parganas (Sundarbans)', state: 'West Bengal', region: 'East India', lat: 21.9497, lng: 88.9004, imageKey: 'kolkata', styles: ['Mangroves', 'Royal Bengal Tigers'] },
  { name: 'Sundarbans', district: 'Sundarbans', state: 'West Bengal', region: 'East India', lat: 21.9497, lng: 88.9004, imageKey: 'kolkata', styles: ['Mangroves', 'Royal Bengal Tigers'] },
  { name: 'Purba Medinipur', district: 'Purba Medinipur (Digha)', state: 'West Bengal', region: 'East India', lat: 21.6266, lng: 87.5074, imageKey: 'kolkata', styles: ['Beach', 'Seafood'] },

  // --- ODISHA DISTRICTS ---
  { name: 'Khordha', district: 'Khordha (Bhubaneswar)', state: 'Odisha', region: 'East India', lat: 20.2961, lng: 85.8245, imageKey: 'puri', styles: ['Temple City', 'Caves', 'Heritage'] },
  { name: 'Bhubaneswar', district: 'Khordha (Bhubaneswar)', state: 'Odisha', region: 'East India', lat: 20.2961, lng: 85.8245, imageKey: 'puri', styles: ['Temple City', 'Caves', 'Heritage'] },
  { name: 'Cuttack', district: 'Cuttack', state: 'Odisha', region: 'East India', lat: 20.4625, lng: 85.8828, imageKey: 'puri', styles: ['Silver City', 'Food', 'Culture'] },
  { name: 'Mayurbhanj', district: 'Mayurbhanj (Simlipal)', state: 'Odisha', region: 'East India', lat: 21.9333, lng: 86.7333, imageKey: 'puri', styles: ['Waterfalls', 'Tigers', 'Nature'] },

  // --- MADHYA PRADESH & CHHATTISGARH ---
  { name: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', region: 'Central India', lat: 23.2599, lng: 77.4126, imageKey: 'delhi', styles: ['Lakes', 'Heritage', 'Museums'] },
  { name: 'Indore', district: 'Indore', state: 'Madhya Pradesh', region: 'Central India', lat: 22.7196, lng: 75.8577, imageKey: 'delhi', styles: ['Street Food', 'Cleanest City', 'Heritage'] },
  { name: 'Gwalior', district: 'Gwalior', state: 'Madhya Pradesh', region: 'Central India', lat: 26.2183, lng: 78.1828, imageKey: 'jaipur', styles: ['Forts', 'Music', 'Palaces'] },
  { name: 'Jabalpur', district: 'Jabalpur (Bhedaghat)', state: 'Madhya Pradesh', region: 'Central India', lat: 23.1815, lng: 79.9864, imageKey: 'varanasi', styles: ['Marble Rocks', 'Waterfalls'] },
  { name: 'Chhatarpur', district: 'Chhatarpur (Khajuraho)', state: 'Madhya Pradesh', region: 'Central India', lat: 24.8318, lng: 79.9199, imageKey: 'varanasi', styles: ['Khajuraho Temples', 'UNESCO', 'Sculpture'] },
  { name: 'Khajuraho', district: 'Chhatarpur (Khajuraho)', state: 'Madhya Pradesh', region: 'Central India', lat: 24.8318, lng: 79.9199, imageKey: 'varanasi', styles: ['Khajuraho Temples', 'UNESCO', 'Sculpture'] },
  { name: 'Umaria', district: 'Umaria (Bandhavgarh)', state: 'Madhya Pradesh', region: 'Central India', lat: 23.6800, lng: 80.9500, imageKey: 'delhi', styles: ['Tigers', 'Safari', 'Wilds'] },
  { name: 'Bandhavgarh', district: 'Umaria (Bandhavgarh)', state: 'Madhya Pradesh', region: 'Central India', lat: 23.6800, lng: 80.9500, imageKey: 'delhi', styles: ['Tigers', 'Safari', 'Wilds'] },
  { name: 'Bastar', district: 'Bastar (Jagdalpur)', state: 'Chhattisgarh', region: 'Central India', lat: 19.0743, lng: 82.0089, imageKey: 'visakhapatnam', styles: ['Chitrakote Falls', 'Tribal Culture', 'Forests'] },
  { name: 'Jagdalpur', district: 'Bastar (Jagdalpur)', state: 'Chhattisgarh', region: 'Central India', lat: 19.0743, lng: 82.0089, imageKey: 'visakhapatnam', styles: ['Chitrakote Falls', 'Tribal Culture', 'Forests'] },
];

export const POPULAR_SEARCH_DESTINATIONS = [
  'Goa',
  'Manali',
  'Kashmir',
  'Kerala',
  'Jaipur',
  'Guntur',
  'Visakhapatnam',
  'Coorg',
  'Udaipur',
  'Mumbai',
  'Bengaluru',
  'Tirupati',
  'Varanasi',
];

// ----------------------------------------------------------------------------
// SCENIC PHOTOGRAPHY CATALOG (Lightweight, fast-loading fallback photography)
// ----------------------------------------------------------------------------
export const CINEMATIC_4K_PHOTOGRAPHY = {
  visakhapatnam: { uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&auto=format&fit=crop&q=80' },
  goa: { uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1280&auto=format&fit=crop&q=80' },
  manali: { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&auto=format&fit=crop&q=80' },
  kashmir: { uri: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1280&auto=format&fit=crop&q=80' },
  kerala: { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1280&auto=format&fit=crop&q=80' },
  jaipur: { uri: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1280&auto=format&fit=crop&q=80' },
  guntur: { uri: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=1280&auto=format&fit=crop&q=80' },
  tirupati: { uri: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?w=1280&auto=format&fit=crop&q=80' },
  chittoor: { uri: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1280&auto=format&fit=crop&q=80' },
  anantapur: { uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1280&auto=format&fit=crop&q=80' },
  kurnool: { uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1280&auto=format&fit=crop&q=80' },
  kadapa: { uri: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1280&auto=format&fit=crop&q=80' },
  nellore: { uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&auto=format&fit=crop&q=80' },
  vijayawada: { uri: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=1280&auto=format&fit=crop&q=80' },
  kakinada: { uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1280&auto=format&fit=crop&q=80' },
  rajahmundry: { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1280&auto=format&fit=crop&q=80' },
  varanasi: { uri: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1280&auto=format&fit=crop&q=80' },
  rishikesh: { uri: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1280&auto=format&fit=crop&q=80' },
  udaipur: { uri: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1280&auto=format&fit=crop&q=80' },
  mumbai: { uri: 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=1280&auto=format&fit=crop&q=80' },
  bengaluru: { uri: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1280&auto=format&fit=crop&q=80' },
  delhi: { uri: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1280&auto=format&fit=crop&q=80' },
  ladakh: { uri: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1280&auto=format&fit=crop&q=80' },
  hyderabad: { uri: 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=1280&auto=format&fit=crop&q=80' },
  agra: { uri: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1280&auto=format&fit=crop&q=80' },
  amritsar: { uri: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1280&auto=format&fit=crop&q=80' },
  madurai: { uri: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1280&auto=format&fit=crop&q=80' },
  mysuru: { uri: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1280&auto=format&fit=crop&q=80' },
  puri: { uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&auto=format&fit=crop&q=80' },
  konark: { uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1280&auto=format&fit=crop&q=80' },
  kolkata: { uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280&auto=format&fit=crop&q=80' },
  andaman: { uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1280&auto=format&fit=crop&q=80' },
  hampi: { uri: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1280&auto=format&fit=crop&q=80' },
  coorg: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80' },
  kodagu: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80' },
  chikkamagaluru: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80' },
  ooty: { uri: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1280&auto=format&fit=crop&q=80' },
  kodaikanal: { uri: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1280&auto=format&fit=crop&q=80' },
  meghalaya: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80' },
  shillong: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80' },
  chennai: require('../assets/images/dest_chennai.jpg'),
  rajasthan: { uri: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1280&auto=format&fit=crop&q=80' },
};

// Aliases for common abbreviations, landmarks, and alternate spellings
const QUERY_ALIASES = {
  vizag: 'visakhapatnam',
  visakha: 'visakhapatnam',
  waltair: 'visakhapatnam',
  blr: 'bengaluru',
  bangalore: 'bengaluru',
  bombay: 'mumbai',
  calcutta: 'kolkata',
  madras: 'chennai',
  banaras: 'varanasi',
  kashi: 'varanasi',
  benares: 'varanasi',
  gandikota: 'kadapa',
  lepakshi: 'anantapur',
  tirumala: 'tirupati',
  'horsley hills': 'chittoor',
  araku: 'visakhapatnam',
  'araku valley': 'visakhapatnam',
  rishikonda: 'visakhapatnam',
  amaravati: 'guntur',
  'belum caves': 'kurnool',
  belum: 'kurnool',
  oravakallu: 'kurnool',
  'amer fort': 'jaipur',
  'dal lake': 'kashmir',
  'hampi ruins': 'hampi',
  chikmagalur: 'chikkamagaluru',
  shimoga: 'shivamogga',
  ooty: 'ooty',
  kodaikanal: 'kodaikanal',
  mangalore: 'dakshina kannada',
  mangaluru: 'dakshina kannada',
};

// Helper to resolve an image asset based on an imageKey, prioritizing local bundled assets
export function getBundledImage(key) {
  const k = (key || '').toLowerCase().trim();
  switch (k) {
    case 'goa': return require('../assets/images/dest_goa.jpg');
    case 'manali': return require('../assets/images/dest_manali.jpg');
    case 'kashmir': return require('../assets/images/dest_kashmir.jpg');
    case 'kerala': return require('../assets/images/dest_kerala.jpg');
    case 'jaipur': return require('../assets/images/dest_jaipur.jpg');
    case 'udaipur': return require('../assets/images/dest_udaipur.jpg');
    case 'rajasthan': return require('../assets/images/dest_rajasthan.jpg');
    case 'mumbai': return require('../assets/images/dest_mumbai.jpg');
    case 'bengaluru': return require('../assets/images/dest_bengaluru.jpg');
    case 'mysuru': return require('../assets/images/dest_mysuru.jpg');
    case 'delhi': return require('../assets/images/dest_delhi.jpg');
    case 'varanasi': return require('../assets/images/dest_varanasi.jpg');
    case 'agra': return require('../assets/images/dest_agra.jpg');
    case 'amritsar': return require('../assets/images/dest_amritsar.jpg');
    case 'madurai': return require('../assets/images/dest_madurai.jpg');
    case 'puri': return require('../assets/images/dest_puri.jpg');
    case 'konark': return require('../assets/images/dest_konark.jpg');
    case 'kolkata': return require('../assets/images/dest_kolkata.jpg');
    case 'ladakh': return require('../assets/images/dest_ladakh.jpg');
    case 'andaman': return require('../assets/images/dest_andaman.jpg');
    case 'hyderabad': return require('../assets/images/dest_hyderabad.jpg');
    case 'guntur': return require('../assets/images/dest_guntur.jpg');
    case 'visakhapatnam': return require('../assets/images/dest_visakhapatnam.jpg');
    case 'tirupati': return require('../assets/images/dest_tirupati.jpg');
    case 'chittoor': return require('../assets/images/dest_chittoor.jpg');
    case 'anantapur': return require('../assets/images/dest_anantapur.jpg');
    case 'kurnool': return require('../assets/images/dest_kurnool.jpg');
    case 'kadapa': return require('../assets/images/dest_kadapa.jpg');
    case 'nellore': return require('../assets/images/dest_nellore.jpg');
    case 'vijayawada': return require('../assets/images/dest_vijayawada.jpg');
    case 'kakinada': return require('../assets/images/dest_kakinada.jpg');
    case 'rajahmundry': return require('../assets/images/dest_rajahmundry.jpg');
    case 'hampi': return require('../assets/images/journal_hampi.jpg');
    case 'coorg':
    case 'kodagu':
    case 'chikkamagaluru':
    case 'chikmagalur':
      return CINEMATIC_4K_PHOTOGRAPHY['coorg'] || require('../assets/images/dest_kerala.jpg');
    case 'ooty':
    case 'nilgiris':
    case 'kodaikanal':
      return CINEMATIC_4K_PHOTOGRAPHY['ooty'] || require('../assets/images/dest_kerala.jpg');
    case 'chennai':
      return require('../assets/images/dest_chennai.jpg');
    default:
      if (CINEMATIC_4K_PHOTOGRAPHY[k]) {
        return CINEMATIC_4K_PHOTOGRAPHY[k];
      }
      return null;
  }
}

/**
 * Resolves any query string (city, district, town, or state)
 * to an accurate geographic profile with exact satellite map coordinates and instant local photography.
 */
export function resolveDestination(query) {
  if (!query || typeof query !== 'string') {
    const defaultDest = CINEMATIC_DESTINATIONS[0];
    return {
      ...defaultDest,
      image: defaultDest.image || getBundledImage(defaultDest.id) || require('../assets/images/dest_goa.jpg'),
    };
  }

  const rawClean = query.trim().toLowerCase();
  // Strip parentheses and brackets e.g. "Kadapa (Gandikota)" -> "kadapa"
  const cleanBase = rawClean.replace(/\([^)]*\)/g, '').trim();
  const clean = QUERY_ALIASES[rawClean] || QUERY_ALIASES[cleanBase] || rawClean;

  // 1. Exact match in Primary Cinematic Destinations (prioritize bundled local asset)
  const exact = CINEMATIC_DESTINATIONS.find(
    (d) =>
      d.id.toLowerCase() === clean ||
      d.name.toLowerCase() === clean ||
      d.id.toLowerCase() === cleanBase ||
      d.name.toLowerCase() === cleanBase
  );
  if (exact) {
    return {
      ...exact,
      image: exact.image || getBundledImage(exact.id) || CINEMATIC_4K_PHOTOGRAPHY[exact.id] || require('../assets/images/dest_goa.jpg'),
    };
  }

  // 2. Starts with query in Primary Cinematic Destinations
  const startsWith = CINEMATIC_DESTINATIONS.find(
    (d) =>
      d.name.toLowerCase().startsWith(clean) ||
      d.name.toLowerCase().startsWith(cleanBase) ||
      clean.startsWith(d.name.toLowerCase()) ||
      cleanBase.startsWith(d.name.toLowerCase())
  );
  if (startsWith) {
    return {
      ...startsWith,
      image: startsWith.image || getBundledImage(startsWith.id) || CINEMATIC_4K_PHOTOGRAPHY[startsWith.id] || require('../assets/images/dest_goa.jpg'),
    };
  }

  // 3. Match in District Dataset (Exact match first, then prefix/substring)
  let districtMatch = INDIAN_DISTRICTS_DATA.find(
    (d) =>
      d.name.toLowerCase() === clean ||
      d.district.toLowerCase() === clean ||
      d.name.toLowerCase() === cleanBase ||
      d.district.toLowerCase() === cleanBase
  );
  if (!districtMatch) {
    districtMatch = INDIAN_DISTRICTS_DATA.find(
      (d) =>
        d.name.toLowerCase().startsWith(clean) ||
        d.district.toLowerCase().startsWith(clean) ||
        d.name.toLowerCase().includes(clean) ||
        clean.includes(d.name.toLowerCase()) ||
        d.district.toLowerCase().includes(clean) ||
        cleanBase.includes(d.name.toLowerCase())
    );
  }

  if (districtMatch) {
    const coords = latLngToCoords(districtMatch.lat, districtMatch.lng);
    const dName = districtMatch.name.toLowerCase().trim();
    const dKey = (districtMatch.imageKey || '').toLowerCase().trim();

    // Prioritize authentic photo of the specific destination/district first, then the district group key
    const resolvedImage =
      CINEMATIC_4K_PHOTOGRAPHY[dName] ||
      getBundledImage(dName) ||
      getBundledImage(dKey) ||
      CINEMATIC_4K_PHOTOGRAPHY[dKey] ||
      getBundledImage('kerala') ||
      require('../assets/images/dest_goa.jpg');

    return {
      id: districtMatch.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: districtMatch.name,
      district: districtMatch.district,
      state: districtMatch.state,
      region: districtMatch.region,
      subRegion: `${districtMatch.district}, ${districtMatch.state}`,
      lat: districtMatch.lat,
      lng: districtMatch.lng,
      coords,
      dates: 'Oct 20 – Nov 10',
      season: 'Autumn / Winter Travel Season',
      styles: districtMatch.styles || ['Culture', 'Nature', 'Heritage'],
      tagline: `Explore authentic local culture, serene landscapes, and historic heritage in ${districtMatch.name}, ${districtMatch.state}.`,
      image: resolvedImage,
      breadcrumbHierarchy: [
        { level: 'WORLD', label: 'ASIA • INDIAN SUBCONTINENT' },
        { level: 'COUNTRY', label: 'INDIA' },
        { level: 'REGION', label: districtMatch.region.toUpperCase() },
        { level: 'STATE', label: districtMatch.state.toUpperCase() },
        { level: 'DESTINATION', label: `${districtMatch.name.toUpperCase()} DISTRICT` },
      ],
    };
  }

  // 4. Substring in primary destinations
  const partial = CINEMATIC_DESTINATIONS.find(
    (d) =>
      d.name.toLowerCase().includes(clean) ||
      clean.includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(cleanBase) ||
      cleanBase.includes(d.name.toLowerCase()) ||
      d.state.toLowerCase().includes(clean) ||
      d.region.toLowerCase().includes(clean) ||
      (d.district && d.district.toLowerCase().includes(clean))
  );
  if (partial) {
    return {
      ...partial,
      image: partial.image || getBundledImage(partial.id) || CINEMATIC_4K_PHOTOGRAPHY[partial.id] || require('../assets/images/dest_goa.jpg'),
    };
  }

  // 5. Fallback: create dynamic centered point within India with authentic photography
  const fallbackKey = cleanBase || clean;
  const dynamicPhoto =
    CINEMATIC_4K_PHOTOGRAPHY[fallbackKey] ||
    getBundledImage(fallbackKey) ||
    CINEMATIC_4K_PHOTOGRAPHY['coorg'] ||
    require('../assets/images/dest_kerala.jpg');

  return {
    ...CINEMATIC_DESTINATIONS[0],
    id: clean.replace(/[^a-z0-9]/g, '-'),
    name: query.trim(),
    image: dynamicPhoto,
    breadcrumbHierarchy: [
      { level: 'WORLD', label: 'ASIA • INDIAN OCEAN' },
      { level: 'COUNTRY', label: 'INDIA' },
      { level: 'REGION', label: 'PENINSULAR SUBCONTINENT' },
      { level: 'STATE', label: 'EXPLORING INDIA' },
      { level: 'DESTINATION', label: query.trim().toUpperCase() },
    ],
  };
}

export default {
  SATELLITE_IMAGE,
  CINEMATIC_DESTINATIONS,
  INDIAN_DISTRICTS_DATA,
  POPULAR_SEARCH_DESTINATIONS,
  resolveDestination,
  latLngToCoords,
};
