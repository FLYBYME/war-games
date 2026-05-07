import * as fs from 'fs/promises';
import { ToolAgent } from './core/Agent.js';
import { SaveProfileTool } from './tools/SaveProfileTool.js';
import { SanityValidator } from './pipeline/SanityValidator.js';
import { Consolidator } from './pipeline/Consolidator.js';
import { EntityProfile } from '../sdk/schemas/index.js';

const INPUT_DIR = '/home/ubuntu/Downloads/Descriptions/DB3000';
const OUTPUT_FILE = './data/db3000_compiled.json';
const BASE_URL = "http://192.168.1.6:11434";
const MODEL = 'qwen3:14b'; 

const SYSTEM_PROMPT = `You are an expert military intelligence data extractor. 
Your objective is to read the provided unstructured text about a military platform and extract its technical specifications.

CRITICAL RULES:
1. You MUST call the 'save_military_profile' tool to output the data.
2. DO NOT guess or hallucinate. If a value is not in the text, omit it or use null.
3. UNIT CONVERSIONS ARE MANDATORY:
   - Convert all weights (lbs, tons) to Kilograms (kg). (1 lb = 0.4536 kg, 1 ton = 1000 kg).
   - Convert all speeds (Mach, mph, km/h) to Knots (kts). (Mach 1 ≈ 661.5 kts at SL, 1 km/h = 0.5399 kts).
   - Convert all ranges and altitudes (nm, miles, feet) to Meters (m). (1 nm = 1852 m, 1 ft = 0.3048 m).
   - Convert all thrust (lbf) to Newtons (N). (1 lbf = 4.448 N).
4. For RCS (Radar Cross Section), if not explicitly stated, estimate based on class: Stealth Fighter=0.01, Standard Fighter=5.0, Bomber=20.0, Frigate=2000.0.`;

async function runPipeline() {
    try {
        await fs.mkdir('./data', { recursive: true });
        const files = await fs.readdir(INPUT_DIR);
        const validProfiles: EntityProfile[] = [];
        const failedFiles: string[] = [];

        console.log(`Starting extraction of ${files.length} files...`);

        // Process a subset for testing if needed, or all files
        const filesToProcess = files.slice(0, 5); // Limit to 5 for initial test

        for (const file of filesToProcess) {
            console.log(`\n>>> Processing: ${file}`);
            const text = await fs.readFile(`${INPUT_DIR}/${file}`, 'utf-8');
            
            const saveTool = new SaveProfileTool();
            const agent = new ToolAgent(BASE_URL, [saveTool]);

            try {
                await agent.chat(MODEL, [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: text }
                ]);

                const profile = saveTool.getExtractedData();
                
                if (profile) {
                    const errors = SanityValidator.validate(profile);
                    if (errors.length > 0) {
                        console.warn(`[WARNING] Validation failed for ${file}:`, errors);
                        failedFiles.push(file);
                    } else {
                        validProfiles.push(profile);
                        console.log(`[SUCCESS] Extracted ${profile.variantName || 'unknown'} (${profile.platformClass || 'unknown'})`);
                    }
                } else {
                    console.error(`[ERROR] LLM failed to call SaveProfileTool for ${file}`);
                    failedFiles.push(file);
                }
            } catch (err: unknown) {
                const error = err as Error;
                console.error(`[FATAL] Error processing ${file}:`, error.message);
                failedFiles.push(file);
            }
        }

        console.log(`\nExtraction Complete. Success: ${validProfiles.length}, Failed: ${failedFiles.length}`);

        if (validProfiles.length > 0) {
            console.log('Consolidating variants...');
            const db3000 = Consolidator.groupAndDiff(validProfiles);

            await fs.writeFile(OUTPUT_FILE, JSON.stringify(db3000, null, 2));
            console.log(`Saved compiled database to ${OUTPUT_FILE}`);
        }
    } catch (err: unknown) {
        const error = err as Error;
        console.error("Pipeline failed:", error.message);
    }
}

void runPipeline();
