import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { DonationModel } from "./donation.model.js";
import * as store from "./store.js";

const app = express();
app.use(express.json());

const PORT = 3000;
const MONGO_URL = process.env.MONGO_URL ?? "mongodb://localhost:27017/donations";

await mongoose.connect(MONGO_URL);
console.log("connected to mongo");

const count = await DonationModel.estimatedDocumentCount();
if (count === 0) {
  await DonationModel.create([
    { charityId: 10, donor: "Alice", amount: 25.0 },
    { charityId: 10, donor: "Bob", amount: 5.5 },
    { charityId: 20, donor: "Carol", amount: 100.0 },
  ]);
  console.log("seeded 3 donations");
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/donations", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result = await store.getAll();
    const { charityId, minAmount } = req.query;

    if (charityId !== undefined) {
      result = result.filter((d) => d.charityId === Number(charityId));
    }
    if (minAmount !== undefined) {
      result = result.filter((d) => d.amount >= Number(minAmount));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
});

app.post("/donations", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { charityId, donor, amount } = req.body as {
      charityId: unknown;
      donor: unknown;
      amount: unknown;
    };

    if (typeof charityId !== "number") {
      return res.status(400).json({ error: "charityId is required and must be a number" });
    }
    if (typeof donor !== "string" || donor.trim() === "") {
      return res.status(400).json({ error: "donor is required and must be a non-empty string" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount is required and must be a positive number" });
    }

    const created = await store.create({ charityId, donor: donor.trim(), amount });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.get("/charities/:id/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charityId = Number(req.params.id);
    const summary = await store.summaryByCharity(charityId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
});

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
