import { MastersService } from "./masters.service";
export declare class MastersController {
    private readonly mastersService;
    constructor(mastersService: MastersService);
    findAll(type: string, query: any): Promise<{
        data: any[];
        total: number;
        page: number;
        lastPage: number;
    }>;
    create(type: string, body: any): Promise<any>;
}
