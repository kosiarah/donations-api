export interface Donation {
  id: number;
  charityId: number;
  donor: string;
  amount: number;
}

// the shape of what a client sends when creating one (no id yet — server assigns it)
export type NewDonation = Omit<Donation, "id">;
