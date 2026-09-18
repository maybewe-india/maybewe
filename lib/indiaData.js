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
  { id: 'goa',       name: 'Goa',         state: 'Goa',                   region: 'West',     tag: 'Beach & Nightlife',    image: { uri: 'https://images.unsplash.com/photo-1519400197429-404ae2e46d86?w=800&auto=format&fit=crop&q=80' } },
  { id: 'andaman',   name: 'Andaman',     state: 'Andaman & Nicobar',     region: 'Islands',  tag: 'Islands & Diving',     image: { uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&auto=format&fit=crop&q=80' } },
  { id: 'varkala',   name: 'Varkala',     state: 'Kerala',                region: 'South',    tag: 'Cliffs & Beach',       image: { uri: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80' } },
  { id: 'gokarna',   name: 'Gokarna',     state: 'Karnataka',             region: 'South',    tag: 'Beach & Temples',      image: { uri: 'https://images.unsplash.com/photo-1625505826533-5c80aca7d157?w=800&auto=format&fit=crop&q=80' } },
  { id: 'pondicherry',name: 'Pondicherry',state: 'Puducherry',            region: 'South',    tag: 'French Quarter & Beach', image: { uri: 'https://images.unsplash.com/photo-1582738411706-bbb21bf0e9d2?w=800&auto=format&fit=crop&q=80' } },

  // Mountains & Himalayas
  { id: 'manali',    name: 'Manali',      state: 'Himachal Pradesh',      region: 'North',    tag: 'Mountains & Snow',     image: { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80' } },
  { id: 'leh',       name: 'Leh',         state: 'Ladakh',                region: 'North',    tag: 'High Altitude & Desert', image: { uri: 'https://images.unsplash.com/photo-1598896520098-97e7deebb27f?w=800&auto=format&fit=crop&q=80' } },
  { id: 'srinagar',  name: 'Srinagar',    state: 'Jammu & Kashmir',       region: 'North',    tag: 'Dal Lake & Gardens',   image: { uri: 'https://images.unsplash.com/photo-1573395238689-56dfcb9f7ed7?w=800&auto=format&fit=crop&q=80' } },
  { id: 'kasol',     name: 'Kasol',       state: 'Himachal Pradesh',      region: 'North',    tag: 'Trek & Camping',       image: { uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80' } },
  { id: 'shimla',    name: 'Shimla',      state: 'Himachal Pradesh',      region: 'North',    tag: 'Colonial Hill Station', image: { uri: 'https://images.unsplash.com/photo-1544464912-8252d5adbcb3?w=800&auto=format&fit=crop&q=80' } },
  { id: 'dharamshala', name: 'Dharamshala', state: 'Himachal Pradesh',   region: 'North',    tag: 'Tibetan Culture & Trek', image: { uri: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&auto=format&fit=crop&q=80' } },
  { id: 'spiti',     name: 'Spiti Valley', state: 'Himachal Pradesh',    region: 'North',    tag: 'Remote & Monasteries', image: { uri: 'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=800&auto=format&fit=crop&q=80' } },
  { id: 'mussoorie', name: 'Mussoorie',   state: 'Uttarakhand',          region: 'North',    tag: 'Hill Station & Waterfalls', image: { uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80' } },
  { id: 'rishikesh', name: 'Rishikesh',   state: 'Uttarakhand',          region: 'North',    tag: 'Yoga & River Rafting', image: { uri: 'https://images.unsplash.com/photo-1561361058-c24e022a8a19?w=800&auto=format&fit=crop&q=80' } },
  { id: 'darjeeling', name: 'Darjeeling', state: 'West Bengal',          region: 'East',     tag: 'Tea Gardens & Toy Train', image: { uri: 'https://images.unsplash.com/photo-1598638601985-d0c4d2b5d60e?w=800&auto=format&fit=crop&q=80' } },
  { id: 'sikkim',    name: 'Sikkim',      state: 'Sikkim',               region: 'Northeast', tag: 'Monasteries & Peaks', image: { uri: 'https://images.unsplash.com/photo-1553789396-a5b5b79ffea3?w=800&auto=format&fit=crop&q=80' } },

  // Rajasthan & Heritage
  { id: 'jaipur',    name: 'Jaipur',      state: 'Rajasthan',            region: 'Northwest', tag: 'Pink City & Forts',   image: { uri: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=80' } },
  { id: 'udaipur',   name: 'Udaipur',     state: 'Rajasthan',            region: 'Northwest', tag: 'Lake City & Palaces', image: { uri: 'https://images.unsplash.com/photo-1590766940554-6f2f8afab7f0?w=800&auto=format&fit=crop&q=80' } },
  { id: 'jaisalmer', name: 'Jaisalmer',   state: 'Rajasthan',            region: 'Northwest', tag: 'Golden Desert & Dunes', image: { uri: 'https://images.unsplash.com/photo-1558618047-3a0fc75a8d3c?w=800&auto=format&fit=crop&q=80' } },
  { id: 'jodhpur',   name: 'Jodhpur',     state: 'Rajasthan',            region: 'Northwest', tag: 'Blue City & Mehrangarh', image: { uri: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&auto=format&fit=crop&q=80' } },

  // South India
  { id: 'kerala',    name: 'Kerala',      state: 'Kerala',               region: 'South',    tag: 'Backwaters & Spice Gardens', image: { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80' } },
  { id: 'munnar',    name: 'Munnar',      state: 'Kerala',               region: 'South',    tag: 'Tea Estates & Mist',  image: { uri: 'https://images.unsplash.com/photo-1580289777853-6e5d5c7f5d4e?w=800&auto=format&fit=crop&q=80' } },
  { id: 'wayanad',   name: 'Wayanad',     state: 'Kerala',               region: 'South',    tag: 'Forests & Wildlife',  image: { uri: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=800&auto=format&fit=crop&q=80' } },
  { id: 'coorg',     name: 'Coorg',       state: 'Karnataka',            region: 'South',    tag: 'Coffee Estates & Rivers', image: { uri: 'https://images.unsplash.com/photo-1601144373053-30a53dbcf53a?w=800&auto=format&fit=crop&q=80' } },
  { id: 'hampi',     name: 'Hampi',       state: 'Karnataka',            region: 'South',    tag: 'Ruins & Boulders',    image: { uri: 'https://images.unsplash.com/photo-1566402791-5b27c1a0d75e?w=800&auto=format&fit=crop&q=80' } },
  { id: 'ooty',      name: 'Ooty',        state: 'Tamil Nadu',           region: 'South',    tag: 'Nilgiris & Gardens',  image: { uri: 'https://images.unsplash.com/photo-1611087189838-a3b40c5afe90?w=800&auto=format&fit=crop&q=80' } },

  // Northeast
  { id: 'meghalaya', name: 'Meghalaya',   state: 'Meghalaya',            region: 'Northeast', tag: 'Living Root Bridges & Waterfalls', image: { uri: 'https://images.unsplash.com/photo-1578894394135-d599e6d5f00f?w=800&auto=format&fit=crop&q=80' } },
  { id: 'kaziranga', name: 'Kaziranga',   state: 'Assam',                region: 'Northeast', tag: 'Rhino & Wildlife',   image: { uri: 'https://images.unsplash.com/photo-1610638376083-0cf8ba92c73b?w=800&auto=format&fit=crop&q=80' } },

  // Heritage & Spiritual
  { id: 'varanasi',  name: 'Varanasi',    state: 'Uttar Pradesh',        region: 'North',    tag: 'Ghats & Spirituality', image: { uri: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=800&auto=format&fit=crop&q=80' } },
  { id: 'agra',      name: 'Agra',        state: 'Uttar Pradesh',        region: 'North',    tag: 'Taj Mahal & Mughal',  image: { uri: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80' } },
  { id: 'amritsar',  name: 'Amritsar',    state: 'Punjab',               region: 'North',    tag: 'Golden Temple & Heritage', image: { uri: 'https://images.unsplash.com/photo-1609340543881-6b9d1e70ab34?w=800&auto=format&fit=crop&q=80' } },

  // Cities
  { id: 'mumbai',    name: 'Mumbai',      state: 'Maharashtra',          region: 'West',     tag: 'City & Coastal Life', image: { uri: 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=800&auto=format&fit=crop&q=80' } },
  { id: 'delhi',     name: 'Delhi',       state: 'Delhi (NCT)',          region: 'North',    tag: 'History & Culture',   image: { uri: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&auto=format&fit=crop&q=80' } },
  { id: 'bengaluru', name: 'Bengaluru',   state: 'Karnataka',            region: 'South',    tag: 'Garden City & Cafes', image: { uri: 'https://images.unsplash.com/photo-1572201088222-4fe8e5bfe870?w=800&auto=format&fit=crop&q=80' } },
  { id: 'kolkata',   name: 'Kolkata',     state: 'West Bengal',          region: 'East',     tag: 'Culture & Art Deco',  image: { uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80' } },
  { id: 'hyderabad', name: 'Hyderabad',   state: 'Telangana',            region: 'South',    tag: 'Nizami Heritage & Biryani', image: { uri: 'https://images.unsplash.com/photo-1505050053434-7abc6f8fe3f7?w=800&auto=format&fit=crop&q=80' } },
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
