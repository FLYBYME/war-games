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
            .action(async (options) => {
                const runAll = !options.tools && !options.sdk && !options.cli;
                
                if (options.tools || runAll) await this.generateTools();
                if (options.sdk || runAll) await this.generateSDK();
                if (options.cli || runAll) await this.generateCLI();
            });
    }

    protected async execute(): Promise<void> {
        // Handled by action
    }

    private async generateTools(): Promise<void> {
        console.log('Scaffolding server tool stubs...');
        const toolsDir = path.resolve('./src/server_v2/tools');
        const contractsDir = path.resolve('./src/sdk_v2/contracts');

        if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });

        const contractFiles = this.findFiles(contractsDir);
        const allContracts: any[] = [];

        for (const file of contractFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const regex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*defineContract\s*\(\s*\{[^}]*domain:\s*['"]([^'"]+)['"][^}]*action:\s*['"]([^'"]+)['"]/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                allContracts.push({ exportName: match[1], domain: match[2], action: match[3], file });
            }
        }

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
                    const fileContent = `import { defineTool } from '../../core/tool_builder.js';\nimport { ${item.exportName} } from '../../../sdk_v2/contracts/${domain}/${domain}.contracts.js';\n\nexport const ${domain}_${item.action} = defineTool(${item.exportName}, async (input, ctx) => {\n    console.log("Executing ${domain}_${item.action}", input);\n    throw new Error("Not implemented");\n});\n`;
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
        const contractsDir = path.resolve('./src/sdk_v2/contracts');
        const outputDir = path.resolve('./src/sdk_v2/generated');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const contractFiles = this.findFiles(contractsDir);
        const allContracts: any[] = [];
        for (const file of contractFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const regex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*defineContract\s*\(\s*\{[^}]*domain:\s*['"]([^'"]+)['"][^}]*action:\s*['"]([^'"]+)['"][^}]*inputSchema:\s*([a-zA-Z0-9_]+)[^}]*outputSchema:\s*([a-zA-Z0-9_]+)[^}]*rest:\s*\{\s*method:\s*['"]([^'"]+)['"]\s*,\s*path:\s*['"]([^'"]+)['"]/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                allContracts.push({ exportName: match[1], domain: match[2], action: match[3], inputType: match[4], outputType: match[5], method: match[6], path: match[7] });
            }
        }

        const byDomain: Record<string, any[]> = {};
        for (const item of allContracts) {
            if (!byDomain[item.domain]) byDomain[item.domain] = [];
            byDomain[item.domain].push(item);
        }

        let code = `import { z } from 'zod';\nimport * as Contracts from '../contracts/index.js';\n\nexport class WarGamesClientV2 {\n    constructor(private baseUrl: string) {}\n\n    private async request<TOut>(method: string, path: string, args: any): Promise<TOut> {\n        let url = this.baseUrl + path;\n        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };\n        if (method === 'GET') {\n            const queryParams = new URLSearchParams();\n            for (const [key, value] of Object.entries(args)) if (value !== undefined) queryParams.append(key, String(value));\n            const qs = queryParams.toString();\n            if (qs) url += '?' + qs;\n        } else options.body = JSON.stringify(args);\n        const response = await fetch(url, options);\n        if (!response.ok) throw new Error(\`Request failed: \${response.status} - \${await response.text()}\`);\n        return response.json();\n    }\n\n    public readonly api = {\n`;
        for (const [domain, methods] of Object.entries(byDomain)) {
            code += `        ${domain}: {\n`;
            for (const m of methods) {
                const pathResolver = `\`${m.path.replace(/:([a-zA-Z0-9_]+)/g, '${args.$1}')}\``;
                code += `            ${m.action}: async (args: z.infer<typeof Contracts.${m.inputType}>): Promise<z.infer<typeof Contracts.${m.outputType}>> => this.request('${m.method}', ${pathResolver}, args),\n`;
            }
            code += `        },\n`;
        }
        code += `    };\n}\n`;
        fs.writeFileSync(path.join(outputDir, 'WarGamesClientV2.ts'), code);
        console.log('✔ V2 SDK Client generated.');
    }

    private async generateCLI(): Promise<void> {
        console.log('Generating V2 CLI Command Tree...');
        const contractsDir = path.resolve('./src/sdk_v2/contracts');
        const outputDir = path.resolve('./src/cli/generated');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const contractFiles = this.findFiles(contractsDir);
        const allContracts: any[] = [];
        for (const file of contractFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const regex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*defineContract\s*\(\s*\{[^}]*domain:\s*['"]([^'"]+)['"][^}]*action:\s*['"]([^'"]+)['"][^}]*description:\s*['"]((?:\\['"]|[^'"])+)['"][^}]*inputSchema:\s*([a-zA-Z0-9_]+)[^}]*outputSchema:\s*([a-zA-Z0-9_]+)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                allContracts.push({ domain: match[2], action: match[3], description: match[4], inputType: match[5] });
            }
        }

        const byDomain: Record<string, any[]> = {};
        for (const item of allContracts) {
            if (!byDomain[item.domain]) byDomain[item.domain] = [];
            byDomain[item.domain].push(item);
        }

        let code = `import { Command } from 'commander';\nimport { ZodToCliMapper } from '../core/ZodToCliMapper.js';\nimport * as Contracts from '../../sdk_v2/contracts/index.js';\nimport { WarGamesClientV2 } from '../../sdk_v2/generated/WarGamesClientV2.js';\nimport { C } from '../core/Utils.js';\n\nexport function registerGeneratedCommands(program: Command, client: WarGamesClientV2) {\n`;
        for (const [domain, methods] of Object.entries(byDomain)) {
            code += `    const ${domain} = program.command('${domain}').description('${domain.toUpperCase()} domain tools');\n`;
            for (const m of methods) {
                code += `    const ${domain}_${m.action} = ${domain}.command('${m.action}').description(\`${m.description}\`).action(async (o) => {\n        try { const res = await client.api.${domain}.${m.action}(ZodToCliMapper.parseOptions(o, Contracts.${m.inputType})); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(\`\\n\${C.red}\${C.bold}✖ Error:\${C.reset} \${err.message}\`); process.exit(1); }\n    });\n    ZodToCliMapper.mapSchemaToOptions(${domain}_${m.action}, Contracts.${m.inputType});\n`;
            }
        }
        code += `}\n`;
        fs.writeFileSync(path.join(outputDir, 'ToolCommands.ts'), code);
        console.log('✔ V2 CLI Command Tree generated.');
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
}
