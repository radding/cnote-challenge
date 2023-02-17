import Zod from "zod";

export interface Transaction {
    amount: number; // The value of the transation. A positive number means the money was deposited, a negative number means money was with drawn.
    userID: string; // The user ID the transaction belongs to
    description?: string; // Optional transaction description (IE user initiated deposit, or interest payment)
    date: Date;
    id: string;
}

export const transactionObject = Zod.object({
    id: Zod.string(),
    amount: Zod.number(),
    date: Zod.date(),
    description: Zod.string().optional(),
    userID: Zod.string(),
});
