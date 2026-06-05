import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { DonationModel } from "./donation.model.js";
import { CharityModel } from "./charity.model.js";
import * as store from "./store.js";

const app = express();
app.use(express.json());

const PORT = 3000;
const MONGO_URL = process.env.MONGO_URL ?? "mongodb://localhost:27017/donations";

await mongoose.connect(MONGO_URL);
console.log("connected to mongo");

// Seed only when both collections are completely empty
const [charityCount, donationCount] = await Promise.all([
  CharityModel.estimatedDocumentCount(),
  DonationModel.estimatedDocumentCount(),
]);

if (charityCount === 0 && donationCount === 0) {
  const [redCross, wwf] = await CharityModel.create([
    { name: "Red Cross", country: "PL" },
    { name: "WWF",       country: "DE" },
  ]);
  await DonationModel.create([
    { charityId: redCross._id, donor: "Alice", amount: 25.0 },
    { charityId: redCross._id, donor: "Bob",   amount: 5.5  },
    { charityId: wwf._id,      donor: "Carol", amount: 100.0 },
  ]);
  console.log("seeded 2 charities and 3 donations");
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ── Charities ─────────────────────────────────────────────────────────────────

app.post("/charities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, country } = req.body as { name: unknown; country: unknown };
    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "name is required and must be a non-empty string" });
    }
    if (typeof country !== "string" || country.trim() === "") {
      return res.status(400).json({ error: "country is required and must be a non-empty string" });
    }
    const created = await store.createCharity({ name: name.trim(), country: country.trim() });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

app.get("/charities", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await store.getAllCharities());
  } catch (err) { next(err); }
});

app.get("/charities/:id/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "invalid id format" });
    }
    const summary = await store.summaryByCharity(req.params.id);
    res.json(summary);
  } catch (err) { next(err); }
});

// ── Donations ─────────────────────────────────────────────────────────────────

app.get("/donations", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { charityId, minAmount, limit: limitRaw, skip: skipRaw } = req.query;

    if (charityId !== undefined && !mongoose.isValidObjectId(charityId)) {
      return res.status(400).json({ error: "charityId query param is not a valid id" });
    }

    const limit = Math.min(Math.max(1, Number(limitRaw ?? 20)), 100);
    const skip  = Math.max(0, Number(skipRaw ?? 0));

    const result = await store.getAll(
      {
        charityId: charityId as string | undefined,
        minAmount: minAmount !== undefined ? Number(minAmount) : undefined,
      },
      { limit, skip }
    );
    res.json(result);
  } catch (err) { next(err); }
});

app.get("/donations/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "invalid id format" });
    }
    const donation = await store.getById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: "donation not found" });
    }
    res.json(donation);
  } catch (err) { next(err); }
});

app.post("/donations", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { charityId, donor, amount } = req.body as {
      charityId: unknown;
      donor: unknown;
      amount: unknown;
    };

    if (typeof charityId !== "string" || !mongoose.isValidObjectId(charityId)) {
      return res.status(400).json({ error: "charityId is required and must be a valid id string" });
    }
    if (typeof donor !== "string" || donor.trim() === "") {
      return res.status(400).json({ error: "donor is required and must be a non-empty string" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount is required and must be a positive number" });
    }

    const exists = await store.charityExists(charityId);
    if (!exists) {
      return res.status(400).json({ error: "charityId does not reference an existing charity" });
    }

    const created = await store.create({ charityId, donor: donor.trim(), amount });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

app.patch("/donations/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "invalid id format" });
    }

    const { donor, amount } = req.body as { donor: unknown; amount: unknown };
    const patch: { donor?: string; amount?: number } = {};

    if (donor !== undefined) {
      if (typeof donor !== "string" || donor.trim() === "") {
        return res.status(400).json({ error: "donor must be a non-empty string" });
      }
      patch.donor = donor.trim();
    }
    if (amount !== undefined) {
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      patch.amount = amount;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "body must include at least one of: donor, amount" });
    }

    const updated = await store.update(req.params.id, patch);
    if (!updated) {
      return res.status(404).json({ error: "donation not found" });
    }
    res.json(updated);
  } catch (err) { next(err); }
});

app.delete("/donations/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "invalid id format" });
    }
    const deleted = await store.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "donation not found" });
    }
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Reports ───────────────────────────────────────────────────────────────────

app.get("/reports/top-charities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit ?? 5)), 100);
    const results = await store.topCharities(limit);
    res.json(results);
  } catch (err) { next(err); }
});

// ── Error handlers ────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "route not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
