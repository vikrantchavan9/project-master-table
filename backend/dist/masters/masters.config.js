"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASTER_DB_CONFIG = void 0;
exports.MASTER_DB_CONFIG = {
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
};
//# sourceMappingURL=masters.config.js.map