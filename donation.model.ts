import mongoose, { Schema, Types } from "mongoose";
import type { Charity } from "./charity.model.js";

const donationSchema = new Schema({
  charityId: { type: Schema.Types.ObjectId, ref: "Charity", required: true },
  donor:     { type: String, required: true },
  amount:    { type: Number, required: true, min: 0 },
});

donationSchema.index({ charityId: 1 });

// expose `id` (string), hide Mongo's `_id` and `__v` from API responses
donationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret["id"] = ret["_id"];
    delete ret["_id"];
  },
});

// Raw type as stored in MongoDB — charityId is a plain ObjectId
export type DonationRaw = {
  charityId: Types.ObjectId;
  donor: string;
  amount: number;
  id: string;
};

// Type after .populate("charityId") — charityId is the full Charity document
export type DonationPopulated = Omit<DonationRaw, "charityId"> & {
  charityId: Charity;
};

export const DonationModel = mongoose.model("Donation", donationSchema);
