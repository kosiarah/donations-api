import { Donation, NewDonation } from "./types.js";

// in-memory data — will be replaced by MongoDB in the next task
let donations: Donation[] = [
  { id: 1, charityId: 10, donor: "Alice", amount: 25.0 },
  { id: 2, charityId: 10, donor: "Bob", amount: 5.5 },
  { id: 3, charityId: 20, donor: "Carol", amount: 100.0 },
];
let nextId = 4;

export function getAll(): Donation[] {
  return donations;
}

export function getById(id: number): Donation | undefined {
  return donations.find((d) => d.id === id);
}

export function create(input: NewDonation): Donation {
  const donation: Donation = { id: nextId++, ...input };
  donations.push(donation);
  return donation;
}

export function remove(id: number): boolean {
  const index = donations.findIndex((d) => d.id === id);
  if (index === -1) return false;
  donations.splice(index, 1);
  return true;
}

export function summaryByCharity(charityId: number): {
  charityId: number;
  count: number;
  total: number;
} {
  const matches = donations.filter((d) => d.charityId === charityId);
  const total = matches.reduce((sum, d) => sum + d.amount, 0);
  return { charityId, count: matches.length, total };
}
