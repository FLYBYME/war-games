export interface IStorageProvider {
    readFile(path: string, encoding?: 'utf8'): Promise<string | ArrayBuffer>;
    writeFile(path: string, content: string | ArrayBuffer): Promise<void>;
    readdir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    unlink(path: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    stat(path: string): Promise<{ size: number }>;
    join(...parts: string[]): string;
}

export interface ILogger {
    info(message: string, context?: unknown): void;
    warn(message: string, context?: unknown): void;
    error(message: string, context?: unknown): void;
    debug(message: string, context?: unknown): void;
}

export interface IImage {
    width: number;
    height: number;
    data: Uint8Array;
}

export interface IImageProvider {
    decodePng(buffer: ArrayBuffer): Promise<IImage>;
}

export interface ServiceConfig {
    storage: IStorageProvider;
    logger: ILogger;
    image?: IImageProvider;
    baseDir?: string;
}
