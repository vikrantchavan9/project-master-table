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
            "state_code",
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
//# sourceMappingURL=masters.config.js.map