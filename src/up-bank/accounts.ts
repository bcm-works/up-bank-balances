import * as App from "-/constants.ts";
import { fetchAll } from "-/up/api.ts";
import type { AccountResource } from "-/up/types.ts";

export async function listAccounts(): Promise<AccountResource[]> {
  return await fetchAll<AccountResource>("/accounts?page%5Bsize%5D=100");
}

export async function AccountSummary(): Promise<string[]> {
  // deno-lint-ignore prefer-const
  let FinalOutput: string[] = [];

  // Get a list of all open accounts
  const ApiResponseJsonData = await listAccounts();

  for (const Account of ApiResponseJsonData) {
    const AccountInfo = Account.attributes;

    // Remove all emojis from account names
    const AccountDisplayName = AccountInfo.displayName.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    ).trim();

    FinalOutput.push(AccountDisplayName + ": " + App.CurrencySymbol + AccountInfo.balance.value);
  }

  return FinalOutput;
}

export async function MainAccount(): Promise<string> {
  // Get a list of all open accounts
  const ApiResponseJsonData = await listAccounts();

  for (const Account of ApiResponseJsonData) {
    const AccountInfo = Account.attributes;
    if (AccountInfo.accountType == "TRANSACTIONAL" && AccountInfo.ownershipType == "INDIVIDUAL") {
      // This is the main individual debit account, use this ID
      return Account.id;
    }
  }

  return "";
}
