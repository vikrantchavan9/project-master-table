// Defines how the DB looks
export interface MasterConfig {
  table: string;
  pk: string;
  sort: string;
  cols: string[]; // Columns allowed for Insert/Update
}

export const MASTER_DB_CONFIG: Record<string, MasterConfig> = {
  // --- HIERARCHICAL TABLES ---
  COUNTRY: {
    table: "mast_country",
    pk: "country_code",
    sort: "country",
    cols: ["country_code", "country", "advisor"],
  },
  STATE: {
    table: "mast_state",
    pk: "stateid",
    sort: "state",
    cols: ["state", "country_code", "advisor", "state_code", "region"],
  },
  DISTRICT: {
    table: "mast_district",
    pk: "districtid",
    sort: "district",
    cols: ["district", "state_code", "country_code", "advisor"],
  },
  PINCODE_MASTER: {
    table: "mast_pincode",
    pk: "pinid",
    sort: "postoffice",
    cols: [
      "pincode",
      "postoffice",
      "district",
      "state",
      "country_code",
      "advisor",
    ],
  },
  INDUSTRY: {
    table: "mast_industry",
    pk: "mastid",
    sort: "option",
    cols: ["option"],
  },
};
