/**
 * Serializes MongoDB documents to JSON-safe objects
 * Converts ObjectId to string and Date objects to ISO strings
 */

export function serializeDocument(doc) {
  if (!doc) return null;
  
  const serialized = {};
  
  for (const [key, value] of Object.entries(doc)) {
    serialized[key] = serializeValue(value);
  }
  
  return serialized;
}

export function serializeArray(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map(doc => serializeDocument(doc));
}

function serializeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle MongoDB ObjectId
  if (value._bsontype === 'ObjectID' || value.constructor?.name === 'ObjectId') {
    return value.toString();
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => serializeValue(item));
  }

  // Handle nested objects (but not class instances)
  if (typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeValue(v)])
    );
  }

  // Return primitive values as-is
  return value;
}
