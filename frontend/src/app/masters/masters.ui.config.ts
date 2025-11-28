export type FieldType = "text" | "number" | "dropdown";

export interface FieldDef {
  name: string; // The key to send to backend (e.g., 'country_code')
  label: string; // UI Label
  type: FieldType;
  lookupMaster?: string; // If type is dropdown, which master to load? (e.g., 'COUNTRY')
  parentField?: string; // If dependent, who is the parent? (e.g., 'country_code')
  required?: boolean;
  maxLength?: number;
}

export interface MasterUIDef {
  label: string;
  pk: string; // Primary Key field name (e.g., 'country_code')
  fields: FieldDef[]; // Form Fields
  columns: { key: string; label: string }[]; // Table Columns
}

export const MASTERS_CONFIG: Record<string, MasterUIDef> = {
  // --- COMPLEX MASTERS ---
  // Country Master
  COUNTRY: {
    label: "Country Master",
    pk: "country_code",
    fields: [
      {
        name: "country_code",
        label: "Country Code",
        type: "text",
        maxLength: 2,
        required: true,
      },
      { name: "country", label: "Country Name", type: "text", required: true },
      { name: "advisor", label: "Advisor ID", type: "number" },
    ],
    columns: [
      { key: "country_code", label: "Code" },
      { key: "country", label: "Country" },
      { key: "advisor", label: "Advisor" },
    ],
  },
  // State Master
  STATE: {
    label: "State Master",
    pk: "state_code",
    fields: [
      {
        name: "country_code",
        label: "Country",
        type: "dropdown",
        lookupMaster: "COUNTRY",
        required: true,
      },
      { name: "state", label: "State Name", type: "text", required: true },
      { name: "advisor", label: "Advisor ID", type: "number" },
    ],
    columns: [
      { key: "state", label: "State" },
      { key: "parent_name", label: "Country" }, // Backend returns 'parent_name' from JOIN
    ],
  },
  // District Master
  DISTRICT: {
    label: "District Master",
    pk: "districtid",
    fields: [
      {
        name: "country_code",
        label: "Country",
        type: "dropdown",
        lookupMaster: "COUNTRY",
        required: true,
      },
      {
        name: "state_code",
        label: "State",
        type: "dropdown",
        lookupMaster: "STATE",
        parentField: "country_code",
        required: true,
      },
      {
        name: "district",
        label: "District Name",
        type: "text",
        required: true,
      },
    ],
    columns: [
      { key: "district", label: "District" },
      { key: "parent_name", label: "State" },
    ],
  },
  INDUSTRY: {
    label: "Industry Master",
    pk: "mastid",
    fields: [
      { name: "option", label: "Industry Name", type: "text", required: true },
    ],
    columns: [{ key: "option", label: "Industry Name" }],
  },

  // --- SIMPLE MASTERS (Add 20+ easily here) ---
  //   SKILLS: {
  //     label: "Skills Master",
  //     pk: "mastid",
  //     fields: [
  //       { name: "option", label: "Skill Name", type: "text", required: true },
  //     ],
  //     columns: [{ key: "option", label: "Skill Name" }],
  //   },

  //   OCCUPATION: {
  //     label: "Occupation Master",
  //     pk: "occuid",
  //     fields: [
  //       { name: "occupation", label: "Occupation", type: "text", required: true },
  //     ],
  //     columns: [{ key: "occupation", label: "Occupation" }],
  //   },
};
