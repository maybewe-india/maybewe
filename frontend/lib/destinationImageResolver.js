// Destination Image Resolver for MaybeWe
// Dynamically resolves high-quality, destination-specific cover images for saved trips.
// Supports international destinations (Ireland, Switzerland, Paris/France, Italy, Japan, etc.)
// and Indian domestic destinations, with smart keyword matching and luxury generic fallbacks.

let goaImg, manaliImg, kashmirImg, rajasthanImg, keralaImg, andamanImg, ladakhImg, hampiImg;
try {
  goaImg = require('../assets/images/dest_goa.jpg');
  manaliImg = require('../assets/images/dest_manali.jpg');
  kashmirImg = require('../assets/images/dest_kashmir.jpg');
  rajasthanImg = require('../assets/images/dest_rajasthan.jpg');
  keralaImg = require('../assets/images/dest_kerala.jpg');
  andamanImg = require('../assets/images/dest_andaman.jpg');
  ladakhImg = require('../assets/images/dest_ladakh.jpg');
  hampiImg = require('../assets/images/journal_hampi.jpg');
} catch {
  // Bundler-safe fallback
}

// Curated high-resolution photography catalog
export const DESTINATION_CATALOG = {
  // International Countries & Iconic Cities
  'ireland': 'https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?w=1200&auto=format&fit=crop&q=80', // Cliffs of Moher & green coast
  'dublin': 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1200&auto=format&fit=crop&q=80',
  'switzerland': 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1200&auto=format&fit=crop&q=80', // Swiss Alps & valley
  'swiss alps': 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1200&auto=format&fit=crop&q=80',
  'zurich': 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1200&auto=format&fit=crop&q=80',
  'geneva': 'https://images.unsplash.com/photo-1574873215043-44119461cb3b?w=1200&auto=format&fit=crop&q=80',
  'interlaken': 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?w=1200&auto=format&fit=crop&q=80',
  'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80', // Paris Eiffel Tower
  'france': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80',
  'italy': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200&auto=format&fit=crop&q=80', // Cinque Terre Italy
  'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&auto=format&fit=crop&q=80', // Colosseum
  'florence': 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=1200&auto=format&fit=crop&q=80',
  'venice': 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=1200&auto=format&fit=crop&q=80',
  'japan': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80', // Kyoto pagoda & Mount Fuji
  'tokyo': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
  'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80',
  'osaka': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&auto=format&fit=crop&q=80',
  'united kingdom': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80',
  'uk': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80',
  'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80',
  'scotland': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&auto=format&fit=crop&q=80',
  'iceland': 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1200&auto=format&fit=crop&q=80',
  'norway': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'spain': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&auto=format&fit=crop&q=80',
  'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&auto=format&fit=crop&q=80',
  'madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&auto=format&fit=crop&q=80',
  'greece': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&auto=format&fit=crop&q=80',
  'santorini': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&auto=format&fit=crop&q=80',
  'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&auto=format&fit=crop&q=80',
  'indonesia': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&auto=format&fit=crop&q=80',
  'thailand': 'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=1200&auto=format&fit=crop&q=80',
  'bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&auto=format&fit=crop&q=80',
  'phuket': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1200&auto=format&fit=crop&q=80',
  'vietnam': 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&auto=format&fit=crop&q=80',
  'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&auto=format&fit=crop&q=80',
  'australia': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&auto=format&fit=crop&q=80',
  'sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&auto=format&fit=crop&q=80',
  'new zealand': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80',
  'united states': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&auto=format&fit=crop&q=80',
  'usa': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&auto=format&fit=crop&q=80',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&auto=format&fit=crop&q=80',
  'california': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&auto=format&fit=crop&q=80',
  'hawaii': 'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=1200&auto=format&fit=crop&q=80',
  'canada': 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&auto=format&fit=crop&q=80',
  'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&auto=format&fit=crop&q=80',
  'uae': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&auto=format&fit=crop&q=80',
  'turkey': 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&auto=format&fit=crop&q=80',
  'maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&auto=format&fit=crop&q=80',
  'sri lanka': 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=1200&auto=format&fit=crop&q=80',
  'nepal': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&auto=format&fit=crop&q=80',

  // Indian Destinations
  'goa': goaImg || { uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80' },
  'manali': manaliImg || { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80' },
  'kashmir': kashmirImg || { uri: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1200&auto=format&fit=crop&q=80' },
  'srinagar': kashmirImg || { uri: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1200&auto=format&fit=crop&q=80' },
  'rajasthan': rajasthanImg || { uri: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&auto=format&fit=crop&q=80' },
  'jaipur': rajasthanImg || { uri: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&auto=format&fit=crop&q=80' },
  'udaipur': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=80',
  'jodhpur': 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1200&auto=format&fit=crop&q=80',
  'kerala': keralaImg || { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop&q=80' },
  'munnar': keralaImg || { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop&q=80' },
  'alleppey': 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=1200&auto=format&fit=crop&q=80',
  'andaman': andamanImg || { uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&auto=format&fit=crop&q=80' },
  'ladakh': ladakhImg || { uri: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1200&auto=format&fit=crop&q=80' },
  'leh': ladakhImg || { uri: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1200&auto=format&fit=crop&q=80' },
  'hampi': hampiImg || { uri: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=80' },
  'rishikesh': 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1200&auto=format&fit=crop&q=80',
  'varanasi': 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200&auto=format&fit=crop&q=80',
  'tirupati': 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?w=1200&auto=format&fit=crop&q=80',
  'ooty': 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1200&auto=format&fit=crop&q=80',
  'coorg': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'kodagu': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'chikkamagaluru': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'chikmagalur': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'kodaikanal': 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1200&auto=format&fit=crop&q=80',
  'wayanad': 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=1200&auto=format&fit=crop&q=80',
  'pondicherry': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=80',
  'spiti': 'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=1200&auto=format&fit=crop&q=80',
  'gokarna': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  'meghalaya': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'shillong': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'darjeeling': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&auto=format&fit=crop&q=80',
  'agra': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&auto=format&fit=crop&q=80',
  'mumbai': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&auto=format&fit=crop&q=80',
  'delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=80',
  'bengaluru': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=80',
  'hyderabad': 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=1200&auto=format&fit=crop&q=80',
};

// Keyword / Vibe themed fallbacks
const THEME_FALLBACKS = [
  {
    regex: /(beach|coast|ocean|sea|island|sand|tropical|shore)/i,
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  },
  {
    regex: /(mountain|trek|hiking|snow|alp|hill|valley|peak|ridge|cliff)/i,
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80',
  },
  {
    regex: /(temple|spiritual|heritage|palace|fort|castle|ruins|historic)/i,
    url: 'https://images.unsplash.com/photo-1590766940554-6f2f8afab7f0?w=1200&auto=format&fit=crop&q=80',
  },
  {
    regex: /(lake|river|waterfall|falls|water|boat|cruise)/i,
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  },
  {
    regex: /(city|urban|nightlife|metropolis|town)/i,
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80',
  },
  {
    regex: /(forest|jungle|nature|safari|green|woods)/i,
    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80',
  },
];

// Curated luxury generic travel photography fallback
export const GENERIC_PREMIUM_TRAVEL_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&auto=format&fit=crop&q=80';

export const DESTINATION_REMOTE_URLS = {
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
  manali: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80',
  kashmir: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1200&auto=format&fit=crop&q=80',
  srinagar: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1200&auto=format&fit=crop&q=80',
  rajasthan: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&auto=format&fit=crop&q=80',
  jaipur: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&auto=format&fit=crop&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop&q=80',
  munnar: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop&q=80',
  andaman: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&auto=format&fit=crop&q=80',
  ladakh: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1200&auto=format&fit=crop&q=80',
  leh: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1200&auto=format&fit=crop&q=80',
  hampi: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=80',
  coorg: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  kodagu: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  chikkamagaluru: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  chikmagalur: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  ooty: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1200&auto=format&fit=crop&q=80',
  kodaikanal: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1200&auto=format&fit=crop&q=80',
  bengaluru: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=80',
  hyderabad: 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=1200&auto=format&fit=crop&q=80',
  udaipur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=80',
};

/**
 * Resolves a destination image URI string from a user input (e.g. "Ireland", "Paris, France").
 * Useful when saving trips or serializing to database/storage.
 */
export function resolveDestinationImageUri(destination) {
  if (!destination || typeof destination !== 'string') {
    return GENERIC_PREMIUM_TRAVEL_IMAGE;
  }

  const clean = destination.toLowerCase().trim();

  const getUriFromVal = (val, key) => {
    if (key && DESTINATION_REMOTE_URLS[key]) return DESTINATION_REMOTE_URLS[key];
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && val.uri) return val.uri;
    return null;
  };

  // 1. Direct key match
  if (DESTINATION_CATALOG[clean] || DESTINATION_REMOTE_URLS[clean]) {
    const val = DESTINATION_CATALOG[clean];
    const uri = getUriFromVal(val, clean);
    if (uri) return uri;
  }

  // 2. Tokenized search (e.g., "Dublin, Ireland" or "Paris, France" or "Trip to Switzerland")
  const words = clean.split(/[\s,–—\/\-\.]+/).filter((w) => w.length > 2);
  for (const [key, val] of Object.entries(DESTINATION_CATALOG)) {
    if (clean.includes(key)) {
      const uri = getUriFromVal(val, key);
      if (uri) return uri;
    }
  }

  for (const word of words) {
    if (DESTINATION_CATALOG[word] || DESTINATION_REMOTE_URLS[word]) {
      const val = DESTINATION_CATALOG[word];
      const uri = getUriFromVal(val, word);
      if (uri) return uri;
    }
  }

  // 3. Keyword / Vibe match
  for (const theme of THEME_FALLBACKS) {
    if (theme.regex.test(clean)) {
      return theme.url;
    }
  }

  // 4. Premium generic fallback
  return GENERIC_PREMIUM_TRAVEL_IMAGE;
}

/**
 * Resolves a React Native Image source object (local asset or remote { uri })
 * for use directly inside `<Image source={getDestinationImage(destination, coverUrl)} />`.
 */
export function getDestinationImage(destination, coverUrl) {
  // If trip already has a valid coverUrl
  if (coverUrl && typeof coverUrl === 'string' && coverUrl.trim().length > 0) {
    return { uri: coverUrl.trim() };
  }
  if (coverUrl && typeof coverUrl === 'object' && coverUrl.uri) {
    return coverUrl;
  }

  if (!destination || typeof destination !== 'string') {
    return { uri: GENERIC_PREMIUM_TRAVEL_IMAGE };
  }

  const clean = destination.toLowerCase().trim();

  // 1. Exact catalog match
  if (DESTINATION_CATALOG[clean]) {
    const val = DESTINATION_CATALOG[clean];
    return typeof val === 'string' ? { uri: val } : val;
  }

  // 2. Substring & word matches
  for (const [key, val] of Object.entries(DESTINATION_CATALOG)) {
    if (clean.includes(key)) {
      return typeof val === 'string' ? { uri: val } : val;
    }
  }

  const words = clean.split(/[\s,–—\/\-\.]+/).filter((w) => w.length > 2);
  for (const word of words) {
    if (DESTINATION_CATALOG[word]) {
      const val = DESTINATION_CATALOG[word];
      return typeof val === 'string' ? { uri: val } : val;
    }
  }

  // 3. Theme regex fallback
  for (const theme of THEME_FALLBACKS) {
    if (theme.regex.test(clean)) {
      return { uri: theme.url };
    }
  }

  // 4. Premium generic fallback
  return { uri: GENERIC_PREMIUM_TRAVEL_IMAGE };
}
