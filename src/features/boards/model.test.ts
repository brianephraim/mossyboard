import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildBoardLanes,
  canReorderBoard,
  groupListItemsByPriority,
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
          columnId: "column-1",
          title: "Define goals",
          description: "",
          priority: "high",
          position: "1000",
          version: 0,
          tags: [],
        },
        {
          id: "card-2",
          columnId: "column-1",
          title: "Collect references",
          description: "",
          priority: "low",
          position: "2000",
          version: 0,
          tags: [],
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
          columnId: "column-2",
          title: "Design hero",
          description: "",
          priority: "high",
          position: "1000",
          version: 0,
          tags: [],
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
          columnId: "column-3",
          title: "Archive notes",
          description: "",
          priority: "none",
          position: "1000",
          version: 0,
          tags: [],
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
      drawer: undefined,
      view: "list",
      groupBy: "priority",
      priority: ["medium", "high"],
    });
  });

  it("keeps real board columns when priority grouping is selected", () => {
    const lanes = buildBoardLanes(boardFixture, {
      groupBy: "priority",
      priority: [],
    });

    assert.deepEqual(
      lanes.map((lane) => lane.title),
      ["To do", "In progress", "Done"],
    );
    assert.deepEqual(
      lanes[0]?.cards.map((card) => card.id),
      ["card-1", "card-2"],
    );
    assert.equal(lanes[0]?.cards[0]?.originalColumnTitle, "To do");
  });

  it("groups cards by priority while preserving their relative column order", () => {
    const [todoLane] = buildBoardLanes(boardFixture, {
      groupBy: "priority",
      priority: [],
    });

    assert.ok(todoLane);
    const [firstCard, secondCard] = todoLane.cards;
    assert.ok(firstCard);
    assert.ok(secondCard);

    const groups = groupListItemsByPriority([
      firstCard,
      secondCard,
      {
        ...firstCard,
        id: "card-5",
        title: "Review copy",
        position: "3000",
      },
    ]);

    assert.deepEqual(
      groups.find((group) => group.priority === "high")?.cards.map((card) => card.id),
      ["card-1", "card-5"],
    );
    assert.deepEqual(
      groups.find((group) => group.priority === "low")?.cards.map((card) => card.id),
      ["card-2"],
    );
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

  it("updates priority during optimistic priority-group moves", () => {
    const reordered = reorderBoardCards(boardFixture, {
      sourceColumnId: "column-1",
      sourceIndex: 1,
      destinationColumnId: "column-2",
      destinationIndex: 1,
      destinationPriority: "high",
    });

    const movedCard = reordered.columns
      .find((column) => column.id === "column-2")
      ?.cards.find((card) => card.id === "card-2");

    assert.equal(movedCard?.priority, "high");
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
