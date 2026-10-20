"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DraftAction } from "@/lib/invoice/draft-reducer";
import { newId } from "@/lib/ids";
import { fieldId } from "@/lib/invoice/draft";
import type { LineItemDraft } from "@/lib/invoice/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Affixed, Field, describedBy } from "./field";

type ErrorFor = (path: string, rawValue: string) => string | undefined;

/** Rows of description / quantity / unit price with a computed amount. Stacks into cards on phones. */
export function LineItemsEditor({
  lines,
  lineTotalsCents,
  errorFor,
  dispatch,
  onBlurField,
}: {
  lines: LineItemDraft[];
  lineTotalsCents: number[];
  errorFor: ErrorFor;
  dispatch: (action: DraftAction) => void;
  onBlurField: (path: string) => void;
}) {
  // After "Add line item", move focus to the new row's description.
  const focusIndex = useRef<number | null>(null);
  useEffect(() => {
    if (focusIndex.current === null) return;
    document.getElementById(fieldId(`lineItems.${focusIndex.current}.description`))?.focus();
    focusIndex.current = null;
  }, [lines.length]);

  return (
    <div>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1fr)_5rem_7.5rem_6.5rem_2.5rem] gap-3 border-b border-border pb-2 sm:grid"
      >
        <span className="eyebrow text-muted-foreground">Description</span>
        <span className="eyebrow text-right text-muted-foreground">Qty</span>
        <span className="eyebrow text-right text-muted-foreground">Unit price</span>
        <span className="eyebrow text-right text-muted-foreground">Amount</span>
        <span />
      </div>

      <ol className="divide-y divide-border">
        {lines.map((line, index) => {
          const n = index + 1;
          const ids = {
            description: fieldId(`lineItems.${index}.description`),
            quantity: fieldId(`lineItems.${index}.quantity`),
            unitPrice: fieldId(`lineItems.${index}.unitPrice`),
          };
          const errors = {
            description: errorFor(`lineItems.${index}.description`, line.description),
            quantity: errorFor(`lineItems.${index}.quantity`, line.quantity),
            unitPrice: errorFor(`lineItems.${index}.unitPrice`, line.unitPrice),
          };
          const update = (patch: Partial<Omit<LineItemDraft, "id">>) => dispatch({ type: "updateLine", id: line.id, patch });

          return (
            <li
              key={line.id}
              className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_5rem_7.5rem_6.5rem_2.5rem] sm:items-start sm:py-3"
            >
              <Field label={`Line ${n} description`} labelClassName="sm:sr-only" htmlFor={ids.description} error={errors.description} className="col-span-2 sm:col-span-1">
                <Input
                  id={ids.description}
                  value={line.description}
                  placeholder="What did you provide?"
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={describedBy(ids.description, errors.description)}
                  onChange={(e) => update({ description: e.target.value })}
                  onBlur={() => onBlurField(`lineItems.${index}.description`)}
                />
              </Field>
              <Field label={`Line ${n} quantity`} labelClassName="sm:sr-only" htmlFor={ids.quantity} error={errors.quantity}>
                <Input
                  id={ids.quantity}
                  value={line.quantity}
                  inputMode="decimal"
                  autoComplete="off"
                  className="text-right tabular-nums"
                  aria-invalid={errors.quantity ? true : undefined}
                  aria-describedby={describedBy(ids.quantity, errors.quantity)}
                  onChange={(e) => update({ quantity: e.target.value })}
                  onBlur={() => onBlurField(`lineItems.${index}.quantity`)}
                />
              </Field>
              <Field label={`Line ${n} unit price`} labelClassName="sm:sr-only" htmlFor={ids.unitPrice} error={errors.unitPrice}>
                <Affixed prefix="$">
                  <Input
                    id={ids.unitPrice}
                    value={line.unitPrice}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    className="pl-7 text-right tabular-nums"
                    aria-invalid={errors.unitPrice ? true : undefined}
                    aria-describedby={describedBy(ids.unitPrice, errors.unitPrice)}
                    onChange={(e) => update({ unitPrice: e.target.value })}
                    onBlur={() => onBlurField(`lineItems.${index}.unitPrice`)}
                  />
                </Affixed>
              </Field>
              <div className="flex items-center justify-between gap-2 sm:contents">
                <p className="text-sm tabular-nums sm:flex sm:h-10 sm:items-center sm:justify-end">
                  <span className="text-muted-foreground sm:sr-only">Amount </span>
                  <span className="font-medium">{formatCents(lineTotalsCents[index] ?? 0)}</span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove line ${n}${line.description.trim() ? `, ${line.description.trim()}` : ""}`}
                  disabled={lines.length === 1}
                  onClick={() => dispatch({ type: "removeLine", id: line.id })}
                  className={cn("text-muted-foreground hover:text-destructive sm:mt-0")}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          focusIndex.current = lines.length;
          dispatch({ type: "addLine", id: newId() });
        }}
      >
        <Plus aria-hidden="true" />
        Add line item
      </Button>
    </div>
  );
}
