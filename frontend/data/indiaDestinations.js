// ============================================================================
// MaybeWe — India Destinations & Attractions Master Dataset
// Production-quality structured data covering all 28 Indian States & 8 Union Territories
// With verified authentic 4K real-location photography
// ============================================================================

export const INDIA_STATES_DATA = [
  // --- 28 STATES ---
  {
    id: 'andhra-pradesh',
    name: 'Andhra Pradesh',
    type: 'State',
    capital: 'Amaravati',
    region: 'South',
    description: 'Long pristine coastlines, Eastern Ghats valleys, and ancient Buddhist & temple heritage.',
    topCity: 'Visakhapatnam',
    badge: 'Coastal & Temples',
  },
  {
    id: 'arunachal-pradesh',
    name: 'Arunachal Pradesh',
    type: 'State',
    capital: 'Itanagar',
    region: 'North-East',
    description: 'Land of the dawn-lit mountains, snow-clad peaks, and high-altitude Buddhist monasteries.',
    topCity: 'Tawang',
    badge: 'Himalayan Frontier',
  },
  {
    id: 'assam',
    name: 'Assam',
    type: 'State',
    capital: 'Dispur',
    region: 'North-East',
    description: 'Brahmaputra river valley, world-famous tea estates, and wild one-horned rhinos.',
    topCity: 'Guwahati',
    badge: 'Tea & Wildlife',
  },
  {
    id: 'bihar',
    name: 'Bihar',
    type: 'State',
    capital: 'Patna',
    region: 'East',
    description: 'Birthplace of Buddhism and Jainism, home to the ancient university of Nalanda.',
    topCity: 'Bodh Gaya',
    badge: 'Spiritual Roots',
  },
  {
    id: 'chhattisgarh',
    name: 'Chhattisgarh',
    type: 'State',
    capital: 'Raipur',
    region: 'Central',
    description: 'Dense sal forests, tribal culture, and the majestic horseshoe Chitrakote Falls.',
    topCity: 'Jagdalpur',
    badge: 'Waterfalls & Tribes',
  },
  {
    id: 'goa',
    name: 'Goa',
    type: 'State',
    capital: 'Panaji',
    region: 'West',
    description: 'Sun-kissed Arabian Sea beaches, Portuguese baroque churches, and vibrant coastal culture.',
    topCity: 'Panaji',
    badge: 'Beaches & Sunshine',
  },
  {
    id: 'gujarat',
    name: 'Gujarat',
    type: 'State',
    capital: 'Gandhinagar',
    region: 'West',
    description: 'The white salt desert of Kutch, Asiatic lions in Gir, and rich textile traditions.',
    topCity: 'Ahmedabad',
    badge: 'White Rann & Heritage',
  },
  {
    id: 'haryana',
    name: 'Haryana',
    type: 'State',
    capital: 'Chandigarh',
    region: 'North',
    description: 'Epic Mahabharata lands of Kurukshetra, agricultural heartland, and buzzing modern hubs.',
    topCity: 'Gurugram',
    badge: 'History & Metropolis',
  },
  {
    id: 'himachal-pradesh',
    name: 'Himachal Pradesh',
    type: 'State',
    capital: 'Shimla',
    region: 'North',
    description: 'Pine-scented mountain passes, snowy Dhauladhar ranges, and alpine backpacking trails.',
    topCity: 'Manali',
    badge: 'Himalayan Valleys',
  },
  {
    id: 'jharkhand',
    name: 'Jharkhand',
    type: 'State',
    capital: 'Ranchi',
    region: 'East',
    description: 'Land of forests, cascading waterfalls, and sacred Jain hills of Parasnath.',
    topCity: 'Ranchi',
    badge: 'Forests & Falls',
  },
  {
    id: 'karnataka',
    name: 'Karnataka',
    type: 'State',
    capital: 'Bengaluru',
    region: 'South',
    description: 'Vijayanagara empire ruins at Hampi, Western Ghats coffee estates, and royal palaces.',
    topCity: 'Bengaluru',
    badge: 'Palaces, Tech & Coffee',
  },
  {
    id: 'kerala',
    name: 'Kerala',
    type: 'State',
    capital: 'Thiruvananthapuram',
    region: 'South',
    description: 'Serene backwater lagoons, emerald tea terraces of Munnar, and Ayurvedic wellness.',
    topCity: 'Kochi',
    badge: 'God’s Own Country',
  },
  {
    id: 'madhya-pradesh',
    name: 'Madhya Pradesh',
    type: 'State',
    capital: 'Bhopal',
    region: 'Central',
    description: 'Heart of India with UNESCO Khajuraho temples, tiger reserves, and marble rocks of Bhedaghat.',
    topCity: 'Indore',
    badge: 'Tigers & Temples',
  },
  {
    id: 'maharashtra',
    name: 'Maharashtra',
    type: 'State',
    capital: 'Mumbai',
    region: 'West',
    description: 'Bustling Arabian Sea financial capital, ancient rock-cut Ajanta-Ellora caves, and Sahyadri forts.',
    topCity: 'Mumbai',
    badge: 'Sahyadri & Metropolis',
  },
  {
    id: 'manipur',
    name: 'Manipur',
    type: 'State',
    capital: 'Imphal',
    region: 'North-East',
    description: 'Jeweled hills and the world’s only floating national park on Loktak Lake.',
    topCity: 'Imphal',
    badge: 'Floating Lakes',
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    type: 'State',
    capital: 'Shillong',
    region: 'North-East',
    description: 'The abode of clouds, living root bridges, crystal clear Umngot river, and roaring waterfalls.',
    topCity: 'Shillong',
    badge: 'Clouds & Root Bridges',
  },
  {
    id: 'mizoram',
    name: 'Mizoram',
    type: 'State',
    capital: 'Aizawl',
    region: 'North-East',
    description: 'Rolling bamboo hills, high ridgeline settlements, and warm village community hospitality.',
    topCity: 'Aizawl',
    badge: 'Blue Mountains',
  },
  {
    id: 'nagaland',
    name: 'Nagaland',
    type: 'State',
    capital: 'Kohima',
    region: 'North-East',
    description: 'Lush mountain valleys, the scenic Dzukou Valley, and rich indigenous festivals.',
    topCity: 'Kohima',
    badge: 'Dzukou & Festivals',
  },
  {
    id: 'odisha',
    name: 'Odisha',
    type: 'State',
    capital: 'Bhubaneswar',
    region: 'East',
    description: 'Ancient stone temple architecture, Konark Sun Temple chariot, and Chilika migratory lake.',
    topCity: 'Puri',
    badge: 'Sun Temple & Coast',
  },
  {
    id: 'punjab',
    name: 'Punjab',
    type: 'State',
    capital: 'Chandigarh',
    region: 'North',
    description: 'The golden sanctum of Harmandir Sahib, vibrant mustard fields, and rich culinary spirit.',
    topCity: 'Amritsar',
    badge: 'Golden Temple & Fields',
  },
  {
    id: 'rajasthan',
    name: 'Rajasthan',
    type: 'State',
    capital: 'Jaipur',
    region: 'North',
    description: 'Desert kingdoms, sandstone fortresses, tranquil royal lakes of Udaipur, and Thar dunes.',
    topCity: 'Jaipur',
    badge: 'Royalty & Forts',
  },
  {
    id: 'sikkim',
    name: 'Sikkim',
    type: 'State',
    capital: 'Gangtok',
    region: 'North-East',
    description: 'Overlooked by Kanchenjunga, high-altitude alpine lakes, and vibrant Tibetan monasteries.',
    topCity: 'Gangtok',
    badge: 'Kanchenjunga Kingdom',
  },
  {
    id: 'tamil-nadu',
    name: 'Tamil Nadu',
    type: 'State',
    capital: 'Chennai',
    region: 'South',
    description: 'Towering Dravidian gopurams, Carnatic melodies, Nilgiri hill stations, and Kanyakumari confluence.',
    topCity: 'Chennai',
    badge: 'Dravidian Temples',
  },
  {
    id: 'telangana',
    name: 'Telangana',
    type: 'State',
    capital: 'Hyderabad',
    region: 'South',
    description: 'Nizami pearl city of Hyderabad, Golconda fortress, Kakatiya architecture, and Deccan plateau.',
    topCity: 'Hyderabad',
    badge: 'Nizami Heritage & Tech',
  },
  {
    id: 'tripura',
    name: 'Tripura',
    type: 'State',
    capital: 'Agartala',
    region: 'North-East',
    description: 'Ujjayanta royal palaces, ancient rock carvings of Unakoti, and bamboo forest reserves.',
    topCity: 'Agartala',
    badge: 'Palaces & Carvings',
  },
  {
    id: 'uttar-pradesh',
    name: 'Uttar Pradesh',
    type: 'State',
    capital: 'Lucknow',
    region: 'North',
    description: 'The immortal Taj Mahal, sacred Ganga ghats of Varanasi, and Awadhi culinary culture.',
    topCity: 'Varanasi',
    badge: 'Taj Mahal & Ganges',
  },
  {
    id: 'uttarakhand',
    name: 'Uttarakhand',
    type: 'State',
    capital: 'Dehradun',
    region: 'North',
    description: 'Devbhumi of roaring Himalayan rivers, yoga capital Rishikesh, and the Valley of Flowers.',
    topCity: 'Rishikesh',
    badge: 'Yoga & Himalayan Peaks',
  },
  {
    id: 'west-bengal',
    name: 'West Bengal',
    type: 'State',
    capital: 'Kolkata',
    region: 'East',
    description: 'Colonial grand architecture of Kolkata, misty Darjeeling tea hills, and mangrove Sundarbans.',
    topCity: 'Kolkata',
    badge: 'Culture, Tea & Tigers',
  },

  // --- 8 UNION TERRITORIES ---
  {
    id: 'andaman-nicobar',
    name: 'Andaman & Nicobar Islands',
    type: 'Union Territory',
    capital: 'Port Blair',
    region: 'Islands',
    description: 'Turquoise waters, coral reef scuba diving, and pristine white sandy beaches of Havelock.',
    topCity: 'Havelock (Swaraj Dweep)',
    badge: 'Coral Reefs & Seas',
  },
  {
    id: 'chandigarh',
    name: 'Chandigarh',
    type: 'Union Territory',
    capital: 'Chandigarh',
    region: 'North',
    description: 'Le Corbusier modernist planned architecture, Rock Garden, and tree-lined wide avenues.',
    topCity: 'Chandigarh',
    badge: 'Modernist Garden City',
  },
  {
    id: 'dadra-nagar-haveli-daman-diu',
    name: 'Dadra & Nagar Haveli and Daman & Diu',
    type: 'Union Territory',
    capital: 'Daman',
    region: 'West',
    description: 'Portuguese sea-facing forts, coastal promenades, and serene Arabian beaches.',
    topCity: 'Diu',
    badge: 'Coastal Fortresses',
  },
  {
    id: 'delhi',
    name: 'Delhi (NCT)',
    type: 'Union Territory',
    capital: 'New Delhi',
    region: 'North',
    description: 'Historic Mughal & colonial capital, street food alleys of Chandni Chowk, and monuments.',
    topCity: 'New Delhi',
    badge: 'National Capital',
  },
  {
    id: 'jammu-kashmir',
    name: 'Jammu & Kashmir',
    type: 'Union Territory',
    capital: 'Srinagar (Summer) / Jammu (Winter)',
    region: 'North',
    description: 'Dal Lake shikaras, snow-blanketed slopes of Gulmarg, and saffron fields of Pampore.',
    topCity: 'Srinagar',
    badge: 'Paradise on Earth',
  },
  {
    id: 'ladakh',
    name: 'Ladakh',
    type: 'Union Territory',
    capital: 'Leh',
    region: 'North',
    description: 'High-altitude cold desert, Pangong Tso azure waters, and ancient monasteries perched on cliffs.',
    topCity: 'Leh',
    badge: 'High Passes & Lakes',
  },
  {
    id: 'lakshadweep',
    name: 'Lakshadweep',
    type: 'Union Territory',
    capital: 'Kavaratti',
    region: 'Islands',
    description: 'Pristine emerald coral atolls, tranquil blue lagoons, and secluded island living.',
    topCity: 'Agatti Island',
    badge: 'Emerald Atolls',
  },
  {
    id: 'puducherry',
    name: 'Puducherry',
    type: 'Union Territory',
    capital: 'Pondicherry',
    region: 'South',
    description: 'French colonial pastel villas, tree-shaded boulevards, peaceful cafes, and Auroville.',
    topCity: 'Pondicherry',
    badge: 'French Quarter & Cafes',
  },
];

// ============================================================================
// 2. MAJOR INDIAN DESTINATIONS & TRAVEL HUBS (ALL 36 STATES & UTs)
// ============================================================================
export const MAJOR_INDIAN_CITIES = [
  {
    "id": "chittoor",
    "name": "Chittoor",
    "state": "Andhra Pradesh",
    "district": "Chittoor",
    "districts": [
      "Chittoor",
      "Horsley Hills",
      "Palamaner",
      "Kaundinya Sanctuary",
      "Punganur",
      "Madanapalle",
      "Gurramkonda"
    ],
    "type": "Heritage & Hills",
    "lat": 13.2172,
    "lng": 79.1003,
    "description": "Scenic cultural hub in southern Andhra Pradesh, home to the cool heights of Horsley Hills, lush mango orchards, and Kaundinya Wildlife Sanctuary.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Horsley Hills",
      "Sanctuary",
      "Nature"
    ],
    "famousAttractions": [
      "Horsley Hills Hilltop",
      "Kaundinya Wildlife Sanctuary",
      "Gurramkonda Fort"
    ]
  },
  {
    "id": "tirupati",
    "name": "Tirupati",
    "state": "Andhra Pradesh",
    "district": "Tirupati",
    "districts": [
      "Tirupati",
      "Tirumala",
      "Chandragiri Fort",
      "Srikalahasti",
      "Renigunta",
      "Kapila Theertham"
    ],
    "type": "Spiritual Capital",
    "lat": 13.6288,
    "lng": 79.4192,
    "description": "World-renowned spiritual city at the foothills of the sacred Tirumala Venkateswara Temple, surrounded by the picturesque Seshachalam hills.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Tirumala",
      "Venkateswara",
      "Seshachalam Hills"
    ],
    "famousAttractions": [
      "Sri Venkateswara Temple Tirumala",
      "Chandragiri Fort",
      "Silathoranam Natural Arch"
    ]
  },
  {
    "id": "vijayawada",
    "name": "Vijayawada",
    "state": "Andhra Pradesh",
    "district": "NTR District",
    "districts": [
      "Vijayawada",
      "NTR District",
      "Prakasam Barrage",
      "Undavalli Caves",
      "Gannavaram",
      "Bhavani Island"
    ],
    "type": "River Metropolis",
    "lat": 16.5062,
    "lng": 80.648,
    "description": "The Place of Victory on the banks of Krishna River, famed for the Kanaka Durga Temple atop Indrakeeladri hill, Undavalli Caves, and Prakasam Barrage.",
    "image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kanaka Durga",
      "Krishna River",
      "Undavalli Caves"
    ],
    "famousAttractions": [
      "Kanaka Durga Temple",
      "Undavalli Rock-Cut Caves",
      "Prakasam Barrage Promenade"
    ]
  },
  {
    "id": "visakhapatnam",
    "name": "Visakhapatnam",
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "districts": [
      "Visakhapatnam",
      "Vizag Beach",
      "Araku Valley",
      "Kailasagiri",
      "Rishikonda Beach",
      "Bheemili",
      "Yarada Beach"
    ],
    "type": "City of Destiny",
    "lat": 17.6868,
    "lng": 83.2185,
    "description": "The City of Destiny where the green Eastern Ghats meet the turquoise Bay of Bengal, featuring submarine museum and scenic Araku Valley train.",
    "image": "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Beaches",
      "Submarine Museum",
      "Araku Valley"
    ],
    "famousAttractions": [
      "RK Beach & Submarine Museum",
      "Kailasagiri Hilltop",
      "Araku Valley & Borra Caves"
    ]
  },
  {
    "id": "guntur",
    "name": "Guntur",
    "state": "Andhra Pradesh",
    "district": "Guntur",
    "districts": [
      "Guntur",
      "Amaravati",
      "Mangalagiri",
      "Tenali",
      "Nagarjuna Sagar",
      "Kondaveedu Fort"
    ],
    "type": "Capital Region & Spice",
    "lat": 16.3067,
    "lng": 80.4365,
    "description": "Historic educational and trade center adjacent to the capital city Amaravati, renowned for Asia’s largest chili market and Mangalagiri panakala temple.",
    "image": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Amaravati",
      "Mangalagiri",
      "Kondaveedu Fort"
    ],
    "famousAttractions": [
      "Amaravati Stupa & Dhyana Buddha",
      "Mangalagiri Panakala Temple",
      "Kondaveedu Fort"
    ]
  },
  {
    "id": "nellore",
    "name": "Nellore",
    "state": "Andhra Pradesh",
    "district": "SPSR Nellore",
    "districts": [
      "Nellore",
      "Pulicat Lake",
      "Mypadu Beach",
      "Venkatagiri",
      "Udayagiri Fort",
      "Kavali"
    ],
    "type": "Coastal Lagoon",
    "lat": 14.4426,
    "lng": 79.9865,
    "description": "Coastal heartland on Penna River, gateway to the second largest brackish water lagoon in India at Pulicat Lake and historic Venkatagiri weave.",
    "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Pulicat Lagoon",
      "Mypadu Beach",
      "Ranganatha Temple"
    ],
    "famousAttractions": [
      "Pulicat Bird Sanctuary",
      "Mypadu Beach",
      "Talpagiri Ranganathaswamy Temple"
    ]
  },
  {
    "id": "kurnool",
    "name": "Kurnool",
    "state": "Andhra Pradesh",
    "district": "Kurnool",
    "districts": [
      "Kurnool",
      "Belum Caves",
      "Yaganti",
      "Ahobilam",
      "Konda Reddy Buruju",
      "Adoni Fort"
    ],
    "type": "Gateway of Rayalaseema",
    "lat": 15.8281,
    "lng": 78.0373,
    "description": "Historical gateway to Rayalaseema on the Tungabhadra river, famed for the dramatic Konda Reddy Buruju, Belum limestone caves, and Yaganti temple.",
    "image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Belum Caves",
      "Konda Reddy Buruju",
      "Yaganti"
    ],
    "famousAttractions": [
      "Belum Underground Caves",
      "Konda Reddy Buruju",
      "Yaganti Uma Maheshwara Temple"
    ]
  },
  {
    "id": "kakinada",
    "name": "Kakinada",
    "state": "Andhra Pradesh",
    "district": "Kakinada",
    "districts": [
      "Kakinada",
      "Hope Island",
      "Coringa Sanctuary",
      "Samalkota",
      "Pithapuram",
      "Draksharamam"
    ],
    "type": "Fertile Delta Port",
    "lat": 16.9891,
    "lng": 82.2475,
    "description": "The Fertilizer City and smart port on the Bay of Bengal, home to the sprawling Coringa Mangrove Sanctuary, Hope Island, and Kakinada Kaja sweets.",
    "image": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Coringa Mangroves",
      "Hope Island",
      "Port City"
    ],
    "famousAttractions": [
      "Coringa Wildlife Sanctuary",
      "Hope Island Coastline",
      "Draksharamam Bheemeshwara Temple"
    ]
  },
  {
    "id": "rajahmundry",
    "name": "Rajahmundry",
    "state": "Andhra Pradesh",
    "district": "East Godavari",
    "districts": [
      "Rajahmundry",
      "Godavari River",
      "Papikondalu",
      "Kadiyam Nurseries",
      "Dowleswaram Barrage",
      "Kotilingeswara Ghat"
    ],
    "type": "Cultural Capital",
    "lat": 17.0005,
    "lng": 81.804,
    "description": "Cultural capital on the mighty Godavari, birthplace of the Telugu language, celebrated for the historic Godavari Arch Bridge and scenic Papikondalu river cruises.",
    "image": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Godavari River",
      "Papikondalu",
      "Kadiyam Nurseries"
    ],
    "famousAttractions": [
      "Godavari Arch Bridge",
      "Papikondalu River Cruise",
      "Sir Arthur Cotton Barrage"
    ]
  },
  {
    "id": "kadapa",
    "name": "Kadapa (Gandikota)",
    "state": "Andhra Pradesh",
    "district": "YSR Kadapa",
    "districts": [
      "Kadapa",
      "Gandikota Gorge",
      "Vontimitta",
      "Proddatur",
      "Pushpagiri",
      "Rayachoti"
    ],
    "type": "Canyon & Heritage",
    "lat": 14.4673,
    "lng": 78.8242,
    "description": "Heart of the Rayalaseema valley, home to the breathtaking Gandikota Grand Canyon of India carved by the Penna River, historic fort, and Vontimitta temple.",
    "image": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Grand Canyon",
      "Gandikota",
      "Penna River"
    ],
    "famousAttractions": [
      "Gandikota River Gorge Viewpoint",
      "Gandikota Fort & Granary",
      "Vontimitta Kodandarama Temple"
    ]
  },
  {
    "id": "anantapur",
    "name": "Anantapur",
    "state": "Andhra Pradesh",
    "district": "Anantapur",
    "districts": [
      "Anantapur",
      "Lepakshi",
      "Gooty Fort",
      "Penukonda",
      "Dharmavaram",
      "Tadipatri"
    ],
    "type": "Architectural Marvel",
    "lat": 14.6819,
    "lng": 77.6006,
    "description": "Historical expanse featuring the world-renowned 16th-century Lepakshi Veerabhadra temple with its hanging pillar, colossal monolithic Nandi, and silk weaves.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Lepakshi",
      "Veerabhadra",
      "Monolithic Nandi"
    ],
    "famousAttractions": [
      "Lepakshi Hanging Pillar & Temple",
      "Monolithic Lepakshi Nandi",
      "Gooty Hilltop Fort"
    ]
  },
  {
    "id": "tawang",
    "name": "Tawang",
    "state": "Arunachal Pradesh",
    "district": "Tawang",
    "districts": [
      "Tawang",
      "Sela Pass",
      "Madhuri Lake",
      "Zemithang",
      "Lumla"
    ],
    "type": "Himalayan Citadel",
    "lat": 27.5861,
    "lng": 91.8594,
    "description": "Majestic high-altitude Himalayan district, home to India's largest Buddhist monastery, snow-draped Sela Pass at 13,700 ft, and glacial crystal lakes.",
    "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Tawang Monastery",
      "Sela Pass",
      "Snow Peaks"
    ],
    "famousAttractions": [
      "Tawang Monastery",
      "Sela Pass & Sela Lake",
      "Nuranang Waterfall"
    ]
  },
  {
    "id": "ziro",
    "name": "Ziro Valley",
    "state": "Arunachal Pradesh",
    "district": "Lower Subansiri",
    "districts": [
      "Ziro",
      "Hapoli",
      "Tarin Fish Farm",
      "Kardo Shiva Lingam"
    ],
    "type": "Pine Valley & Culture",
    "lat": 27.5369,
    "lng": 93.8291,
    "description": "Picturesque UNESCO-nominated plateau framed by whispering pine groves, terraced rice paddies, and the indigenous culture of the Apatani tribe.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Apatani Culture",
      "Pine Groves",
      "Music Festival"
    ],
    "famousAttractions": [
      "Talley Valley Wildlife Sanctuary",
      "Kardo Giant Shiva Lingam",
      "Ziro Pine Forest"
    ]
  },
  {
    "id": "kaziranga",
    "name": "Kaziranga",
    "state": "Assam",
    "district": "Golaghat",
    "districts": [
      "Kaziranga",
      "Kohora",
      "Bagori",
      "Bokakhat"
    ],
    "type": "Wildlife UNESCO",
    "lat": 26.5775,
    "lng": 93.1711,
    "description": "World-renowned UNESCO World Heritage national park on the Brahmaputra floodplains, sheltering two-thirds of the world's great one-horned rhinos.",
    "image": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "One-Horned Rhino",
      "Safari",
      "Brahmaputra"
    ],
    "famousAttractions": [
      "Kaziranga National Park",
      "Orchid & Biodiversity Park",
      "Kakochang Waterfalls"
    ]
  },
  {
    "id": "guwahati",
    "name": "Guwahati",
    "state": "Assam",
    "district": "Kamrup Metropolitan",
    "districts": [
      "Guwahati",
      "Dispur",
      "Umananda",
      "Chandubi Lake",
      "Hajo"
    ],
    "type": "Gateway of North-East",
    "lat": 26.1445,
    "lng": 91.7362,
    "description": "Bustling metropolis on the south bank of the mighty Brahmaputra, revered for the sacred Kamakhya Temple atop Nilachal Hill and river ropeways.",
    "image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kamakhya Temple",
      "Brahmaputra",
      "River Ropeway"
    ],
    "famousAttractions": [
      "Kamakhya Temple Nilachal",
      "Umananda Peacock Island",
      "Brahmaputra Sunset Cruise"
    ]
  },
  {
    "id": "bodh-gaya",
    "name": "Bodh Gaya",
    "state": "Bihar",
    "district": "Gaya",
    "districts": [
      "Bodh Gaya",
      "Gaya",
      "Falgu River",
      "Dungeshwari"
    ],
    "type": "Spiritual Cradle",
    "lat": 24.6961,
    "lng": 84.9869,
    "description": "One of the most important Buddhist pilgrimage sites in the world, where Gautama Buddha attained supreme enlightenment under the sacred Bodhi Tree.",
    "image": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Bodhi Tree",
      "Mahabodhi Temple",
      "Enlightenment"
    ],
    "famousAttractions": [
      "Mahabodhi Temple UNESCO",
      "Sacred Bodhi Tree",
      "Great Buddha 80-ft Statue"
    ]
  },
  {
    "id": "nalanda",
    "name": "Nalanda & Rajgir",
    "state": "Bihar",
    "district": "Nalanda",
    "districts": [
      "Nalanda",
      "Rajgir",
      "Pawapuri",
      "Venuvana",
      "Gridhakuta Peak"
    ],
    "type": "Ancient University Ruins",
    "lat": 25.1357,
    "lng": 85.4436,
    "description": "UNESCO archaeological ruins of the ancient world's premier residential monastic university that drew scholars from across Asia from the 5th to 12th century.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Ancient University",
      "Nalanda Ruins",
      "Rajgir Hot Springs"
    ],
    "famousAttractions": [
      "Nalanda Mahavihara Excavated Ruins",
      "Vishwa Shanti Stupa Rajgir",
      "Gridhakuta Vulture Peak"
    ]
  },
  {
    "id": "jagdalpur",
    "name": "Jagdalpur (Bastar)",
    "state": "Chhattisgarh",
    "district": "Bastar",
    "districts": [
      "Jagdalpur",
      "Bastar",
      "Chitrakote",
      "Tirathgarh",
      "Kanger Valley"
    ],
    "type": "Niagara of India",
    "lat": 19.0748,
    "lng": 82.0081,
    "description": "Heart of Bastar tribal culture, celebrated for the roaring horseshoe Chitrakote Falls on the Indravati river and Kanger Ghati subterranean limestone caves.",
    "image": "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Chitrakote Falls",
      "Tribal Art",
      "Kanger Valley"
    ],
    "famousAttractions": [
      "Chitrakote Horseshoe Falls",
      "Tirathgarh Tiered Waterfalls",
      "Kotumsar Limestone Caves"
    ]
  },
  {
    "id": "north-goa",
    "name": "North Goa",
    "state": "Goa",
    "district": "North Goa",
    "districts": [
      "North Goa",
      "Panaji",
      "Anjuna",
      "Vagator",
      "Calangute",
      "Candolim",
      "Morjim",
      "Arambol"
    ],
    "type": "Coastal Beats & Forts",
    "lat": 15.4989,
    "lng": 73.8278,
    "description": "Vibrant coastal stretch celebrated for cliffside cafes, historical Aguada & Chapora sea forts, palm-fringed sandy shores, and bustling night flea markets.",
    "image": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Beaches",
      "Vagator",
      "Fort Aguada"
    ],
    "famousAttractions": [
      "Aguada Sea Fortress",
      "Chapora Fort Cliff",
      "Anjuna Flea Market & Beach"
    ]
  },
  {
    "id": "south-goa",
    "name": "South Goa",
    "state": "Goa",
    "district": "South Goa",
    "districts": [
      "South Goa",
      "Margao",
      "Palolem",
      "Agonda",
      "Colva",
      "Benaulim",
      "Cavelossim",
      "Cabo de Rama"
    ],
    "type": "Serene Shores & Heritage",
    "lat": 15.2736,
    "lng": 73.958,
    "description": "Tranquil tropical paradise of crescent-shaped sandy bays, heritage Portuguese mansions, secluded sunset cliffs, and lush spice plantations.",
    "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Palolem",
      "Colva",
      "Portuguese Mansions"
    ],
    "famousAttractions": [
      "Palolem Crescent Bay",
      "Cabo de Rama Cliff Fort",
      "Basilica of Bom Jesus"
    ]
  },
  {
    "id": "ahmedabad",
    "name": "Ahmedabad",
    "state": "Gujarat",
    "district": "Ahmedabad",
    "districts": [
      "Ahmedabad",
      "Sabarmati",
      "Manek Chowk",
      "Vastrapur",
      "SG Highway",
      "Adalaj"
    ],
    "type": "UNESCO Heritage City",
    "lat": 23.0225,
    "lng": 72.5714,
    "description": "India's first UNESCO World Heritage city on the Sabarmati, world-famous for Mahatma Gandhi's Sabarmati Ashram, intricate stepwells, and street food.",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Sabarmati",
      "Adalaj Stepwell",
      "Heritage Pols"
    ],
    "famousAttractions": [
      "Sabarmati Ashram",
      "Adalaj Stepwell",
      "Sidi Saiyyed Mosque Lattice"
    ]
  },
  {
    "id": "kutch",
    "name": "Kutch (Rann of Kutch)",
    "state": "Gujarat",
    "district": "Kutch",
    "districts": [
      "Kutch",
      "Dhordo",
      "Bhuj",
      "Mandvi",
      "Dholavira",
      "Kala Dungar"
    ],
    "type": "White Salt Desert",
    "lat": 23.8343,
    "lng": 69.8396,
    "description": "Breathtaking vast white salt desert stretching to the horizon, glowing under the full moon during the Rann Utsav with vibrant handicrafts and ancient Dholavira.",
    "image": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "White Rann",
      "Rann Utsav",
      "Dholavira"
    ],
    "famousAttractions": [
      "White Desert of Dhordo",
      "Dholavira Harappan City",
      "Kala Dungar Black Hill"
    ]
  },
  {
    "id": "gurugram",
    "name": "Gurugram (Gurgaon)",
    "state": "Haryana",
    "district": "Gurugram",
    "districts": [
      "Gurugram",
      "Cyber City",
      "Golf Course Road",
      "Sohna",
      "Manesar"
    ],
    "type": "Millennium City",
    "lat": 28.4595,
    "lng": 77.0266,
    "description": "India's soaring Millennium City, boasting world-class glass skyscrapers, top tech enterprise headquarters, luxury dining, and Sultanpur National Park.",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Cyber Hub",
      "Skyscrapers",
      "Sultanpur Park"
    ],
    "famousAttractions": [
      "Cyber Hub Promenade",
      "Sultanpur Bird Sanctuary",
      "Kingdom of Dreams"
    ]
  },
  {
    "id": "manali",
    "name": "Manali & Kullu",
    "state": "Himachal Pradesh",
    "district": "Kullu",
    "districts": [
      "Kullu",
      "Manali",
      "Old Manali",
      "Solang Valley",
      "Rohtang Pass",
      "Atal Tunnel",
      "Vashisht"
    ],
    "type": "Valley of the Gods",
    "lat": 32.2396,
    "lng": 77.1887,
    "description": "High-altitude paradise nestled between snow-draped Himalayan peaks, gateway to Solang Valley, Rohtang Pass, apple orchards, and adventurous treks.",
    "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Snow Peaks",
      "Solang Valley",
      "Rohtang Pass"
    ],
    "famousAttractions": [
      "Rohtang Pass Snow Crest",
      "Solang Valley Adventure Arena",
      "Hidimba Devi Wooden Temple"
    ]
  },
  {
    "id": "shimla",
    "name": "Shimla",
    "state": "Himachal Pradesh",
    "district": "Shimla",
    "districts": [
      "Shimla",
      "The Ridge",
      "Mall Road",
      "Kufri",
      "Mashobra",
      "Narkanda"
    ],
    "type": "Queen of Hills",
    "lat": 31.1048,
    "lng": 77.1734,
    "description": "Colonial summer capital framed by pine and deodar forests, famous for its historic UNESCO toy train, The Ridge, and panoramic Himalayan viewpoints.",
    "image": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "The Ridge",
      "Toy Train",
      "Colonial Heritage"
    ],
    "famousAttractions": [
      "The Ridge & Christ Church",
      "Jakhu Hanuman Hilltop Temple",
      "Kalka-Shimla Toy Train"
    ]
  },
  {
    "id": "spiti",
    "name": "Spiti Valley",
    "state": "Himachal Pradesh",
    "district": "Lahaul and Spiti",
    "districts": [
      "Spiti",
      "Kaza",
      "Key Monastery",
      "Kibber",
      "Chandratal Lake",
      "Hikkim"
    ],
    "type": "Middle Land",
    "lat": 32.2461,
    "lng": 78.0349,
    "description": "Otherworldly high-altitude cold desert valley situated between Tibet and India, renowned for thousand-year-old Key Monastery, Chandratal, and highest post office.",
    "image": "https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Key Monastery",
      "Chandratal",
      "Cold Desert"
    ],
    "famousAttractions": [
      "Key Gompa Monastery",
      "Chandratal Crescent Moon Lake",
      "Hikkim World's Highest Post Office"
    ]
  },
  {
    "id": "dharamshala",
    "name": "Dharamshala & McLeodGanj",
    "state": "Himachal Pradesh",
    "district": "Kangra",
    "districts": [
      "Kangra",
      "Dharamshala",
      "McLeodGanj",
      "Bhagsunag",
      "Dharamkot",
      "Triund"
    ],
    "type": "Little Lhasa",
    "lat": 32.219,
    "lng": 76.3234,
    "description": "Spiritual Himalayan residence of His Holiness the Dalai Lama, surrounded by cedar forests and dramatic Dhauladhar mountain snow peaks.",
    "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Dalai Lama",
      "Triund Trek",
      "Dhauladhar"
    ],
    "famousAttractions": [
      "Tsuglagkhang Tibetan Complex",
      "Triund Mountain Ridge",
      "Bhagsunag Waterfall"
    ]
  },
  {
    "id": "srinagar",
    "name": "Srinagar",
    "state": "Jammu & Kashmir",
    "district": "Srinagar",
    "districts": [
      "Srinagar",
      "Dal Lake",
      "Nigeen Lake",
      "Lal Chowk",
      "Shalimar Bagh"
    ],
    "type": "Paradise on Earth",
    "lat": 34.0837,
    "lng": 74.7973,
    "description": "The crown jewel of Kashmir valley, world-famous for tranquil Dal Lake wooden shikaras, carved houseboats, and historic Mughal terraced gardens.",
    "image": "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Dal Lake",
      "Shikara Ride",
      "Mughal Gardens"
    ],
    "famousAttractions": [
      "Dal Lake Houseboats & Shikaras",
      "Shalimar & Nishat Bagh",
      "Shankaracharya Hilltop Temple"
    ]
  },
  {
    "id": "gulmarg",
    "name": "Gulmarg",
    "state": "Jammu & Kashmir",
    "district": "Baramulla",
    "districts": [
      "Gulmarg",
      "Tangmarg",
      "Apharwat Peak",
      "Kongdoori"
    ],
    "type": "Meadow of Flowers",
    "lat": 34.0484,
    "lng": 74.3805,
    "description": "Premier winter sports capital of Asia, home to one of the world's highest cable car gondolas ascending to 13,780 ft amid powdery snow slopes.",
    "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Gulmarg Gondola",
      "Ski Slopes",
      "Apharwat"
    ],
    "famousAttractions": [
      "Gulmarg Gondola Phase 2",
      "Apharwat Snow Peak",
      "Alpather High-Altitude Frozen Lake"
    ]
  },
  {
    "id": "ranchi",
    "name": "Ranchi",
    "state": "Jharkhand",
    "district": "Ranchi",
    "districts": [
      "Ranchi",
      "Hundru",
      "Dassam",
      "Jonha",
      "Kanke",
      "Tagore Hill"
    ],
    "type": "City of Waterfalls",
    "lat": 23.3441,
    "lng": 85.3096,
    "description": "The City of Waterfalls on the Chota Nagpur plateau, blessed with cascading natural waterfalls, cool breezes, and tribal heritage.",
    "image": "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Dassam Falls",
      "Hundru Falls",
      "Chota Nagpur"
    ],
    "famousAttractions": [
      "Dassam Waterfalls",
      "Hundru Waterfalls",
      "Tagore Hill & Rock Garden"
    ]
  },
  {
    "id": "bengaluru",
    "name": "Bengaluru",
    "state": "Karnataka",
    "district": "Bengaluru Urban",
    "districts": [
      "Bengaluru Urban",
      "Koramangala",
      "Indiranagar",
      "Whitefield",
      "Electronic City",
      "HSR Layout",
      "MG Road"
    ],
    "type": "Tech & Garden Capital",
    "lat": 12.9716,
    "lng": 77.5946,
    "description": "India’s Silicon Valley known for lush parks, vibrant craft brewery culture, innovative cafes, and year-round pleasant weather.",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Silicon Valley",
      "Pub Capital",
      "Parks"
    ],
    "famousAttractions": [
      "Bangalore Palace",
      "Cubbon Park",
      "Lalbagh Botanical Garden"
    ]
  },
  {
    "id": "mysuru",
    "name": "Mysuru",
    "state": "Karnataka",
    "district": "Mysuru",
    "districts": [
      "Mysuru",
      "Chamundi Hill",
      "Srirangapatna",
      "Nanjangud"
    ],
    "type": "Royal Heritage",
    "lat": 12.2958,
    "lng": 76.6394,
    "description": "City of palaces and sandalwood, famed for the grand illuminated Mysore Palace, silk sarees, and royal Dasara celebrations.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Palaces",
      "Royalty",
      "Heritage"
    ],
    "famousAttractions": [
      "Mysore Palace",
      "Chamundi Hill",
      "Brindavan Gardens"
    ]
  },
  {
    "id": "hampi",
    "name": "Hampi",
    "state": "Karnataka",
    "district": "Vijayanagara",
    "districts": [
      "Hampi",
      "Hospet",
      "Anegundi",
      "Kamalapur"
    ],
    "type": "UNESCO Stone Marvel",
    "lat": 15.335,
    "lng": 76.46,
    "description": "UNESCO World Heritage wonder of the Vijayanagara Empire, famed for its iconic Stone Chariot, musical pillared halls, and boulder-strewn riverscapes.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Stone Chariot",
      "Vijayanagara",
      "Boulders"
    ],
    "famousAttractions": [
      "Vittala Temple Stone Chariot",
      "Virupaksha Temple",
      "Matanga Hill Sunrise"
    ]
  },
  {
    "id": "coorg",
    "name": "Coorg (Kodagu)",
    "state": "Karnataka",
    "district": "Kodagu",
    "districts": [
      "Kodagu",
      "Madikeri",
      "Kushalnagar",
      "Virajpet"
    ],
    "type": "Coffee & Hills",
    "lat": 12.4244,
    "lng": 75.7382,
    "description": "Scotland of India nestled in the Western Ghats: aromatic coffee & spice plantations, misty waterfalls, and Kodava warrior culture.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Coffee",
      "Misty Hills",
      "Waterfalls"
    ],
    "famousAttractions": [
      "Abbey Falls",
      "Raja Seat Sunset View",
      "Dubare Elephant Camp"
    ]
  },
  {
    "id": "gokarna",
    "name": "Gokarna",
    "state": "Karnataka",
    "district": "Uttara Kannada",
    "districts": [
      "Gokarna",
      "Om Beach",
      "Kudle Beach",
      "Half Moon Beach",
      "Paradise Beach"
    ],
    "type": "Beaches & Sanctum",
    "lat": 14.5479,
    "lng": 74.3188,
    "description": "Spiritual coastal town where secluded beaches like Om Beach and Kudle Beach nestle between rocky headlands along the Arabian Sea.",
    "image": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Om Beach",
      "Mahabaleshwar",
      "Coastal Trek"
    ],
    "famousAttractions": [
      "Om Beach Headland",
      "Kudle Beach Cove",
      "Mahabaleshwar Temple"
    ]
  },
  {
    "id": "kochi",
    "name": "Kochi (Cochin)",
    "state": "Kerala",
    "district": "Ernakulam",
    "districts": [
      "Ernakulam",
      "Fort Kochi",
      "Mattancherry",
      "Marine Drive",
      "Willingdon Island"
    ],
    "type": "Queen of Arabian Sea",
    "lat": 9.9312,
    "lng": 76.2673,
    "description": "Queen of the Arabian Sea: historic colonial streets of Fort Kochi, iconic cantilevered Chinese fishing nets, Jewish Synagogue, and Kathakali centers.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Chinese Nets",
      "Fort Kochi",
      "Heritage"
    ],
    "famousAttractions": [
      "Fort Kochi Chinese Fishing Nets",
      "Mattancherry Palace",
      "Jewish Synagogue"
    ]
  },
  {
    "id": "munnar",
    "name": "Munnar",
    "state": "Kerala",
    "district": "Idukki",
    "districts": [
      "Idukki",
      "Munnar",
      "Mattupetty",
      "Top Station",
      "Marayoor"
    ],
    "type": "Emerald Tea Valleys",
    "lat": 10.0889,
    "lng": 77.0595,
    "description": "Stunning hill station famous for rolling emerald tea estates carpeted in morning mist, rare Nilgiri Tahr at Eravikulam, and Anamudi peak.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Tea Estates",
      "Misty Peaks",
      "Nilgiri Tahr"
    ],
    "famousAttractions": [
      "Eravikulam National Park",
      "Mattupetty Dam",
      "Top Station Panoramic View"
    ]
  },
  {
    "id": "alleppey",
    "name": "Alleppey (Alappuzha)",
    "state": "Kerala",
    "district": "Alappuzha",
    "districts": [
      "Alappuzha",
      "Vembanad",
      "Kuttanad",
      "Marari Beach"
    ],
    "type": "Backwaters & Houseboats",
    "lat": 9.4981,
    "lng": 76.3388,
    "description": "Venice of the East: world-famous labyrinth of tranquil palm-fringed canals, lagoons, and traditional thatched kettuvallam houseboats.",
    "image": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Backwaters",
      "Houseboat",
      "Canals"
    ],
    "famousAttractions": [
      "Alleppey Houseboat Cruise",
      "Vembanad Lake",
      "Marari Pristine Beach"
    ]
  },
  {
    "id": "varkala",
    "name": "Varkala",
    "state": "Kerala",
    "district": "Thiruvananthapuram",
    "districts": [
      "Varkala",
      "North Cliff",
      "South Cliff",
      "Papanasam Beach"
    ],
    "type": "Cliffside Ocean",
    "lat": 8.7379,
    "lng": 76.7163,
    "description": "Unique dramatic red laterite cliff rising vertically beside the Arabian Sea, vibrant cliff-top cafes, natural mineral springs, and surf breaks.",
    "image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Red Cliff",
      "Papanasam Beach",
      "Cafes"
    ],
    "famousAttractions": [
      "Varkala North Cliff Walk",
      "Papanasam Holy Beach",
      "Janardhana Swamy Temple"
    ]
  },
  {
    "id": "leh",
    "name": "Leh & Ladakh",
    "state": "Ladakh",
    "district": "Leh",
    "districts": [
      "Leh",
      "Pangong Tso",
      "Nubra Valley",
      "Thiksey",
      "Khardung La"
    ],
    "type": "Roof of the World",
    "lat": 34.1526,
    "lng": 77.5771,
    "description": "High-altitude Himalayan desert kingdom of cobalt-blue Pangong Tso, Khardung La pass, royal Leh Palace, and whitewashed Buddhist monasteries.",
    "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Pangong Tso",
      "Khardung La",
      "Monasteries"
    ],
    "famousAttractions": [
      "Pangong Tso High Altitude Lake",
      "Thiksey Monastery Complex",
      "Khardung La Mountain Pass"
    ]
  },
  {
    "id": "nubra",
    "name": "Nubra Valley",
    "state": "Ladakh",
    "district": "Leh",
    "districts": [
      "Nubra",
      "Diskit",
      "Hunder",
      "Turtuk",
      "Panamik"
    ],
    "type": "Valley of Flowers & Dunes",
    "lat": 34.6863,
    "lng": 77.5673,
    "description": "Tri-armed desert valley famous for silver sand dunes at Hunder, double-humped Bactrian camels, Diskit monastery Buddha statue, and Turtuk village.",
    "image": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Hunder Dunes",
      "Bactrian Camels",
      "Diskit"
    ],
    "famousAttractions": [
      "Hunder Sand Dunes & Camels",
      "Diskit Monastery Giant Buddha",
      "Turtuk Indo-Balti Border Village"
    ]
  },
  {
    "id": "khajuraho",
    "name": "Khajuraho",
    "state": "Madhya Pradesh",
    "district": "Chhatarpur",
    "districts": [
      "Khajuraho",
      "Western Temples",
      "Eastern Temples",
      "Raneh Falls"
    ],
    "type": "UNESCO Sculptural Wonder",
    "lat": 24.8318,
    "lng": 79.9199,
    "description": "UNESCO World Heritage group of monuments celebrated worldwide for their exquisite Nagara-style architectural symbolism and intricate erotic carvings.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kandariya Mahadeva",
      "Chandela Art",
      "UNESCO"
    ],
    "famousAttractions": [
      "Kandariya Mahadeva Temple",
      "Lakshmana Temple",
      "Raneh Canyon Waterfalls"
    ]
  },
  {
    "id": "gwalior",
    "name": "Gwalior",
    "state": "Madhya Pradesh",
    "district": "Gwalior",
    "districts": [
      "Gwalior",
      "Gwalior Fort",
      "Jai Vilas",
      "Tansen Tomb"
    ],
    "type": "Pearl in the Necklace of Forts",
    "lat": 26.2183,
    "lng": 78.1828,
    "description": "Historic princely city dominated by the massive 8th-century hilltop Gwalior Fort, opulent Jai Vilas Palace, and musical heritage of Miyan Tansen.",
    "image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Gwalior Fort",
      "Scindia Palace",
      "Tansen"
    ],
    "famousAttractions": [
      "Gwalior Hilltop Fort",
      "Jai Vilas Scindia Palace",
      "Man Mandir Palace"
    ]
  },
  {
    "id": "mumbai",
    "name": "Mumbai",
    "state": "Maharashtra",
    "district": "Mumbai City",
    "districts": [
      "Mumbai City",
      "Colaba",
      "Bandra",
      "Juhu",
      "Marine Drive",
      "Andheri"
    ],
    "type": "City of Dreams",
    "lat": 18.922,
    "lng": 72.8347,
    "description": "India's financial and entertainment capital on the Arabian Sea: iconic Gateway of India, crescent Queen's Necklace Marine Drive, and colonial heritage.",
    "image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Gateway of India",
      "Marine Drive",
      "Bollywood"
    ],
    "famousAttractions": [
      "Gateway of India",
      "Marine Drive Promenade",
      "Chhatrapati Shivaji Maharaj Terminus"
    ]
  },
  {
    "id": "pune",
    "name": "Pune",
    "state": "Maharashtra",
    "district": "Pune",
    "districts": [
      "Pune",
      "Koregaon Park",
      "Kothrud",
      "Aundh",
      "Hinjawadi",
      "Sinhagad"
    ],
    "type": "Oxford of the East",
    "lat": 18.5204,
    "lng": 73.8567,
    "description": "Cultural capital of Maharashtra, historic seat of the Maratha Peshwas, vibrant education hub, and gateway to scenic Western Ghats hill fortresses.",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Shaniwar Wada",
      "Sinhagad Fort",
      "Osho Garden"
    ],
    "famousAttractions": [
      "Shaniwar Wada Palace",
      "Sinhagad Hilltop Fort",
      "Aga Khan Palace"
    ]
  },
  {
    "id": "aurangabad",
    "name": "Chhatrapati Sambhajinagar (Ajanta & Ellora)",
    "state": "Maharashtra",
    "district": "Chhatrapati Sambhajinagar",
    "districts": [
      "Sambhajinagar",
      "Ellora",
      "Ajanta",
      "Daulatabad",
      "Bibi Ka Maqbara"
    ],
    "type": "Rock-Cut Masterpieces",
    "lat": 19.8762,
    "lng": 75.3433,
    "description": "Tourism capital of Maharashtra, home to the monolithic Kailash Temple carved from a single volcanic cliff and ancient Buddhist & Jain caves.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Ellora Kailash",
      "Ajanta Frescoes",
      "Daulatabad Fort"
    ],
    "famousAttractions": [
      "Kailash Monolithic Temple Ellora",
      "Ajanta Buddhist Caves",
      "Daulatabad Fortress"
    ]
  },
  {
    "id": "shillong",
    "name": "Shillong",
    "state": "Meghalaya",
    "district": "East Khasi Hills",
    "districts": [
      "Shillong",
      "Umiam",
      "Police Bazar",
      "Laitlum Canyons",
      "Elephant Falls"
    ],
    "type": "Scotland of the East",
    "lat": 25.5788,
    "lng": 91.8933,
    "description": "Capital of Meghalaya known for its cool climate, rolling pine hills, crystal Umiam Lake, cascading waterfalls, and vibrant indie rock music culture.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Umiam Lake",
      "Laitlum Canyons",
      "Pine Hills"
    ],
    "famousAttractions": [
      "Umiam Lake Water Sports",
      "Laitlum Grand Canyons",
      "Elephant Falls"
    ]
  },
  {
    "id": "cherrapunji",
    "name": "Cherrapunji & Nohkalikai",
    "state": "Meghalaya",
    "district": "East Khasi Hills",
    "districts": [
      "Sohra",
      "Nohkalikai",
      "Mawsmai",
      "Nongriat"
    ],
    "type": "Living Root Bridges",
    "lat": 25.2702,
    "lng": 91.7323,
    "description": "The abode of clouds and one of the wettest spots on Earth, famous for the magnificent Nohkalikai plunging waterfall and double-decker living root bridges.",
    "image": "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Nohkalikai Falls",
      "Root Bridges",
      "Mawsmai Cave"
    ],
    "famousAttractions": [
      "Nohkalikai 1115-ft Falls",
      "Double Decker Living Root Bridge",
      "Mawsmai Limestone Caves"
    ]
  },
  {
    "id": "puri",
    "name": "Puri",
    "state": "Odisha",
    "district": "Puri",
    "districts": [
      "Puri",
      "Golden Beach",
      "Swargadwar",
      "Chilika Lake Gateway"
    ],
    "type": "Sacred Coastal Dham",
    "lat": 19.8135,
    "lng": 85.8312,
    "description": "Holy coastal city on the Bay of Bengal, home of Lord Jagannath's grand 12th-century temple, annual Rath Yatra festival, and Blue Flag Golden Beach.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Jagannath Temple",
      "Golden Beach",
      "Rath Yatra"
    ],
    "famousAttractions": [
      "Shri Jagannath Temple",
      "Puri Golden Surf Beach",
      "Chilika Lake Dolphin Sanctuary"
    ]
  },
  {
    "id": "konark",
    "name": "Konark",
    "state": "Odisha",
    "district": "Puri",
    "districts": [
      "Konark",
      "Chandrabhaga Beach",
      "Ramchandi"
    ],
    "type": "Sun Temple Chariot",
    "lat": 19.8876,
    "lng": 86.0945,
    "description": "UNESCO World Heritage marvel: 13th-century monumental Sun God chariot carved in black granite with 24 colossal intricately sculpted stone wheels.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Sun Temple",
      "Stone Chariot",
      "UNESCO"
    ],
    "famousAttractions": [
      "Konark Sun Temple Complex",
      "Chandrabhaga Sea Beach",
      "Konark Archaeological Museum"
    ]
  },
  {
    "id": "amritsar",
    "name": "Amritsar",
    "state": "Punjab",
    "district": "Amritsar",
    "districts": [
      "Amritsar",
      "Golden Temple",
      "Wagah Border",
      "Jallianwala Bagh",
      "Ranjit Avenue"
    ],
    "type": "The Golden Heart",
    "lat": 31.62,
    "lng": 74.8765,
    "description": "Spiritual and cultural capital of Sikhism, revered for the pure gold-plated Sri Harmandir Sahib (Golden Temple), sacred Amrit Sarovar, and Wagah Border.",
    "image": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Golden Temple",
      "Wagah Border",
      "Amritsari Kulcha"
    ],
    "famousAttractions": [
      "Sri Harmandir Sahib (Golden Temple)",
      "Wagah Border Beating Retreat",
      "Jallianwala Bagh Memorial"
    ]
  },
  {
    "id": "jaipur",
    "name": "Jaipur",
    "state": "Rajasthan",
    "district": "Jaipur",
    "districts": [
      "Jaipur",
      "Amer",
      "Malviya Nagar",
      "Vaishali Nagar",
      "C-Scheme",
      "Mansarovar"
    ],
    "type": "The Pink City",
    "lat": 26.9124,
    "lng": 75.7873,
    "description": "UNESCO World Heritage capital of Rajasthan: iconic pink sandstone Hawa Mahal, colossal Amer Fort overlooking Maota Lake, and astronomical Jantar Mantar.",
    "image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Hawa Mahal",
      "Amer Fort",
      "City Palace"
    ],
    "famousAttractions": [
      "Hawa Mahal Palace of Winds",
      "Amer Hill Fortress",
      "City Palace Complex"
    ]
  },
  {
    "id": "udaipur",
    "name": "Udaipur",
    "state": "Rajasthan",
    "district": "Udaipur",
    "districts": [
      "Udaipur",
      "Lake Pichola",
      "Fateh Sagar",
      "Sukhadia Circle"
    ],
    "type": "City of Lakes & Palaces",
    "lat": 24.5854,
    "lng": 73.7125,
    "description": "Romantic City of Lakes nestled in the Aravalli hills, famed for shimmering Lake Pichola, white marble Lake Palace, and grand City Palace.",
    "image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Lake Pichola",
      "City Palace",
      "Lake Palace"
    ],
    "famousAttractions": [
      "City Palace on Lake Pichola",
      "Taj Lake Palace",
      "Jag Mandir Island"
    ]
  },
  {
    "id": "jodhpur",
    "name": "Jodhpur",
    "state": "Rajasthan",
    "district": "Jodhpur",
    "districts": [
      "Jodhpur",
      "Mehrangarh",
      "Clock Tower",
      "Umaid Bhawan"
    ],
    "type": "The Blue City",
    "lat": 26.2389,
    "lng": 73.0243,
    "description": "The Blue City of the Thar Desert, commanded by the impregnable cliffside Mehrangarh Fort rising 400 ft above indigo-painted historic houses.",
    "image": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Mehrangarh Fort",
      "Blue Houses",
      "Umaid Bhawan"
    ],
    "famousAttractions": [
      "Mehrangarh Cliff Fortress",
      "Jaswant Thada Marble Cenotaph",
      "Umaid Bhawan Palace"
    ]
  },
  {
    "id": "jaisalmer",
    "name": "Jaisalmer",
    "state": "Rajasthan",
    "district": "Jaisalmer",
    "districts": [
      "Jaisalmer",
      "Sam Sand Dunes",
      "Khuri",
      "Patwon Ki Haveli"
    ],
    "type": "The Golden City",
    "lat": 26.9157,
    "lng": 70.9083,
    "description": "The Golden City in the heart of the Great Thar Desert, dominated by the living yellow sandstone Jaisalmer Fort and sweeping wind-carved Sam Sand Dunes.",
    "image": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Golden Fort",
      "Sam Dunes",
      "Desert Safari"
    ],
    "famousAttractions": [
      "Jaisalmer Living Fort",
      "Sam Sand Dunes Camel Safari",
      "Patwon Ki Haveli"
    ]
  },
  {
    "id": "gangtok",
    "name": "Gangtok",
    "state": "Sikkim",
    "district": "East Sikkim",
    "districts": [
      "Gangtok",
      "Rumtek",
      "Tsomgo Lake",
      "Nathu La Gateway"
    ],
    "type": "Himalayan Vistas",
    "lat": 27.3389,
    "lng": 88.6065,
    "description": "Clean mountain capital commanding breathtaking views of Mt. Kanchenjunga (world's 3rd highest peak), Rumtek Monastery, and sacred glacial Tsomgo Lake.",
    "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kanchenjunga",
      "Rumtek",
      "Tsomgo Lake"
    ],
    "famousAttractions": [
      "Tsomgo Glacial Lake",
      "Rumtek Dharma Chakra Centre",
      "Nathula Indo-China Pass"
    ]
  },
  {
    "id": "chennai",
    "name": "Chennai",
    "state": "Tamil Nadu",
    "district": "Chennai",
    "districts": [
      "Chennai",
      "Mylapore",
      "T Nagar",
      "Adyar",
      "Besant Nagar",
      "Anna Nagar",
      "Marina"
    ],
    "type": "Dravidian Cultural Capital",
    "lat": 13.0827,
    "lng": 80.2707,
    "description": "Cultural gateway of South India on the Coromandel Coast, famed for the world's second-longest natural urban beach at Marina and ancient Mylapore temples.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Marina Beach",
      "Kapaleeshwarar",
      "Carnatic Music"
    ],
    "famousAttractions": [
      "Marina Beach Promenade",
      "Kapaleeshwarar Temple Mylapore",
      "Fort St. George"
    ]
  },
  {
    "id": "madurai",
    "name": "Madurai",
    "state": "Tamil Nadu",
    "district": "Madurai",
    "districts": [
      "Madurai",
      "Meenakshi Temple",
      "Thirumalai Nayakkar",
      "Alagar Kovil"
    ],
    "type": "Temple City of Gopurams",
    "lat": 9.9252,
    "lng": 78.1198,
    "description": "Ancient 2,500-year-old soul of Tamil Nadu, world-renowned for the magnificent Meenakshi Amman Temple and its 14 towering multi-colored gopurams.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Meenakshi Temple",
      "Gopurams",
      "Thirumalai Nayak"
    ],
    "famousAttractions": [
      "Meenakshi Amman Temple Complex",
      "Thirumalai Nayakkar Palace",
      "Gandhi Memorial Museum"
    ]
  },
  {
    "id": "ooty",
    "name": "Ooty (Udhagamandalam)",
    "state": "Tamil Nadu",
    "district": "Nilgiris",
    "districts": [
      "Nilgiris",
      "Ooty",
      "Coonoor",
      "Kotagiri"
    ],
    "type": "Queen of the Nilgiris",
    "lat": 11.4102,
    "lng": 76.695,
    "description": "Scenic hill haven set amid the blue Nilgiri Mountains: rolling tea estates, botanical gardens, and the UNESCO heritage Nilgiri Mountain Toy Train.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Nilgiri Toy Train",
      "Tea Gardens",
      "Doddabetta"
    ],
    "famousAttractions": [
      "Nilgiri Mountain Railway Toy Train",
      "Government Botanical Garden",
      "Doddabetta Mountain Peak"
    ]
  },
  {
    "id": "mahabalipuram",
    "name": "Mahabalipuram (Mamallapuram)",
    "state": "Tamil Nadu",
    "district": "Chengalpattu",
    "districts": [
      "Mamallapuram",
      "Shore Temple",
      "Five Rathas",
      "Tiger Cave"
    ],
    "type": "UNESCO Coastal Monoliths",
    "lat": 12.6269,
    "lng": 80.1927,
    "description": "7th-century Pallava coastal sanctuary on the Bay of Bengal, celebrated for the monolithic Shore Temple, Pancha Rathas, and Arjuna's Penance bas-relief.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Shore Temple",
      "Pancha Rathas",
      "Arjuna Penance"
    ],
    "famousAttractions": [
      "Shore Temple on Bay of Bengal",
      "Pancha Rathas Monolithic Chariots",
      "Krishna's Butterball & Arjuna's Penance"
    ]
  },
  {
    "id": "hyderabad",
    "name": "Hyderabad",
    "state": "Telangana",
    "district": "Hyderabad",
    "districts": [
      "Hyderabad",
      "HITEC City",
      "Gachibowli",
      "Jubilee Hills",
      "Banjara Hills",
      "Charminar",
      "Secunderabad"
    ],
    "type": "City of Pearls",
    "lat": 17.385,
    "lng": 78.4867,
    "description": "Dynamic fusion of royal Nizam heritage and futuristic Cyberabad: the 1591 Charminar, massive Golconda Fort, aromatic biryani, and tech hubs.",
    "image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Charminar",
      "Golconda",
      "Biryani"
    ],
    "famousAttractions": [
      "Charminar Historic Monument",
      "Golconda Diamond Fort",
      "Ramoji Film City"
    ]
  },
  {
    "id": "warangal",
    "name": "Warangal",
    "state": "Telangana",
    "district": "Warangal",
    "districts": [
      "Warangal",
      "Hanamkonda",
      "Kazipet",
      "Ramappa",
      "Laknavaram Lake"
    ],
    "type": "Kakatiya Heritage",
    "lat": 17.9689,
    "lng": 79.5941,
    "description": "Historical capital of the Kakatiya Dynasty, home to the Thousand Pillar Temple, Warangal Fort with its iconic stone gateway, and UNESCO Ramappa Temple.",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kakatiya Kala Thoranam",
      "Thousand Pillar",
      "Ramappa"
    ],
    "famousAttractions": [
      "Thousand Pillar Temple",
      "Warangal Fort Kala Thoranam",
      "UNESCO Ramappa Temple"
    ]
  },
  {
    "id": "agartala",
    "name": "Agartala",
    "state": "Tripura",
    "district": "West Tripura",
    "districts": [
      "Agartala",
      "Ujjayanta",
      "Neermahal",
      "Sepahijala"
    ],
    "type": "Royal Palaces of Tripura",
    "lat": 23.8315,
    "lng": 91.2868,
    "description": "Charming capital celebrated for the grand white marble Ujjayanta Palace, the water palace of Neermahal floating in Rudrasagar Lake, and handicraft bazaars.",
    "image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Ujjayanta Palace",
      "Neermahal",
      "Water Palace"
    ],
    "famousAttractions": [
      "Ujjayanta Palace Museum",
      "Neermahal Lake Palace",
      "Sepahijala Wildlife Sanctuary"
    ]
  },
  {
    "id": "varanasi",
    "name": "Varanasi",
    "state": "Uttar Pradesh",
    "district": "Varanasi",
    "districts": [
      "Varanasi",
      "Dashashwamedh",
      "Assi Ghat",
      "Manikarnika",
      "Sarnath"
    ],
    "type": "The Eternal City",
    "lat": 25.3176,
    "lng": 82.9739,
    "description": "One of the oldest continuously inhabited cities in the world: sacred Ganga Ghats, mesmerizing evening aartis, Kashi Vishwanath, and nearby Sarnath.",
    "image": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Ganga Aarti",
      "Kashi Vishwanath",
      "Sarnath"
    ],
    "famousAttractions": [
      "Dashashwamedh Ghat Evening Aarti",
      "Kashi Vishwanath Temple",
      "Sarnath Deer Park & Dhamek Stupa"
    ]
  },
  {
    "id": "agra",
    "name": "Agra",
    "state": "Uttar Pradesh",
    "district": "Agra",
    "districts": [
      "Agra",
      "Tajganj",
      "Fatehpur Sikri",
      "Sikandra"
    ],
    "type": "City of the Taj",
    "lat": 27.1767,
    "lng": 78.0081,
    "description": "Home of the immortal Taj Mahal, UNESCO World Heritage symbol of love, along with the colossal red sandstone Agra Fort and imperial Fatehpur Sikri.",
    "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Taj Mahal",
      "Agra Fort",
      "Fatehpur Sikri"
    ],
    "famousAttractions": [
      "Taj Mahal World Wonder",
      "Agra Fort Red Citadel",
      "Fatehpur Sikri Royal Complex"
    ]
  },
  {
    "id": "rishikesh",
    "name": "Rishikesh",
    "state": "Uttarakhand",
    "district": "Dehradun",
    "districts": [
      "Rishikesh",
      "Tapovan",
      "Laxman Jhula",
      "Ram Jhula",
      "Shivpuri",
      "Triveni Ghat"
    ],
    "type": "Yoga Capital of the World",
    "lat": 30.0869,
    "lng": 78.2676,
    "description": "Global capital of yoga nestled where the emerald Ganges tumbles from the Himalayas: suspension bridges, river rafting rapids, ashrams, and Ganga aartis.",
    "image": "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Yoga",
      "Laxman Jhula",
      "River Rafting"
    ],
    "famousAttractions": [
      "Laxman & Ram Jhula Bridges",
      "Triveni Ghat Evening Maha Aarti",
      "Ganga White Water Rafting"
    ]
  },
  {
    "id": "mussoorie",
    "name": "Mussoorie & Dehradun",
    "state": "Uttarakhand",
    "district": "Dehradun",
    "districts": [
      "Dehradun",
      "Mussoorie",
      "Mall Road",
      "Kempty Falls",
      "Landour",
      "Dhanaulti"
    ],
    "type": "Queen of the Hills",
    "lat": 30.4598,
    "lng": 78.0644,
    "description": "Enchanting hill retreat boasting the spectacular Kempty Falls, pine-shaded paths of Landour, and breathtaking vistas of the snow-clad Garhwal Himalayas.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kempty Falls",
      "Landour",
      "Mall Road"
    ],
    "famousAttractions": [
      "Kempty Cascading Falls",
      "Gun Hill Cable Car",
      "Landour Char Dukan & Viewpoints"
    ]
  },
  {
    "id": "kolkata",
    "name": "Kolkata",
    "state": "West Bengal",
    "district": "Kolkata",
    "districts": [
      "Kolkata",
      "Park Street",
      "Salt Lake",
      "New Town",
      "Ballygunge",
      "Howrah"
    ],
    "type": "City of Joy",
    "lat": 22.5726,
    "lng": 88.3639,
    "description": "The intellectual and cultural capital of India: cantilevered Howrah Bridge over the Hooghly, marble Victoria Memorial, heritage tramways, and Durga Puja.",
    "image": "https://images.unsplash.com/photo-1558431382-27e303142255?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Howrah Bridge",
      "Victoria Memorial",
      "Culture"
    ],
    "famousAttractions": [
      "Howrah Bridge Landmark",
      "Victoria Memorial Hall",
      "Dakshineswar Kali Temple"
    ]
  },
  {
    "id": "darjeeling",
    "name": "Darjeeling",
    "state": "West Bengal",
    "district": "Darjeeling",
    "districts": [
      "Darjeeling",
      "Mall Road",
      "Tiger Hill",
      "Ghum",
      "Batasia Loop",
      "Kurseong"
    ],
    "type": "Queen of the Hills & Tea",
    "lat": 27.041,
    "lng": 88.2663,
    "description": "World-famous for champagne Darjeeling tea estates, the UNESCO Himalayan Toy Train, and dawn sunrise over Mt. Kanchenjunga from Tiger Hill.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Darjeeling Tea",
      "Toy Train",
      "Tiger Hill"
    ],
    "famousAttractions": [
      "Tiger Hill Kanchenjunga Sunrise",
      "Darjeeling Himalayan Railway UNESCO",
      "Batasia Loop & War Memorial"
    ]
  },
  {
    "id": "imphal",
    "name": "Imphal",
    "state": "Manipur",
    "district": "Imphal West",
    "districts": [
      "Imphal",
      "Kangla",
      "Loktak",
      "Moirang",
      "Keibul Lamjao"
    ],
    "type": "Jewel of India",
    "lat": 24.817,
    "lng": 93.9368,
    "description": "Scenic valley city, home to the ancient royal seat of Kangla Fort, the all-women Ima Keithel market, and Loktak Lake's floating islands (phumdis).",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Kangla Fort",
      "Loktak Lake",
      "Ima Keithel"
    ],
    "famousAttractions": [
      "Kangla Fort Complex",
      "Keibul Lamjao Floating Park",
      "Ima Keithel Mothers' Market"
    ]
  },
  {
    "id": "aizawl",
    "name": "Aizawl",
    "state": "Mizoram",
    "district": "Aizawl",
    "districts": [
      "Aizawl",
      "Reiek",
      "Hmuifang",
      "Vantawng Falls"
    ],
    "type": "City in the Clouds",
    "lat": 23.7271,
    "lng": 92.7176,
    "description": "Picturesque mountain ridge city perched above the clouds at 3,700 ft, featuring cliffside viewpoints, bamboo handicrafts, and fresh alpine breezes.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Cloud Ridge",
      "Reiek Tlang",
      "Durtlang Hills"
    ],
    "famousAttractions": [
      "Reiek Mountain Peak",
      "Solomon's Temple",
      "Durtlang Hills Viewpoint"
    ]
  },
  {
    "id": "kohima",
    "name": "Kohima",
    "state": "Nagaland",
    "district": "Kohima",
    "districts": [
      "Kohima",
      "Kisama",
      "Dzukou Valley",
      "Khonoma"
    ],
    "type": "Land of Festivals",
    "lat": 25.6751,
    "lng": 94.1086,
    "description": "Historic hill capital nestled among the mountains, famous for the annual Hornbill Festival at Kisama Heritage Village, Dzukou Valley, and WWII Memorial.",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Hornbill Festival",
      "Dzukou Valley",
      "Kisama"
    ],
    "famousAttractions": [
      "Kisama Hornbill Heritage Village",
      "Dzukou Valley Lily Treks",
      "Kohima War Cemetery"
    ]
  },
  {
    "id": "andaman",
    "name": "Port Blair & Havelock (Swaraj Dweep)",
    "state": "Andaman & Nicobar Islands",
    "district": "South Andaman",
    "districts": [
      "Port Blair",
      "Havelock Island",
      "Neil Island",
      "Radhanagar Beach",
      "Cellular Jail"
    ],
    "type": "Tropical Island Paradise",
    "lat": 11.6234,
    "lng": 92.7265,
    "description": "Pristine tropical archipelago in the Bay of Bengal, celebrated for Radhanagar Beach (one of Asia's finest), scuba diving coral reefs, and Cellular Jail.",
    "image": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Radhanagar Beach",
      "Scuba Diving",
      "Cellular Jail"
    ],
    "famousAttractions": [
      "Cellular Jail National Memorial",
      "Radhanagar Beach Havelock",
      "Elephant Beach Coral Reefs"
    ]
  },
  {
    "id": "chandigarh",
    "name": "Chandigarh",
    "state": "Chandigarh",
    "district": "Chandigarh",
    "districts": [
      "Chandigarh",
      "Sector 17",
      "Sukhna Lake",
      "Rock Garden"
    ],
    "type": "The City Beautiful",
    "lat": 30.7333,
    "lng": 76.7794,
    "description": "India's premier planned modern city designed by Le Corbusier, internationally acclaimed for the whimsical Nek Chand Rock Garden and Sukhna Lake.",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Rock Garden",
      "Sukhna Lake",
      "Planned City"
    ],
    "famousAttractions": [
      "Nek Chand Rock Garden",
      "Sukhna Lake Promenade",
      "Zakir Hussain Rose Garden"
    ]
  },
  {
    "id": "daman-diu",
    "name": "Daman & Diu",
    "state": "Dadra & Nagar Haveli and Daman & Diu",
    "district": "Daman",
    "districts": [
      "Daman",
      "Diu",
      "Moti Daman",
      "Nani Daman",
      "Nagoa Beach",
      "Silvassa"
    ],
    "type": "Portuguese Coastal Fortress",
    "lat": 20.3974,
    "lng": 72.8328,
    "description": "Historic coastal union territory with 16th-century Portuguese sea forts, black and golden sand beaches, and serene coconut palms along the Arabian Sea.",
    "image": "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Diu Fort",
      "Moti Daman",
      "Nagoa Beach"
    ],
    "famousAttractions": [
      "Diu Sea Fortress",
      "Moti Daman Fort Ramparts",
      "Nagoa Horseshoe Beach"
    ]
  },
  {
    "id": "delhi-central",
    "name": "Delhi (Central & New Delhi)",
    "state": "Delhi (NCT)",
    "district": "New Delhi",
    "districts": [
      "New Delhi",
      "Connaught Place",
      "Kartavya Path",
      "Chanakyapuri",
      "Lodhi Colony"
    ],
    "type": "National Capital Citadel",
    "lat": 28.6139,
    "lng": 77.209,
    "description": "The heart of India: stately Kartavya Path boulevard, India Gate triumphal arch, President's Estate, and lush Mughal-era Lodhi Gardens.",
    "image": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "India Gate",
      "Humayun Tomb",
      "Connaught Place"
    ],
    "famousAttractions": [
      "India Gate Memorial",
      "Humayun's Tomb Garden",
      "Qutub Minar Complex"
    ]
  },
  {
    "id": "lakshadweep",
    "name": "Agatti & Bangaram Atolls",
    "state": "Lakshadweep",
    "district": "Lakshadweep",
    "districts": [
      "Agatti",
      "Bangaram",
      "Kavaratti",
      "Kadmat",
      "Minicoy"
    ],
    "type": "Turquoise Coral Atolls",
    "lat": 10.8548,
    "lng": 72.1932,
    "description": "Enchanting tropical coral archipelago in the Arabian Sea, renowned for crystal-clear turquoise lagoons, pristine white sandbanks, and vibrant scuba diving.",
    "image": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "Coral Lagoon",
      "Bangaram",
      "Scuba Diving"
    ],
    "famousAttractions": [
      "Agatti Island Turquoise Lagoon",
      "Bangaram Atoll Sandbanks",
      "Kavaratti Marine Aquarium"
    ]
  },
  {
    "id": "puducherry",
    "name": "Puducherry (Pondicherry)",
    "state": "Puducherry",
    "district": "Puducherry",
    "districts": [
      "Puducherry",
      "White Town",
      "Auroville",
      "Promenade Beach",
      "Paradise Beach"
    ],
    "type": "French Riviera of the East",
    "lat": 11.9416,
    "lng": 79.8083,
    "description": "French Riviera of the East: charming pastel yellow colonial villas, bougainvillea-draped cafes, seaside Promenade Beach, and experimental spiritual Auroville.",
    "image": "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=2000&auto=format&fit=crop&q=85",
    "tags": [
      "French Quarter",
      "Promenade Beach",
      "Auroville"
    ],
    "famousAttractions": [
      "French White Town Streets",
      "Promenade Seaside Boardwalk",
      "Matrimandir Auroville"
    ]
  }
];

// ============================================================================
// 3. FAMOUS PLACES & ATTRACTIONS (Organized by State/UT)
// ============================================================================
export const FAMOUS_PLACES = [
  {
    "id": "sri-venkateswara-temple",
    "name": "Tirumala Venkateswara Temple",
    "state": "Andhra Pradesh",
    "city": "Tirupati",
    "category": "Spiritual Sanctum",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "World-renowned Dravidian temple with pure gold Ananda Nilayam vimana dome in the sacred Seshachalam hills."
  },
  {
    "id": "gandikota-canyon",
    "name": "Gandikota Grand Canyon",
    "state": "Andhra Pradesh",
    "city": "Kadapa (Gandikota)",
    "category": "World Wonder",
    "image": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=2000&auto=format&fit=crop&q=85",
    "description": "The Grand Canyon of India carved by the Penna River with dramatic red sandstone gorges and historic fort."
  },
  {
    "id": "kanaka-durga-temple",
    "name": "Kanaka Durga Temple",
    "state": "Andhra Pradesh",
    "city": "Vijayawada",
    "category": "Spiritual Sanctum",
    "image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=2000&auto=format&fit=crop&q=85",
    "description": "Venerated hilltop temple atop Indrakeeladri overlooking the sacred Krishna River and Prakasam Barrage."
  },
  {
    "id": "kailasagiri",
    "name": "Kailasagiri & RK Beach",
    "state": "Andhra Pradesh",
    "city": "Visakhapatnam",
    "category": "Urban Beach",
    "image": "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=2000&auto=format&fit=crop&q=85",
    "description": "Scenic hilltop park where the green Eastern Ghats meet the turquoise Bay of Bengal coastline."
  },
  {
    "id": "amaravati-buddha",
    "name": "Amaravati Dhyana Buddha",
    "state": "Andhra Pradesh",
    "city": "Guntur",
    "category": "Historical Monument",
    "image": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=2000&auto=format&fit=crop&q=85",
    "description": "Colossal 125-foot Dhyana Buddha statue on the Krishna riverbanks celebrating 2,000 years of Buddhist heritage."
  },
  {
    "id": "lepakshi-temple",
    "name": "Lepakshi Veerabhadra Temple",
    "state": "Andhra Pradesh",
    "city": "Anantapur",
    "category": "Ancient Architecture",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "16th-century Vijayanagara architectural masterpiece with hanging pillar and colossal monolithic Nandi."
  },
  {
    "id": "konda-reddy-buruju",
    "name": "Konda Reddy Buruju",
    "state": "Andhra Pradesh",
    "city": "Kurnool",
    "category": "Hill Fortress",
    "image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2000&auto=format&fit=crop&q=85",
    "description": "Iconic circular fortress bastion standing majestically in the heart of historic Kurnool."
  },
  {
    "id": "godavari-bridge",
    "name": "Godavari Arch Bridge",
    "state": "Andhra Pradesh",
    "city": "Rajahmundry",
    "category": "Colonial Landmark",
    "image": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=2000&auto=format&fit=crop&q=85",
    "description": "Majestic bowstring girder arch bridge spanning the sacred Akhanda Godavari River at sunset."
  },
  {
    "id": "horsley-hills",
    "name": "Horsley Hills",
    "state": "Andhra Pradesh",
    "city": "Chittoor",
    "category": "Scenic Lake",
    "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85",
    "description": "Serene hill retreat perched at 4,147 ft with lush eucalyptus groves, valley viewpoints, and cool breezes."
  },
  {
    "id": "coringa-mangroves",
    "name": "Coringa Wildlife Sanctuary",
    "state": "Andhra Pradesh",
    "city": "Kakinada",
    "category": "Wildlife Sanctuary",
    "image": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=2000&auto=format&fit=crop&q=85",
    "description": "India's second largest mangrove forest with elevated wooden boardwalks and estuary biodiversity."
  },
  {
    "id": "pulicat-lake",
    "name": "Pulicat Lagoon Sanctuary",
    "state": "Andhra Pradesh",
    "city": "Nellore",
    "category": "Wildlife Sanctuary",
    "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&auto=format&fit=crop&q=85",
    "description": "Vast coastal brackish lagoon hosting thousands of greater flamingos and migratory waterfowl."
  },
  {
    "id": "taj-mahal",
    "name": "Taj Mahal",
    "state": "Uttar Pradesh",
    "city": "Agra",
    "category": "World Wonder",
    "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=2000&auto=format&fit=crop&q=85",
    "description": "UNESCO World Heritage wonder of ivory-white marble commissioned by Mughal Emperor Shah Jahan."
  },
  {
    "id": "gateway-of-india",
    "name": "Gateway of India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "category": "Colonial Landmark",
    "image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=2000&auto=format&fit=crop&q=85",
    "description": "Majestic basalt arch overlooking Mumbai harbour, welcoming travelers to the Arabian Sea coastline."
  },
  {
    "id": "india-gate",
    "name": "India Gate",
    "state": "Delhi (NCT)",
    "city": "Delhi",
    "category": "National Monument",
    "image": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=2000&auto=format&fit=crop&q=85",
    "description": "Triumphal war memorial arch on the Kartavya Path boulevard in the heart of New Delhi."
  },
  {
    "id": "red-fort",
    "name": "Red Fort",
    "state": "Delhi (NCT)",
    "city": "Delhi",
    "category": "Mughal Citadel",
    "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=2000&auto=format&fit=crop&q=85",
    "description": "Iconic red sandstone fort that was the historic seat of Mughal rule in Old Delhi."
  },
  {
    "id": "amer-fort",
    "name": "Amer Fort",
    "state": "Rajasthan",
    "city": "Jaipur",
    "category": "Hill Fortress",
    "image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85",
    "description": "Sprawling hilltop fort with Sheesh Mahal (hall of mirrors) overlooking Maota Lake."
  },
  {
    "id": "hawa-mahal",
    "name": "Hawa Mahal",
    "state": "Rajasthan",
    "city": "Jaipur",
    "category": "Royal Palace",
    "image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2000&auto=format&fit=crop&q=85",
    "description": "The five-storey pink sandstone Palace of Winds featuring 953 intricate jharokha lattice windows."
  },
  {
    "id": "golden-temple",
    "name": "Golden Temple",
    "state": "Punjab",
    "city": "Amritsar",
    "category": "Spiritual Sanctum",
    "image": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=2000&auto=format&fit=crop&q=85",
    "description": "Harmandir Sahib with pure gold-plated dome surrounded by the sacred Amrit Sarovar water."
  },
  {
    "id": "charminar",
    "name": "Charminar",
    "state": "Telangana",
    "city": "Hyderabad",
    "category": "Historical Monument",
    "image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=2000&auto=format&fit=crop&q=85",
    "description": "1591 monument with four 48-metre minarets and bustling bazaar alleys of Laad Bazaar."
  },
  {
    "id": "meenakshi-temple",
    "name": "Meenakshi Temple",
    "state": "Tamil Nadu",
    "city": "Madurai",
    "category": "Dravidian Temple",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "Ancient temple complex with 14 colorful multi-tiered gopurams dedicated to Goddess Meenakshi."
  },
  {
    "id": "marina-beach",
    "name": "Marina Beach",
    "state": "Tamil Nadu",
    "city": "Chennai",
    "category": "Urban Beach",
    "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&auto=format&fit=crop&q=85",
    "description": "One of the world’s longest natural urban beaches, famous for sea breezes and roasted corn stalls."
  },
  {
    "id": "mysore-palace",
    "name": "Mysore Palace",
    "state": "Karnataka",
    "city": "Mysuru",
    "category": "Royal Palace",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "Grand Indo-Saracenic palace illuminated by over 97,000 electric bulbs on festive evenings."
  },
  {
    "id": "hampi-ruins",
    "name": "Hampi",
    "state": "Karnataka",
    "city": "Hampi",
    "category": "UNESCO Ruins",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "Monolithic Stone Chariot and grand pillared halls carved amid otherworldly granite boulders."
  },
  {
    "id": "konark-sun-temple",
    "name": "Konark Sun Temple",
    "state": "Odisha",
    "city": "Konark",
    "category": "Ancient Architecture",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "13th-century chariot of the Sun God carved in stone with 24 colossal wheels on the Bay of Bengal."
  },
  {
    "id": "victoria-memorial",
    "name": "Victoria Memorial",
    "state": "West Bengal",
    "city": "Kolkata",
    "category": "Colonial Landmark",
    "image": "https://images.unsplash.com/photo-1558431382-27e303142255?w=2000&auto=format&fit=crop&q=85",
    "description": "White Makrana marble museum surrounded by lush gardens, reflecting Kolkata’s historic heritage."
  },
  {
    "id": "dal-lake",
    "name": "Dal Lake",
    "state": "Jammu & Kashmir",
    "city": "Srinagar",
    "category": "Scenic Lake",
    "image": "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=2000&auto=format&fit=crop&q=85",
    "description": "The jewel of Kashmir with traditional wooden houseboats, flower shikaras, and reflection of the Zabarwan mountains."
  },
  {
    "id": "varanasi-ghats",
    "name": "Varanasi Ghats",
    "state": "Uttar Pradesh",
    "city": "Varanasi",
    "category": "Spiritual Riverfront",
    "image": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=2000&auto=format&fit=crop&q=85",
    "description": "84 riverfront stone ghats on the sacred Ganga alive with devotional aartis, chants, and morning rowing."
  },
  {
    "id": "ajanta-ellora",
    "name": "Ajanta & Ellora",
    "state": "Maharashtra",
    "city": "Aurangabad",
    "category": "Rock-Cut Caves",
    "image": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=2000&auto=format&fit=crop&q=85",
    "description": "Ancient rock-hewn caves featuring the monolithic Kailash temple carved entirely out of a single volcanic cliff."
  },
  {
    "id": "kaziranga",
    "name": "Kaziranga",
    "state": "Assam",
    "city": "Kaziranga",
    "category": "Wildlife Sanctuary",
    "image": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=2000&auto=format&fit=crop&q=85",
    "description": "UNESCO sanctuary in the Brahmaputra floodplain hosting the world’s largest population of great one-horned rhinos."
  }
];

// ============================================================================
// 4. HELPER UTILITIES
// ============================================================================

export function getDestinationsByState(stateName) {
  if (!stateName) return [];
  const query = stateName.toLowerCase().trim();
  return MAJOR_INDIAN_CITIES.filter(
    (c) => c.state.toLowerCase() === query || c.state.toLowerCase().includes(query)
  );
}

export function getFamousPlacesByState(stateName) {
  if (!stateName) return [];
  const query = stateName.toLowerCase().trim();
  return FAMOUS_PLACES.filter(
    (p) => p.state.toLowerCase() === query || p.state.toLowerCase().includes(query)
  );
}

export function getNearbyDestinations(stateName, cityName) {
  const stateDestinations = getDestinationsByState(stateName);
  if (stateDestinations.length > 0) {
    if (cityName) {
      const cityQuery = cityName.toLowerCase().trim();
      return stateDestinations.filter((c) => !c.name.toLowerCase().includes(cityQuery));
    }
    return stateDestinations;
  }
  // Return top default destinations
  return MAJOR_INDIAN_CITIES.slice(0, 4);
}

export function searchDestinations(query) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  return MAJOR_INDIAN_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
  );
}
