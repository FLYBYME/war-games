import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { bug_create } from '../../../../server_v2/tools/bug/bug_create.js';
import { bug_list } from '../../../../server_v2/tools/bug/bug_list.js';
import { bug_get } from '../../../../server_v2/tools/bug/bug_get.js';
import { bug_update } from '../../../../server_v2/tools/bug/bug_update.js';
import { bug_add_comment } from '../../../../server_v2/tools/bug/bug_add_comment.js';
import { createMockMatchService, createMockContext } from '../../utils/mock_factory.js';
import { db, initDb } from '../../../../server_v2/db/db.js';
import { bugs, bugComments } from '../../../../server_v2/db/schema.js';

describe('Bug Reporting Tools Unit Tests', () => {
    
    beforeAll(async () => {
        await initDb();
    });

    beforeEach(() => {
        // Clear tables for each test
        db.delete(bugComments).run();
        db.delete(bugs).run();
    });

    it('should create and retrieve a bug report', async () => {
        const ctx = createMockContext(createMockMatchService());

        const createRes = await bug_create.call({
            title: 'Test Bug',
            description: 'Something went wrong',
            severity: 'High',
            matchId: 'm1'
        }, ctx);

        expect(createRes.id).toBeDefined();
        expect(createRes.title).toBe('Test Bug');

        const getRes = await bug_get.call({ id: createRes.id }, ctx);
        expect(getRes.id).toBe(createRes.id);
        expect(getRes.severity).toBe('High');
    });

    it('should list and update bugs', async () => {
        const ctx = createMockContext(createMockMatchService());

        const b1 = await bug_create.call({ title: 'Bug 1', description: 'D1', severity: 'Low' }, ctx);
        const b2 = await bug_create.call({ title: 'Bug 2', description: 'D2', severity: 'Critical' }, ctx);

        const listRes = await bug_list.call({}, ctx);
        expect(listRes.totalCount).toBe(2);

        const updateRes = await bug_update.call({
            id: b1.id,
            status: 'Resolved'
        }, ctx);

        expect(updateRes.status).toBe('Resolved');
    });

    it('should add and retrieve comments', async () => {
        const ctx = createMockContext(createMockMatchService());

        const b = await bug_create.call({ title: 'Comment Bug', description: 'D', severity: 'Medium' }, ctx);

        const c1 = await bug_add_comment.call({
            bugId: b.id,
            author: 'Tester',
            text: 'First comment'
        }, ctx);

        const getRes = await bug_get.call({ id: b.id }, ctx);
        expect(getRes.comments).toHaveLength(1);
        expect(getRes.comments[0].text).toBe('First comment');
    });
});
