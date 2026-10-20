"use client";

import { EyeOff, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DraftAction } from "@/lib/invoice/draft-reducer";
import { newId } from "@/lib/ids";
import { fieldId } from "@/lib/invoice/draft";
import type { CustomField } from "@/lib/invoice/schema";
import { cn } from "@/lib/utils";
import { Field, describedBy } from "./field";

type ErrorFor = (path: string, rawValue: string) => string | undefined;

/** Label/value pairs with a "show on invoice" switch. Hidden rows stay in the editor, muted. */
export function CustomFieldsEditor({
  fields,
  errorFor,
  dispatch,
  onBlurField,
}: {
  fields: CustomField[];
  errorFor: ErrorFor;
  dispatch: (action: DraftAction) => void;
  onBlurField: (path: string) => void;
}) {
  const focusIndex = useRef<number | null>(null);
  useEffect(() => {
    if (focusIndex.current === null) return;
    document.getElementById(fieldId(`customFields.${focusIndex.current}.label`))?.focus();
    focusIndex.current = null;
  }, [fields.length]);

  return (
    <div>
      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          No custom fields yet. Add things like a PO number or project code.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {fields.map((field, index) => {
            const name = field.label.trim() || `field ${index + 1}`;
            const ids = {
              label: fieldId(`customFields.${index}.label`),
              value: fieldId(`customFields.${index}.value`),
              visible: fieldId(`customFields.${index}.visible`),
            };
            const errors = {
              label: errorFor(`customFields.${index}.label`, field.label),
              value: errorFor(`customFields.${index}.value`, field.value),
            };
            const update = (patch: Partial<Omit<CustomField, "id">>) =>
              dispatch({ type: "updateCustomField", id: field.id, patch });

            return (
              <li
                key={field.id}
                className={cn(
                  "grid grid-cols-2 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto_2.5rem] sm:items-start",
                  !field.visible && "[&_input]:bg-muted/60",
                )}
              >
                <Field label="Label" htmlFor={ids.label} error={errors.label}>
                  <Input
                    id={ids.label}
                    value={field.label}
                    placeholder="PO number"
                    aria-invalid={errors.label ? true : undefined}
                    aria-describedby={describedBy(ids.label, errors.label)}
                    onChange={(e) => update({ label: e.target.value })}
                    onBlur={() => onBlurField(`customFields.${index}.label`)}
                    className={cn(!field.visible && "text-muted-foreground")}
                  />
                </Field>
                <Field label="Value" htmlFor={ids.value} error={errors.value}>
                  <Input
                    id={ids.value}
                    value={field.value}
                    placeholder="7781"
                    aria-invalid={errors.value ? true : undefined}
                    aria-describedby={describedBy(ids.value, errors.value)}
                    onChange={(e) => update({ value: e.target.value })}
                    onBlur={() => onBlurField(`customFields.${index}.value`)}
                    className={cn(!field.visible && "text-muted-foreground")}
                  />
                </Field>
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:contents">
                  <div className="flex items-center gap-2.5 sm:mt-[1.625rem] sm:h-10">
                    <Switch
                      id={ids.visible}
                      checked={field.visible}
                      onCheckedChange={(visible) => update({ visible })}
                      aria-label={`Show ${name} on the invoice`}
                    />
                    <span className="flex w-[4.5rem] items-center gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
                      {field.visible ? (
                        "Visible"
                      ) : (
                        <>
                          <EyeOff className="size-3.5" />
                          Hidden
                        </>
                      )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${name}`}
                    onClick={() => dispatch({ type: "removeCustomField", id: field.id })}
                    className="text-muted-foreground hover:text-destructive sm:mt-[1.625rem]"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          focusIndex.current = fields.length;
          dispatch({ type: "addCustomField", id: newId() });
        }}
      >
        <Plus aria-hidden="true" />
        Add field
      </Button>
    </div>
  );
}
