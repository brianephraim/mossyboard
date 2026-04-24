import { keyBetween } from "../../lib/ordering/key-between";
import { trpcErrors } from "../trpc/init";

type OrderedItem = {
  id: string;
  position: string;
};

export function resolveOrderedPosition(
  items: OrderedItem[],
  input: {
    prevId?: string | null;
    nextId?: string | null;
    excludedId?: string | null;
    entityLabel: string;
    defaultPlacement?: "end";
  },
) {
  const defaultPlacement = input.defaultPlacement ?? "end";
  const scopeItems =
    input.excludedId === undefined || input.excludedId === null
      ? items
      : items.filter((item) => item.id !== input.excludedId);

  if (input.prevId && input.prevId === input.excludedId) {
    throw trpcErrors.badRequest(`${input.entityLabel} cannot be its own previous neighbor`);
  }

  if (input.nextId && input.nextId === input.excludedId) {
    throw trpcErrors.badRequest(`${input.entityLabel} cannot be its own next neighbor`);
  }

  const prevIndex =
    input.prevId === undefined || input.prevId === null
      ? null
      : scopeItems.findIndex((item) => item.id === input.prevId);
  const nextIndex =
    input.nextId === undefined || input.nextId === null
      ? null
      : scopeItems.findIndex((item) => item.id === input.nextId);

  if (prevIndex === -1 || nextIndex === -1) {
    throw trpcErrors.notFound("Ordered neighbor not found");
  }

  if (prevIndex !== null && nextIndex !== null && nextIndex !== prevIndex + 1) {
    throw trpcErrors.badRequest("Ordered neighbors must be adjacent");
  }

  const previousItem =
    prevIndex !== null && prevIndex >= 0
      ? scopeItems[prevIndex]
      : nextIndex !== null
        ? nextIndex > 0
          ? scopeItems[nextIndex - 1]
          : null
        : defaultPlacement === "end"
          ? scopeItems.at(-1)
          : null;

  const nextItem =
    nextIndex !== null && nextIndex >= 0
      ? scopeItems[nextIndex]
      : prevIndex !== null && prevIndex >= 0 && prevIndex + 1 < scopeItems.length
        ? scopeItems[prevIndex + 1]
        : null;

  try {
    return keyBetween(previousItem?.position ?? null, nextItem?.position ?? null);
  } catch {
    throw trpcErrors.conflict("Unable to resolve an ordered position");
  }
}
