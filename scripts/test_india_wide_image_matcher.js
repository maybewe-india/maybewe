async function resolveVenuePhoto(name, lat, lon, category) {
  if (!name) return null;
  const cleanName = name.trim();

  // Tier 1: Known Landmarks Dictionary (Case-insensitive fuzzy match)
  const knownLandmarks = {
    'gateway of india': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&auto=format&fit=crop&q=85',
    'india gate': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=85',
    'taj mahal': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&auto=format&fit=crop&q=85',
    'red fort': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=85',
    'amer fort': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=85',
    'hawa mahal': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop&q=85',
    'qutub minar': 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=1200&auto=format&fit=crop&q=85',
    'charminar': 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?w=1200&auto=format&fit=crop&q=85',
    'golden temple': 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1200&auto=format&fit=crop&q=85',
    'mysore palace': 'https://images.unsplash.com/photo-1600100397608-f010f443b22b?w=1200&auto=format&fit=crop&q=85',
    'victoria memorial': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=1200&auto=format&fit=crop&q=85',
    'cubbon park': 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=1200&auto=format&fit=crop&q=85',
    'marine drive': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&auto=format&fit=crop&q=85',
  };

  const lower = cleanName.toLowerCase();
  for (const [key, url] of Object.entries(knownLandmarks)) {
    if (lower === key || lower.startsWith(key) || lower.endsWith(key) || (lower.includes(key) && key.length > 8)) {
      return { url, source: 'landmark_registry', verified: true };
    }
  }

  // Tier 2: Wikipedia Title & Entity API
  try {
    const wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(cleanName) + '&prop=pageimages&pithumbsize=800&format=json&origin=*';
    const res = await fetch(wikiUrl, { headers: { 'User-Agent': 'MaybeWeTravelerApp/1.0 (contact@maybewe.app)' } });
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages || {};
      for (const id in pages) {
        if (id !== '-1' && pages[id].thumbnail?.source) {
          return { url: pages[id].thumbnail.source, source: 'wikipedia_title', verified: true };
        }
      }
    }
  } catch (e) {}

  // Tier 3: Wikipedia Geosearch if coordinates provided
  if (typeof lat === 'number' && typeof lon === 'number') {
    try {
      const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=400&ggslimit=3&prop=pageimages&pithumbsize=800&format=json&origin=*`;
      const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'MaybeWeTravelerApp/1.0 (contact@maybewe.app)' } });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const pages = geoData.query?.pages || {};
        for (const id in pages) {
          const page = pages[id];
          const pageTitle = page.title.toLowerCase();
          // Verify title has relevance to venue name
          if (page.thumbnail?.source && (lower.includes(pageTitle) || pageTitle.includes(lower) || pageTitle.split(' ').some(w => w.length > 4 && lower.includes(w)))) {
            return { url: page.thumbnail.source, source: 'wikipedia_geosearch', verified: true };
          }
        }
      }
    } catch (e) {}
  }

  // Tier 4: Unphotographed Venue — Return Authentic Non-Black Category Vector Placeholder
  return {
    url: null,
    source: 'category_vector_placeholder',
    verified: false
  };
}

async function run() {
  const venues = [
    { city: 'Bengaluru', name: 'Cubbon Park', lat: 12.9738, lon: 77.5906, cat: 'parks' },
    { city: 'Bengaluru', name: 'Third Wave Coffee', lat: 12.9352, lon: 77.6245, cat: 'cafes' },
    { city: 'Hyderabad', name: 'Charminar', lat: 17.3616, lon: 78.4747, cat: 'attractions' },
    { city: 'Hyderabad', name: 'Paradise Biryani', lat: 17.4416, lon: 78.4878, cat: 'restaurants' },
    { city: 'Mumbai', name: 'Gateway of India', lat: 18.9220, lon: 72.8347, cat: 'attractions' },
    { city: 'Mumbai', name: 'Kyani Bakery', lat: 18.9438, lon: 72.8285, cat: 'cafes' },
    { city: 'Delhi', name: 'India Gate', lat: 28.6129, lon: 77.2295, cat: 'attractions' },
    { city: 'Delhi', name: 'Qutub Minar', lat: 28.5245, lon: 77.1855, cat: 'attractions' },
    { city: 'Delhi', name: 'AIIMS Delhi', lat: 28.5672, lon: 77.2100, cat: 'hospitals' },
  ];

  for (const v of venues) {
    const res = await resolveVenuePhoto(v.name, v.lat, v.lon, v.cat);
    console.log(`[${v.city}] ${v.name} -> ${res.source} | ${res.url ? res.url.slice(0, 60) + '...' : 'Placeholder SVG'}`);
  }
}
run();
