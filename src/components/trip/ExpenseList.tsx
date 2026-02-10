"use client"

import { useState, useMemo } from "react"
import { Plus, MoreHorizontal, Edit2, Trash2, ArrowLeftRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FormDialog } from "@/components/ui/form-dialog"
import { FormField } from "@/components/ui/form-field"
import { TextField } from "@/components/ui/text-field"
import { SelectField } from "@/components/ui/select-field"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Expense, ExchangeRate, ExpenseCategory, CURRENCIES, parseLocalDate, formatLocalDate } from "@/types"
import {
  addExpense,
  updateExpense,
  deleteExpense,
  upsertExchangeRate,
  deleteExchangeRate,
  updateTrip,
} from "@/lib/db"

interface ExpenseListProps {
  tripId: string
  expenses: Expense[]
  exchangeRates: ExchangeRate[]
  homeCurrency: string
  onRefresh: () => Promise<void>
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  accommodation: "Accommodation",
  food: "Food & Drink",
  transport: "Transport",
  activities: "Activities",
  shopping: "Shopping",
  other: "Other",
}

const CATEGORY_ORDER: ExpenseCategory[] = [
  "accommodation",
  "food",
  "transport",
  "activities",
  "shopping",
  "other",
]

const ZERO_DECIMAL_CURRENCIES = ["JPY", "KRW", "VND", "IDR", "CLP", "HUF", "ISK"]

function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode)
  const symbol = currency?.symbol || currencyCode
  const decimals = ZERO_DECIMAL_CURRENCIES.includes(currencyCode) ? 0 : 2
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function convertAmount(
  amount: number,
  fromCurrency: string,
  homeCurrency: string,
  rates: ExchangeRate[]
): number | null {
  if (fromCurrency === homeCurrency) return amount

  // Look for rate: 1 homeCurrency = X fromCurrency
  const directRate = rates.find(
    r => r.fromCurrency === homeCurrency && r.toCurrency === fromCurrency
  )
  if (directRate) return amount / directRate.rate

  // Look for inverse: 1 fromCurrency = X homeCurrency
  const inverseRate = rates.find(
    r => r.fromCurrency === fromCurrency && r.toCurrency === homeCurrency
  )
  if (inverseRate) return amount * inverseRate.rate

  return null
}

const CURRENCY_OPTIONS = CURRENCIES.map(c => ({
  value: c.code,
  label: `${c.code} (${c.symbol})`,
}))

const CATEGORY_OPTIONS = CATEGORY_ORDER.map(cat => ({
  value: cat,
  label: CATEGORY_LABELS[cat],
}))

export function ExpenseList({ tripId, expenses, exchangeRates, homeCurrency, onRefresh }: ExpenseListProps) {
  // Expense dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Expense form state
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(homeCurrency)
  const [category, setCategory] = useState<ExpenseCategory>("other")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState("")

  // Exchange rate dialog state
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false)
  const [isSavingRate, setIsSavingRate] = useState(false)
  const [rateFromCurrency, setRateFromCurrency] = useState(homeCurrency)
  const [rateToCurrency, setRateToCurrency] = useState("")
  const [rateValue, setRateValue] = useState("")

  // Computed values
  const totalInHomeCurrency = useMemo(() => {
    let total = 0
    for (const expense of expenses) {
      const converted = convertAmount(expense.amount, expense.currency, homeCurrency, exchangeRates)
      if (converted !== null) total += converted
    }
    return total
  }, [expenses, homeCurrency, exchangeRates])

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const expense of expenses) {
      const converted = convertAmount(expense.amount, expense.currency, homeCurrency, exchangeRates)
      if (converted !== null) {
        totals[expense.category] = (totals[expense.category] || 0) + converted
      }
    }
    return totals
  }, [expenses, homeCurrency, exchangeRates])

  // Group expenses by date
  const expensesByDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {}
    for (const expense of expenses) {
      if (!groups[expense.date]) groups[expense.date] = []
      groups[expense.date].push(expense)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [expenses])

  // Handlers
  const handleOpenExpenseDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setDescription(expense.description)
      setAmount(String(expense.amount))
      setCurrency(expense.currency)
      setCategory(expense.category)
      setDate(parseLocalDate(expense.date))
      setNotes(expense.notes || "")
    } else {
      setEditingExpense(null)
      setDescription("")
      setAmount("")
      setCurrency(homeCurrency)
      setCategory("other")
      setDate(new Date())
      setNotes("")
    }
    setIsExpenseDialogOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!description.trim() || !amount || !date) return
    setIsSaving(true)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setIsSaving(false)
      return
    }

    const converted = convertAmount(parsedAmount, currency, homeCurrency, exchangeRates)
    const expenseData = {
      description: description.trim(),
      amount: parsedAmount,
      currency,
      convertedAmount: converted ?? undefined,
      category,
      date: formatLocalDate(date),
      notes: notes.trim() || undefined,
    }

    if (editingExpense) {
      await updateExpense(tripId, editingExpense.id, expenseData)
    } else {
      await addExpense(tripId, expenseData)
    }

    setIsExpenseDialogOpen(false)
    setIsSaving(false)
    await onRefresh()
  }

  const handleDeleteExpense = async () => {
    if (!editingExpense) return
    setIsSaving(true)
    await deleteExpense(tripId, editingExpense.id)
    setIsExpenseDialogOpen(false)
    setIsSaving(false)
    await onRefresh()
  }

  const handleHomeCurrencyChange = async (newCurrency: string) => {
    await updateTrip(tripId, { homeCurrency: newCurrency })
    await onRefresh()
  }

  const handleOpenRateDialog = () => {
    setRateFromCurrency(homeCurrency)
    setRateToCurrency("")
    setRateValue("")
    setIsRateDialogOpen(true)
  }

  const handleSaveRate = async () => {
    if (!rateToCurrency || !rateValue) return
    const parsed = parseFloat(rateValue)
    if (isNaN(parsed) || parsed <= 0) return
    setIsSavingRate(true)
    await upsertExchangeRate(tripId, rateFromCurrency, rateToCurrency, parsed)
    setRateToCurrency("")
    setRateValue("")
    setIsSavingRate(false)
    await onRefresh()
  }

  const handleDeleteRate = async (rateId: string) => {
    await deleteExchangeRate(tripId, rateId)
    await onRefresh()
  }

  const formatDateHeading = (dateStr: string) => {
    const d = parseLocalDate(dateStr)
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  return (
    <div className="max-w-[800px] mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-h1 font-fustat text-text-primary">Expenses</h2>
          <p className="text-body text-text-secondary mt-1">
            Total: {formatCurrency(totalInHomeCurrency, homeCurrency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={handleOpenRateDialog} leftIcon={<ArrowLeftRight />}>
            Rates
          </Button>
          <Button variant="primary" size="small" onClick={() => handleOpenExpenseDialog()} leftIcon={<Plus />}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Home Currency Selector */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border-muted">
        <span className="text-small text-text-secondary">Home currency:</span>
        <SelectField
          value={homeCurrency}
          onChange={handleHomeCurrencyChange}
          options={CURRENCY_OPTIONS}
          className="w-[180px] !p-2 text-small"
        />
      </div>

      {/* Category Summary */}
      {expenses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_ORDER.filter(cat => categoryTotals[cat]).map(cat => (
            <div
              key={cat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-small text-text-secondary"
            >
              <span>{CATEGORY_LABELS[cat]}</span>
              <span className="text-text-primary font-medium">
                {formatCurrency(categoryTotals[cat], homeCurrency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expense List */}
      {expenses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-body text-text-secondary mb-4">No expenses logged yet</p>
          <Button variant="secondary" size="small" onClick={() => handleOpenExpenseDialog()} leftIcon={<Plus />}>
            Add your first expense
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {expensesByDate.map(([dateStr, dateExpenses]) => (
            <div key={dateStr}>
              <h3 className="text-h4 font-fustat text-text-secondary uppercase tracking-wide mb-2">
                {formatDateHeading(dateStr)}
              </h3>
              <div className="border border-border-muted rounded-lg overflow-hidden">
                {dateExpenses.map((expense, i) => {
                  const converted = convertAmount(expense.amount, expense.currency, homeCurrency, exchangeRates)
                  const needsRate = expense.currency !== homeCurrency && converted === null

                  return (
                    <div
                      key={expense.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 group ${
                        i < dateExpenses.length - 1 ? "border-b border-border-muted" : ""
                      }`}
                    >
                      {/* Description + Category */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body text-text-primary truncate">{expense.description}</span>
                          <span className="text-small text-text-tertiary shrink-0">
                            {CATEGORY_LABELS[expense.category]}
                          </span>
                        </div>
                        {expense.notes && (
                          <p className="text-small text-text-tertiary truncate mt-0.5">{expense.notes}</p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <div className="text-body text-text-primary font-medium">
                          {formatCurrency(expense.amount, expense.currency)}
                        </div>
                        {expense.currency !== homeCurrency && (
                          <div className="text-small text-text-tertiary">
                            {needsRate ? (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="w-3 h-3" />
                                No rate
                              </span>
                            ) : (
                              `~${formatCurrency(converted!, homeCurrency)}`
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenExpenseDialog(expense)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={async () => {
                              await deleteExpense(tripId, expense.id)
                              await onRefresh()
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Expense Dialog */}
      <FormDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        submitLabel={editingExpense ? "Save" : "Add"}
        onSubmit={handleSaveExpense}
        submitDisabled={!description.trim() || !amount || !date}
        loading={isSaving}
        onDelete={editingExpense ? handleDeleteExpense : undefined}
      >
        <FormField label="Description">
          <TextField
            placeholder="e.g., Hotel, Suica card, Dinner"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount">
            <TextField
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField label="Currency">
            <SelectField
              value={currency}
              onChange={setCurrency}
              options={CURRENCY_OPTIONS}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category">
            <SelectField
              value={category}
              onChange={(v) => setCategory(v as ExpenseCategory)}
              options={CATEGORY_OPTIONS}
            />
          </FormField>
          <FormField label="Date">
            <DatePickerField
              value={date}
              onChange={setDate}
            />
          </FormField>
        </div>

        <FormField label="Notes" optional>
          <TextField
            placeholder="Any additional details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>
      </FormDialog>

      {/* Exchange Rate Management Dialog */}
      <FormDialog
        open={isRateDialogOpen}
        onOpenChange={setIsRateDialogOpen}
        title="Exchange Rates"
        submitLabel="Done"
        onSubmit={() => setIsRateDialogOpen(false)}
      >
        {/* Existing rates */}
        {exchangeRates.length > 0 && (
          <div className="space-y-2">
            {exchangeRates.map(rate => (
              <div key={rate.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-body text-text-primary">
                  1 {rate.fromCurrency} = {rate.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {rate.toCurrency}
                </span>
                <button
                  onClick={() => handleDeleteRate(rate.id)}
                  className="p-1 rounded hover:bg-neutral-200 text-text-secondary"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {exchangeRates.length === 0 && (
          <p className="text-small text-text-secondary text-center py-2">
            No exchange rates set. Add one below.
          </p>
        )}

        {/* Add new rate */}
        <div className="border-t border-border-muted pt-4">
          <p className="text-h3 font-fustat text-text-primary mb-3">Add Rate</p>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mb-3">
            <FormField label="From">
              <SelectField
                value={rateFromCurrency}
                onChange={setRateFromCurrency}
                options={CURRENCY_OPTIONS}
              />
            </FormField>
            <span className="text-text-secondary pb-3">=</span>
            <FormField label="To">
              <SelectField
                value={rateToCurrency}
                onChange={setRateToCurrency}
                options={CURRENCY_OPTIONS}
                placeholder="Select"
              />
            </FormField>
          </div>
          <div className="flex gap-2">
            <FormField label="Rate" className="flex-1">
              <TextField
                type="number"
                placeholder={`1 ${rateFromCurrency} = ?`}
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                min="0"
                step="0.000001"
              />
            </FormField>
            <div className="flex items-end">
              <Button
                variant="secondary"
                size="small"
                onClick={handleSaveRate}
                disabled={!rateToCurrency || !rateValue || isSavingRate}
                className="mb-[1px]"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
