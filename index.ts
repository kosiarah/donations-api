import express, { NextFunction, Request, Response } from "express";
import * as store from "./store.js";

const app = express();
app.use(express.json()); // parse JSON bodies — must be before any route that reads req.body

const PORT = 3000;

// Step 1 — health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Step 3 — list donations with optional filters
app.get("/donations", (req: Request, res: Response) => {
  let result = store.getAll();
  const { charityId, minAmount } = req.query;

  if (charityId !== undefined) {
    result = result.filter((d) => d.charityId === Number(charityId));
  }
  if (minAmount !== undefined) {
    result = result.filter((d) => d.amount >= Number(minAmount));
  }

  res.json(result);
});

// Step 4 — get one donation by id
app.get("/donations/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const donation = store.getById(id);
  if (!donation) {
    return res.status(404).json({ error: "donation not found" });
  }
  res.json(donation);
});

// Step 5 — create a donation
app.post("/donations", (req: Request, res: Response) => {
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

  const created = store.create({ charityId, donor: donor.trim(), amount });
  res.status(201).json(created);
});

// Step 6 — charity summary (aggregation preview)
app.get("/charities/:id/summary", (req: Request, res: Response) => {
  const charityId = Number(req.params.id);
  const summary = store.summaryByCharity(charityId);
  res.json(summary);
});

// Step 7 — delete a donation
app.delete("/donations/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const deleted = store.remove(id);
  if (!deleted) {
    return res.status(404).json({ error: "donation not found" });
  }
  res.status(204).end();
});

// Step 8 — catch-all 404 for unknown routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "route not found" });
});

// Step 8 — error handler (4 args = how Express identifies it as an error handler)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
