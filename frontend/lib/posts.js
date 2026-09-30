import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { getPlaceById } from './places.js';
import { logNotificationEvent } from './notifications.js';

const POSTS_STORAGE_KEY = '@maybewe_travel_posts_v1';
const POST_LIKES_STORAGE_KEY = '@maybewe_post_likes_v1';
const POST_SAVES_STORAGE_KEY = '@maybewe_post_saves_v1';

export const HAMPI_FALLBACK_URL =
  'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1000&auto=format&fit=crop&q=80';
export const JAIPUR_FALLBACK_URL =
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1000&auto=format&fit=crop&q=80';

export function sanitizePostMediaUrl(url) {
  if (!url || typeof url !== 'string') return HAMPI_FALLBACK_URL;
  if (url.includes('1600100397608')) return HAMPI_FALLBACK_URL;
  if (url.includes('1603262110263')) return JAIPUR_FALLBACK_URL;
  return url;
}

export function healPost(post) {
  if (!post) return post;
  const mediaList = Array.isArray(post.media) && post.media.length > 0 ? post.media : null;

  if (!mediaList) {
    return {
      ...post,
      media: [
        {
          id: `media-${post.id}-0`,
          media_url: HAMPI_FALLBACK_URL,
          caption: post.destination || 'Travel moment',
          display_order: 0,
        },
      ],
    };
  }

  const healedMedia = mediaList.map((m) => {
    const cleanUrl = sanitizePostMediaUrl(m.media_url);
    if (cleanUrl !== m.media_url) {
      return { ...m, media_url: cleanUrl };
    }
    return m;
  });

  return {
    ...post,
    media: healedMedia,
  };
}

// Seed editorial travel stories with authentic Indian photography
const DEMO_POSTS = [
  {
    id: 'post-hampi-sunset',
    user_id: 'user-demo-priya',
    user_name: 'Priya Sharma',
    user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    user_location: 'Bengaluru, India',
    content: 'Sunset over the Matanga Hill boulders. The temple bells echoed down the Tungabhadra river just as the dusk light turned pure ochre.',
    destination: 'Hampi',
    place_id: null,
    trip_id: null,
    like_count: 42,
    save_count: 14,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    media: [
      {
        id: 'media-hampi-1',
        media_url: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1000&auto=format&fit=crop&q=80',
        caption: 'Golden hour at the monolithic boulders',
        display_order: 0,
      },
    ],
  },
  {
    id: 'post-goa-thalassa',
    user_id: 'user-demo-arjun',
    user_name: 'Arjun Mehta',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    user_location: 'Mumbai, India',
    content: 'Assagao and Siolim evenings have a cadence you can never replicate in the city. Grilled kingfish, local poee, and cold drinks overlooking the cliff edge.',
    destination: 'Goa',
    place_id: 'goa-thalassa',
    trip_id: null,
    like_count: 88,
    save_count: 29,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    media: [
      {
        id: 'media-thalassa-1',
        media_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1000&auto=format&fit=crop&q=80',
        caption: 'Cliffside sunset at Siolim',
        display_order: 0,
      },
      {
        id: 'media-thalassa-2',
        media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
        caption: 'Waves crashing against Vagator shore',
        display_order: 1,
      },
    ],
  },
  {
    id: 'post-jaipur-hawa-mahal',
    user_id: 'user-demo-priya',
    user_name: 'Priya Sharma',
    user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    user_location: 'Bengaluru, India',
    content: 'Woke up at 6 AM to see the honeycombed pink sandstone of Hawa Mahal before the bazaar wakes up. The quietest 30 minutes in the Pink City.',
    destination: 'Jaipur',
    place_id: 'jaipur-hawa-mahal',
    trip_id: null,
    like_count: 65,
    save_count: 22,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    media: [
      {
        id: 'media-hawa-1',
        media_url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1000&auto=format&fit=crop&q=80',
        caption: 'Sunrise light on the 953 jharokhas',
        display_order: 0,
      },
    ],
  },
  {
    id: 'post-udaipur-lake',
    user_id: 'user-demo-rohan',
    user_name: 'Rohan Verma',
    user_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    user_location: 'Delhi, India',
    content: 'Lake Pichola at twilight. The white marble palaces appear to float on liquid obsidian. Drinking ginger chai at Ambrai Ghat.',
    destination: 'Udaipur',
    place_id: 'udaipur-lake-palace',
    trip_id: null,
    like_count: 112,
    save_count: 45,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    media: [
      {
        id: 'media-udaipur-1',
        media_url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1000&auto=format&fit=crop&q=80',
        caption: 'The reflection of Lake Palace',
        display_order: 0,
      },
    ],
  },
  {
    id: 'post-kerala-backwaters',
    user_id: 'user-demo-priya',
    user_name: 'Priya Sharma',
    user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    user_location: 'Bengaluru, India',
    content: 'Drifting down the palm-lined canals of Alleppey. The only sounds are kingfishers diving into the lagoons and coconut palms swaying in the sea breeze.',
    destination: 'Kerala',
    place_id: 'kerala-backwaters-houseboat',
    trip_id: null,
    like_count: 94,
    save_count: 38,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    media: [
      {
        id: 'media-kerala-1',
        media_url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1000&auto=format&fit=crop&q=80',
        caption: 'Morning mist on the Alleppey canals',
        display_order: 0,
      },
    ],
  },
];

/**
 * Fetch all travel posts
 * Supports filtering by destination, placeId, or userId
 */
export async function fetchPosts({ destination, placeId, userId } = {}) {
  let posts = [];

  try {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          destination,
          place_id,
          trip_id,
          like_count,
          save_count,
          visibility,
          created_at,
          user:users(id, name, avatar_url),
          media:post_media(id, media_url, caption, display_order)
        `)
        .order('created_at', { ascending: false });

      if (destination) query = query.ilike('destination', `%${destination}%`);
      if (placeId) query = query.eq('place_id', placeId);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        posts = data.map((p) => ({
          ...p,
          user_name: p.user?.name || 'Traveler',
          user_avatar: p.user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          user_location: p.user?.city || p.destination || 'India',
        }));
      }
    }
  } catch (err) {
    console.warn('Supabase fetchPosts failed, falling back to local storage:', err);
  }

  if (posts.length === 0) {
    try {
      const raw = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
      if (raw) {
        posts = JSON.parse(raw);
        let cacheUpdated = false;
        posts = posts.map((p) => {
          const healed = healPost(p);
          if (JSON.stringify(healed.media) !== JSON.stringify(p.media)) {
            cacheUpdated = true;
          }
          return healed;
        });
        if (cacheUpdated) {
          AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts)).catch(() => {});
        }
      } else {
        posts = DEMO_POSTS.map(healPost);
        await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
      }
    } catch {
      posts = DEMO_POSTS.map(healPost);
    }
  } else {
    posts = posts.map(healPost);
  }

  // Client-side filtering
  if (destination) {
    const destNorm = destination.toLowerCase().trim();
    posts = posts.filter((p) => (p.destination || '').toLowerCase().includes(destNorm));
  }
  if (placeId) {
    posts = posts.filter((p) => p.place_id === placeId);
  }
  if (userId) {
    posts = posts.filter((p) => p.user_id === userId);
  }

  return posts;
}

/**
 * Fetch posts tagged with a specific place
 * Used in Place Discovery for "Travel moments from this place"
 */
export async function fetchPlaceTravelMoments(placeId) {
  if (!placeId) return [];
  const allPosts = await fetchPosts();
  return allPosts.filter((p) => p.place_id === placeId);
}

/**
 * Create a new travel post
 */
export async function createPost(postData, authorId = null) {
  const {
    userId,
    userName = 'Traveler',
    userAvatar = null,
    userLocation = 'India',
    content,
    caption,
    destination,
    placeId = null,
    place_id = null,
    tripId = null,
    trip_id = null,
    mediaUrls = [],
    media_urls = [],
    visibility = 'public',
  } = (postData || {});

  const finalContent = content || caption || postData?.content || postData?.caption;
  if (!finalContent || !finalContent.trim()) {
    throw new Error('Please write a caption or story for your post.');
  }

  const finalMedia = (mediaUrls?.length > 0 ? mediaUrls : media_urls) || [];
  if (!finalMedia || finalMedia.length === 0) {
    throw new Error('Please add at least one travel photo.');
  }

  const finalUserId = userId || postData?.user_id || authorId || 'current-user';
  const finalPlaceId = placeId || place_id || postData?.place_id || null;
  const finalTripId = tripId || trip_id || postData?.trip_id || null;
  const finalDest = destination || postData?.destination || 'India';

  const postId = `post-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedMedia = finalMedia.map((url, idx) => ({
    id: `media-${Date.now()}-${idx}`,
    media_url: url,
    caption: '',
    display_order: idx,
  }));

  const newPost = {
    id: postId,
    user_id: finalUserId,
    user_name: userName,
    user_avatar: userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    user_location: userLocation,
    content: finalContent.trim(),
    caption: finalContent.trim(),
    destination: finalDest,
    place_id: finalPlaceId,
    trip_id: finalTripId,
    like_count: 0,
    save_count: 0,
    visibility,
    created_at: now,
    media: formattedMedia,
  };

  const currentPosts = await fetchPosts();
  const updated = [newPost, ...currentPosts];
  await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));

  // Sync to Supabase
  if (isSupabaseConfigured && finalUserId) {
    try {
      const { data: dbPost, error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: finalUserId,
            content: finalContent.trim(),
            destination: finalDest || null,
            place_id: finalPlaceId,
            trip_id: finalTripId,
            visibility,
          },
        ])
        .select()
        .single();

      if (!error && dbPost) {
        for (let i = 0; i < finalMedia.length; i++) {
          await supabase.from('post_media').insert([
            {
              post_id: dbPost.id,
              media_url: finalMedia[i],
              display_order: i,
            },
          ]);
        }
      }
    } catch (e) {
      console.warn('Error creating post in Supabase:', e);
    }
  }

  return newPost;
}

/**
 * Edit an existing post (Only owner may edit)
 */
export async function updatePost(postId, arg2, arg3) {
  let userId;
  let updates;
  if (typeof arg2 === 'string') {
    userId = arg2;
    updates = arg3 || {};
  } else {
    updates = arg2 || {};
    userId = arg3;
  }

  const currentPosts = await fetchPosts();
  const post = currentPosts.find((p) => p.id === postId);

  if (!post) throw new Error('Post not found.');
  if (post.user_id !== userId) {
    throw new Error('Unauthorized: You can only edit your own posts.');
  }

  const newContent = updates.content !== undefined ? updates.content : updates.caption;
  if (newContent !== undefined) {
    post.content = newContent.trim();
    post.caption = newContent.trim();
  }
  if (updates.destination !== undefined) post.destination = updates.destination;
  if (updates.place_id !== undefined || updates.placeId !== undefined) {
    post.place_id = updates.place_id || updates.placeId;
  }
  post.updated_at = new Date().toISOString();

  await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(currentPosts));

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('posts')
        .update({
          content: post.content,
          destination: post.destination,
          place_id: post.place_id,
        })
        .eq('id', postId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Error updating post in Supabase:', e);
    }
  }

  return post;
}

/**
 * Delete a post (Only owner may delete)
 */
export async function deletePost(postId, userId) {
  const currentPosts = await fetchPosts();
  const post = currentPosts.find((p) => p.id === postId);

  if (!post) throw new Error('Post not found.');
  if (post.user_id !== userId) {
    throw new Error('Unauthorized: You can only delete your own posts.');
  }

  const updated = currentPosts.filter((p) => p.id !== postId);
  await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting post in Supabase:', e);
    }
  }

  return { success: true };
}

/**
 * Like or unlike a post (prevents duplicate likes)
 */
export async function togglePostLike(postId, userId, likerName = 'A traveler') {
  if (!postId || !userId) return { liked: false, likeCount: 0 };

  let likesMap = {};
  try {
    const raw = await AsyncStorage.getItem(POST_LIKES_STORAGE_KEY);
    if (raw) likesMap = JSON.parse(raw);
  } catch {}

  const likeKey = `${postId}_${userId}`;
  const isAlreadyLiked = Boolean(likesMap[likeKey]);

  const currentPosts = await fetchPosts();
  const post = currentPosts.find((p) => p.id === postId);

  let newLikedState = false;
  if (isAlreadyLiked) {
    delete likesMap[likeKey];
    if (post) post.like_count = Math.max(0, (post.like_count || 1) - 1);
    newLikedState = false;
  } else {
    likesMap[likeKey] = true;
    if (post) post.like_count = (post.like_count || 0) + 1;
    newLikedState = true;

    // Log notification event for post author
    if (post && post.user_id && post.user_id !== userId) {
      logNotificationEvent({
        userId: post.user_id,
        actorId: userId,
        type: 'like',
        entityId: postId,
        title: 'New Story Like',
        message: `${likerName} liked your travel story in ${post.destination || 'India'}.`,
      });
    }
  }

  await AsyncStorage.setItem(POST_LIKES_STORAGE_KEY, JSON.stringify(likesMap));
  await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(currentPosts));

  // Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      if (newLikedState) {
        await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: userId }]);
      } else {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      }
    } catch (e) {
      console.warn('Error toggling like in Supabase:', e);
    }
  }

  return { liked: newLikedState, likeCount: post?.like_count || 0 };
}

/**
 * Check if user liked a post
 */
export async function getPostLikeStatus(postId, userId) {
  if (!postId || !userId) return false;
  try {
    const raw = await AsyncStorage.getItem(POST_LIKES_STORAGE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Boolean(map[`${postId}_${userId}`]);
  } catch {
    return false;
  }
}

/**
 * Save or unsave a post to collections (prevents duplicate saves)
 */
export async function togglePostSave(postId, userId, collectionName = 'Saved') {
  if (!postId || !userId) return { saved: false };

  let savesMap = {};
  try {
    const raw = await AsyncStorage.getItem(POST_SAVES_STORAGE_KEY);
    if (raw) savesMap = JSON.parse(raw);
  } catch {}

  const saveKey = `${postId}_${userId}`;
  const isAlreadySaved = Boolean(savesMap[saveKey]);

  const currentPosts = await fetchPosts();
  const post = currentPosts.find((p) => p.id === postId);

  let newSavedState = false;
  if (isAlreadySaved) {
    delete savesMap[saveKey];
    if (post) post.save_count = Math.max(0, (post.save_count || 1) - 1);
    newSavedState = false;
  } else {
    savesMap[saveKey] = collectionName;
    if (post) post.save_count = (post.save_count || 0) + 1;
    newSavedState = true;
  }

  await AsyncStorage.setItem(POST_SAVES_STORAGE_KEY, JSON.stringify(savesMap));
  await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(currentPosts));

  // Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      if (newSavedState) {
        await supabase
          .from('post_saves')
          .insert([{ post_id: postId, user_id: userId, collection_name: collectionName }]);
      } else {
        await supabase
          .from('post_saves')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      }
    } catch (e) {
      console.warn('Error toggling save in Supabase:', e);
    }
  }

  return { saved: newSavedState, saveCount: post?.save_count || 0 };
}

/**
 * Check if user saved a post
 */
export async function getPostSaveStatus(postId, userId) {
  if (!postId || !userId) return false;
  try {
    const raw = await AsyncStorage.getItem(POST_SAVES_STORAGE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Boolean(map[`${postId}_${userId}`]);
  } catch {
    return false;
  }
}

/**
 * Fetch all posts saved by a user
 */
export async function fetchUserSavedPosts(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(POST_SAVES_STORAGE_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw);

    const savedPostIds = Object.keys(map)
      .filter((k) => k.endsWith(`_${userId}`))
      .map((k) => k.split(`_${userId}`)[0]);

    const allPosts = await fetchPosts();
    return allPosts.filter((p) => savedPostIds.includes(p.id));
  } catch {
    return [];
  }
}

/**
 * Explicit like post (prevents duplicate likes)
 */
export async function likePost(postId, userId, likerName = 'A traveler') {
  const isLiked = await getPostLikeStatus(postId, userId);
  if (isLiked) {
    return { liked: true, alreadyLiked: true };
  }
  const res = await togglePostLike(postId, userId, likerName);
  return { liked: true, likeCount: res.likeCount };
}

/**
 * Explicit unlike post
 */
export async function unlikePost(postId, userId) {
  const isLiked = await getPostLikeStatus(postId, userId);
  if (!isLiked) {
    return { unliked: true, alreadyUnliked: true };
  }
  const res = await togglePostLike(postId, userId);
  return { unliked: true, likeCount: res.likeCount };
}

/**
 * Explicit save post (prevents duplicate saves)
 */
export async function savePost(postId, userId, collectionName = 'Saved') {
  const isSaved = await getPostSaveStatus(postId, userId);
  if (isSaved) {
    return { saved: true, alreadySaved: true };
  }
  const res = await togglePostSave(postId, userId, collectionName);
  return { saved: true };
}

/**
 * Explicit unsave post
 */
export async function unsavePost(postId, userId) {
  const isSaved = await getPostSaveStatus(postId, userId);
  if (!isSaved) {
    return { unsaved: true, alreadyUnsaved: true };
  }
  const res = await togglePostSave(postId, userId);
  return { unsaved: true };
}
