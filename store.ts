import { DonationModel, Donation } from "./donation.model.js";

export type NewDonation = {
  charityId: number;
  donor: string;
  amount: number;
};

export async function getAll(): Promise<Donation[]> {
  const docs = await DonationModel.find();
  return docs.map((d) => d.toJSON() as unknown as Donation);
}

export async function getById(id: string): Promise<Donation | null> {
  const doc = await DonationModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Donation) : null;
}

export async function create(input: NewDonation): Promise<Donation> {
  const doc = await DonationModel.create(input);
  return doc.toJSON() as unknown as Donation;
}

export async function remove(id: string): Promise<boolean> {
  const deleted = await DonationModel.findByIdAndDelete(id);
  return deleted !== null;
}

export async function summaryByCharity(
  charityId: number
): Promise<{ charityId: number; count: number; total: number }> {
  const result = await DonationModel.aggregate([
    { $match: { charityId } },
    { $group: { _id: "$charityId", count: { $sum: 1 }, total: { $sum: "$amount" } } },
  ]);
  if (result.length === 0) {
    return { charityId, count: 0, total: 0 };
  }
  const first = result[0]!;
  return { charityId, count: first.count as number, total: first.total as number };
}
