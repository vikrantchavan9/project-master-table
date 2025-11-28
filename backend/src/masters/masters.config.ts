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
    cols: ["district", "stateid", "advisor"],
  },
  PINCODE: {
    table: "mast_place",
    pk: "placeid",
    sort: "place",
    cols: [
      "country_code",
      "stateid",
      "districtid",
      "pincode",
      "place",
      "advisor",
    ],
  },
  INDUSTRY: {
    table: "mast_industry",
    pk: "mastid",
    sort: "option",
    cols: ["option"],
  },

  // --- SIMPLE MASTERS (From your PDF) ---
  // You can now just add one line here to support a new table!

  //   OCCUPATION: {
  //     table: "mast_occupation",
  //     pk: "occuid",
  //     sort: "occupation",
  //     cols: ["occupation"],
  //   },
  //   LANGUAGE: {
  //     table: "mast_lang",
  //     pk: "langid",
  //     sort: "language",
  //     cols: ["language"],
  //   },
  //     SKILLS: {
  //     table: "mast_skills",
  //     pk: "mastid",
  //     sort: "option",
  //     cols: ["option"],
  //   },
};
