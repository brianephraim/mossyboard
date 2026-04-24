import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildBoardLanes,
  canReorderBoard,
  parseBoardDetailSearch,
  reorderBoardCards,
  togglePrioritySelection,
} from "./model";
import type { LoadedBoard } from "./types";

const boardFixture: LoadedBoard = {
  id: "board-1",
  name: "Product Launch",
  updatedAt: "2026-04-24T12:00:00.000Z",
  columnCount: 3,
  cardCount: 4,
  columns: [
    {
      id: "column-1",
      title: "To do",
      position: "1000",
      version: 0,
      cardCount: 2,
      cards: [
        {
          id: "card-1",
          title: "Define goals",
          description: "",
          priority: "high",
          position: "1000",
          version: 0,
        },
        {
          id: "card-2",
          title: "Collect references",
          description: "",
          priority: "low",
          position: "2000",
          version: 0,
        },
      ],
    },
    {
      id: "column-2",
      title: "In progress",
      position: "2000",
      version: 0,
      cardCount: 1,
      cards: [
        {
          id: "card-3",
          title: "Design hero",
          description: "",
          priority: "high",
          position: "1000",
          version: 0,
        },
      ],
    },
    {
      id: "column-3",
      title: "Done",
      position: "3000",
      version: 0,
      cardCount: 1,
      cards: [
        {
          id: "card-4",
          title: "Archive notes",
          description: "",
          priority: "none",
          position: "1000",
          version: 0,
        },
      ],
    },
  ],
};

describe("board model helpers", () => {
  it("parses board detail search with sensible defaults", () => {
    const parsed = parseBoardDetailSearch({
      view: "list",
      groupBy: "priority",
      priority: "high,medium,bad",
    });

    assert.deepEqual(parsed, {
      card: undefined,
      view: "list",
      groupBy: "priority",
      priority: ["medium", "high"],
    });
  });

  it("groups priority lanes while preserving original column order", () => {
    const lanes = buildBoardLanes(boardFixture, {
      groupBy: "priority",
      priority: [],
    });

    assert.equal(lanes[3]?.title, "High");
    assert.deepEqual(
      lanes[3]?.cards.map((card) => card.id),
      ["card-1", "card-3"],
    );
    assert.equal(lanes[3]?.cards[0]?.originalColumnTitle, "To do");
    assert.equal(lanes[3]?.cards[1]?.originalColumnTitle, "In progress");
  });

  it("reorders cards across columns for optimistic updates", () => {
    const reordered = reorderBoardCards(boardFixture, {
      sourceColumnId: "column-1",
      sourceIndex: 0,
      destinationColumnId: "column-2",
      destinationIndex: 1,
    });

    assert.deepEqual(
      reordered.columns.find((column) => column.id === "column-1")?.cards.map((card) => card.id),
      ["card-2"],
    );
    assert.deepEqual(
      reordered.columns.find((column) => column.id === "column-2")?.cards.map((card) => card.id),
      ["card-3", "card-1"],
    );
  });

  it("toggles priority filters in a stable order", () => {
    const one = togglePrioritySelection([], "high");
    const two = togglePrioritySelection(one, "low");
    const three = togglePrioritySelection(two, "high");

    assert.deepEqual(one, ["high"]);
    assert.deepEqual(two, ["low", "high"]);
    assert.deepEqual(three, ["low"]);
  });

  it("only enables reorder in unfiltered column-board view", () => {
    assert.equal(
      canReorderBoard({
        view: "board",
        groupBy: "column",
        priority: [],
      }),
      true,
    );

    assert.equal(
      canReorderBoard({
        view: "board",
        groupBy: "priority",
        priority: [],
      }),
      false,
    );
  });
});
