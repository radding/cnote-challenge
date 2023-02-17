/**
 * In a real world scenario, I would store the interest in the database, possibly tied to the account.
 */
export class InterestRepository {
    constructor(private readonly annualInterest: number) {}

    async getApplicableInterest() {
        const applicableInterest = this.annualInterest / 365;
        return applicableInterest;
    }
}