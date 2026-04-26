import crypto from "node:crypto";

import postgres from "postgres";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function assertLocalDatabase(url) {
  const hostname = new URL(url).hostname;
  if (!isLocalHost(hostname)) {
    throw new Error(
      `Refusing to seed non-local database (host=${hostname}). Set DATABASE_URL to a localhost database.`,
    );
  }
}

function uuid() {
  return crypto.randomUUID();
}

const ownerId = requireEnv("KANBAN_DEV_OWNER_ID");
const databaseUrl = requireEnv("DATABASE_URL");
assertLocalDatabase(databaseUrl);

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  const existing = await sql /* sql */ `
    select count(*)::int as count
    from boards
    where owner_id = ${ownerId} and deleted_at is null
  `;
  const count = existing[0]?.count ?? 0;
  if (count > 0) {
    console.log("Seed skipped: owner already has boards.");
    process.exit(0);
  }

  const boardId = uuid();
  const colTodoId = uuid();
  const colDoingId = uuid();
  const colDoneId = uuid();

  // Positions are lexicographically ordered strings.
  const posA = "a";
  const posB = "b";
  const posC = "c";

  await sql /* sql */ `
    insert into boards (id, owner_id, name)
    values (${boardId}, ${ownerId}, 'My First Board')
  `;

  await sql /* sql */ `
    insert into columns (id, board_id, title, position)
    values
      (${colTodoId}, ${boardId}, 'Todo', ${posA}),
      (${colDoingId}, ${boardId}, 'In progress', ${posB}),
      (${colDoneId}, ${boardId}, 'Done', ${posC})
  `;

  const card1Id = uuid();
  const card2Id = uuid();
  const card3Id = uuid();
  const doingId = uuid();
  const doneId = uuid();

  await sql /* sql */ `
    insert into cards (id, column_id, title, description, priority, position)
    values
      (${card1Id}, ${colTodoId}, 'Set up local dev', '', 'none', 'a'),
      (${card2Id}, ${colTodoId}, 'Read the README', '', 'none', 'b'),
      (${card3Id}, ${colTodoId}, 'Try drag-and-drop', '', 'none', 'c'),
      (${doingId}, ${colDoingId}, 'Move a card', '', 'low', 'a'),
      (${doneId}, ${colDoneId}, 'Ship something small', '', 'medium', 'a')
  `;

  console.log("Seed complete.");
} finally {
  await sql.end({ timeout: 2 });
}
