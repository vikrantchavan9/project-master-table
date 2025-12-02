export type FieldType = "text" | "number" | "dropdown";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  lookupMaster?: string;
  parentField?: string;
  valueKey?: string; // <-- already present
  required?: boolean;
  maxLength?: number;
}

export interface MasterUIDef {
  label: string;
  pk: string;
  fields: FieldDef[];
  columns: { key: string; label: string }[];
}

// --- COMPLEX MASTERS ---
export const MASTERS_CONFIG: Record<string, MasterUIDef> = {
  // --------------------------------------------------------------------
  // COUNTRY
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------
  STATE: {
    label: "State Master",
    pk: "stateid", // correct PK
    fields: [
      {
        name: "country_code",
        label: "Country",
        type: "dropdown",
        lookupMaster: "COUNTRY",
        required: true,
        valueKey: "country_code",
      },

      // -----------------------------
      // 🔥 ADDED MISSING FIELD
      // Each state MUST have state_code (AP, MH...)
      // -----------------------------
      {
        name: "state_code",
        label: "State Code",
        type: "text",
        required: true,
      },

      { name: "state", label: "State Name", type: "text", required: true },
      { name: "advisor", label: "Advisor ID", type: "number" },
    ],
    columns: [
      { key: "state_code", label: "Code" },
      { key: "state", label: "State" },
      { key: "parent_name", label: "Country" },
    ],
  },

  // --------------------------------------------------------------------
  // DISTRICT
  // --------------------------------------------------------------------
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
        valueKey: "country_code", // 🔥 ADDED
      },
      {
        name: "state_code",
        label: "State",
        type: "dropdown",
        lookupMaster: "STATE",
        parentField: "country_code",
        required: true,
        valueKey: "state_code", // 🔥 FIXED
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

  // --------------------------------------------------------------------
  // PINCODE MASTER
  // --------------------------------------------------------------------
  PINCODE_MASTER: {
    label: "Pincode Master",
    pk: "pinid",
    fields: [
      // Country
      {
        name: "country_code",
        label: "Country",
        type: "dropdown",
        lookupMaster: "COUNTRY",
        valueKey: "country_code",
        required: true,
      },

      // ----------------------------------------------------
      // 🔥 FIX: STATE must return state_code, not full state name
      // ----------------------------------------------------
      {
        name: "state_code",
        label: "State",
        type: "dropdown",
        lookupMaster: "STATE",
        parentField: "country_code",
        valueKey: "state_code", // 🔥 CHANGED
        required: true,
      },

      // ----------------------------------------------------
      // 🔥 FIX: DISTRICT should depend on `state_code`, not `state`
      // and value should be districtid (unique)
      // ----------------------------------------------------
      {
        name: "district",
        label: "District",
        type: "dropdown",
        lookupMaster: "DISTRICT",
        parentField: "state_code", // 🔥 FIXED
        valueKey: "district", // or "districtid" if backend expects ID
        required: true,
      },

      // remaining fields
      {
        name: "postoffice",
        label: "Post Office",
        type: "text",
        required: true,
      },
      { name: "pincode", label: "Pin Code", type: "text", required: true },
    ],
    columns: [
      { key: "pincode", label: "Pin" },
      { key: "postoffice", label: "Post Office" },
      { key: "district", label: "District" },
      { key: "state", label: "State" },
    ],
  },

  // --------------------------------------------------------------------
  // INDUSTRY
  // --------------------------------------------------------------------
  INDUSTRY: {
    label: "Industry Master",
    pk: "mastid",
    fields: [
      { name: "option", label: "Industry Name", type: "text", required: true },
    ],
    columns: [{ key: "option", label: "Industry Name" }],
  },
};
