import { Types } from "mongoose";
import { DonationModel, DonationPopulated } from "./donation.model.js";
import { CharityModel, Charity } from "./charity.model.js";

// ── Charity functions ──────────────────────────────────────────────────────────

export async function createCharity(input: { name: string; country: string }): Promise<Charity> {
  const doc = await CharityModel.create(input);
  return doc.toJSON() as unknown as Charity;
}

export async function getAllCharities(): Promise<Charity[]> {
  const docs = await CharityModel.find();
  return docs.map((d) => d.toJSON() as unknown as Charity);
}

export async function charityExists(id: string): Promise<boolean> {
  const n = await CharityModel.countDocuments({ _id: id });
  return n > 0;
}

// ── Donation types ─────────────────────────────────────────────────────────────

export type NewDonation = {
  charityId: string;
  donor: string;
  amount: number;
};

export type DonationUpdate = {
  donor?: string;
  amount?: number;
};

export type PagedDonations = {
  total: number;
  count: number;
  items: DonationPopulated[];
};

// ── Donation functions ─────────────────────────────────────────────────────────

export async function getAll(
  filters: { charityId?: string; minAmount?: number },
  page: { limit: number; skip: number }
): Promise<PagedDonations> {
  const query: Record<string, unknown> = {};
  if (filters.charityId !== undefined) {
    query["charityId"] = new Types.ObjectId(filters.charityId);
  }
  if (filters.minAmount !== undefined) {
    query["amount"] = { $gte: filters.minAmount };
  }

  const [total, docs] = await Promise.all([
    DonationModel.countDocuments(query),
    DonationModel.find(query)
      .skip(page.skip)
      .limit(page.limit)
      .populate<{ charityId: Charity }>("charityId"),
  ]);

  const items = docs.map((d) => d.toJSON() as unknown as DonationPopulated);
  return { total, count: items.length, items };
}

export async function getById(id: string): Promise<DonationPopulated | null> {
  const doc = await DonationModel
    .findById(id)
    .populate<{ charityId: Charity }>("charityId");
  return doc ? (doc.toJSON() as unknown as DonationPopulated) : null;
}

export async function create(input: NewDonation): Promise<DonationPopulated> {
  const doc = await DonationModel.create({
    charityId: new Types.ObjectId(input.charityId),
    donor: input.donor,
    amount: input.amount,
  });
  const populated = await doc.populate<{ charityId: Charity }>("charityId");
  return populated.toJSON() as unknown as DonationPopulated;
}

export async function update(
  id: string,
  patch: DonationUpdate
): Promise<DonationPopulated | null> {
  const doc = await DonationModel
    .findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
    .populate<{ charityId: Charity }>("charityId");
  return doc ? (doc.toJSON() as unknown as DonationPopulated) : null;
}

export async function remove(id: string): Promise<boolean> {
  const deleted = await DonationModel.findByIdAndDelete(id);
  return deleted !== null;
}

export async function summaryByCharity(
  charityId: string
): Promise<{ charityId: string; count: number; total: number }> {
  const result = await DonationModel.aggregate([
    { $match: { charityId: new Types.ObjectId(charityId) } },
    { $group: { _id: "$charityId", count: { $sum: 1 }, total: { $sum: "$amount" } } },
  ]);
  if (result.length === 0) return { charityId, count: 0, total: 0 };
  const first = result[0]!;
  return { charityId, count: first.count as number, total: first.total as number };
}

export type CharitySummary = {
  charityId: string;
  name: string;
  count: number;
  total: number;
};

export async function topCharities(limit: number): Promise<CharitySummary[]> {
  const results = await DonationModel.aggregate<CharitySummary>([
    { $group: { _id: "$charityId", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "charities",
        localField: "_id",
        foreignField: "_id",
        as: "charityInfo",
      },
    },
    {
      $project: {
        _id: 0,
        charityId: { $toString: "$_id" },
        name: { $arrayElemAt: ["$charityInfo.name", 0] },
        count: 1,
        total: 1,
      },
    },
  ]);
  return results;
}
