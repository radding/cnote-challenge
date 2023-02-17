import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    /**
     * The transactions table keeps track of all transactions for a given user. This table is intended to act like a ledger, that is all new transactions are 
     * appened to the end of the log. You can not delete, nor update a transaction that is inserted into the ledger. To remove a transaction, a new transaction
     * with the opposite ammount is applied. 
     */
    await knex.schema.createTable("transactions", (table) => {
        table.uuid("id").primary(); // The transaction ID. Is a UUID to mask how many transactions are in the system.
        table.string("user_uid").notNullable(); // In a real application, this would be foriegn key to a user id if this was a monolith.
        table.bigInteger("amount").notNullable(); // The amount the transaction is good for
        table.timestamp("created_time").notNullable(); // When the transaction was created
        table.string("description"); // the (optional) description of the transaction

        table.index(["user_uid", "created_time"]);
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("transactions");
}

