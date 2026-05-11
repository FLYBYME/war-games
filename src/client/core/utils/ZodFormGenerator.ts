/**
 * ZodFormGenerator — Utility to generate ui-lib form fields from Zod schemas.
 *
 * This is the core "Schema-Driven UI" engine described in the UI spec §9.
 * It can be used by any extension to dynamically build type-safe forms.
 */

import { z } from 'zod';
import * as uiLib from '../../ui-lib';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedField {
    key: string;
    label: string;
    element: HTMLElement;
    getValue: () => unknown;
    isAutoPopulated: boolean;
}

export interface FormGeneratorOptions {
    /** Context values to auto-populate known fields */
    contextValues?: Record<string, string | undefined>;
    /** Keys to hide entirely (e.g., internal system fields) */
    hiddenKeys?: string[];
    /** Keys to show as read-only */
    readonlyKeys?: string[];
}

// ─── Well-known context keys ─────────────────────────────────────────────────

const CONTEXT_KEYS = new Set(['matchId', 'side', 'batchId']);

// ─── Generator ───────────────────────────────────────────────────────────────

/**
 * Generate form fields from a Zod schema.
 */
export function generateFormFields(
    schema: z.ZodTypeAny,
    options: FormGeneratorOptions = {}
): GeneratedField[] {
    const { contextValues = {}, hiddenKeys = [], readonlyKeys = [] } = options;
    const fields: GeneratedField[] = [];

    const inner = unwrap(schema);
    if (!(inner instanceof z.ZodObject)) return fields;

    const shape = inner.shape as Record<string, z.ZodTypeAny>;

    for (const [key, fieldSchema] of Object.entries(shape)) {
        if (hiddenKeys.includes(key)) continue;

        const description = fieldSchema.description ?? key;
        const isContext = CONTEXT_KEYS.has(key);
        const contextValue = contextValues[key];
        const isReadonly = readonlyKeys.includes(key);

        // Auto-populate context fields
        if (isContext && contextValue) {
            const badge = new uiLib.Badge({
                count: `${key}: ${contextValue}`,
                variant: 'accent',
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, badge.getElement()),
                getValue: () => contextValue,
                isAutoPopulated: true,
            });
            continue;
        }

        const unwrapped = unwrap(fieldSchema);
        const isOptional = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault;

        // ── String ───────────────────────────────────────────────────────
        if (unwrapped instanceof z.ZodString) {
            const input = new uiLib.TextInput({
                placeholder: description + (isOptional ? ' (optional)' : ''),
                value: '',
                disabled: isReadonly,
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, input.getElement()),
                getValue: () => input.getValue() || undefined,
                isAutoPopulated: false,
            });
        }
        // ── Number ───────────────────────────────────────────────────────
        else if (unwrapped instanceof z.ZodNumber) {
            const input = new uiLib.TextInput({
                placeholder: description + (isOptional ? ' (optional)' : ''),
                value: '',
                type: 'number',
                disabled: isReadonly,
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, input.getElement()),
                getValue: () => {
                    const v = input.getValue();
                    return v ? Number(v) : undefined;
                },
                isAutoPopulated: false,
            });
        }
        // ── Boolean ──────────────────────────────────────────────────────
        else if (unwrapped instanceof z.ZodBoolean) {
            const toggle = new uiLib.Switch({
                checked: false,
                label: description,
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, toggle.getElement()),
                getValue: () => {
                    const cb = toggle.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement | null;
                    return cb?.checked ?? false;
                },
                isAutoPopulated: false,
            });
        }
        // ── Enum ─────────────────────────────────────────────────────────
        else if (unwrapped instanceof z.ZodEnum) {
            const opts = (unwrapped as z.ZodEnum<[string, ...string[]]>).options;
            const select = new uiLib.Select({
                options: opts.map((o: string) => ({ label: o, value: o })),
                value: opts[0],
                placeholder: description,
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, select.getElement()),
                getValue: () => {
                    const sel = select.getElement().querySelector('select') as HTMLSelectElement | null;
                    return sel?.value ?? opts[0];
                },
                isAutoPopulated: false,
            });
        }
        // ── Nested Object (Vector3, etc.) ────────────────────────────────
        else if (unwrapped instanceof z.ZodObject) {
            // Check if it looks like a Vector3
            const objShape = unwrapped.shape as Record<string, z.ZodTypeAny>;
            const shapeKeys = Object.keys(objShape);

            if (shapeKeys.includes('x') && shapeKeys.includes('y') && shapeKeys.includes('z') && shapeKeys.length <= 4) {
                const v3 = new uiLib.Vector3Field({
                    value: { x: 0, y: 0, z: 0 },
                });
                fields.push({
                    key,
                    label: description,
                    element: wrapWithLabel(key, description, v3.getElement()),
                    getValue: () => v3.getValue(),
                    isAutoPopulated: false,
                });
            } else {
                // Generic nested object — render as JSON textarea
                const textarea = new uiLib.TextArea({
                    placeholder: `${description} (JSON)`,
                    value: '',
                    rows: 3,
                });
                fields.push({
                    key,
                    label: description,
                    element: wrapWithLabel(key, description, textarea.getElement()),
                    getValue: () => {
                        const val = (textarea.getElement().querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? '';
                        if (!val) return undefined;
                        try { return JSON.parse(val); } catch { return val; }
                    },
                    isAutoPopulated: false,
                });
            }
        }
        // ── Array ────────────────────────────────────────────────────────
        else if (unwrapped instanceof z.ZodArray) {
            const textarea = new uiLib.TextArea({
                placeholder: `${description} (JSON array)` + (isOptional ? ' (optional)' : ''),
                value: '',
                rows: 3,
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, textarea.getElement()),
                getValue: () => {
                    const val = (textarea.getElement().querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? '';
                    if (!val) return undefined;
                    try { return JSON.parse(val); } catch { return undefined; }
                },
                isAutoPopulated: false,
            });
        }
        // ── Fallback ─────────────────────────────────────────────────────
        else {
            const textarea = new uiLib.TextArea({
                placeholder: `${description} (JSON)` + (isOptional ? ' (optional)' : ''),
                value: '',
                rows: 2,
            });
            fields.push({
                key,
                label: description,
                element: wrapWithLabel(key, description, textarea.getElement()),
                getValue: () => {
                    const val = (textarea.getElement().querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? '';
                    if (!val) return undefined;
                    try { return JSON.parse(val); } catch { return val; }
                },
                isAutoPopulated: false,
            });
        }
    }

    return fields;
}

/**
 * Collect values from generated fields into a payload object.
 */
export function collectFormValues(fields: GeneratedField[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
        const value = field.getValue();
        if (value !== undefined) {
            payload[field.key] = value;
        }
    }
    return payload;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
    if (schema instanceof z.ZodOptional) return unwrap(schema.unwrap());
    if (schema instanceof z.ZodDefault) return unwrap(schema.removeDefault());
    return schema;
}

function wrapWithLabel(key: string, description: string, inputEl: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '2px';

    const label = document.createElement('label');
    label.textContent = key;
    label.title = description;
    Object.assign(label.style, {
        fontSize: '11px',
        color: 'var(--text-muted, #888)',
        fontWeight: '600',
    });

    wrapper.appendChild(label);
    wrapper.appendChild(inputEl);
    return wrapper;
}
