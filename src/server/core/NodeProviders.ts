import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { IStorageProvider, ILogger, IImageProvider, IImage } from '../../sdk/services/types.js';

export class NodeStorageProvider implements IStorageProvider {
    async readFile(filePath: string, encoding?: 'utf8'): Promise<string | ArrayBuffer> {
        if (encoding === 'utf8') {
            return await fs.readFile(filePath, 'utf8');
        }
        const buffer = await fs.readFile(filePath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    async writeFile(filePath: string, content: string | ArrayBuffer): Promise<void> {
        if (typeof content === 'string') {
            await fs.writeFile(filePath, content);
        } else {
            await fs.writeFile(filePath, Buffer.from(content));
        }
    }

    async readdir(dirPath: string): Promise<string[]> {
        return await fs.readdir(dirPath);
    }

    async exists(filePath: string): Promise<boolean> {
        return existsSync(filePath);
    }

    async unlink(filePath: string): Promise<void> {
        await fs.unlink(filePath);
    }

    async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
        await fs.mkdir(dirPath, options);
    }

    async stat(filePath: string): Promise<{ size: number }> {
        const stats = await fs.stat(filePath);
        return { size: stats.size };
    }

    join(...parts: string[]): string {
        return path.join(...parts);
    }
}

export class NodeImageProvider implements IImageProvider {
    async decodePng(buffer: ArrayBuffer): Promise<IImage> {
        return new Promise((resolve, reject) => {
            new PNG().parse(Buffer.from(buffer), (err, data) => {
                if (err) reject(err);
                else {
                    resolve({
                        width: data.width,
                        height: data.height,
                        data: new Uint8Array(data.data)
                    });
                }
            });
        });
    }
}

export { logger } from './Logger.js';
