export interface AccountResource {
  id: string;
  attributes: {
    displayName: string;
    accountType: "SAVER" | "TRANSACTIONAL" | "HOME_LOAN";
    ownershipType: "INDIVIDUAL" | "JOINT";
    balance: { currencyCode: string; value: string; valueInBaseUnits: number };
    createdAt: string;
  };
}

export interface TransactionResource {
  id: string;
  attributes: {
    status: "HELD" | "SETTLED";
    description: string;
    message: string | null;
    amount: { currencyCode: string; value: string; valueInBaseUnits: number };
    foreignAmount: { currencyCode: string; value: string; valueInBaseUnits: number } | null;
    transactionType: string | null;
    settledAt: string | null;
    createdAt: string;
    isCategorizable: boolean;
    roundUp: { amount: { value: string } } | null;
    cashback: { amount: { value: string }; description: string } | null;
    cardPurchaseMethod: { method: string; cardNumberSuffix: string | null } | null;
    note: { text: string } | null;
    deepLinkURL: string | null;
  };
  relationships: {
    account?: { data: { id: string } | null };
    transferAccount?: { data: { id: string } | null };
    category?: { data: { id: string } | null };
    tags?: { data: { id: string }[] };
    attachment?: { data: { id: string } | null };
  };
}
