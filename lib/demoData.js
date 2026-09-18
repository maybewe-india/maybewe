// Demo Data Layer for MaybeWe — India Edition
// All demo data represents Indian travelers planning trips across India.
// Centralised destination data lives in lib/indiaData.js

// ---------------------------------------------------------------------------
// CURRENT USER — Demo
// ---------------------------------------------------------------------------
export const DEMO_CURRENT_USER = {
  id: 'current-user-uuid-101',
  name: 'Priya Sharma',
  email: 'priya@maybwe.in',
  age: 24,
  gender: 'Female',
  bio: 'UI designer from Bengaluru who travels for the stillness of mountains, backwater sunsets, and chai stops at dhabas along the highway.',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  travel_styles: ['Culture', 'Photography', 'Food', 'Nature'],
  languages: ['English', 'Telugu', 'Hindi'],
  verification_status: 'verified',
  trust_score: 4.95,
  subscription_tier: 'premium',
  theme_preference: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  created_at: '2025-01-10T10:00:00Z',
};

// ---------------------------------------------------------------------------
// DEMO TRAVELERS — 5 Indian Travelers
// ---------------------------------------------------------------------------
export const DEMO_TRAVELERS = [
  {
    id: 'user-001',
    name: 'Arjun Mehta',
    age: 26,
    gender: 'Male',
    bio: 'Product manager from Delhi who lives for Goa sunsets, flea market finds in Anjuna, and early morning rides along Vagator beach.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80',
    travel_styles: ['Beach', 'Food', 'Culture', 'Nightlife'],
    languages: ['Hindi', 'English', 'Punjabi'],
    verification_status: 'verified',
    trust_score: 4.92,
    subscription_tier: 'premium',
    destination: 'Goa',
    trip_date_from: '2026-10-15',
    trip_date_to: '2026-10-25',
    trip_travel_style: 'Beach & Food',
    looking_for: 'Beach companion & flea market explorer',
    compatibility: 94,
    travel_history: [
      { place: 'Rishikesh', year: '2025', photo: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=500&auto=format&fit=crop&q=80' },
      { place: 'Udaipur', year: '2024', photo: 'https://images.unsplash.com/photo-1590766940554-6f2f8afab7f0?w=500&auto=format&fit=crop&q=80' },
      { place: 'Andaman', year: '2023', photo: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'user-002',
    name: 'Kavya Reddy',
    age: 23,
    gender: 'Female',
    bio: 'Graphic designer from Hyderabad. Addicted to Manali snowfall, bonfire nights in Kasol, and lost trekking trails that nobody seems to know about.',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80',
    travel_styles: ['Adventure', 'Nature', 'Backpacking', 'Photography'],
    languages: ['Telugu', 'Hindi', 'English'],
    verification_status: 'verified',
    trust_score: 4.88,
    subscription_tier: 'free',
    destination: 'Manali',
    trip_date_from: '2026-11-01',
    trip_date_to: '2026-11-10',
    trip_travel_style: 'Adventure & Backpacking',
    looking_for: 'Trek partner & snowfall companion',
    compatibility: 89,
    travel_history: [
      { place: 'Coorg', year: '2025', photo: 'https://images.unsplash.com/photo-1601144373053-30a53dbcf53a?w=500&auto=format&fit=crop&q=80' },
      { place: 'Spiti Valley', year: '2024', photo: 'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=500&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'user-003',
    name: 'Rahul Nair',
    age: 29,
    gender: 'Male',
    bio: "Photojournalist from Mumbai. Chasing mist over Dal Lake, houseboat mornings in Srinagar, and golden light through chinar trees in October.",
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80',
    travel_styles: ['Photography', 'Culture', 'Adventure', 'Nature'],
    languages: ['Malayalam', 'Hindi', 'English'],
    verification_status: 'verified',
    trust_score: 4.95,
    subscription_tier: 'premium',
    destination: 'Kashmir',
    trip_date_from: '2026-10-12',
    trip_date_to: '2026-10-22',
    trip_travel_style: 'Photography & Culture',
    looking_for: 'Photography buddy & trek companion',
    compatibility: 91,
    travel_history: [
      { place: 'Hampi', year: '2025', photo: 'https://images.unsplash.com/photo-1566402791-5b27c1a0d75e?w=500&auto=format&fit=crop&q=80' },
      { place: 'Meghalaya', year: '2024', photo: 'https://images.unsplash.com/photo-1578894394135-d599e6d5f00f?w=500&auto=format&fit=crop&q=80' },
      { place: 'Leh', year: '2023', photo: 'https://images.unsplash.com/photo-1598896520098-97e7deebb27f?w=500&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'user-004',
    name: 'Ananya Singh',
    age: 27,
    gender: 'Female',
    bio: 'Yoga teacher and wellness blogger from Jaipur. Heading to Kerala for Ayurveda, backwater canoe rides, and tea estate mornings in Munnar.',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
    travel_styles: ['Wellness', 'Nature', 'Culture', 'Food'],
    languages: ['Hindi', 'English', 'Rajasthani'],
    verification_status: 'verified',
    trust_score: 4.82,
    subscription_tier: 'free',
    destination: 'Kerala',
    trip_date_from: '2026-11-05',
    trip_date_to: '2026-11-15',
    trip_travel_style: 'Wellness & Nature',
    looking_for: 'Wellness companion & backwater co-traveler',
    compatibility: 86,
    travel_history: [
      { place: 'Pondicherry', year: '2025', photo: 'https://images.unsplash.com/photo-1582738411706-bbb21bf0e9d2?w=500&auto=format&fit=crop&q=80' },
      { place: 'Gokarna', year: '2024', photo: 'https://images.unsplash.com/photo-1625505826533-5c80aca7d157?w=500&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'user-005',
    name: 'Dev Kapoor',
    age: 31,
    gender: 'Male',
    bio: "Startup founder from Bengaluru who disappears to Rishikesh every quarter to recharge — river rafting, beachfront cafes, and morning yoga on the ghats.",
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=800&auto=format&fit=crop&q=80',
    travel_styles: ['Adventure', 'Wellness', 'Food', 'Culture'],
    languages: ['Hindi', 'English', 'Punjabi'],
    verification_status: 'pending',
    trust_score: 4.75,
    subscription_tier: 'free',
    destination: 'Rishikesh',
    trip_date_from: '2026-10-18',
    trip_date_to: '2026-10-28',
    trip_travel_style: 'Adventure & Wellness',
    looking_for: 'Rafting partner & yoga companion',
    compatibility: 83,
    travel_history: [
      { place: 'Varanasi', year: '2024', photo: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=500&auto=format&fit=crop&q=80' },
    ],
  },
];

// ---------------------------------------------------------------------------
// DEMO MY TRIPS — Indian destinations
// ---------------------------------------------------------------------------
export const DEMO_MY_TRIPS = [
  {
    id: 'my-trip-001',
    destination: 'Goa',
    date_from: '2026-10-15',
    date_to: '2026-10-25',
    travel_style: 'Beach & Food',
    looking_for: 'Beach companion & local food explorer',
    status: 'active',
    created_at: '2026-09-01T12:00:00Z',
    matched_count: 3,
  },
  {
    id: 'my-trip-002',
    destination: 'Manali',
    date_from: '2026-12-10',
    date_to: '2026-12-18',
    travel_style: 'Adventure & Hiking',
    looking_for: 'Trek partner & snowfall companion',
    status: 'active',
    created_at: '2026-09-10T09:30:00Z',
    matched_count: 2,
  },
  {
    id: 'my-trip-003',
    destination: 'Kashmir',
    date_from: '2025-10-05',
    date_to: '2025-10-14',
    travel_style: 'Photography & Culture',
    looking_for: 'Photography buddy',
    status: 'completed',
    created_at: '2025-09-01T08:00:00Z',
    matched_count: 4,
  },
  {
    id: 'my-trip-004',
    destination: 'Andaman',
    date_from: '2027-01-20',
    date_to: '2027-01-30',
    travel_style: 'Beach & Island Hopping',
    looking_for: 'Snorkelling partner & island explorer',
    status: 'active',
    created_at: '2026-09-15T14:00:00Z',
    matched_count: 3,
  },
];

// ---------------------------------------------------------------------------
// DEMO MATCHES
// ---------------------------------------------------------------------------
export const DEMO_MATCHES = [
  {
    id: 'match-001',
    user: DEMO_TRAVELERS[0], // Arjun Mehta
    status: 'accepted',
    lastMessage: "Perfect! Let's meet at Baga Beach on the 16th morning?",
    lastMessageTime: '10:45 AM',
    unreadCount: 1,
    trip: {
      destination: 'Goa',
      dates: 'Oct 15 – Oct 25',
    },
  },
  {
    id: 'match-002',
    user: DEMO_TRAVELERS[2], // Rahul Nair
    status: 'accepted',
    lastMessage: 'The light over Dal Lake at 6 AM is something else — bring a wide lens!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    trip: {
      destination: 'Kashmir',
      dates: 'Oct 12 – Oct 22',
    },
  },
  {
    id: 'match-003',
    user: DEMO_TRAVELERS[1], // Kavya Reddy
    status: 'pending',
    initialNote: 'Hey Priya! Saw your Manali trip overlaps with mine. Would love to do the Hampta Pass trek together!',
    lastMessageTime: '2 hours ago',
    unreadCount: 0,
    trip: {
      destination: 'Manali',
      dates: 'Nov 01 – Nov 10',
    },
  },
];

// ---------------------------------------------------------------------------
// DEMO CHAT MESSAGES
// ---------------------------------------------------------------------------
export const DEMO_CHAT_MESSAGES = {
  'match-001': [
    {
      id: 'msg-1',
      sender_id: 'user-001',
      content: 'Hey Priya! Excited that our Goa dates overlap. Are you planning to visit the spice plantations in Ponda?',
      created_at: '2026-09-17T09:15:00Z',
    },
    {
      id: 'msg-2',
      sender_id: 'current-user-uuid-101',
      content: 'Hi Arjun! Yes, and also Dudhsagar Falls if the weather holds. What part of Goa are you staying in?',
      created_at: '2026-09-17T09:22:00Z',
    },
    {
      id: 'msg-3',
      sender_id: 'user-001',
      content: "I got a place near Assagao — super chill neighbourhood. Great cafes and only 10 minutes to Vagator beach.",
      created_at: '2026-09-17T09:30:00Z',
    },
    {
      id: 'msg-4',
      sender_id: 'current-user-uuid-101',
      content: "That sounds amazing! The Vagator sunset is supposed to be unreal. We should catch it on the first day we overlap.",
      created_at: '2026-09-17T10:10:00Z',
    },
    {
      id: 'msg-5',
      sender_id: 'user-001',
      content: "Perfect! Let's meet at Baga Beach on the 16th morning?",
      created_at: '2026-09-17T10:45:00Z',
    },
  ],
  'match-002': [
    {
      id: 'msg-201',
      sender_id: 'user-003',
      content: 'Priya! Kashmir in October is peak photography season. The chinar trees turn gold and it looks unreal.',
      created_at: '2026-09-16T14:00:00Z',
    },
    {
      id: 'msg-202',
      sender_id: 'current-user-uuid-101',
      content: "Rahul, I've been saving up for this trip for a year! Any tips for the shikara rides on Dal Lake?",
      created_at: '2026-09-16T14:20:00Z',
    },
    {
      id: 'msg-203',
      sender_id: 'user-003',
      content: 'The light over Dal Lake at 6 AM is something else — bring a wide lens!',
      created_at: '2026-09-16T15:10:00Z',
    },
  ],
};

// ---------------------------------------------------------------------------
// DEMO REVIEWS
// ---------------------------------------------------------------------------
export const DEMO_REVIEWS = [
  {
    id: 'rev-001',
    reviewer_name: 'Kavya R.',
    rating: 5,
    comment: 'Priya was an incredible travel buddy in Manali! Super organised, always on time, and knew the best dhabas off the tourist trail.',
    date: 'Dec 2025',
  },
  {
    id: 'rev-002',
    reviewer_name: 'Dev K.',
    rating: 5,
    comment: 'Great energy and very safety-conscious throughout our Rishikesh trip. Would definitely travel together again.',
    date: 'Apr 2025',
  },
];

// ---------------------------------------------------------------------------
// DESTINATION IMAGES — Indian destinations
// ---------------------------------------------------------------------------
let goaImg      = { uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80' };
let manaliImg   = { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80' };
let kashmirImg  = { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80' };
let rajasthanImg= { uri: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=80' };
let keralaImg   = { uri: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80' };
let andamanImg  = { uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&auto=format&fit=crop&q=80' };
let ladakhImg   = { uri: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&auto=format&fit=crop&q=80' };
let hampiImg    = { uri: 'https://images.unsplash.com/photo-1566402791-5b27c1a0d75e?w=800&auto=format&fit=crop&q=80' };

try {
  goaImg       = require('../assets/images/dest_goa.jpg');
  manaliImg    = require('../assets/images/dest_manali.jpg');
  kashmirImg   = require('../assets/images/dest_kashmir.jpg');
  rajasthanImg = require('../assets/images/dest_rajasthan.jpg');
  keralaImg    = require('../assets/images/dest_kerala.jpg');
  andamanImg   = require('../assets/images/dest_andaman.jpg');
  ladakhImg    = require('../assets/images/dest_ladakh.jpg');
  hampiImg     = require('../assets/images/journal_hampi.jpg');
} catch {
  // In Node.js environment without React Native bundler
}

export const DESTINATION_IMAGES = {
  'Goa':       goaImg,
  'Manali':    manaliImg,
  'Kashmir':   kashmirImg,
  'Rajasthan': rajasthanImg,
  'Jaipur':    rajasthanImg,
  'Kerala':    keralaImg,
  'Munnar':    keralaImg,
  'Andaman':   andamanImg,
  'Ladakh':    ladakhImg,
  'Leh':       ladakhImg,
  'Hampi':     hampiImg,
  'Rishikesh': { uri: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=800&auto=format&fit=crop&q=80' },
  'Udaipur':   { uri: 'https://images.unsplash.com/photo-1590766940554-6f2f8afab7f0?w=800&auto=format&fit=crop&q=80' },
  'Varanasi':  { uri: 'https://images.unsplash.com/photo-1561049933-c8fbef47b329?w=800&auto=format&fit=crop&q=80' },
};

// ---------------------------------------------------------------------------
// POPULAR PLACES — Top Indian destinations with active traveler communities
// ---------------------------------------------------------------------------
export const POPULAR_PLACES = [
  {
    id: 'place-1',
    name: 'Goa',
    country: 'India',
    state: 'Goa',
    image: goaImg,
    tag: 'Beach & Nightlife',
    travelersCount: 42,
    rating: 4.90,
  },
  {
    id: 'place-2',
    name: 'Manali',
    country: 'India',
    state: 'Himachal Pradesh',
    image: manaliImg,
    tag: 'Mountains & Snow',
    travelersCount: 38,
    rating: 4.88,
  },
  {
    id: 'place-3',
    name: 'Kashmir',
    country: 'India',
    state: 'Jammu & Kashmir',
    image: kashmirImg,
    tag: 'Dal Lake & Chinar',
    travelersCount: 29,
    rating: 4.95,
  },
  {
    id: 'place-4',
    name: 'Kerala',
    country: 'India',
    state: 'Kerala',
    image: keralaImg,
    tag: 'Backwaters & Spice',
    travelersCount: 35,
    rating: 4.92,
  },
  {
    id: 'place-5',
    name: 'Rajasthan',
    country: 'India',
    state: 'Rajasthan',
    image: rajasthanImg,
    tag: 'Forts & Desert',
    travelersCount: 31,
    rating: 4.87,
  },
  {
    id: 'place-6',
    name: 'Andaman',
    country: 'India',
    state: 'Andaman & Nicobar',
    image: andamanImg,
    tag: 'Islands & Diving',
    travelersCount: 19,
    rating: 4.93,
  },
];
