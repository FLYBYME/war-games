import { Command } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import fs from 'fs';
import path from 'path';

export class GenerateCommand extends BaseCommand {
    public readonly name = 'generate';
    public readonly description = 'Generate V2 artifacts (Tools, SDK, CLI)';
    public readonly category = 'Development';

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .option('-t, --tools', 'Generate server tool stubs')
            .option('-s, --sdk', 'Generate V2 SDK')
            .option('-c, --cli', 'Generate V2 CLI tree')
            .option('-a, --all', 'Generate all artifacts (default)', true)
            .option('-l, --list-tools', 'List all discovered tools')
            .action(async (options) => {
                if (options.listTools) {
                    this.listTools();
                    return;
                }
                const runAll = !options.tools && !options.sdk && !options.cli;
                
                if (options.tools || runAll) await this.generateTools();
                if (options.sdk || runAll) await this.generateSDK();
                if (options.cli || runAll) await this.generateCLI();
            });
    }

    private listTools(): void {
        const allContracts = this.discoverContracts();
        const byDomain: Record<string, any[]> = {};
        for (const item of allContracts) {
            if (!byDomain[item.domain]) byDomain[item.domain] = [];
            byDomain[item.domain].push(item);
        }

        console.log('\nDISCOVERED TOOLS\n================');
        for (const [domain, methods] of Object.entries(byDomain)) {
            console.log(`\n[${domain.toUpperCase()}]`);
            for (const m of methods) {
                const fullName = `${domain}_${m.action}`;
                console.log(`  - ${fullName.padEnd(30)} | ${m.description}`);
            }
        }
        console.log('');
    }

    protected async execute(): Promise<void> {
        // Handled by action
    }

    private findFiles(dir: string, fileList: string[] = []): string[] {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) this.findFiles(filePath, fileList);
            else if (filePath.endsWith('.ts') && !filePath.includes('.schema.')) fileList.push(filePath);
        }
        return fileList;
    }

    private discoverContracts(): any[] {
        const contractsDir = path.resolve('./src/sdk_v2/contracts');
        const contractFiles = this.findFiles(contractsDir);
        const allContracts: any[] = [];

        for (const file of contractFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const contractStarts = [...content.matchAll(/export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*defineContract\s*\(/g)];

            for (const match of contractStarts) {
                const exportName = match[1];
                const startIdx = match.index + match[0].length - 1; // Start at '('
                
                // Extract the block including nested parens/braces
                let braceCount = 0;
                let endIdx = startIdx;
                for (let i = startIdx; i < content.length; i++) {
                    if (content[i] === '(') braceCount++;
                    if (content[i] === ')') braceCount--;
                    if (braceCount === 0) {
                        endIdx = i;
                        break;
                    }
                }

                const body = content.substring(startIdx, endIdx + 1);

                const domainMatch = /\bdomain:\s*['"]([^'"]+)['"]/.exec(body);
                const actionMatch = /\baction:\s*['"]([^'"]+)['"]/.exec(body);
                const descMatch = /\bdescription:\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|`((?:\\.|[^`])*)`)/.exec(body);
                
                const inputMatch = body.match(/\binputSchema:\s*([a-zA-Z0-9_]+)/);
                const outputMatch = body.match(/\boutputSchema:\s*([a-zA-Z0-9_]+)/);
                
                let inputType = 'any';
                if (inputMatch && inputMatch[1] !== 'z' && inputMatch[1] !== 'any') inputType = inputMatch[1];
                
                let outputType = 'any';
                if (outputMatch && outputMatch[1] !== 'z' && outputMatch[1] !== 'any') outputType = outputMatch[1];

                const restMatch = /\brest:\s*\{([\s\S]*?)\}/.exec(body);
                let method = 'POST';
                let pathStr = '/';
                let isStream = false;

                if (restMatch) {
                    const restBody = restMatch[1];
                    const m = /\bmethod:\s*['"]([^'"]+)['"]/.exec(restBody);
                    const p = /\bpath:\s*['"]([^'"]+)['"]/.exec(restBody);
                    const s = /\bisStream:\s*(true|false)/.exec(restBody);
                    if (m) method = m[1];
                    if (p) pathStr = p[1];
                    if (s) isStream = s[1] === 'true';
                }

                if (domainMatch && actionMatch) {
                    const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || descMatch[3] || '') : '';
                    const description = rawDesc.replace(/\\'/g, "'").replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

                    console.log(`  Discovered: ${domainMatch[1]}.${actionMatch[1]} (Input: ${inputType}, Output: ${outputType}, Stream: ${isStream})`);

                    allContracts.push({
                        exportName,
                        domain: domainMatch[1],
                        action: actionMatch[1],
                        description,
                        inputType,
                        outputType,
                        method,
                        path: pathStr,
                        isStream
                    });
                }
            }
        }
        return allContracts;
    }

    private async generateTools(): Promise<void> {
        console.log('Scaffolding server tool stubs...');
        const toolsDir = path.resolve('./src/server_v2/tools');
        if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });

        const allContracts = this.discoverContracts();
        const byDomain: Record<string, any[]> = {};
        for (const item of allContracts) {
            if (!byDomain[item.domain]) byDomain[item.domain] = [];
            byDomain[item.domain].push(item);
        }

        for (const [domain, domainContracts] of Object.entries(byDomain)) {
            const domainDir = path.join(toolsDir, domain);
            if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir, { recursive: true });

            for (const item of domainContracts) {
                const filePath = path.join(domainDir, `${domain}_${item.action}.ts`);
                if (!fs.existsSync(filePath)) {
                    const fileContent = `import { defineTool } from '../../core/tool_builder.js';\nimport { ${item.exportName} } from '../../../sdk_v2/contracts/index.js';\n\nexport const ${domain}_${item.action} = defineTool(${item.exportName}, async (input, ctx) => {\n    console.log("Executing ${domain}_${item.action}", input);\n    throw new Error("Not implemented");\n});\n`;
                    fs.writeFileSync(filePath, fileContent);
                }
            }
            const indexFilePath = path.join(domainDir, 'index.ts');
            const exportsStr = domainContracts.map(c => `export * from './${domain}_${c.action}.js';`).join('\n');
            fs.writeFileSync(indexFilePath, exportsStr + '\n');
        }
        fs.writeFileSync(path.join(toolsDir, 'index.ts'), Object.keys(byDomain).map(d => `export * from './${d}/index.js';`).join('\n') + '\n');
        console.log('✔ Server tool stubs updated.');
    }

    private async generateSDK(): Promise<void> {
        console.log('Generating V2 SDK Client...');
        const outputDir = path.resolve('./src/sdk_v2/generated');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const allContracts = this.discoverContracts();
        const byDomain: Record<string, any[]> = {};
        for (const item of allContracts) {
            if (!byDomain[item.domain]) byDomain[item.domain] = [];
            byDomain[item.domain].push(item);
        }

        let code = `import { z } from 'zod';\nimport * as Contracts from '../contracts/index.js';\n\nexport class WarGamesClientV2 {\n    constructor(private baseUrl: string) {}\n\n    private async request<TOut>(method: string, path: string, args: any): Promise<TOut> {\n        let url = this.baseUrl + path;\n        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };\n        if (method === 'GET') {\n            const queryParams = new URLSearchParams();\n            for (const [key, value] of Object.entries(args)) {\n                if (value === undefined) continue;\n                queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));\n            }\n            const qs = queryParams.toString();\n            if (qs) url += '?' + qs;\n        } else options.body = JSON.stringify(args);\n        const response = await fetch(url, options);\n        if (!response.ok) throw new Error(\`Request failed: \${response.status} - \${await response.text()}\`);\n        return response.json();\n    }\n\n    private async *stream<TOut>(method: string, path: string, args: any): AsyncIterable<TOut> {\n        let url = this.baseUrl + path;\n        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };\n        \n        if (method === 'GET') {\n            const queryParams = new URLSearchParams();\n            for (const [key, value] of Object.entries(args)) {\n                if (value === undefined) continue;\n                queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));\n            }\n            const qs = queryParams.toString();\n            if (qs) url += '?' + qs;\n        } else {\n            options.body = JSON.stringify(args);\n        }\n\n        const response = await fetch(url, options);\n        if (!response.ok) throw new Error(\`Stream failed: \${response.status} - \${await response.text()}\`);\n        if (!response.body) throw new Error('Response body is empty');\n\n        const reader = response.body.getReader();\n        const decoder = new TextDecoder();\n        let buffer = '';\n\n        while (true) {\n            const { done, value } = await reader.read();\n            if (done) break;\n            buffer += decoder.decode(value, { stream: true });\n            const lines = buffer.split('\\n');\n            buffer = lines.pop() || '';\n            for (const line of lines) {\n                if (line.startsWith('data: ')) {\n                    try { yield JSON.parse(line.substring(6)); } catch (e) {} \n                }\n            }\n        }\n    }\n\n    public api = {\n`;
        for (const [domain, methods] of Object.entries(byDomain)) {
            code += `        ${domain}: {\n`;
            for (const m of methods) {
                const pathResolver = `\`${m.path.replace(/:([a-zA-Z0-9_]+)/g, '${args.$1}')}\``;
                const isPlainAny = (s: string) => s === 'any' || s === 'z.any()' || s === 'z.unknown()' || s === 'unknown';
                const inputType = isPlainAny(m.inputType) ? 'any' : `z.infer<typeof Contracts.${m.inputType}>`;
                const outputType = isPlainAny(m.outputType) ? 'any' : `z.infer<typeof Contracts.${m.outputType}>`;
                
                if (m.isStream) {
                    code += `            ${m.action}: (args: ${inputType}): AsyncIterable<${outputType}> => this.stream('${m.method}', ${pathResolver}, args),\n`;
                } else {
                    code += `            ${m.action}: async (args: ${inputType}): Promise<${outputType}> => this.request('${m.method}', ${pathResolver}, args),\n`;
                }
            }
            code += `        },\n`;
        }
        code += `    };\n}\n`;
        fs.writeFileSync(path.join(outputDir, 'WarGamesClientV2.ts'), code);
        console.log('✔ V2 SDK Client generated.');
    }

    private async generateCLI(): Promise<void> {
        console.log('Generating V2 CLI Command Tree...');
        const outputDir = path.resolve('./src/cli/generated');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const allContracts = this.discoverContracts();
        const byDomain: Record<string, any[]> = {};
        for (const item of allContracts) {
            if (!byDomain[item.domain]) byDomain[item.domain] = [];
            byDomain[item.domain].push(item);
        }

        let code = `import { Command } from 'commander';\nimport { ZodToCliMapper } from '../core/ZodToCliMapper.js';\nimport * as Contracts from '../../sdk_v2/contracts/index.js';\nimport { WarGamesClientV2 } from '../../sdk_v2/generated/WarGamesClientV2.js';\nimport { C } from '../core/Utils.js';\n\nexport function registerGeneratedCommands(program: Command, client: WarGamesClientV2) {\n`;
        for (const [domain, methods] of Object.entries(byDomain)) {
            code += `    let ${domain} = program.commands.find(c => c.name() === '${domain}');\n`;
            code += `    if (!${domain}) ${domain} = program.command('${domain}').description('${domain.toUpperCase()} domain tools');\n`;
            for (const m of methods) {
                const isPlainAny = (s: string) => s === 'any' || s === 'z.any()' || s === 'z.unknown()' || s === 'unknown';
                const inputSchema = isPlainAny(m.inputType) ? 'z.any()' : `Contracts.${m.inputType}`;
                
                if (m.isStream) {
                    code += `    const ${domain}_${m.action} = ${domain}.command('${m.action}').description(\`${m.description}\`).action(async (o) => {\n        try {\n            const stream = client.api.${domain}.${m.action}(ZodToCliMapper.parseOptions(o, ${inputSchema} as any));\n            for await (const event of stream) {\n                console.dir(event, { depth: null });\n            }\n        } catch (err: any) { console.error(\`\\n\${C.red}\${C.bold}✖ Error:\${C.reset} \${err.message}\`); process.exit(1); }\n    });\n`;
                } else {
                    code += `    const ${domain}_${m.action} = ${domain}.command('${m.action}').description(\`${m.description}\`).action(async (o) => {\n        try { const res = await client.api.${domain}.${m.action}(ZodToCliMapper.parseOptions(o, ${inputSchema} as any)); console.dir(res, { depth: null }); } catch (err: any) { console.error(\`\\n\${C.red}\${C.bold}✖ Error:\${C.reset} \${err.message}\`); process.exit(1); }\n    });\n`;
                }
                code += `    ZodToCliMapper.mapSchemaToOptions(${domain}_${m.action}, ${inputSchema} as any);\n`;
            }
        }
        code += `}\n`;
        fs.writeFileSync(path.join(outputDir, 'ToolCommands.ts'), code);
        console.log('✔ V2 CLI Command Tree generated.');
    }
}
