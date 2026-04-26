import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  getFilteredColumnPlacement,
  getPriorityGroupDroppableId,
  getPriorityGroupPlacement,
  parsePriorityGroupDroppableId,
} from "./priorityGrouping";
import type { LoadedBoard } from "./types";

const boardFixture: LoadedBoard = {
  id: "board-1",
  name: "Product Launch",
  updatedAt: "2026-04-24T12:00:00.000Z",
  columnCount: 2,
  cardCount: 7,
  columns: [
    {
      id: "column-1",
      title: "To do",
      position: "1000",
      version: 0,
      cardCount: 5,
      cards: [
        {
          id: "card-1",
          columnId: "column-1",
          title: "Write brief",
          description: "",
          priority: "low",
          position: "1000",
          version: 0,
        },
        {
          id: "card-2",
          columnId: "column-1",
          title: "Define goals",
          description: "",
          priority: "high",
          position: "2000",
          version: 0,
        },
        {
          id: "card-3",
          columnId: "column-1",
          title: "Collect screenshots",
          description: "",
          priority: "medium",
          position: "3000",
          version: 0,
        },
        {
          id: "card-4",
          columnId: "column-1",
          title: "Approve copy",
          description: "",
          priority: "high",
          position: "4000",
          version: 0,
        },
        {
          id: "card-5",
          columnId: "column-1",
          title: "Archive notes",
          description: "",
          priority: "none",
          position: "5000",
          version: 0,
        },
      ],
    },
    {
      id: "column-2",
      title: "Doing",
      position: "2000",
      version: 0,
      cardCount: 2,
      cards: [
        {
          id: "card-6",
          columnId: "column-2",
          title: "Sync legal",
          description: "",
          priority: "none",
          position: "1000",
          version: 0,
        },
        {
          id: "card-7",
          columnId: "column-2",
          title: "Prep recap",
          description: "",
          priority: "low",
          position: "2000",
          version: 0,
        },
      ],
    },
  ],
};

describe("priority grouping helpers", () => {
  it("round-trips priority droppable ids", () => {
    const droppableId = getPriorityGroupDroppableId("column-1", "high");

    assert.equal(droppableId, "priority-group:column-1:high");
    assert.deepEqual(parsePriorityGroupDroppableId(droppableId), {
      columnId: "column-1",
      priority: "high",
    });
    assert.equal(parsePriorityGroupDroppableId("column-1"), null);
  });

  it("places a moved card directly above the previous top card when dropped at group start", () => {
    const placement = getPriorityGroupPlacement(boardFixture, {
      cardId: "card-4",
      columnId: "column-1",
      priority: "high",
      destinationIndex: 0,
    });

    assert.deepEqual(placement, {
      columnId: "column-1",
      destinationIndex: 1,
      prevId: "card-1",
      nextId: "card-2",
    });
  });

  it("places a moved card directly below the group card above it in priority view", () => {
    const placement = getPriorityGroupPlacement(boardFixture, {
      cardId: "card-2",
      columnId: "column-1",
      priority: "high",
      destinationIndex: 1,
    });

    assert.deepEqual(placement, {
      columnId: "column-1",
      destinationIndex: 3,
      prevId: "card-4",
      nextId: "card-5",
    });
  });

  it("maps cross-group drops back into the underlying user order", () => {
    const placement = getPriorityGroupPlacement(boardFixture, {
      cardId: "card-2",
      columnId: "column-1",
      priority: "medium",
      destinationIndex: 1,
    });

    assert.deepEqual(placement, {
      columnId: "column-1",
      destinationIndex: 2,
      prevId: "card-3",
      nextId: "card-4",
    });
  });

  it("maps filtered-column drops back into the underlying user order", () => {
    const placement = getFilteredColumnPlacement(boardFixture, {
      cardId: "card-4",
      columnId: "column-1",
      priority: ["high", "medium"],
      destinationIndex: 0,
    });

    assert.deepEqual(placement, {
      columnId: "column-1",
      destinationIndex: 1,
      prevId: "card-1",
      nextId: "card-2",
    });
  });

  it("appends when dropping into a filtered column with no currently visible cards", () => {
    const placement = getFilteredColumnPlacement(boardFixture, {
      cardId: "card-2",
      columnId: "column-2",
      priority: ["high"],
      destinationIndex: 0,
    });

    assert.deepEqual(placement, {
      columnId: "column-2",
      destinationIndex: 2,
      prevId: "card-7",
      nextId: null,
    });
  });
});
