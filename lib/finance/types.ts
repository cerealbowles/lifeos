export type AccountDTO = {
  id: string;
  name: string;
  accountType: string;
  institution: string | null;
  lastFour: string | null;
  statementCloseDay: number | null;
  nextStatementCloseAt: string | null;
};

export type ReminderDTO = {
  id: string;
  financialAccountId: string | null;
  name: string;
  amount: string | null;
  nextDueAt: string;
  autopay: boolean | null;
};
