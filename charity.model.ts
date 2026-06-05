import mongoose, { Schema, InferSchemaType } from "mongoose";

const charitySchema = new Schema({
  name:    { type: String, required: true },
  country: { type: String, required: true },
});

charitySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret["id"] = ret["_id"];
    delete ret["_id"];
  },
});

export type Charity = InferSchemaType<typeof charitySchema> & { id: string };
export const CharityModel = mongoose.model("Charity", charitySchema);
