import { addTagToCard, detachTagFromCard, listTagsForOwner, type TagRow } from "./repo";

export function listTagsForUser(ownerId: string): Promise<TagRow[]> {
  return listTagsForOwner({ ownerId });
}

export function addTagToCardForUser(
  ownerId: string,
  input: { cardId: string; name: string },
): Promise<{ tagId: string }> {
  return addTagToCard({
    ownerId,
    cardId: input.cardId,
    rawName: input.name,
  });
}

export function detachTagFromCardForUser(
  ownerId: string,
  input: { cardId: string; tagId: string },
): Promise<{ detached: boolean }> {
  return detachTagFromCard({
    ownerId,
    cardId: input.cardId,
    tagId: input.tagId,
  });
}
