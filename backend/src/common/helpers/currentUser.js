const prisma = require('./prisma');

/**
 * Runs a set of database operations within an interactive transaction,
 * setting the SQL local session variable 'app.current_user_id' so Postgres
 * audit triggers capture the mutating actor's user ID.
 *
 * @param {string|null} userId - The UUID of the current user.
 * @param {function(object): Promise<any>} callback - A callback receiving the transaction client.
 * @returns {Promise<any>} The result of the callback.
 */
async function withUserContext(userId, callback) {
  if (!userId) {
    // If no user context (e.g., system actions, seed), bypass transaction context or run standard prisma
    return await callback(prisma);
  }

  // Validate that the user ID is a valid UUID to prevent SQL injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid user ID context for transaction: ${userId}`);
  }

  return await prisma.$transaction(async (tx) => {
    // Set both the app.current_user_id and the Supabase auth claim sub
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}';`);
    await tx.$executeRawUnsafe(`SET LOCAL request.jwt.claims = '{"sub": "${userId}", "role": "authenticated"}';`);
    // Run the actual DB operations on this transaction client
    return await callback(tx);
  });
}

module.exports = withUserContext;
