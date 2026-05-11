/**
 * ToolRunnerExtension — Schema-driven debug console for invoking any tool.
 *
 * Uses the globalContractRegistry to enumerate all 100+ tools,
 * then generates type-safe forms from Zod inputSchemas using ui-lib components.
 * Acts as a built-in "Postman" for the simulation API.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import { globalContractRegistry, ToolContract, toolKey } from '@sdk/contracts/index';
import { z } from 'zod';
import * as uiLib from '../ui-lib';

// ─── Zod-to-UI Mapper ───────────────────────────────────────────────────────

/**
 * Context-aware fields that can be auto-populated from services.
 */
const CONTEXT_KEYS = ['matchId', 'side', 'batchId'] as const;

interface FormField {
    key: string;
    element: HTMLElement;
    getValue: () => unknown;
    isContextField: boolean;
}

/**
 * Generates ui-lib form fields from a Zod object schema.
 * Returns an array of FormField descriptors.
 */
function generateFieldsFromSchema(
    schema: z.ZodTypeAny,
    contextValues: Record<string, string | undefined>
): FormField[] {
    const fields: FormField[] = [];

    // Unwrap ZodDefault / ZodOptional to get the inner shape
    const innerSchema = unwrapSchema(schema);

    if (!(innerSchema instanceof z.ZodObject)) {
        return fields;
    }

    const shape = innerSchema.shape as Record<string, z.ZodTypeAny>;

    for (const [key, fieldSchema] of Object.entries(shape)) {
        const description = getDescription(fieldSchema) ?? key;
        const isContextField = (CONTEXT_KEYS as ReadonlyArray<string>).includes(key);
        const contextValue = contextValues[key];

        // If it's a context field with a value, render as a hidden/read-only badge
        if (isContextField && contextValue) {
            const badge = new uiLib.Badge({
                count: `${key}: ${contextValue}`,
                variant: 'accent'
            });
            fields.push({
                key,
                element: wrapWithLabel(key, description, badge.getElement()),
                getValue: () => contextValue,
                isContextField: true
            });
            continue;
        }

        const unwrapped = unwrapSchema(fieldSchema);
        const isOptional = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault;

        // Map Zod types to ui-lib components
        if (unwrapped instanceof z.ZodString) {
            const input = new uiLib.TextInput({
                placeholder: description + (isOptional ? ' (optional)' : ''),
                value: ''
            });
            fields.push({
                key,
                element: wrapWithLabel(key, description, input.getElement()),
                getValue: () => {
                    const val = (input.getElement().querySelector('input') as HTMLInputElement | null)?.value ?? '';
                    return val || undefined;
                },
                isContextField: false
            });
        } else if (unwrapped instanceof z.ZodNumber) {
            const input = new uiLib.TextInput({
                placeholder: description + (isOptional ? ' (optional)' : ''),
                value: '',
                type: 'number'
            });
            fields.push({
                key,
                element: wrapWithLabel(key, description, input.getElement()),
                getValue: () => {
                    const val = (input.getElement().querySelector('input') as HTMLInputElement | null)?.value ?? '';
                    return val ? Number(val) : undefined;
                },
                isContextField: false
            });
        } else if (unwrapped instanceof z.ZodBoolean) {
            const toggle = new uiLib.Switch({
                checked: false,
                label: description
            });
            fields.push({
                key,
                element: wrapWithLabel(key, description, toggle.getElement()),
                getValue: () => {
                    const checkbox = toggle.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement | null;
                    return checkbox?.checked ?? false;
                },
                isContextField: false
            });
        } else if (unwrapped instanceof z.ZodEnum) {
            const options = (unwrapped as z.ZodEnum<[string, ...string[]]>).options;
            const select = new uiLib.Select({
                options: options.map((o: string) => ({ label: o, value: o })),
                value: options[0],
                placeholder: description
            });
            fields.push({
                key,
                element: wrapWithLabel(key, description, select.getElement()),
                getValue: () => {
                    const sel = select.getElement().querySelector('select') as HTMLSelectElement | null;
                    return sel?.value ?? options[0];
                },
                isContextField: false
            });
        } else {
            // Fallback: render as a JSON text area for complex types
            const textarea = new uiLib.TextArea({
                placeholder: `${description} (JSON)` + (isOptional ? ' (optional)' : ''),
                value: '',
                rows: 3
            });
            fields.push({
                key,
                element: wrapWithLabel(key, description, textarea.getElement()),
                getValue: () => {
                    const val = (textarea.getElement().querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? '';
                    if (!val) return undefined;
                    try { return JSON.parse(val); } catch { return val; }
                },
                isContextField: false
            });
        }
    }

    return fields;
}

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
    if (schema instanceof z.ZodOptional) return unwrapSchema(schema.unwrap());
    if (schema instanceof z.ZodDefault) return unwrapSchema(schema.removeDefault());
    return schema;
}

function getDescription(schema: z.ZodTypeAny): string | undefined {
    return schema.description;
}

function wrapWithLabel(key: string, description: string, inputEl: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '2px';

    const label = document.createElement('label');
    label.textContent = key;
    label.title = description;
    label.style.fontSize = '11px';
    label.style.color = 'var(--text-muted, #888)';
    label.style.fontWeight = '600';

    wrapper.appendChild(label);
    wrapper.appendChild(inputEl);
    return wrapper;
}

// ─── Extension ───────────────────────────────────────────────────────────────

export const ToolRunnerExtension: Extension = {
    id: 'wargames.tool-runner',
    name: 'Tool Runner',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;

        const toolRunnerProvider: ViewProvider = {
            id: 'tool-runner.view',
            name: 'Tool Runner',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ padding: 'md', gap: 'md', fill: true, overflow: 'hidden' });

                // Header
                const header = new uiLib.Heading({ text: 'TOOL RUNNER', level: 4, transform: 'uppercase' });
                const description = new uiLib.Text({
                    text: 'Execute any system tool using auto-generated type-safe forms.',
                    variant: 'muted',
                    size: 'sm'
                });
                root.appendChildren(header, description);

                // Tool selector
                const toolOptions = buildToolOptions();
                const toolSelect = new uiLib.Select({
                    options: toolOptions,
                    value: '',
                    placeholder: 'Select a tool...',
                    onChange: (selectedKey) => switchTool(selectedKey)
                });
                root.appendChildren(toolSelect);

                // Main Area with ScrollArea
                const formArea = new uiLib.Column({ gap: 'md' });
                const resultArea = new uiLib.Column({ gap: 'sm', borderTop: true, paddingTop: 'md' });
                resultArea.getElement().style.display = 'none';

                const scrollArea = new uiLib.ScrollArea({ 
                    fill: true, 
                    children: [formArea, resultArea] 
                });
                root.appendChildren(scrollArea);

                // State
                let currentFields: FormField[] = [];
                let currentContract: ToolContract | null = null;

                const switchTool = (selectedKey: string) => {
                    formArea.getElement().innerHTML = '';
                    resultArea.getElement().innerHTML = '';
                    resultArea.getElement().style.display = 'none';
                    currentFields = [];
                    currentContract = null;

                    if (!selectedKey) return;

                    const contract = globalContractRegistry.get(selectedKey);
                    if (!contract) return;
                    currentContract = contract;

                    // Build context values from services
                    const contextValues: Record<string, string | undefined> = {
                        matchId: ide.matches.currentMatchId.get() ?? undefined,
                        side: ide.matches.currentSide.get(),
                    };

                    const selectedEntity = ide.selection.primaryId.get();
                    if (selectedEntity) {
                        contextValues['entityId'] = selectedEntity;
                    }

                    // Generate form fields
                    currentFields = generateFieldsFromSchema(contract.inputSchema, contextValues);

                    // Add Tool Description
                    formArea.appendChildren(new uiLib.Alert({
                        message: contract.description,
                        variant: 'info'
                    }));

                    for (const field of currentFields) {
                        formArea.getElement().appendChild(field.element);
                    }

                    // Execute button
                    const execBtn = new uiLib.Button({
                        label: `Execute ${contract.domain}.${contract.action}`,
                        variant: 'primary',
                        icon: 'fas fa-play',
                        onClick: () => { void executeCurrentTool(); }
                    });
                    formArea.appendChildren(execBtn);
                };

                // Execute tool
                const executeCurrentTool = async () => {
                    if (!currentContract || currentFields.length === 0) return;

                    // Gather form values
                    const payload: Record<string, unknown> = {};
                    for (const field of currentFields) {
                        const value = field.getValue();
                        if (value !== undefined) {
                            payload[field.key] = value;
                        }
                    }

                    resultArea.getElement().innerHTML = '';
                    resultArea.getElement().style.display = 'flex';
                    const spinner = new uiLib.Spinner({ size: 'md' });
                    resultArea.appendChildren(spinner);

                    try {
                        // Validate with Zod before sending
                        const validated = currentContract.inputSchema.parse(payload);

                        // Navigate the client API object safely
                        const domain = currentContract.domain;
                        const action = currentContract.action;
                        
                        const api = ide.getClient().api as any;
                        const apiFn = api[domain]?.[action];
                        if (!apiFn) throw new Error(`Unknown API action: ${domain}.${action}`);

                        const resultRaw = apiFn(validated);
                        
                        // Handle both Promises and AsyncIterables (Streams)
                        let result: unknown;
                        if (resultRaw instanceof Promise) {
                            result = await resultRaw;
                        } else if (resultRaw && typeof (resultRaw as any)[Symbol.asyncIterator] === 'function') {
                            result = { info: "Stream started...", stream: resultRaw };
                        } else {
                            result = resultRaw;
                        }

                        // Render result
                        resultArea.getElement().innerHTML = '';
                        resultArea.appendChildren(new uiLib.Text({ text: 'EXECUTION RESULT', size: 'xs', weight: 'bold', variant: 'muted' }));
                        
                        const jsonTree = new uiLib.JsonTree({
                            data: result,
                            expandDepth: 3,
                            label: `${currentContract.domain}.${currentContract.action} result`
                        });
                        resultArea.appendChildren(jsonTree);

                    } catch (error) {
                        resultArea.getElement().innerHTML = '';
                        const errMsg = error instanceof Error ? error.message : String(error);
                        resultArea.appendChildren(new uiLib.Alert({
                            message: `Execution Failed: ${errMsg}`,
                            variant: 'error'
                        }));
                    }
                };

                root.mount(container);
            }
        };

        ide.views.registerProvider('bottom-panel', toolRunnerProvider);

        ide.activityBar.registerItem({
            id: 'tool-runner.view',
            location: 'bottom-panel',
            icon: 'fas fa-terminal',
            title: 'Tool Runner',
            order: 20
        });

        // Command to open via palette
        ide.commands.register({
            id: 'toolRunner.open',
            label: 'Open Tool Runner',
            handler: () => {
                void ide.views.renderView('bottom-panel', 'tool-runner.view');
            }
        });

        console.log('✅ ToolRunnerExtension activated');
    }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildToolOptions(): { label: string; value: string }[] {
    const options: { label: string; value: string }[] = [
        { label: '— Select a tool —', value: '' }
    ];

    for (const [key, contract] of globalContractRegistry.entries()) {
        options.push({
            label: `${contract.domain}.${contract.action} — ${contract.description.substring(0, 60)}`,
            value: key
        });
    }

    // Sort by domain then action
    options.sort((a, b) => {
        if (a.value === '' || b.value === '') return a.value === '' ? -1 : 1;
        return a.label.localeCompare(b.label);
    });

    return options;
}
