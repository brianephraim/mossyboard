import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "../db/client";
import { cardTags, tags } from "../db/schema";
import { lockOwnedCard, listTagsForCards, touchBoard, touchCard } from "../board/repo-shared";
import { trpcErrors } from "../trpc/init";

export type TagRow = {
  id: string;
  name: string;
  normalizedName: string;
  version: number;
};

export const TAG_NAME_MAX_LENGTH = 40;
export const PER_CARD_TAG_LIMIT = 20;

function normalize(rawName: string): { trimmed: string; normalized: string } {
  const trimmed = rawName.trim();
  const normalized = trimmed.toLowerCase();
  return { trimmed, normalized };
}

export async function listTagsForOwner(input: { ownerId: string }): Promise<TagRow[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      version: tags.version,
    })
    .from(tags)
    .where(and(eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
    .orderBy(asc(tags.name), asc(tags.id));
}

export async function addTagToCard(input: {
  ownerId: string;
  cardId: string;
  rawName: string;
}): Promise<{ tagId: string }> {
  const { trimmed, normalized } = normalize(input.rawName);
  if (trimmed.length === 0) {
    throw trpcErrors.badRequest("Tag name cannot be empty");
  }
  if (trimmed.length > TAG_NAME_MAX_LENGTH) {
    throw trpcErrors.badRequest(`Tag name cannot exceed ${TAG_NAME_MAX_LENGTH} characters`);
  }
  if (trimmed.includes(",")) {
    throw trpcErrors.badRequest("Tag name cannot contain a comma");
  }

  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      throw trpcErrors.notFound("Card not found");
    }

    const [existingTag] = await tx
      .select({
        id: tags.id,
        name: tags.name,
        normalizedName: tags.normalizedName,
        version: tags.version,
      })
      .from(tags)
      .where(
        and(
          eq(tags.ownerId, input.ownerId),
          eq(tags.normalizedName, normalized),
          isNull(tags.deletedAt),
        ),
      )
      .for("update")
      .limit(1);

    const now = new Date();
    let tagId: string;

    if (existingTag) {
      tagId = existingTag.id;
      if (existingTag.name !== trimmed) {
        await tx
          .update(tags)
          .set({
            name: trimmed,
            version: existingTag.version + 1,
            updatedAt: now,
          })
          .where(eq(tags.id, existingTag.id));
      }
    } else {
      tagId = randomUUID();
      await tx.insert(tags).values({
        id: tagId,
        ownerId: input.ownerId,
        name: trimmed,
        normalizedName: normalized,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .insert(cardTags)
      .values({
        cardId: lockedCard.id,
        tagId,
        createdAt: now,
      })
      .onConflictDoNothing();

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(cardTags)
      .where(eq(cardTags.cardId, lockedCard.id));

    if (count > PER_CARD_TAG_LIMIT) {
      throw trpcErrors.badRequest(`A card can have at most ${PER_CARD_TAG_LIMIT} tags`);
    }

    await touchCard(tx, { cardId: lockedCard.id, now });
    await touchBoard(tx, { boardId: lockedCard.boardId, now });

    return { tagId };
  });
}

export async function detachTagFromCard(input: {
  ownerId: string;
  cardId: string;
  tagId: string;
}): Promise<{ detached: boolean }> {
  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      throw trpcErrors.notFound("Card not found");
    }

    const [ownedTag] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
      .limit(1);

    if (!ownedTag) {
      return { detached: false };
    }

    const removed = await tx
      .delete(cardTags)
      .where(and(eq(cardTags.cardId, lockedCard.id), eq(cardTags.tagId, ownedTag.id)))
      .returning({ cardId: cardTags.cardId });

    const detached = removed.length > 0;

    if (detached) {
      const now = new Date();
      await touchCard(tx, { cardId: lockedCard.id, now });
      await touchBoard(tx, { boardId: lockedCard.boardId, now });
    }

    return { detached };
  });
}

export { listTagsForCards };
