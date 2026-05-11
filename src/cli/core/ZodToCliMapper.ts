import { z } from 'zod';
import { Command } from 'commander';

/**
 * ZodToCliMapper: Recursively maps Zod schemas to Commander.js options.
 * Handles nested objects (dot-notation), arrays, and utilizes .describe() for help text.
 */
export class ZodToCliMapper {
    /**
     * Maps a Zod schema to a Commander.js command's options.
     */
    public static mapSchemaToOptions(program: Command, schema: z.ZodTypeAny, prefix: string = ''): void {
        const unwrapped = this.unwrapSchema(schema);

        if (unwrapped instanceof z.ZodObject) {
            const shape = unwrapped.shape;
            for (const [key, value] of Object.entries(shape)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                this.mapFieldToOption(program, value as z.ZodTypeAny, fullKey);
            }
        }
    }

    /**
     * Unflattens dot-notation options and handles coordinate parsing.
     */
    public static parseOptions<T extends z.ZodTypeAny>(options: Record<string, unknown>, schema: T): z.infer<T> {
        const result: any = {};
        const unwrapped = this.unwrapSchema(schema);

        for (const [key, value] of Object.entries(options)) {
            const parts = key.split('.');
            let current = result;
            let currentSchema: z.ZodTypeAny = unwrapped;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i]!;
                if (!current[part]) {
                    current[part] = {};
                }
                
                const next = current[part];
                if (typeof next !== 'object' || next === null || Array.isArray(next)) {
                     // Should not happen with well-formed dot-notation
                     continue;
                }
                current = next as Record<string, unknown>;
                
                // Track schema depth if possible
                if (currentSchema instanceof z.ZodObject) {
                    const nextSchema = currentSchema.shape[part];
                    if (nextSchema) {
                        currentSchema = this.unwrapSchema(nextSchema);
                    }
                }
            }

            const lastPart = parts[parts.length - 1]!;
            
            // Get the specific schema for this field
            let fieldSchema: z.ZodTypeAny | undefined;
            if (currentSchema instanceof z.ZodObject) {
                const field = currentSchema.shape[lastPart];
                if (field) {
                    fieldSchema = this.unwrapSchema(field);
                }
            }

            current[lastPart] = this.parseValue(value, fieldSchema);
        }

        return result as z.infer<T>;
    }

    private static parseValue(value: unknown, schema?: z.ZodTypeAny): unknown {
        if (typeof value === 'string' && value.includes(',') && schema instanceof z.ZodObject) {
            const parts = value.split(',').map(v => parseFloat(v.trim()));
            const shape = schema.shape as Record<string, z.ZodTypeAny>;
            const keys = Object.keys(shape);
            
            if (parts.length === 3) {
                if (keys.includes('x') && keys.includes('y') && keys.includes('z')) {
                    return { x: parts[0], y: parts[1], z: parts[2] };
                }
                if (keys.includes('lat') && keys.includes('lon') && keys.includes('alt')) {
                    return { lat: parts[0], lon: parts[1], alt: parts[2] };
                }
            }
        }
        return value;
    }

    private static mapFieldToOption(program: Command, schema: z.ZodTypeAny, key: string): void {
        const unwrapped = this.unwrapSchema(schema);
        const description = unwrapped.description || '';

        // Special Case: Vector3 or Lla (Simple coordinate objects)
        if (unwrapped instanceof z.ZodObject && this.isCoordinateObject(unwrapped)) {
            program.option(`--${key} <csv>`, `${description} (comma-separated: x,y,z or lat,lon,alt)`);
            return;
        }

        // Nested Objects
        if (unwrapped instanceof z.ZodObject) {
            this.mapSchemaToOptions(program, unwrapped, key);
            return;
        }

        // Arrays
        if (unwrapped instanceof z.ZodArray) {
            program.option(`--${key} <values...>`, `${description} (space-separated list)`);
            return;
        }

        // Enums
        if (unwrapped instanceof z.ZodEnum) {
            const values = (unwrapped._def as { values: string[] }).values.join('|');
            program.option(`--${key} <${values}>`, `${description}`);
            return;
        }

        // Booleans
        if (unwrapped instanceof z.ZodBoolean) {
            program.option(`--${key}`, `${description}`);
            program.option(`--no-${key}`, `Disable ${key}`);
            return;
        }

        // Numbers
        if (unwrapped instanceof z.ZodNumber) {
            program.option(`--${key} <number>`, `${description}`, (val) => parseFloat(val));
            return;
        }

        // Strings (Default)
        program.option(`--${key} <string>`, `${description}`);
    }

    private static unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
        let current = schema;
        while (
            current instanceof z.ZodOptional ||
            current instanceof z.ZodNullable ||
            current instanceof z.ZodDefault
        ) {
            if (current instanceof z.ZodOptional) {
                current = current.unwrap();
            } else if (current instanceof z.ZodNullable) {
                current = current.unwrap();
            } else if (current instanceof z.ZodDefault) {
                current = current._def.innerType as z.ZodTypeAny;
            }
        }
        return current;
    }

    private static isCoordinateObject(obj: z.ZodObject<Record<string, z.ZodTypeAny>>): boolean {
        const keys = Object.keys(obj.shape);
        const isXYZ = keys.includes('x') && keys.includes('y') && keys.includes('z');
        const isLLA = keys.includes('lat') && keys.includes('lon') && keys.includes('alt');
        return isXYZ || isLLA;
    }
}
