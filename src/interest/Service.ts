import { addDays, differenceInCalendarDays, differenceInDays, format, isBefore } from "date-fns";
import { application } from "express";
import { TransactionRepo } from "../transactions/Repository";
import { InterestRepository } from "./Repository";

export class InterestService {
    constructor(private readonly interestRepo: InterestRepository, private readonly transactionRepo: TransactionRepo) {}

    public async getApplicableInterestForMonth(month: number, userID: string) {
        if (month < 0 || month > 11) {
            throw new Error("month must be a number between 0 and 11");
        }
        const todaysDate = new Date();
        const monthEnd = new Date(todaysDate.getFullYear(), month + 1, 0);

        const balances = await this.transactionRepo.getDailyBalanceForUser(userID, monthEnd);
        const applicableInterest = await this.interestRepo.getApplicableInterest();
        const interestPayments = balances.map((balance, ndx) => {
            const nextDay = balances[ndx + 1]?.day ?? monthEnd;
            const dayDifference = differenceInCalendarDays(new Date(nextDay).getTime(), new Date(balance.day).getTime());
            console.log(`difference between ${new Date(nextDay)} and ${new Date(balance.day)}: ${dayDifference}`)
            return dayDifference * applicableInterest * balance.balance;
        });
        console.log(interestPayments);

        const totalInterest = interestPayments.reduce((acc, payment) => acc + payment, 0) * 100;
        return Math.round(totalInterest) / 100;
    }
}