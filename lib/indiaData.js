// ============================================================================
// MaybeWe — India Data Layer
// Single source of truth for all India-specific content.
// Do NOT scatter destination names, states, or languages in JSX.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. INDIAN STATES & UNION TERRITORIES
// ---------------------------------------------------------------------------
export const INDIA_STATES = [
  // States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman & Nicobar Islands',
  'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)',
  'Jammu & Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// ---------------------------------------------------------------------------
// 2. CURATED INDIAN DESTINATIONS
// ---------------------------------------------------------------------------
export const INDIA_DESTINATIONS = [
  // Beach & Coastal
  { id: 'goa',       name: 'Goa',         state: 'Goa',                   region: 'West',     tag: 'Beach & Nightlife',    image: { uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'andaman',   name: 'Andaman',     state: 'Andaman & Nicobar Islands', region: 'Islands',  tag: 'Islands & Diving',     image: { uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'varkala',   name: 'Varkala',     state: 'Kerala',                region: 'South',    tag: 'Cliffs & Beach',       image: { uri: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'gokarna',   name: 'Gokarna',     state: 'Karnataka',             region: 'South',    tag: 'Beach & Temples',      image: { uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'pondicherry',name: 'Pondicherry',state: 'Puducherry',            region: 'South',    tag: 'French Quarter & Beach', image: { uri: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=2000&auto=format&fit=crop&q=85' } },

  // Mountains & Himalayas
  { id: 'manali',    name: 'Manali',      state: 'Himachal Pradesh',      region: 'North',    tag: 'Mountains & Snow',     image: { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'leh',       name: 'Leh',         state: 'Ladakh',                region: 'North',    tag: 'High Altitude & Desert', image: { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'srinagar',  name: 'Srinagar',    state: 'Jammu & Kashmir',       region: 'North',    tag: 'Dal Lake & Gardens',   image: { uri: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'kasol',     name: 'Kasol',       state: 'Himachal Pradesh',      region: 'North',    tag: 'Trek & Camping',       image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'shimla',    name: 'Shimla',      state: 'Himachal Pradesh',      region: 'North',    tag: 'Colonial Hill Station', image: { uri: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'dharamshala', name: 'Dharamshala', state: 'Himachal Pradesh',   region: 'North',    tag: 'Tibetan Culture & Trek', image: { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'spiti',     name: 'Spiti Valley', state: 'Himachal Pradesh',    region: 'North',    tag: 'Remote & Monasteries', image: { uri: 'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'mussoorie', name: 'Mussoorie',   state: 'Uttarakhand',          region: 'North',    tag: 'Hill Station & Waterfalls', image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'rishikesh', name: 'Rishikesh',   state: 'Uttarakhand',          region: 'North',    tag: 'Yoga & River Rafting', image: { uri: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'darjeeling', name: 'Darjeeling', state: 'West Bengal',          region: 'East',     tag: 'Tea Gardens & Toy Train', image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'sikkim',    name: 'Sikkim',      state: 'Sikkim',               region: 'Northeast', tag: 'Monasteries & Peaks', image: { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85' } },

  // Rajasthan & Heritage
  { id: 'jaipur',    name: 'Jaipur',      state: 'Rajasthan',            region: 'Northwest', tag: 'Pink City & Forts',   image: { uri: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'udaipur',   name: 'Udaipur',     state: 'Rajasthan',            region: 'Northwest', tag: 'Lake City & Palaces', image: { uri: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'jaisalmer', name: 'Jaisalmer',   state: 'Rajasthan',            region: 'Northwest', tag: 'Golden Desert & Dunes', image: { uri: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'jodhpur',   name: 'Jodhpur',     state: 'Rajasthan',            region: 'Northwest', tag: 'Blue City & Mehrangarh', image: { uri: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=2000&auto=format&fit=crop&q=85' } },

  // South India
  { id: 'kerala',    name: 'Kerala',      state: 'Kerala',               region: 'South',    tag: 'Backwaters & Spice Gardens', image: { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'munnar',    name: 'Munnar',      state: 'Kerala',               region: 'South',    tag: 'Tea Estates & Mist',  image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'wayanad',   name: 'Wayanad',     state: 'Kerala',               region: 'South',    tag: 'Forests & Wildlife',  image: { uri: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'coorg',     name: 'Coorg',       state: 'Karnataka',            region: 'South',    tag: 'Coffee Estates & Rivers', image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'hampi',     name: 'Hampi',       state: 'Karnataka',            region: 'South',    tag: 'Ruins & Boulders',    image: { uri: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'ooty',      name: 'Ooty',        state: 'Tamil Nadu',           region: 'South',    tag: 'Nilgiris & Gardens',  image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },

  // Northeast
  { id: 'meghalaya', name: 'Meghalaya',   state: 'Meghalaya',            region: 'Northeast', tag: 'Living Root Bridges & Waterfalls', image: { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'kaziranga', name: 'Kaziranga',   state: 'Assam',                region: 'Northeast', tag: 'Rhino & Wildlife',   image: { uri: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=2000&auto=format&fit=crop&q=85' } },

  // Heritage & Spiritual
  { id: 'varanasi',  name: 'Varanasi',    state: 'Uttar Pradesh',        region: 'North',    tag: 'Ghats & Spirituality', image: { uri: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'agra',      name: 'Agra',        state: 'Uttar Pradesh',        region: 'North',    tag: 'Taj Mahal & Mughal',  image: { uri: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'amritsar',  name: 'Amritsar',    state: 'Punjab',               region: 'North',    tag: 'Golden Temple & Heritage', image: { uri: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=2000&auto=format&fit=crop&q=85' } },

  // Cities
  { id: 'mumbai',    name: 'Mumbai',      state: 'Maharashtra',          region: 'West',     tag: 'City & Coastal Life', image: { uri: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'delhi',     name: 'Delhi',       state: 'Delhi (NCT)',          region: 'North',    tag: 'History & Culture',   image: { uri: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'bengaluru', name: 'Bengaluru',   state: 'Karnataka',            region: 'South',    tag: 'Garden City & Cafes', image: { uri: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'kolkata',   name: 'Kolkata',     state: 'West Bengal',          region: 'East',     tag: 'Culture & Art Deco',  image: { uri: 'https://images.unsplash.com/photo-1558431382-27e303142255?w=2000&auto=format&fit=crop&q=85' } },
  { id: 'hyderabad', name: 'Hyderabad',   state: 'Telangana',            region: 'South',    tag: 'Nizami Heritage & Biryani', image: { uri: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=2000&auto=format&fit=crop&q=85' } },
];

// ---------------------------------------------------------------------------
// 3. INDIAN LANGUAGES
// ---------------------------------------------------------------------------
export const INDIAN_LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Punjabi',
  'Urdu',
  'Odia',
  'Assamese',
  'Nepali',
  'Konkani',
  'Manipuri',
  'Bodo',
  'Dogri',
  'Maithili',
  'Sanskrit',
];

// ---------------------------------------------------------------------------
// 4. INR BUDGET RANGES
// ---------------------------------------------------------------------------
export const INDIA_BUDGET_RANGES = [
  { id: 'budget_1', label: 'Under ₹5,000',         min: 0,      max: 5000  },
  { id: 'budget_2', label: '₹5,000 – ₹10,000',     min: 5000,   max: 10000 },
  { id: 'budget_3', label: '₹10,000 – ₹25,000',    min: 10000,  max: 25000 },
  { id: 'budget_4', label: '₹25,000 – ₹50,000',    min: 25000,  max: 50000 },
  { id: 'budget_5', label: '₹50,000 – ₹1,00,000',  min: 50000,  max: 100000 },
  { id: 'budget_6', label: '₹1,00,000+',            min: 100000, max: null  },
];

// ---------------------------------------------------------------------------
// 5. FORMATTING HELPERS
// ---------------------------------------------------------------------------

/**
 * Formats a number as Indian Rupees.
 * Uses en-IN locale for lakh/crore grouping.
 * @param {number} amount
 * @returns {string} e.g. "₹1,00,000"
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date string using Indian locale.
 * @param {string} dateStr — ISO date string e.g. "2026-10-15"
 * @param {object} options — Intl.DateTimeFormat options
 * @returns {string} e.g. "15 Oct 2026"
 */
export function formatDateIN(dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', options);
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date range in Indian locale.
 * @param {string} from
 * @param {string} to
 * @returns {string} e.g. "15 Oct – 22 Oct 2026"
 */
export function formatTripDateRangeIN(from, to) {
  if (!from) return 'Flexible Dates';
  try {
    const fromDate = new Date(from);
    const fromStr = fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (!to) return fromStr;
    const toDate = new Date(to);
    const toStr = toDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fromStr} – ${toStr}`;
  } catch {
    return `${from} – ${to || ''}`;
  }
}

// ---------------------------------------------------------------------------
// 6. PHONE CONSTANTS
// ---------------------------------------------------------------------------
export const INDIA_PHONE_CODE = '+91';
export const INDIA_COUNTRY_CODE = 'IN';
export const INDIA_LOCALE = 'en-IN';
export const INDIA_CURRENCY = 'INR';
export const INDIA_CURRENCY_SYMBOL = '₹';
