import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildBoardLanes,
  canReorderBoard,
  groupListItemsByPriority,
  parseBoardDetailSearch,
  serializeTagFilter,
  togglePrioritySelection,
  toggleTagSelection,
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
      tags: [],
    });
  });

  it("keeps real board columns when priority grouping is selected", () => {
    const lanes = buildBoardLanes(boardFixture, {
      groupBy: "priority",
      priority: [],
      tags: [],
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
      tags: [],
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
        tags: [],
      }),
      true,
    );

    assert.equal(
      canReorderBoard({
        view: "board",
        groupBy: "priority",
        priority: [],
        tags: [],
      }),
      false,
    );
  });
});

describe("parseTagFilter (via parseBoardDetailSearch)", () => {
  it("lowercases, trims, dedupes, preserves inner spaces", () => {
    const parsed = parseBoardDetailSearch({ tags: "Bug, NEEDS REVIEW, bug" });
    assert.deepEqual(parsed.tags, ["bug", "needs review"]);
  });

  it("returns [] for missing or empty input", () => {
    const a = parseBoardDetailSearch({});
    const b = parseBoardDetailSearch({ tags: "" });
    assert.deepEqual(a.tags, []);
    assert.deepEqual(b.tags, []);
  });
});

describe("serializeTagFilter", () => {
  it("joins with commas, returns undefined for empty arrays", () => {
    assert.equal(serializeTagFilter([]), undefined);
    assert.equal(serializeTagFilter(["bug", "x"]), "bug,x");
  });
});

describe("toggleTagSelection", () => {
  it("adds when missing, removes when present", () => {
    assert.deepEqual(toggleTagSelection([], "bug"), ["bug"]);
    assert.deepEqual(toggleTagSelection(["bug"], "bug"), []);
    assert.deepEqual(toggleTagSelection(["a"], "b").sort(), ["a", "b"].sort());
  });
});

describe("buildBoardLanes with tag filter", () => {
  const tagBoardFixture: LoadedBoard = {
    id: "tag-board",
    name: "Tag Board",
    updatedAt: "2026-04-24T12:00:00.000Z",
    columnCount: 1,
    cardCount: 3,
    columns: [
      {
        id: "col",
        title: "Todo",
        position: "1000",
        version: 0,
        cardCount: 3,
        cards: [
          {
            id: "c1",
            columnId: "col",
            title: "C1",
            description: "",
            priority: "high",
            position: "1000",
            version: 0,
            tags: [{ id: "t-bug", name: "Bug", normalizedName: "bug" }],
          },
          {
            id: "c2",
            columnId: "col",
            title: "C2",
            description: "",
            priority: "medium",
            position: "2000",
            version: 0,
            tags: [{ id: "t-fe", name: "Frontend", normalizedName: "frontend" }],
          },
          {
            id: "c3",
            columnId: "col",
            title: "C3",
            description: "",
            priority: "low",
            position: "3000",
            version: 0,
            tags: [],
          },
        ],
      },
    ],
  };

  it("filters by tags (OR within array)", () => {
    const lanes = buildBoardLanes(tagBoardFixture, {
      groupBy: "column",
      priority: [],
      tags: ["bug"],
    });
    assert.deepEqual(
      lanes[0]?.cards.map((c) => c.id),
      ["c1"],
    );
  });

  it("multiple tags use OR", () => {
    const lanes = buildBoardLanes(tagBoardFixture, {
      groupBy: "column",
      priority: [],
      tags: ["bug", "frontend"],
    });
    assert.deepEqual(lanes[0]?.cards.map((c) => c.id).sort(), ["c1", "c2"].sort());
  });

  it("AND across priority and tag dimensions", () => {
    const lanes = buildBoardLanes(tagBoardFixture, {
      groupBy: "column",
      priority: ["high"],
      tags: ["bug"],
    });
    assert.deepEqual(
      lanes[0]?.cards.map((c) => c.id),
      ["c1"],
    );
  });
});

describe("canReorderBoard with tags", () => {
  it("returns false when tags filter is non-empty", () => {
    assert.equal(
      canReorderBoard({ view: "board", groupBy: "column", priority: [], tags: ["x"] }),
      false,
    );
  });

  it("returns true when all filters empty and grouping is column", () => {
    assert.equal(
      canReorderBoard({ view: "board", groupBy: "column", priority: [], tags: [] }),
      true,
    );
  });
});
