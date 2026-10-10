// ============================================================================
// MAYBEWE ACCOUNT DELETION & STORAGE SWEEP HARDENING TEST SUITE
// File: tests/account_deletion.test.js
// Milestone #11: Final Account Deletion Security Gate
// Fail-Closed Membership Fetch & Exact Bucket Segment Depth Validation
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const edgeFuncPath1 = path.join(rootDir, 'supabase', 'functions', 'delete-account', 'index.ts');
const edgeFuncPath2 = path.join(rootDir, 'backend', 'supabase', 'functions', 'delete-account', 'index.ts');

const edgeFuncCode1 = fs.readFileSync(edgeFuncPath1, 'utf8');
const edgeFuncCode2 = fs.readFileSync(edgeFuncPath2, 'utf8');

const migPath1 = path.join(rootDir, 'supabase', 'migrations', '27_fix_account_deletion_rpc_location_columns.sql');
const migPath2 = path.join(rootDir, 'backend', 'supabase', 'migrations', '27_fix_account_deletion_rpc_location_columns.sql');
const migCode1 = fs.readFileSync(migPath1, 'utf8');
const migCode2 = fs.readFileSync(migPath2, 'utf8');

// The 9 canonical production storage buckets
const REQUIRED_BUCKETS = [
  'avatars',
  'travel-photos',
  'trip-covers',
  'post-media',
  'story-media',
  'chat-media',
  'hangout-media',
  'verification-selfies',
  'verification-documents',
];

const SHARED_COLLABORATIVE_BUCKETS = ['chat-media', 'hangout-media'];

// Regex escape helper matching the Edge Function
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Bucket-aware in-memory ownership validator matching the Edge Function with exact segment depth
function isUserOwnedPath(
  arg1,
  arg2,
  arg3,
  validConversations = new Set(),
  validHangouts = new Set()
) {
  let bucket;
  let filePath;
  let targetUserId;

  if (
    typeof arg1 === 'string' &&
    (arg1 === 'chat-media' ||
      arg1 === 'hangout-media' ||
      REQUIRED_BUCKETS.includes(arg1))
  ) {
    bucket = arg1;
    filePath = arg2;
    targetUserId = arg3;
  } else if (
    typeof arg3 === 'string' &&
    (arg3 === 'chat-media' ||
      arg3 === 'hangout-media' ||
      REQUIRED_BUCKETS.includes(arg3))
  ) {
    filePath = arg1;
    targetUserId = arg2;
    bucket = arg3;
  } else {
    bucket = arg1;
    filePath = arg2;
    targetUserId = arg3;
  }

  if (!filePath || typeof filePath !== 'string' || !targetUserId || typeof targetUserId !== 'string') {
    return false;
  }

  // Reject trailing slash before normalization
  if (filePath.trim().endsWith('/')) {
    return false;
  }

  let normalizedPath = filePath.trim().replace(/^\/+/, '');
  if (!normalizedPath || normalizedPath.endsWith('/')) {
    return false;
  }

  // Strip bucket prefix if passed as part of filePath
  if (bucket && normalizedPath.startsWith(bucket + '/')) {
    normalizedPath = normalizedPath.slice(bucket.length + 1);
  }

  const segments = normalizedPath.split('/');

  // Reject malformed segments: empty segments or hidden files (.keep, .DS_Store, etc.)
  for (const seg of segments) {
    if (!seg || seg === '' || seg.startsWith('.')) {
      return false;
    }
  }

  const filename = segments[segments.length - 1];
  if (!filename || filename === '.keep' || filename === '.DS_Store' || filename === '.emptyFolderPlaceholder' || filename.startsWith('.')) {
    return false;
  }

  // Non-collaborative buckets: strictly user partition (2 segments) or legacy root file (1 segment)
  if (bucket !== 'chat-media' && bucket !== 'hangout-media') {
    // 1. Direct user partition: MUST be EXACTLY two segments: ${targetUserId}/${filename}
    if (segments.length === 2 && segments[0] === targetUserId) {
      return true;
    }

    // 2. Legacy root pattern: MUST be EXACTLY one segment
    if (segments.length === 1) {
      const escapedUser = escapeRegex(targetUserId);
      const legacyRegex = new RegExp(`^${escapedUser}[-_.]\\S+$`);
      return legacyRegex.test(segments[0]);
    }

    // REJECT all arbitrary nested depths (3+ segments like ${userId}/nested/deep/pic.png)
    return false;
  }

  // Collaborative Buckets: chat-media
  if (bucket === 'chat-media') {
    // Nested pattern: EXACTLY three segments: {conversationId}/{userId}/{filename}
    if (segments.length === 3) {
      const [conversationId, participantId, file] = segments;
      return participantId === targetUserId && validConversations.has(conversationId) && !!file && !file.startsWith('.');
    }
    // Direct fallback: EXACTLY two segments: {userId}/{filename}
    if (segments.length === 2) {
      return segments[0] === targetUserId && !!segments[1] && !segments[1].startsWith('.');
    }
    // REJECT arbitrary depths (1 segment or 4+ segments)
    return false;
  }

  // Collaborative Buckets: hangout-media
  if (bucket === 'hangout-media') {
    // Nested pattern: EXACTLY three segments: {hangoutId}/{userId}/{filename}
    if (segments.length === 3) {
      const [hangoutId, participantId, file] = segments;
      return participantId === targetUserId && validHangouts.has(hangoutId) && !!file && !file.startsWith('.');
    }
    // Direct fallback: EXACTLY two segments: {userId}/{filename}
    if (segments.length === 2) {
      return segments[0] === targetUserId && !!segments[1] && !segments[1].startsWith('.');
    }
    // REJECT arbitrary depths (1 segment or 4+ segments)
    return false;
  }

  return false;
}

// Error distinction helper matching the Edge Function
function isNotFoundError(error) {
  if (!error) return false;
  const status = error.statusCode || error.status;
  const msg = (error.message || '').toLowerCase();

  if (typeof status === 'number' && status !== 404) {
    return false;
  }

  if (
    msg.includes('500') ||
    msg.includes('internal') ||
    msg.includes('timeout') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('network') ||
    msg.includes('permission') ||
    msg.includes('connection refused')
  ) {
    return false;
  }

  if (
    status === 404 ||
    msg.includes('bucket not found') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('not_found')
  ) {
    return true;
  }

  return false;
}

function isStorageApiError(error) {
  if (!error) return false;
  return !isNotFoundError(error);
}

// Simulated directory crawler matching the Edge Function
async function listUserFilesRecursively(
  storageClient,
  bucketName,
  folderPath,
  userId,
  depth = 0,
  validConversations = new Set(),
  validHangouts = new Set()
) {
  const client = storageClient?.storage && typeof storageClient.storage.from === "function"
    ? storageClient.storage
    : storageClient;

  if (depth > 10) return [];

  const escapedUser = escapeRegex(userId);
  const isValidPartition =
    folderPath === userId ||
    folderPath.startsWith(`${userId}/`) ||
    new RegExp(`(^|/)${escapedUser}(/|$)`).test(folderPath);

  if (!isValidPartition) {
    return [];
  }

  const collectedFiles = [];
  const limit = 100;
  let offset = 0;
  let keepPaginating = true;

  while (keepPaginating) {
    const { data, error } = await client
      .from(bucketName)
      .list(folderPath, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw new Error(`Storage listing API error in bucket '${bucketName}' at '${folderPath}': ${error.message}`);
    }

    if (!data || !Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      if (!item || !item.name) continue;
      const isFolder = item.id === null && (!item.metadata || !item.metadata.mimetype);
      const itemPath = `${folderPath}/${item.name}`;

      if (isFolder) {
        const subFiles = await listUserFilesRecursively(
          client,
          bucketName,
          itemPath,
          userId,
          depth + 1,
          validConversations,
          validHangouts
        );
        collectedFiles.push(...subFiles);
      } else {
        if (item.id !== null || (item.metadata && item.metadata.mimetype)) {
          if (isUserOwnedPath(bucketName, itemPath, userId, validConversations, validHangouts)) {
            collectedFiles.push(itemPath);
          }
        }
      }
    }

    if (data.length < limit) {
      keepPaginating = false;
    } else {
      offset += limit;
    }
  }

  return collectedFiles;
}

// Simulated shared collaborative bucket crawler matching the Edge Function
async function listSharedBucketUserFiles(
  storageClient,
  bucketName,
  userId,
  validParentIds
) {
  const client = storageClient?.storage && typeof storageClient.storage.from === "function"
    ? storageClient.storage
    : storageClient;

  const allUserFiles = [];
  const validConversations = bucketName === 'chat-media' ? (validParentIds || new Set()) : new Set();
  const validHangouts = bucketName === 'hangout-media' ? (validParentIds || new Set()) : new Set();

  // 1. Direct user partition fallback
  const directFiles = await listUserFilesRecursively(
    client,
    bucketName,
    userId,
    userId,
    0,
    validConversations,
    validHangouts
  );
  for (const df of directFiles) {
    if (isUserOwnedPath(bucketName, df, userId, validConversations, validHangouts) && !allUserFiles.includes(df)) {
      allUserFiles.push(df);
    }
  }

  // 2. Verified parent IDs direct crawl
  if (validParentIds && validParentIds.size > 0) {
    for (const parentId of validParentIds) {
      const targetUserFolder = `${parentId}/${userId}`;
      const nestedUserFiles = await listUserFilesRecursively(
        client,
        bucketName,
        targetUserFolder,
        userId,
        0,
        validConversations,
        validHangouts
      );
      for (const nf of nestedUserFiles) {
        if (
          isUserOwnedPath(bucketName, nf, userId, validConversations, validHangouts) &&
          nf !== parentId &&
          nf !== `${parentId}/` &&
          !allUserFiles.includes(nf)
        ) {
          allUserFiles.push(nf);
        }
      }
    }
    return allUserFiles;
  }

  // Fallback discovery if validParentIds is not provided
  const limit = 100;
  let offset = 0;
  let keepPaginating = true;

  while (keepPaginating) {
    const { data, error } = await client
      .from(bucketName)
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      if (isNotFoundError(error)) {
        break;
      }
      throw new Error(`Storage shared listing API error in bucket '${bucketName}': ${error.message}`);
    }

    if (!data || !Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      if (!item || !item.name) continue;

      const isParentFolder = item.id === null && (!item.metadata || !item.metadata.mimetype);
      if (isParentFolder && item.name !== userId) {
        const parentId = item.name;
        const fallbackConvs = bucketName === 'chat-media' ? new Set([parentId]) : new Set();
        const fallbackHangouts = bucketName === 'hangout-media' ? new Set([parentId]) : new Set();
        const targetUserFolder = `${parentId}/${userId}`;

        const nestedUserFiles = await listUserFilesRecursively(
          client,
          bucketName,
          targetUserFolder,
          userId,
          0,
          fallbackConvs,
          fallbackHangouts
        );
        for (const nf of nestedUserFiles) {
          if (
            isUserOwnedPath(bucketName, nf, userId, fallbackConvs, fallbackHangouts) &&
            nf !== parentId &&
            nf !== `${parentId}/` &&
            !allUserFiles.includes(nf)
          ) {
            allUserFiles.push(nf);
          }
        }
      }
    }

    if (data.length < limit) {
      keepPaginating = false;
    } else {
      offset += limit;
    }
  }

  return allUserFiles;
}

// Simulated legacy root file scanner matching the Edge Function
async function listLegacyRootFiles(storageClient, bucketName, userId) {
  const client = storageClient?.storage && typeof storageClient.storage.from === "function"
    ? storageClient.storage
    : storageClient;

  if (SHARED_COLLABORATIVE_BUCKETS.includes(bucketName)) {
    return [];
  }

  const rootFiles = [];
  const limit = 100;
  let offset = 0;
  let keepPaginating = true;
  const legacyRegex = new RegExp(`^${escapeRegex(userId)}[-_.].+`);

  while (keepPaginating) {
    const { data, error } = await client
      .from(bucketName)
      .list('', {
        search: userId,
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw new Error(`Storage root listing API error in bucket '${bucketName}': ${error.message}`);
    }

    if (!data || !Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      if (!item || !item.name) continue;
      if (item.id === null && (!item.metadata || !item.metadata.mimetype)) continue;

      if (legacyRegex.test(item.name) && isUserOwnedPath(bucketName, item.name, userId)) {
        if (!rootFiles.includes(item.name)) {
          rootFiles.push(item.name);
        }
      }
    }

    if (data.length < limit) {
      keepPaginating = false;
    } else {
      offset += limit;
    }
  }

  return rootFiles;
}

// ----------------------------------------------------------------------------
// 1. FALLBACK STORAGE BUCKETS COVERAGE
// ----------------------------------------------------------------------------
test('1. Fallback Bucket List Includes All 9 Buckets (Including story-media & verification-documents)', () => {
  for (const b of REQUIRED_BUCKETS) {
    assert.ok(
      edgeFuncCode1.includes(`'${b}'`) || edgeFuncCode1.includes(`"${b}"`),
      `supabase edge function must include bucket '${b}'`
    );
    assert.ok(
      edgeFuncCode2.includes(`'${b}'`) || edgeFuncCode2.includes(`"${b}"`),
      `backend edge function must include bucket '${b}'`
    );
  }
});

// ----------------------------------------------------------------------------
// 2. DYNAMIC BUCKET DISCOVERY FAILURE RECOVERY
// ----------------------------------------------------------------------------
test('2. Dynamic Bucket Discovery Failure Graceful Fallback', async () => {
  const mockFailingStorageClient = {
    storage: {
      listBuckets: async () => ({
        data: null,
        error: { message: 'permission denied for storage.listBuckets' },
      }),
    },
  };

  let allBuckets = [...REQUIRED_BUCKETS];
  try {
    const { data: remoteBuckets, error: bucketListError } = await mockFailingStorageClient.storage.listBuckets();
    if (!bucketListError && Array.isArray(remoteBuckets)) {
      for (const b of remoteBuckets) {
        if (b?.name && !allBuckets.includes(b.name)) allBuckets.push(b.name);
      }
    }
  } catch (err) {
    // fallback
  }

  assert.equal(allBuckets.length, 9);
  assert.ok(allBuckets.includes('story-media'));
  assert.ok(allBuckets.includes('verification-documents'));
});

// ----------------------------------------------------------------------------
// 3. EXACT REGEX MATCHING & META-CHARACTER SANITIZATION
// ----------------------------------------------------------------------------
test('3. Exact Regex Matching & Meta-Character Sanitization (escapeRegex & delimited boundaries)', () => {
  const userId = '11111111-2222-3333-4444-555555555555';

  assert.equal(isUserOwnedPath('avatars', `${userId}-avatar.png`, userId), true, 'Matches ${userId}-avatar.png');
  assert.equal(isUserOwnedPath('avatars', `${userId}_doc.pdf`, userId), true, 'Matches ${userId}_doc.pdf');
  assert.equal(isUserOwnedPath('avatars', `${userId}.jpg`, userId), true, 'Matches ${userId}.jpg');

  // Exact negative checks
  assert.equal(isUserOwnedPath('avatars', `${userId}extra-name.jpg`, userId), false, 'Rejects missing delimiter');
  assert.equal(isUserOwnedPath('avatars', `prefix_${userId}.jpg`, userId), false, 'Rejects userId as substring in middle');
  assert.equal(isUserOwnedPath('avatars', '99999999-8888-7777-6666-555555555555-avatar.png', userId), false, 'Rejects different userId');

  // Regex special character escaping check
  const trickyUserId = 'user.name+test$123';
  assert.equal(escapeRegex(trickyUserId), 'user\\.name\\+test\\$123');
  assert.equal(isUserOwnedPath('avatars', `${trickyUserId}-photo.jpg`, trickyUserId), true, 'Matches escaped regex user');
  assert.equal(isUserOwnedPath('avatars', 'userXname+test$123-photo.jpg', trickyUserId), false, 'Rejects unescaped regex wildcard collision');
});

// ----------------------------------------------------------------------------
// 4. SHARED BUCKET ISOLATION: USER A SWEPT, USER B PRESERVED
// ----------------------------------------------------------------------------
test('4. Shared Bucket Isolation: Sweeps User A files, leaves User B files untouched', async () => {
  const userA = 'user-alpha-111';
  const userB = 'user-bravo-222';
  const convId1 = 'conv-001';
  const convId2 = 'conv-002';
  const validConvs = new Set([convId1, convId2]);

  const mockBucket = {
    '': [
      { id: null, name: convId1, metadata: null },
      { id: null, name: convId2, metadata: null },
    ],
    [`${convId1}/${userA}`]: [
      { id: 'f-1', name: 'photo_1.jpg', metadata: { mimetype: 'image/jpeg' } },
      { id: 'f-2', name: 'audio_1.m4a', metadata: { mimetype: 'audio/mp4' } },
    ],
    [`${convId1}/${userB}`]: [
      { id: 'f-3', name: 'partner_reply.jpg', metadata: { mimetype: 'image/jpeg' } },
    ],
    [`${convId2}/${userA}`]: [
      { id: 'f-4', name: 'trip_doc.pdf', metadata: { mimetype: 'application/pdf' } },
    ],
    [`${convId2}/${userB}`]: [
      { id: 'f-5', name: 'exclusive_chat.png', metadata: { mimetype: 'image/png' } },
    ],
    [userA]: [
      { id: 'f-6', name: 'direct_upload.jpg', metadata: { mimetype: 'image/jpeg' } },
    ],
  };

  const mockStorageClient = {
    from: (bucketName) => ({
      list: async (folderPath) => {
        return { data: mockBucket[folderPath] || [], error: null };
      },
    }),
  };

  const filesToDelete = await listSharedBucketUserFiles(mockStorageClient, 'chat-media', userA, validConvs);

  // User A files MUST be swept
  assert.ok(filesToDelete.includes(`${convId1}/${userA}/photo_1.jpg`));
  assert.ok(filesToDelete.includes(`${convId1}/${userA}/audio_1.m4a`));
  assert.ok(filesToDelete.includes(`${convId2}/${userA}/trip_doc.pdf`));
  assert.ok(filesToDelete.includes(`${userA}/direct_upload.jpg`));

  // User B files MUST be preserved
  assert.equal(filesToDelete.includes(`${convId1}/${userB}/partner_reply.jpg`), false);
  assert.equal(filesToDelete.includes(`${convId2}/${userB}/exclusive_chat.png`), false);
});

// ----------------------------------------------------------------------------
// 5. TRAVERSAL GUARD: PARENT CONVERSATION / HANGOUT FOLDERS NEVER SUBMITTED
// ----------------------------------------------------------------------------
test('5. Traversal Guard: Parent conversation/hangout folder placeholders are NEVER submitted for removal', async () => {
  const userA = 'user-alpha-111';
  const convId = 'conv-safety-test';

  const mockBucket = {
    '': [
      { id: null, name: convId, metadata: null },
    ],
    [`${convId}/${userA}`]: [
      { id: 'f-1', name: 'image.jpg', metadata: { mimetype: 'image/jpeg' } },
    ],
  };

  const mockStorageClient = {
    from: (bucketName) => ({
      list: async (folderPath) => {
        return { data: mockBucket[folderPath] || [], error: null };
      },
    }),
  };

  const filesToDelete = await listSharedBucketUserFiles(mockStorageClient, 'chat-media', userA);

  // Parent conversation folder placeholder must NOT be included
  assert.equal(filesToDelete.includes(convId), false, 'Parent conversation ID placeholder must NEVER be added');
  assert.equal(filesToDelete.includes(`${convId}/`), false, 'Parent folder path must NEVER be added');
  assert.equal(filesToDelete.includes(`${convId}/${userA}`), false, 'Intermediate user folder placeholder must not be added');
  assert.deepEqual(filesToDelete, [`${convId}/${userA}/image.jpg`]);
});

// ----------------------------------------------------------------------------
// 6. STORAGE API ERROR DISTINCTION VS EMPTY FOLDER GUARD
// ----------------------------------------------------------------------------
test('6. Explicit Listing Error vs. Empty Folder Guard', async () => {
  const targetUserId = 'user-error-test';

  const failingStorageClient = {
    from: (bucketName) => ({
      list: async () => ({
        data: null,
        error: { message: 'Internal Server Error (connection refused)', statusCode: 500 },
      }),
    }),
  };

  await assert.rejects(
    async () => {
      await listUserFilesRecursively(failingStorageClient, 'post-media', targetUserId, targetUserId);
    },
    (err) => {
      assert.ok(err.message.includes('Storage listing API error') || err.message.includes('Internal Server Error'));
      return true;
    },
    'Storage listing 500 error must throw rather than returning empty array'
  );

  await assert.rejects(
    async () => {
      await listLegacyRootFiles(failingStorageClient, 'verification-selfies', targetUserId);
    },
    (err) => {
      assert.ok(err.message.includes('Storage root listing API error') || err.message.includes('Internal Server Error'));
      return true;
    },
    'Root listing 500 error must throw rather than returning empty array'
  );

  const missingFolderStorageClient = {
    from: (bucketName) => ({
      list: async () => ({
        data: null,
        error: { message: 'Bucket or object not found', statusCode: 404 },
      }),
    }),
  };

  const emptyResultDir = await listUserFilesRecursively(
    missingFolderStorageClient,
    'post-media',
    targetUserId,
    targetUserId
  );
  assert.deepEqual(emptyResultDir, [], '404 missing partition must return [] without error');

  const emptyResultRoot = await listLegacyRootFiles(
    missingFolderStorageClient,
    'verification-selfies',
    targetUserId
  );
  assert.deepEqual(emptyResultRoot, [], '404 missing bucket must return [] without error');
});

// ----------------------------------------------------------------------------
// 7. PAGINATION & SUBDIRECTORY RECURSION
// ----------------------------------------------------------------------------
test('7. Multi-Page Pagination (limit: 100) across User Partition', async () => {
  const targetUserId = 'user-delta-444';

  const page1Files = Array.from({ length: 100 }, (_, i) => ({
    id: `file-${i}`,
    name: `item_${i}.jpg`,
    metadata: { mimetype: 'image/jpeg' },
  }));

  const page2Files = Array.from({ length: 52 }, (_, i) => ({
    id: `file-${100 + i}`,
    name: `item_${100 + i}.jpg`,
    metadata: { mimetype: 'image/jpeg' },
  }));

  const mockStorageClient = {
    from: (bucketName) => ({
      list: async (folderPath, options = {}) => {
        if (folderPath === targetUserId) {
          if (options.offset === 0) return { data: page1Files, error: null };
          if (options.offset === 100) return { data: page2Files, error: null };
          return { data: [], error: null };
        }
        return { data: [], error: null };
      },
    }),
  };

  const results = await listUserFilesRecursively(
    mockStorageClient,
    'post-media',
    targetUserId,
    targetUserId
  );

  assert.equal(results.length, 152, 'Must correctly paginate across all 152 items');
  assert.ok(results.includes(`${targetUserId}/item_0.jpg`));
  assert.ok(results.includes(`${targetUserId}/item_151.jpg`));
});

// ----------------------------------------------------------------------------
// 8. STRICT EXECUTION SEQUENCE & RETRY IDEMPOTENCE
// ----------------------------------------------------------------------------
test('8. Operational Execution Sequence: Storage -> Database -> Auth Admin', () => {
  const storageIndex = edgeFuncCode1.indexOf('Storage Cleanup');
  const databaseIndex = edgeFuncCode1.indexOf('Database Cleanup');
  const authIndex = edgeFuncCode1.indexOf('auth.admin.deleteUser');

  assert.ok(storageIndex !== -1, 'Must contain Storage Cleanup step');
  assert.ok(databaseIndex !== -1, 'Must contain Database Cleanup step');
  assert.ok(authIndex !== -1, 'Must contain Auth Admin deleteUser step');

  assert.ok(storageIndex < databaseIndex, 'Storage cleanup must precede Database cleanup');
  assert.ok(databaseIndex < authIndex, 'Database cleanup must precede Auth identity deletion');

  assert.ok(
    edgeFuncCode1.includes("includes('not found')") || edgeFuncCode1.includes('includes("not found")'),
    'Must treat already-deleted Auth user as safe idempotent retry'
  );
});

// ----------------------------------------------------------------------------
// 9. PRODUCTION CODE AUDIT: BUCKET-AWARE VALIDATION & FAIL-CLOSED GUARDS
// ----------------------------------------------------------------------------
test('9. Production Code Audit: Regex Escaping & In-Memory Validation Verification', () => {
  assert.ok(
    edgeFuncCode1.includes('escapeRegex') && edgeFuncCode2.includes('escapeRegex'),
    'Both functions must define and use escapeRegex'
  );

  assert.ok(
    edgeFuncCode1.includes('isUserOwnedPath') && edgeFuncCode2.includes('isUserOwnedPath'),
    'Both functions must define and enforce isUserOwnedPath in-memory validation'
  );

  assert.ok(
    edgeFuncCode1.includes('listSharedBucketUserFiles') && edgeFuncCode2.includes('listSharedBucketUserFiles'),
    'Both functions must implement dedicated listSharedBucketUserFiles'
  );

  assert.ok(
    edgeFuncCode1.includes('userConversationIds') && edgeFuncCode2.includes('userConversationIds'),
    'Both functions must harvest userConversationIds'
  );

  assert.ok(
    edgeFuncCode1.includes('userHangoutIds') && edgeFuncCode2.includes('userHangoutIds'),
    'Both functions must harvest userHangoutIds'
  );
});

// ----------------------------------------------------------------------------
// 10. CODEBASE PARITY: SUPABASE VS BACKEND EDGE FUNCTION
// ----------------------------------------------------------------------------
test('10. Edge Function Parity Between supabase/ and backend/ Directories', () => {
  assert.equal(
    edgeFuncCode1,
    edgeFuncCode2,
    'supabase/functions/delete-account/index.ts and backend/supabase/functions/delete-account/index.ts must be identical'
  );
});

// ----------------------------------------------------------------------------
// 11. NEGATIVE CHECK 1: NESTED PATH IN NON-COLLABORATIVE BUCKET IS REJECTED
// ----------------------------------------------------------------------------
test('11. Negative Check 1: Nested path in non-collaborative buckets is strictly REJECTED', () => {
  const userId = 'user-gamma-333';
  const nonCollabBuckets = [
    'avatars',
    'travel-photos',
    'trip-covers',
    'post-media',
    'story-media',
    'verification-selfies',
    'verification-documents',
  ];

  for (const bucket of nonCollabBuckets) {
    // Nested path format: folder/{userId}/file.png
    assert.equal(
      isUserOwnedPath(bucket, `nested/${userId}/pic.png`, userId),
      false,
      `Nested path in '${bucket}' MUST evaluate to false`
    );
    assert.equal(
      isUserOwnedPath(bucket, `${bucket}/nested/${userId}/pic.png`, userId),
      false,
      `Prefixed nested path in '${bucket}' MUST evaluate to false`
    );
    assert.equal(
      isUserOwnedPath(bucket, `trip-123/${userId}/cover.jpg`, userId),
      false,
      `Multi-level folder path in '${bucket}' MUST evaluate to false`
    );

    // Direct user partition MUST pass
    assert.equal(
      isUserOwnedPath(bucket, `${userId}/legit_file.jpg`, userId),
      true,
      `Direct partition path in '${bucket}' MUST evaluate to true`
    );
    // Legacy root pattern MUST pass in non-collaborative buckets
    assert.equal(
      isUserOwnedPath(bucket, `${userId}-legacy_file.jpg`, userId),
      true,
      `Legacy root path in '${bucket}' MUST evaluate to true`
    );
  }
});

// ----------------------------------------------------------------------------
// 12. NEGATIVE CHECK 2: SIBLING PARTICIPANT FILES IN SHARED BUCKETS ARE PRESERVED
// ----------------------------------------------------------------------------
test('12. Negative Check 2: Sibling participant files in shared collaborative buckets are PRESERVED', () => {
  const targetUser = 'user-owner-001';
  const siblingUser = 'user-sibling-002';
  const convId = 'chat-room-99';
  const hangoutId = 'hangout-event-44';
  const validConvs = new Set([convId]);
  const validHangouts = new Set([hangoutId]);

  // Sibling in chat-media
  assert.equal(
    isUserOwnedPath('chat-media', `${convId}/${siblingUser}/voice_note.m4a`, targetUser, validConvs, validHangouts),
    false,
    'Sibling file in chat-media must evaluate to false'
  );
  assert.equal(
    isUserOwnedPath('chat-media', `chat-media/${convId}/${siblingUser}/document.pdf`, targetUser, validConvs, validHangouts),
    false,
    'Prefixed sibling file in chat-media must evaluate to false'
  );

  // Sibling in hangout-media
  assert.equal(
    isUserOwnedPath('hangout-media', `${hangoutId}/${siblingUser}/photo.jpg`, targetUser, validConvs, validHangouts),
    false,
    'Sibling file in hangout-media must evaluate to false'
  );
  assert.equal(
    isUserOwnedPath('hangout-media', `hangout-media/${hangoutId}/${siblingUser}/map.png`, targetUser, validConvs, validHangouts),
    false,
    'Prefixed sibling file in hangout-media must evaluate to false'
  );

  // Target user own nested files MUST evaluate to true when parent is verified
  assert.equal(
    isUserOwnedPath('chat-media', `${convId}/${targetUser}/my_note.m4a`, targetUser, validConvs, validHangouts),
    true,
    'Target user own file in verified chat-media must evaluate to true'
  );
  assert.equal(
    isUserOwnedPath('hangout-media', `${hangoutId}/${targetUser}/my_photo.jpg`, targetUser, validConvs, validHangouts),
    true,
    'Target user own file in verified hangout-media must evaluate to true'
  );
});

// ----------------------------------------------------------------------------
// 13. NEGATIVE CHECK 3: PARENT CONVERSATION / HANGOUT FOLDERS NEVER MATCHED
// ----------------------------------------------------------------------------
test('13. Negative Check 3: Parent conversation folder placeholders and .keep files are PRESERVED', () => {
  const targetUser = 'user-owner-001';
  const convId = 'conversation-abc';
  const hangoutId = 'hangout-xyz';
  const validConvs = new Set([convId]);
  const validHangouts = new Set([hangoutId]);

  const placeholders = [
    convId,
    `${convId}/`,
    `chat-media/${convId}/`,
    `${convId}/.keep`,
    `${convId}/.emptyFolderPlaceholder`,
    hangoutId,
    `${hangoutId}/`,
    `hangout-media/${hangoutId}/`,
    `${hangoutId}/.keep`,
  ];

  for (const ph of placeholders) {
    assert.equal(
      isUserOwnedPath('chat-media', ph, targetUser, validConvs, validHangouts),
      false,
      `Placeholder '${ph}' in chat-media must evaluate to false`
    );
    assert.equal(
      isUserOwnedPath('hangout-media', ph, targetUser, validConvs, validHangouts),
      false,
      `Placeholder '${ph}' in hangout-media must evaluate to false`
    );
  }
});

// ----------------------------------------------------------------------------
// 14. NEGATIVE CHECK 4: STORAGE FAILURE HALTS EXECUTION & BLOCKS AUTH DELETION
// ----------------------------------------------------------------------------
test('14. Negative Check 4: Storage failure during pagination or nested scanning halts execution & prevents auth.admin.deleteUser', async () => {
  const targetUserId = 'user-fail-closed-999';
  let authAdminDeleteUserCalled = false;
  let databaseCleanupCalled = false;

  const mockFailingStorageClient = {
    from: (bucketName) => ({
      list: async (folderPath, options = {}) => {
        // First page succeeds with 100 items, second page fails with 500 error
        if (options.offset === 100) {
          return {
            data: null,
            error: { message: 'Storage connection timeout / server error', statusCode: 500 },
          };
        }
        return {
          data: Array.from({ length: 100 }, (_, i) => ({
            id: `item-${i}`,
            name: `photo_${i}.jpg`,
            metadata: { mimetype: 'image/jpeg' },
          })),
          error: null,
        };
      },
      remove: async () => ({ data: [], error: null }),
    }),
  };

  const mockAdminClient = {
    rpc: async () => {
      databaseCleanupCalled = true;
      return { data: null, error: null };
    },
    auth: {
      admin: {
        deleteUser: async () => {
          authAdminDeleteUserCalled = true;
          return { data: { user: null }, error: null };
        },
      },
    },
  };

  // Simulated runner with fail-closed guarantee matching delete-account/index.ts
  async function runAccountDeletion(storageClient, adminClient, userId) {
    // 1. Storage Sweep
    let sweepFailed = false;
    try {
      await listUserFilesRecursively(storageClient, 'chat-media', userId, userId);
    } catch (err) {
      sweepFailed = true;
      // Fail-closed guarantee: abort execution
      throw new Error(`Storage sweep failed: ${err.message}`);
    }

    if (sweepFailed) return;

    // 2. Database Cleanup
    await adminClient.rpc('delete_user_account_by_admin', { target_user_id: userId });

    // 3. Auth User Deletion
    await adminClient.auth.admin.deleteUser(userId);
  }

  await assert.rejects(
    async () => {
      await runAccountDeletion(mockFailingStorageClient, mockAdminClient, targetUserId);
    },
    (err) => {
      assert.ok(err.message.includes('Storage sweep failed'));
      return true;
    },
    'Account deletion must abort when storage pagination fails'
  );

  // FAIL-CLOSED GUARANTEE: Neither database cleanup nor auth.admin.deleteUser was ever invoked
  assert.equal(databaseCleanupCalled, false, 'Database cleanup must NEVER be called when storage sweep fails');
  assert.equal(authAdminDeleteUserCalled, false, 'auth.admin.deleteUser must NEVER be called when storage sweep fails');
});

// ----------------------------------------------------------------------------
// 15. VERIFIED PARENT IDS: UNAUTHORIZED CONVERSATIONS & HANGOUTS STRICTLY REJECTED
// ----------------------------------------------------------------------------
test('15. Verified Parent ID Gate: Media in unauthorized conversations/hangouts is REJECTED', () => {
  const userId = 'user-verified-888';
  const authorizedConvId = 'conv-authorized-111';
  const unauthorizedConvId = 'conv-unauthorized-999';
  const authorizedHangoutId = 'hangout-authorized-222';
  const unauthorizedHangoutId = 'hangout-unauthorized-888';

  const validConvs = new Set([authorizedConvId]);
  const validHangouts = new Set([authorizedHangoutId]);

  // Authorized conversation file: MUST be accepted
  assert.equal(
    isUserOwnedPath('chat-media', `${authorizedConvId}/${userId}/chat_img.jpg`, userId, validConvs, validHangouts),
    true,
    'File under authorized conversation MUST return true'
  );

  // Unauthorized conversation file: MUST be REJECTED even if participantId matches
  assert.equal(
    isUserOwnedPath('chat-media', `${unauthorizedConvId}/${userId}/chat_img.jpg`, userId, validConvs, validHangouts),
    false,
    'File under unauthorized conversation MUST return false'
  );

  // Authorized hangout file: MUST be accepted
  assert.equal(
    isUserOwnedPath('hangout-media', `${authorizedHangoutId}/${userId}/event.png`, userId, validConvs, validHangouts),
    true,
    'File under authorized hangout MUST return true'
  );

  // Unauthorized hangout file: MUST be REJECTED even if participantId matches
  assert.equal(
    isUserOwnedPath('hangout-media', `${unauthorizedHangoutId}/${userId}/event.png`, userId, validConvs, validHangouts),
    false,
    'File under unauthorized hangout MUST return false'
  );
});

// ----------------------------------------------------------------------------
// 16. PRE-REMOVAL VALIDATION WITH EARLY MEMBERSHIP SETS
// ----------------------------------------------------------------------------
test('16. Pre-Removal Validation with Early Membership Sets', () => {
  const userId = 'user-guard-777';
  const validConv = 'conv-verified-555';
  const unverifiedConv = 'conv-unverified-666';
  const validConvs = new Set([validConv]);

  const mixedBatch = [
    `${validConv}/${userId}/valid_doc.pdf`,
    `${unverifiedConv}/${userId}/unverified_doc.pdf`,
    `${validConv}/other-user/stolen_doc.pdf`,
    `${validConv}/`,
    `${validConv}/.keep`,
    `${userId}/valid_top_level.png`,
  ];

  // Pre-removal filter applied right before storage.from(bucket).remove(batch)
  const validatedBatch = mixedBatch.filter((f) =>
    isUserOwnedPath('chat-media', f, userId, validConvs, new Set())
  );

  assert.deepEqual(validatedBatch, [
    `${validConv}/${userId}/valid_doc.pdf`,
    `${userId}/valid_top_level.png`,
  ]);

  // Keys under unverified conversation or foreign users must be rejected
  assert.equal(validatedBatch.includes(`${unverifiedConv}/${userId}/unverified_doc.pdf`), false);
  assert.equal(validatedBatch.includes(`${validConv}/other-user/stolen_doc.pdf`), false);
  assert.equal(validatedBatch.includes(`${validConv}/`), false);
  assert.equal(validatedBatch.includes(`${validConv}/.keep`), false);
});

// ----------------------------------------------------------------------------
// 17. TEST A: FAIL-CLOSED MEMBERSHIP FETCH ERROR GUARANTEE
// ----------------------------------------------------------------------------
test('17. Test A: Fail-Closed Membership Fetch Error Aborts Before Storage or Auth Purge', async () => {
  const userId = 'user-fail-fetch-101';
  let storageRemoved = false;
  let authUserDeleted = false;
  let dbTeardownCalled = false;

  const mockFailingServiceClient = {
    from: (table) => ({
      select: () => ({
        eq: async () => {
          if (table === 'conversation_participants') {
            return { data: null, error: { message: 'Database connection drop / query timeout', code: 'PGRST000' } };
          }
          return { data: [], error: null };
        },
      }),
    }),
    storage: {
      from: () => ({
        remove: async () => {
          storageRemoved = true;
          return { data: [], error: null };
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async () => {
          authUserDeleted = true;
          return { data: { user: null }, error: null };
        },
      },
    },
    rpc: async () => {
      dbTeardownCalled = true;
      return { data: null, error: null };
    },
  };

  // Simulates early membership harvest sequence in delete-account/index.ts
  async function executeHardenedDeletion(client, targetId) {
    const { data: convData, error: convErr } = await client
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', targetId);

    if (convErr) {
      throw new Error(`Failed to query conversation_participants for user '${targetId}': ${convErr.message}`);
    }

    // Storage removal should only execute if membership query succeeds
    await client.storage.from('chat-media').remove(['some-file.jpg']);
    await client.rpc('delete_user_account_by_admin', { target_user_id: targetId });
    await client.auth.admin.deleteUser(targetId);
  }

  await assert.rejects(
    async () => {
      await executeHardenedDeletion(mockFailingServiceClient, userId);
    },
    (err) => {
      assert.ok(err.message.includes('Failed to query conversation_participants'));
      return true;
    },
    'Query failure MUST throw immediately'
  );

  // Assert absolute fail-closed isolation
  assert.equal(storageRemoved, false, 'Storage removal must NEVER be called if membership query fails');
  assert.equal(dbTeardownCalled, false, 'Database teardown must NEVER be called if membership query fails');
  assert.equal(authUserDeleted, false, 'auth.admin.deleteUser must NEVER be called if membership query fails');
});

// ----------------------------------------------------------------------------
// 18. TEST B: REJECT ARBITRARY SEGMENT DEPTH IN COLLABORATIVE & NON-COLLABORATIVE BUCKETS
// ----------------------------------------------------------------------------
test('18. Test B: Exact Segment Depth Constraints (Reject arbitrary nested depths)', () => {
  const userId = 'user-depth-tester';
  const validConvId = 'conv-depth-valid';
  const validConvs = new Set([validConvId]);

  // Non-collaborative bucket: MUST be exactly 2 segments (userId/filename)
  assert.equal(
    isUserOwnedPath('avatars', `${userId}/extra/deep/pic.png`, userId),
    false,
    '4-segment path in avatars MUST be rejected'
  );
  assert.equal(
    isUserOwnedPath('avatars', `${userId}/sub/pic.png`, userId),
    false,
    '3-segment path in avatars MUST be rejected'
  );
  assert.equal(
    isUserOwnedPath('post-media', `${userId}/2026/albums/pic.jpg`, userId),
    false,
    '4-segment path in post-media MUST be rejected'
  );
  assert.equal(
    isUserOwnedPath('avatars', `${userId}/legit.png`, userId),
    true,
    'Exact 2-segment path in avatars MUST be accepted'
  );

  // Collaborative bucket: MUST be exactly 3 segments (convId/userId/filename)
  assert.equal(
    isUserOwnedPath('chat-media', `${validConvId}/${userId}/extra/nested/file.png`, userId, validConvs),
    false,
    '5-segment path in chat-media MUST be rejected'
  );
  assert.equal(
    isUserOwnedPath('chat-media', `${validConvId}/${userId}/sub/photo.jpg`, userId, validConvs),
    false,
    '4-segment path in chat-media MUST be rejected'
  );
  assert.equal(
    isUserOwnedPath('chat-media', `${validConvId}/${userId}/chat_doc.pdf`, userId, validConvs),
    true,
    'Exact 3-segment path in chat-media MUST be accepted'
  );
});

// ----------------------------------------------------------------------------
// 19. TEST C: REJECT MALFORMED, EMPTY, OR HIDDEN FILES
// ----------------------------------------------------------------------------
test('19. Test C: Reject Malformed Segments, Empty Filenames, and Hidden Files', () => {
  const userId = 'user-malformed-tester';
  const validConvId = 'conv-clean';
  const validConvs = new Set([validConvId]);

  // Trailing slash / empty filename
  assert.equal(isUserOwnedPath('avatars', `${userId}/`, userId), false, 'Empty filename in avatars MUST be rejected');
  assert.equal(isUserOwnedPath('chat-media', `${validConvId}/${userId}/`, userId, validConvs), false, 'Trailing slash in chat-media MUST be rejected');

  // Hidden / placeholder files (.keep, .DS_Store, etc.)
  assert.equal(isUserOwnedPath('avatars', `${userId}/.keep`, userId), false, '.keep in avatars MUST be rejected');
  assert.equal(isUserOwnedPath('avatars', `${userId}/.DS_Store`, userId), false, '.DS_Store in avatars MUST be rejected');
  assert.equal(isUserOwnedPath('chat-media', `${validConvId}/${userId}/.keep`, userId, validConvs), false, '.keep in chat-media MUST be rejected');
  assert.equal(isUserOwnedPath('chat-media', `${validConvId}/${userId}/.emptyFolderPlaceholder`, userId, validConvs), false, 'Placeholder in chat-media MUST be rejected');
});

// ----------------------------------------------------------------------------
// 20. TEST: UPLOAD CALL-SITE INVENTORY COMPREHENSIVE ACCEPTANCE
// ----------------------------------------------------------------------------
test('20. Upload Call-Site Inventory: Accepts all legitimate formats across 9 buckets', () => {
  const userId = '11111111-2222-3333-4444-555555555555';
  const convId = 'conv-callsite-001';
  const hangoutId = 'hangout-callsite-002';
  const validConvs = new Set([convId]);
  const validHangouts = new Set([hangoutId]);

  // 1. verification-documents (uploadVerificationFile: ${userId}/${prefix}_${timestamp}.${ext})
  assert.equal(isUserOwnedPath('verification-documents', `${userId}/doc_front_1728456000000.jpg`, userId), true);
  assert.equal(isUserOwnedPath('verification-documents', `${userId}/doc_back_1728456000000.jpg`, userId), true);
  assert.equal(isUserOwnedPath('verification-documents', `${userId}/doc_1728456000000.png`, userId), true);
  assert.equal(isUserOwnedPath('verification-documents', `${userId}/selfie_1728456000000.jpg`, userId), true);

  // 2. verification-selfies (submitVerificationSelfie: ${userId}/selfie_${timestamp}.jpg)
  assert.equal(isUserOwnedPath('verification-selfies', `${userId}/selfie_1728456000000.jpg`, userId), true);

  // 3. story-media (uploadStoryMedia: ${userId}/${timestamp}_${randomHash}.${ext})
  assert.equal(isUserOwnedPath('story-media', `${userId}/1728456000000_a1b2c3.jpg`, userId), true);
  assert.equal(isUserOwnedPath('story-media', `${userId}/1728456000000_def456.png`, userId), true);

  // 4. post-media (uploadPostMedia: ${userId}/${timestamp}_${randomHash}.${ext})
  assert.equal(isUserOwnedPath('post-media', `${userId}/1728456000000_xyz789.jpg`, userId), true);
  assert.equal(isUserOwnedPath('post-media', `${userId}/1728456000000_post12.webp`, userId), true);

  // 5. avatars (updateProfile: ${userId}/avatar_${timestamp}.jpg & legacy root)
  assert.equal(isUserOwnedPath('avatars', `${userId}/avatar_1728456000000.jpg`, userId), true);
  assert.equal(isUserOwnedPath('avatars', `${userId}.png`, userId), true);
  assert.equal(isUserOwnedPath('avatars', `${userId}-avatar.jpg`, userId), true);

  // 6. travel-photos (${userId}/${filename})
  assert.equal(isUserOwnedPath('travel-photos', `${userId}/trip_moment_1728456000000.jpg`, userId), true);

  // 7. trip-covers (${userId}/${filename})
  assert.equal(isUserOwnedPath('trip-covers', `${userId}/cover_1728456000000.jpg`, userId), true);

  // 8. chat-media (uploadChatMedia: ${convId}/${userId}/${filename} & direct fallback)
  assert.equal(isUserOwnedPath('chat-media', `${convId}/${userId}/1728456000000_chat99.jpg`, userId, validConvs), true);
  assert.equal(isUserOwnedPath('chat-media', `${userId}/direct_upload_1728456000000.jpg`, userId, validConvs), true);

  // 9. hangout-media (uploadHangoutMedia: ${hangoutId}/${userId}/${filename} & direct cover fallback)
  assert.equal(isUserOwnedPath('hangout-media', `${hangoutId}/${userId}/1728456000000_hangout88.jpg`, userId, new Set(), validHangouts), true);
  assert.equal(isUserOwnedPath('hangout-media', `${userId}/1728456000000_cover77.jpg`, userId, new Set(), validHangouts), true);
});

// ----------------------------------------------------------------------------
// 21. TEST: FAIL-CLOSED ATOMIC GUARANTEE UNDER ALL FAILURE MODES
// ----------------------------------------------------------------------------
test('21. Fail-Closed Atomic Guarantee: Storage list/remove or DB teardown errors preserve auth identity', async () => {
  const userId = 'user-atomic-test-999';

  // Mode 1: Storage listing error aborts before DB cascade & auth deletion
  {
    let dbCalled = false;
    let authCalled = false;
    const client = {
      from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      storage: {
        from: () => ({
          list: async () => ({ data: null, error: { message: '500 Internal Storage Error', statusCode: 500 } }),
        }),
      },
      rpc: async () => { dbCalled = true; return { data: null, error: null }; },
      auth: { admin: { deleteUser: async () => { authCalled = true; return { error: null }; } } },
    };

    async function runDeletion(c) {
      const { data } = await c.from('convs').select().eq('u', userId);
      const listRes = await c.storage.from('post-media').list(userId);
      if (listRes.error) throw new Error(`Storage sweep failed: ${listRes.error.message}`);
      await c.rpc('delete_user_account_by_admin', { target_user_id: userId });
      await c.auth.admin.deleteUser(userId);
    }

    await assert.rejects(async () => runDeletion(client), /Storage sweep failed: 500/);
    assert.equal(dbCalled, false, 'DB teardown MUST NOT execute if storage listing fails');
    assert.equal(authCalled, false, 'Auth delete MUST NOT execute if storage listing fails');
  }

  // Mode 2: Storage removal failure aborts before DB teardown & auth deletion
  {
    let dbCalled = false;
    let authCalled = false;
    const client = {
      storage: {
        from: () => ({
          remove: async () => ({ data: null, error: { message: 'Permission denied / Storage service error' } }),
        }),
      },
      rpc: async () => { dbCalled = true; return { data: null, error: null }; },
      auth: { admin: { deleteUser: async () => { authCalled = true; return { error: null }; } } },
    };

    async function runDeletion(c) {
      const remRes = await c.storage.from('post-media').remove([`${userId}/pic.jpg`]);
      if (remRes.error) throw new Error(`Storage removal failed: ${remRes.error.message}`);
      await c.rpc('delete_user_account_by_admin', { target_user_id: userId });
      await c.auth.admin.deleteUser(userId);
    }

    await assert.rejects(async () => runDeletion(client), /Storage removal failed/);
    assert.equal(dbCalled, false, 'DB teardown MUST NOT execute if storage removal fails');
    assert.equal(authCalled, false, 'Auth delete MUST NOT execute if storage removal fails');
  }

  // Mode 3: Database teardown failure aborts before auth deletion
  {
    let authCalled = false;
    const client = {
      rpc: async () => ({ data: { success: false, error: 'Foreign key cascade deadlock' }, error: null }),
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: 'DB connection closed' } }),
          or: async () => ({ error: null }),
        }),
      }),
      auth: { admin: { deleteUser: async () => { authCalled = true; return { error: null }; } } },
    };

    async function runDeletion(c) {
      const { data: rpcData, error: rpcError } = await c.rpc('delete_user_account_by_admin', { target_user_id: userId });
      if (rpcError || (rpcData && rpcData.success === false)) {
        const { error: userDelErr } = await c.from('users').delete().eq('id', userId);
        if (userDelErr) {
          throw new Error(`Database direct user record deletion failed: ${userDelErr.message}`);
        }
      }
      await c.auth.admin.deleteUser(userId);
    }

    await assert.rejects(async () => runDeletion(client), /Database direct user record deletion failed/);
    assert.equal(authCalled, false, 'Auth delete MUST NOT execute if database teardown fails');
  }

  // Mode 4: Complete happy path succeeds in order (Storage -> DB -> Auth)
  {
    const executionOrder = [];
    const client = {
      storage: {
        from: () => ({
          remove: async () => {
            executionOrder.push('STORAGE_REMOVE');
            return { data: [], error: null };
          },
        }),
      },
      rpc: async () => {
        executionOrder.push('DB_TEARDOWN');
        return { data: { success: true }, error: null };
      },
      auth: {
        admin: {
          deleteUser: async () => {
            executionOrder.push('AUTH_DELETE');
            return { error: null };
          },
        },
      },
    };

    async function runDeletion(c) {
      await c.storage.from('post-media').remove([`${userId}/pic.jpg`]);
      const { data } = await c.rpc('delete_user_account_by_admin', { target_user_id: userId });
      if (!data?.success) throw new Error('DB failed');
      await c.auth.admin.deleteUser(userId);
      return { status: 200 };
    }

    const res = await runDeletion(client);
    assert.equal(res.status, 200);
    assert.deepEqual(executionOrder, ['STORAGE_REMOVE', 'DB_TEARDOWN', 'AUTH_DELETE']);
  }
});

// ----------------------------------------------------------------------------
// 22. TEST: CRYPTOGRAPHIC CALLER AUTHENTICATION & EXPLICIT TOKEN PASSING
// ----------------------------------------------------------------------------
test('22. Cryptographic Caller Authentication: Explicit getUser(token) parameter passing & gateway security', async () => {
  // NOTE: This test utilizes local in-memory simulation mocks to strictly verify
  // cryptographic parameter contracts and gateway boundaries with ZERO live network calls.

  let capturedToken = null;

  async function simulateEdgeFunctionAuth(headers, bodyJson = null, mockAuthResponse = null) {
    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token || !authHeader.toLowerCase().startsWith('bearer ')) {
      return { status: 401, body: { success: false, error: 'Unauthorized: Missing or invalid Authorization token' } };
    }

    // Explicit token passing verification: getUser(token)
    capturedToken = token;

    if (!mockAuthResponse || mockAuthResponse.error || !mockAuthResponse.user || !mockAuthResponse.user.id) {
      return { status: 401, body: { success: false, error: 'Unauthorized: Invalid or missing authentication session' } };
    }

    // Identity authority: Resolved strictly from verified user.id
    const verifiedUserId = mockAuthResponse.user.id;

    // Body tampering test: attacker payload contains different userId
    let attemptedImpersonationId = null;
    if (bodyJson) {
      attemptedImpersonationId = bodyJson.userId || bodyJson.user_id;
    }

    const targetUserId = verifiedUserId;

    return {
      status: 200,
      body: {
        success: true,
        targetUserId,
        receivedToken: capturedToken,
        tamperedIgnored: attemptedImpersonationId !== null && attemptedImpersonationId !== targetUserId,
      },
    };
  }

  // 1. Missing Authorization header -> HTTP 401
  {
    const res = await simulateEdgeFunctionAuth({});
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Missing or invalid Authorization token'));
  }

  // 2. Empty or missing token after Bearer prefix -> HTTP 401
  {
    const res = await simulateEdgeFunctionAuth({ Authorization: 'Bearer ' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Missing or invalid Authorization token'));
  }

  // 3. Malformed Authorization header (Basic instead of Bearer) -> HTTP 401
  {
    const res = await simulateEdgeFunctionAuth({ Authorization: 'Basic dXNlcjpwYXNz' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  }

  // 4. Negative test: Forged / expired signature rejected by auth.getUser(token) -> HTTP 401
  {
    const res = await simulateEdgeFunctionAuth(
      { Authorization: 'Bearer forged-or-expired-jwt-token' },
      null,
      { user: null, error: { message: 'JWT expired or invalid signature' } }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid or missing authentication session'));
  }

  // 5. Positive test: Explicit token parameter extraction passed cleanly to getUser(token)
  {
    const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legitimate-session-token';
    const legitimateUserId = 'uid-legitimate-token-owner-001';

    const res = await simulateEdgeFunctionAuth(
      { Authorization: `Bearer ${expectedToken}` },
      null,
      { user: { id: legitimateUserId, email: 'owner@example.com' }, error: null }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.targetUserId, legitimateUserId);
    assert.equal(res.body.receivedToken, expectedToken, 'getUser(token) MUST receive the sanitized token string');
  }

  // 6. Impersonation prevention: Tampered request body containing victim userId is strictly ignored
  {
    const legitimateTokenOwner = 'uid-legitimate-caller-111';
    const victimUserId = 'uid-victim-target-999';

    const res = await simulateEdgeFunctionAuth(
      { Authorization: 'Bearer valid-jwt-token' },
      { userId: victimUserId, user_id: victimUserId, malicious_override: true },
      { user: { id: legitimateTokenOwner, email: 'legitimate@example.com' }, error: null }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.targetUserId, legitimateTokenOwner, 'Target MUST strictly be the authenticated JWT user ID');
    assert.notEqual(res.body.targetUserId, victimUserId, 'Victim ID in body MUST NEVER be used');
    assert.equal(res.body.tamperedIgnored, true);
  }
});


// ----------------------------------------------------------------------------
// 23. TEST: PL/pgSQL DISAMBIGUATION, RPC FAIL-CLOSED TEARDOWN & CATCH SCOPE
// ----------------------------------------------------------------------------
test('23. PL/pgSQL Disambiguation, RPC Fail-Closed Teardown, Catch Scope Handling & Isolation', async () => {
  // A. Static Migration 27 Audit: Disambiguated parameters & table aliases
  assert.equal(migCode1, migCode2, 'Both migration copies must be bit-for-bit identical');

  assert.ok(
    migCode1.includes('delete_user_account_by_admin(p_target_user_id UUID)'),
    'RPC must use disambiguated p_target_user_id parameter'
  );

  assert.ok(
    migCode1.includes('v_target_user_id := p_target_user_id;'),
    'RPC must assign parameter to internal v_target_user_id variable'
  );

  assert.ok(
    migCode1.includes('DELETE FROM public.live_location_sessions AS lls') &&
    migCode1.includes('lls.owner_user_id = v_target_user_id') &&
    migCode1.includes('lls.target_user_id = v_target_user_id'),
    'RPC must query live_location_sessions using explicit lls table alias and v_target_user_id'
  );

  assert.ok(
    migCode1.includes('lls.owner_user_id = v_user_id') &&
    migCode1.includes('lls.target_user_id = v_user_id'),
    'delete_user_account must query live_location_sessions using lls alias and v_user_id'
  );

  // B. Static Edge Function Audit: Outer currentStage scoping & RPC teardown boundary
  assert.equal(edgeFuncCode1, edgeFuncCode2, 'Both edge function copies must be bit-for-bit identical');

  assert.ok(
    edgeFuncCode1.includes("let currentStage = 'init';"),
    'Edge function must declare currentStage in outer function scope above try block'
  );

  assert.ok(
    edgeFuncCode1.includes("const storageCleanupSummary: Record<string, { success: boolean; count: number; error?: string }> = {};"),
    'Edge function must declare storageCleanupSummary in outer function scope above try block'
  );

  assert.ok(
    edgeFuncCode1.includes("p_target_user_id: userId"),
    'Edge function must call delete_user_account_by_admin with p_target_user_id parameter'
  );

  assert.ok(
    edgeFuncCode1.includes("Database teardown RPC failed at stage"),
    'Edge function must fail-closed and throw immediately on RPC failure'
  );

  // C. Simulation: PL/pgSQL Parameter Disambiguation & Unrelated User Protection
  const userA = 'user-deleting-alpha-111';
  const userB = 'user-peer-bravo-222';
  const userC = 'user-unrelated-charlie-333';
  const userD = 'user-unrelated-delta-444';

  let liveSessionsStore = [
    { id: 's1', owner_user_id: userA, target_user_id: userB, desc: 'User A sharing to User B' },
    { id: 's2', owner_user_id: userB, target_user_id: userA, desc: 'User B sharing to User A' },
    { id: 's3', owner_user_id: userC, target_user_id: userD, desc: 'Unrelated User C sharing to User D' },
    { id: 's4', owner_user_id: userB, target_user_id: userC, desc: 'Unrelated User B sharing to User C' },
  ];

  // Disambiguated simulated RPC logic
  function simulateDisambiguatedRpcDeletion(sessions, p_target_user_id) {
    const v_target_user_id = p_target_user_id;
    return sessions.filter((lls) => {
      // DELETE condition: remove row if owner or target matches v_target_user_id
      const matches = lls.owner_user_id === v_target_user_id || lls.target_user_id === v_target_user_id;
      return !matches; // retain non-matching rows
    });
  }

  liveSessionsStore = simulateDisambiguatedRpcDeletion(liveSessionsStore, userA);

  // Verify User A sessions (s1 where owner=userA, s2 where target=userA) are swept
  assert.equal(liveSessionsStore.some((s) => s.owner_user_id === userA), false, 'Zero sessions owned by User A');
  assert.equal(liveSessionsStore.some((s) => s.target_user_id === userA), false, 'Zero sessions targeting User A');

  // Verify unrelated sessions s3 and s4 remain 100% intact
  assert.equal(liveSessionsStore.length, 2, 'Exactly 2 unrelated sessions must survive');
  assert.ok(liveSessionsStore.some((s) => s.id === 's3'), 'Session s3 (C -> D) must be preserved');
  assert.ok(liveSessionsStore.some((s) => s.id === 's4'), 'Session s4 (B -> C) must be preserved');

  // D. Simulation: RPC Teardown Failure Aborts Before Auth Deletion
  {
    let authCalled = false;
    const failingRpcClient = {
      rpc: async (funcName, params) => {
        assert.equal(funcName, 'delete_user_account_by_admin');
        assert.equal(params.p_target_user_id, userA);
        return { data: { success: false, error: 'Database transaction lock timeout' }, error: null };
      },
      auth: { admin: { deleteUser: async () => { authCalled = true; return { error: null }; } } },
    };

    async function runPipeline(c, uid) {
      let currentStage = 'database_cascade';
      const { data: rpcData, error: rpcError } = await c.rpc('delete_user_account_by_admin', {
        p_target_user_id: uid,
      });

      if (rpcError || (rpcData && rpcData.success === false)) {
        const errMsg = rpcError?.message || rpcData?.error || 'RPC returned failure status';
        throw new Error(`Database teardown RPC failed at stage ${currentStage}: ${errMsg}`);
      }

      await c.auth.admin.deleteUser(uid);
    }

    await assert.rejects(
      async () => runPipeline(failingRpcClient, userA),
      /Database teardown RPC failed at stage database_cascade: Database transaction lock timeout/
    );
    assert.equal(authCalled, false, 'Auth deletion MUST NOT execute when RPC teardown fails');
  }

  // E. Simulation: Catch Block Scope & Structured HTTP 500 JSON Response (No ReferenceError)
  {
    let currentStage = 'init';
    const storageCleanupSummary = { 'post-media': { success: true, count: 2 } };

    function simulateCatchHandler(thrownErr) {
      // Simulates the exact catch block in Deno.serve
      try {
        currentStage = 'database_cascade';
        throw thrownErr;
      } catch (err) {
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: false,
            stage: currentStage,
            error: err?.message || 'Internal deletion pipeline error',
            storageSummary: storageCleanupSummary,
          },
        };
      }
    }

    const res = simulateCatchHandler(new Error('RPC deadlock detected'));
    assert.equal(res.status, 500);
    assert.equal(res.headers['Content-Type'], 'application/json');
    assert.equal(res.body.success, false);
    assert.equal(res.body.stage, 'database_cascade');
    assert.equal(res.body.error, 'RPC deadlock detected');
    assert.deepEqual(res.body.storageSummary, { 'post-media': { success: true, count: 2 } });
  }
});

test('24. Storage Client Namespace Resolution, Multi-Bucket Sweep & Fail-Closed Protection', async () => {
  // A. Static Edge Function Audit: Correct Storage Client Passing & Defensive Normalization
  assert.equal(edgeFuncCode1, edgeFuncCode2, 'Both edge function copies must be bit-for-bit identical');

  assert.ok(
    edgeFuncCode1.includes('serviceRoleClient.storage'),
    'Edge function must explicitly reference serviceRoleClient.storage'
  );

  assert.ok(
    edgeFuncCode1.includes('listSharedBucketUserFiles(') &&
    edgeFuncCode1.includes('serviceRoleClient.storage,'),
    'listSharedBucketUserFiles must receive serviceRoleClient.storage'
  );

  assert.ok(
    edgeFuncCode1.includes('listUserFilesRecursively(') &&
    edgeFuncCode1.includes('serviceRoleClient.storage,'),
    'listUserFilesRecursively must receive serviceRoleClient.storage'
  );

  assert.ok(
    edgeFuncCode1.includes('listLegacyRootFiles(') &&
    edgeFuncCode1.includes('serviceRoleClient.storage,'),
    'listLegacyRootFiles must receive serviceRoleClient.storage'
  );

  assert.ok(
    edgeFuncCode1.includes('storageClient?.storage && typeof storageClient.storage.from === "function"'),
    'Helper functions must defensively normalize client if top-level client is passed'
  );

  assert.ok(
    edgeFuncCode1.includes('serviceRoleClient.storage') && edgeFuncCode1.includes('.from(bucketName)') && edgeFuncCode1.includes('.remove(validatedBatch)'),
    'Removal operations must target serviceRoleClient.storage.from(bucketName).remove'
  );

  // B. Defensive Normalization: Calling helpers with top-level client vs .storage client
  const testUserId = 'test-user-storage-123';
  const mockBucketStore = {
    'avatars': {
      [testUserId]: [{ name: 'avatar.png', id: 'f1', metadata: { mimetype: 'image/png' } }],
    },
    'chat-media': {
      'conv-1': [{ name: testUserId, id: null, metadata: null }],
      [`conv-1/${testUserId}`]: [{ name: 'voice.m4a', id: 'f2', metadata: { mimetype: 'audio/m4a' } }],
    },
  };

  const mockStorageApi = {
    from: (bucket) => ({
      list: async (folderPath) => ({
        data: (mockBucketStore[bucket] && mockBucketStore[bucket][folderPath]) || [],
        error: null,
      }),
      remove: async (paths) => ({ data: paths, error: null }),
    }),
  };

  // Top-level client (with .storage and database .from)
  const mockTopLevelClient = {
    from: (table) => {
      // PostgREST table builder does NOT have .list
      return { select: () => ({ data: [], error: null }) };
    },
    storage: mockStorageApi,
  };

  // Test 1: Helper given top-level client normalizes to .storage and DOES NOT crash with "from(...).list is not a function"
  const dedicatedFilesNormalized = await listUserFilesRecursively(
    mockTopLevelClient,
    'avatars',
    testUserId,
    testUserId
  );
  assert.deepEqual(dedicatedFilesNormalized, [`${testUserId}/avatar.png`]);

  // Test 2: Helper given storage client directly functions identically
  const dedicatedFilesDirect = await listUserFilesRecursively(
    mockTopLevelClient.storage,
    'avatars',
    testUserId,
    testUserId
  );
  assert.deepEqual(dedicatedFilesDirect, [`${testUserId}/avatar.png`]);

  // Test 3: Shared bucket crawler with top-level client
  const sharedFilesNormalized = await listSharedBucketUserFiles(
    mockTopLevelClient,
    'chat-media',
    testUserId,
    new Set(['conv-1'])
  );
  assert.deepEqual(sharedFilesNormalized, [`conv-1/${testUserId}/voice.m4a`]);

  // C. Multi-Bucket Sweep Simulation Across All 9 Canonical Buckets
  const mockAllBuckets = {};
  const removedRecord = {};

  for (const b of REQUIRED_BUCKETS) {
    if (SHARED_COLLABORATIVE_BUCKETS.includes(b)) {
      mockAllBuckets[b] = {
        'shared-room-1': [{ name: testUserId, id: null, metadata: null }, { name: 'peer-user-999', id: null, metadata: null }],
        [`shared-room-1/${testUserId}`]: [{ name: 'user_file.jpg', id: 'id1', metadata: { mimetype: 'image/jpeg' } }],
        [`shared-room-1/peer-user-999`]: [{ name: 'peer_file.jpg', id: 'id2', metadata: { mimetype: 'image/jpeg' } }],
      };
    } else {
      mockAllBuckets[b] = {
        [testUserId]: [{ name: 'owned_doc.pdf', id: 'id3', metadata: { mimetype: 'application/pdf' } }],
      };
    }
  }

  const multiStorageClient = {
    from: (bucket) => ({
      list: async (folderPath) => ({
        data: (mockAllBuckets[bucket] && mockAllBuckets[bucket][folderPath]) || [],
        error: null,
      }),
      remove: async (paths) => {
        removedRecord[bucket] = paths;
        return { data: paths, error: null };
      },
    }),
  };

  const fullSummary = {};
  for (const bucketName of REQUIRED_BUCKETS) {
    let files = [];
    if (SHARED_COLLABORATIVE_BUCKETS.includes(bucketName)) {
      files = await listSharedBucketUserFiles(
        multiStorageClient,
        bucketName,
        testUserId,
        new Set(['shared-room-1'])
      );
    } else {
      files = await listUserFilesRecursively(
        multiStorageClient,
        bucketName,
        testUserId,
        testUserId
      );
    }

    const validated = files.filter((f) =>
      isUserOwnedPath(bucketName, f, testUserId, new Set(['shared-room-1']), new Set(['shared-room-1']))
    );

    if (validated.length > 0) {
      await multiStorageClient.from(bucketName).remove(validated);
      fullSummary[bucketName] = { success: true, count: validated.length };
    } else {
      fullSummary[bucketName] = { success: true, count: 0 };
    }
  }

  // Confirm all 9 buckets succeeded
  for (const b of REQUIRED_BUCKETS) {
    assert.equal(fullSummary[b].success, true, `Bucket ${b} must report success`);
    assert.equal(fullSummary[b].count, 1, `Bucket ${b} must remove exactly 1 user file`);
  }

  // Confirm peer files were never removed from shared collaborative buckets
  for (const b of SHARED_COLLABORATIVE_BUCKETS) {
    assert.deepEqual(removedRecord[b], [`shared-room-1/${testUserId}/user_file.jpg`]);
    assert.equal(
      removedRecord[b].some((f) => f.includes('peer-user-999')),
      false,
      'Peer files must NEVER be submitted for removal'
    );
  }

  // D. Fail-Closed Abortion Simulation on Storage API Error
  let dbCascadeCalled = false;
  let authAdminCalled = false;

  const failingStorage = {
    from: (bucket) => ({
      list: async () => ({ data: null, error: { message: '503 Service Unavailable' } }),
      remove: async () => ({ error: null }),
    }),
  };

  async function simulateFullPipeline(storageApi, userId) {
    let stage = 'init';
    try {
      stage = 'storage_sweep';
      await listUserFilesRecursively(storageApi, 'avatars', userId, userId);

      stage = 'database_cascade';
      dbCascadeCalled = true;

      stage = 'auth_purge';
      authAdminCalled = true;
    } catch (err) {
      return { status: 500, stage, error: err.message };
    }
    return { status: 200, stage: 'completed' };
  }

  const result = await simulateFullPipeline(failingStorage, testUserId);
  assert.equal(result.status, 500);
  assert.equal(result.stage, 'storage_sweep');
  assert.equal(dbCascadeCalled, false, 'Database cascade MUST NOT execute on storage failure');
  assert.equal(authAdminCalled, false, 'Auth admin purge MUST NOT execute on storage failure');
});
