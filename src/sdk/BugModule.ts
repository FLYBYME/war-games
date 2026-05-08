import type { WarGamesClient } from "./WarGamesClient.js";
import { BugReport, CreateBugReport, UpdateBugReport, AddBugComment } from "./schemas/bugs.js";

export class BugModule {
    constructor(private client: WarGamesClient) { }
    async list() {
        return await this.client.apiFetch<BugReport[]>('/api/bugs');
    }
    async get(id: string) {
        return await this.client.apiFetch<BugReport>(`/api/bugs/${id}`);
    }
    async report(data: CreateBugReport) {
        return await this.client.apiFetch<BugReport>('/api/bugs', { method: 'POST', body: JSON.stringify(data) });
    }
    async update(id: string, updates: UpdateBugReport) {
        return await this.client.apiFetch<BugReport>(`/api/bugs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    }
    async comment(id: string, data: AddBugComment) {
        return await this.client.apiFetch<unknown>(`/api/bugs/${id}/comments`, { method: 'POST', body: JSON.stringify(data) });
    }
}
