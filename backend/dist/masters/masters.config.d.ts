export interface MasterConfig {
    table: string;
    pk: string;
    sort: string;
    cols: string[];
}
export declare const MASTER_DB_CONFIG: Record<string, MasterConfig>;
