import mongoose, { Schema } from "mongoose";

export interface Donation {
  id: string;
  charityId: number;
  donor: string;
  amount: number;
}

const donationSchema = new Schema({
  charityId: { type: Number, required: true },
  donor: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
});

// expose `id` (string), hide Mongo's `_id` and `__v` from API responses
donationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret["id"] = ret["_id"];
    delete ret["_id"];
  },
});

export const DonationModel = mongoose.model("Donation", donationSchema);
