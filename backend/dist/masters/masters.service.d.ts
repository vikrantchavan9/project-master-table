import { Pool } from "pg";
export declare class MastersService {
    private pool;
    constructor(pool: Pool);
    private tableMap;
    findAll(type: string, query: any): Promise<{
        data: any[];
        total: number;
        page: number;
        lastPage: number;
    }>;
    create(type: string, body: any): Promise<any>;
}
