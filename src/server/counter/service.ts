import { getSharedCounter, incrementSharedCounter } from "./repo";

export async function readCounter() {
  return getSharedCounter();
}

export async function incrementCounter() {
  return incrementSharedCounter();
}
