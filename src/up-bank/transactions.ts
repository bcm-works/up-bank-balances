import * as App from "-/constants.ts";
import moment from "moment";
import { fetchAll } from "-/up/api.ts";
import type { TransactionResource } from "-/up/types.ts";

export async function getTransactionsForAccount(BankAccountId: string): Promise<TransactionResource[]> {
  return await fetchAll<TransactionResource>(
    "/accounts/" + encodeURIComponent(BankAccountId) + "/transactions?page%5Bsize%5D=100"
  );
}

export async function TransactionsForAccount(BankAccountId: string): Promise<string[]> {
  // deno-lint-ignore prefer-const
  let TransactionList: string[] = [];

  const ApiResponseJsonData = (await getTransactionsForAccount(BankAccountId)).slice(0, 20);

  for (const Transaction of ApiResponseJsonData) {
    const TransactionInfo = Transaction.attributes;
    const TransactionDate = moment(TransactionInfo.createdAt).fromNow();

    // Fix the output of debit transactions
    let TransactionAmount = (App.CurrencySymbol + TransactionInfo.amount.value).replace(
      App.CurrencySymbol + "-",
      "-" + App.CurrencySymbol
    );

    if (TransactionAmount.indexOf("-" + App.CurrencySymbol) == -1) {
      // This transaction is a credit
      TransactionAmount = "+" + TransactionAmount;
    }

    const TransactionItem: string[] = [
      TransactionAmount + ": ",
      TransactionInfo.description.trim(),
      TransactionInfo.message ? ", " + TransactionInfo.message.trim() : "",
      " (" + TransactionDate + ")"
    ];

    TransactionList.push(
      TransactionItem.join("")
    );
  }

  return TransactionList;
}
