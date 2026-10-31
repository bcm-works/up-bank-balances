import { join } from "@std/path";
import { Application } from "@oak/oak/application";

import { listAccounts } from "-/up/accounts.ts";
import { getTransactionsForAccount } from "-/up/transactions.ts";
import type { AccountResource, TransactionResource } from "-/up/types.ts";
import * as App from "-/constants.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character] || character);
}

function accountName(account: AccountResource): string {
  return account.attributes.displayName.trim();
}

function amount(value: string): string {
  return (value.startsWith("-") ? "-" + App.CurrencySymbol + value.slice(1) : "+" + App.CurrencySymbol + value);
}

function transactionCategory(transaction: TransactionResource): string {
  return transaction.relationships.category?.data?.id || "Uncategorised";
}

function renderTransaction(transaction: TransactionResource): string {
  const info = transaction.attributes;
  const tags = transaction.relationships.tags?.data?.map((tag) => tag.id) || [];
  const badges = [
    `<span class="badge ${info.status.toLowerCase()}">${escapeHtml(info.status)}</span>`,
    `<span class="badge">${escapeHtml(transactionCategory(transaction))}</span>`,
    ...tags.map((tag) => `<span class="badge">#${escapeHtml(tag)}</span>`),
    transaction.relationships.attachment?.data ? '<span class="badge">Receipt</span>' : ""
  ].join("");
  const details = [
    info.message?.trim(),
    info.transactionType,
    info.foreignAmount ? `${info.foreignAmount.currencyCode} ${info.foreignAmount.value}` : "",
    info.cardPurchaseMethod ? info.cardPurchaseMethod.method.replaceAll("_", " ") : "",
    info.note?.text
  ].filter((detail): detail is string => Boolean(detail)).map(escapeHtml).join(" · ");
  const date = new Date(info.createdAt).toLocaleString();
  const deepLink = info.deepLinkURL ? ` <a href="${escapeHtml(info.deepLinkURL)}">Open in Up</a>` : "";

  return `<li class="transaction">
    <div class="transaction-main"><strong class="amount ${info.amount.value.startsWith("-") ? "debit" : "credit"}">${
    escapeHtml(amount(info.amount.value))
  }</strong><strong>${escapeHtml(info.description.trim())}</strong></div>
    <div class="transaction-meta">${escapeHtml(date)} · ${badges}${deepLink}</div>
    ${details ? `<div class="transaction-details">${details}</div>` : ""}
  </li>`;
}

function renderAccount(account: AccountResource, selected: boolean): string {
  const info = account.attributes;
  return `<article class="account-card ${selected ? "selected" : ""}">
    <h3>${escapeHtml(accountName(account))}</h3>
    <strong class="balance">${escapeHtml(App.CurrencySymbol + info.balance.value)}</strong>
    <span>${escapeHtml(info.accountType.replace("_", " "))} · ${escapeHtml(info.ownershipType.toLowerCase())}</span>
  </article>`;
}

function renderPage(
  accounts: AccountResource[],
  selectedAccountId: string,
  transactions: TransactionResource[]
): string {
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const totalBaseUnits = accounts.reduce((total, account) => total + account.attributes.balance.valueInBaseUnits, 0);
  const total = (totalBaseUnits / 100).toFixed(2);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bank Accounts</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"></head><body>
    <header><div><h1>Bank Accounts</h1><p class="muted">Up account overview</p></div><a class="refresh" href="/?account=${
    encodeURIComponent(selectedAccountId)
  }">Refresh</a></header>
    <main>
      <section><div class="section-heading"><h2>Accounts</h2><strong>Total ${
    escapeHtml(App.CurrencySymbol + total)
  }</strong></div><div class="account-grid">${
    accounts.map((account) => renderAccount(account, account.id === selectedAccountId)).join("")
  }</div></section>
      <section class="transactions-section"><div class="section-heading"><h2>Transactions</h2><form method="get"><label for="account">Account</label><select id="account" name="account" onchange="this.form.submit()">${
    accounts.map((account) =>
      `<option value="${escapeHtml(account.id)}" ${account.id === selectedAccountId ? "selected" : ""}>${
        escapeHtml(accountName(account))
      }</option>`
    ).join("")
  }</select></form></div>
        ${
    selectedAccount ?
      `<p class="muted">${
        escapeHtml(accountName(selectedAccount))
      } · showing ${transactions.length} transactions</p><ul class="transactions">${
        transactions.length ? transactions.map(renderTransaction).join("") : "<li>No transactions found.</li>"
      }</ul>` :
      "<p>No accounts found.</p>"
  }
      </section>
    </main>
  </body></html>`;
}

const ScriptDirectory = "./";
const AssetsFavicon = join(ScriptDirectory, "assets", "favicon.svg");
const AssetsStyles = join(ScriptDirectory, "assets", "styles.css");
const PublicDirectory = join(ScriptDirectory, "public");
Deno.mkdirSync(PublicDirectory, { recursive: true });
Deno.copyFileSync(AssetsFavicon, join(PublicDirectory, "favicon.svg"));
Deno.copyFileSync(AssetsStyles, join(PublicDirectory, "styles.css"));

const app = new Application();
app.use(async (context, next) => {
  const pathname = context.request.url.pathname;
  if (pathname === "/" || pathname === "/index.html") {
    try {
      const accounts = await listAccounts();
      const requestedAccount = context.request.url.searchParams.get("account");
      const selectedAccountId = accounts.some((account) => account.id === requestedAccount) ?
        requestedAccount as string :
        accounts.find((account) => account.attributes.accountType === "TRANSACTIONAL")?.id || accounts[0]?.id || "";
      const transactions = selectedAccountId ? await getTransactionsForAccount(selectedAccountId) : [];
      context.response.headers.set("Cache-Control", "no-store");
      context.response.type = "html";
      context.response.body = renderPage(accounts, selectedAccountId, transactions);
    } catch (error) {
      context.response.status = 502;
      context.response.type = "html";
      context.response.body = `<h1>Unable to load Up data</h1><p>${
        escapeHtml(error instanceof Error ? error.message : "Unknown error")
      }</p><p><a href="/">Try again</a></p>`;
    }
    return;
  }

  try {
    await context.send({ root: PublicDirectory, index: "index.html" });
  } catch {
    await next();
  }
});

console.log('%cServing "public" directory at %chttp://localhost:8001', "color: green", "color: blue");
await app.listen({ port: 8001 });
