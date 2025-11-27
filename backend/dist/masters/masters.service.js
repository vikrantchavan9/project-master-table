"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let MastersService = class MastersService {
    constructor(pool) {
        this.pool = pool;
        this.tableMap = {
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
            SKILLS: {
                table: "mast_skills",
                pk: "mastid",
                sort: "optionname",
                cols: ["optionname"],
            },
        };
    }
    async findAll(type, query) {
        const config = this.tableMap[type];
        if (!config)
            throw new common_1.BadRequestException(`Invalid Master Type: ${type}`);
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = query.search || "";
        let mainAlias = "";
        if (type === "STATE")
            mainAlias = "s";
        else if (type === "DISTRICT")
            mainAlias = "d";
        else if (type === "PINCODE")
            mainAlias = "p";
        const prefix = (col) => (mainAlias ? `${mainAlias}.${col}` : col);
        let whereClauses = [];
        let values = [];
        let paramIdx = 1;
        if (search) {
            whereClauses.push(`${config.sort} ILIKE $${paramIdx}`);
            values.push(`%${search}%`);
            paramIdx++;
        }
        if (type === "STATE" && query.country_code) {
            whereClauses.push(`country_code = $${paramIdx}`);
            values.push(query.country_code);
            paramIdx++;
        }
        if (type === "DISTRICT" && query.stateID) {
            whereClauses.push(`stateid = $${paramIdx}`);
            values.push(query.stateID);
            paramIdx++;
        }
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        let selectSql = `SELECT * FROM ${config.table}`;
        if (type === "STATE") {
            selectSql = `
        SELECT s.*, c.country as parent_name
        FROM mast_state s
        LEFT JOIN mast_country c ON s.country_code = c.country_code
      `;
        }
        else if (type === "DISTRICT") {
            selectSql = `
        SELECT d.*, s.state as parent_name, s.country_code
        FROM mast_district d
        LEFT JOIN mast_state s ON d.stateid = s.stateid
      `;
        }
        const dataQuery = `
      ${selectSql}
      ${whereSql}
      ORDER BY ${config.pk} DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
        const countQuery = `SELECT COUNT(*) as total FROM ${config.table} ${whereSql}`;
        try {
            const [dataRes, countRes] = await Promise.all([
                this.pool.query(dataQuery, values),
                this.pool.query(countQuery, values),
            ]);
            return {
                data: dataRes.rows,
                total: parseInt(countRes.rows[0]?.total || 0),
                page,
                lastPage: Math.ceil(parseInt(countRes.rows[0]?.total || 0) / limit),
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async create(type, body) {
        const config = this.tableMap[type];
        if (!config)
            throw new common_1.BadRequestException(`Invalid Master Type: ${type}`);
        if (type === "STATE" && body.stateName) {
            body.state = body.stateName;
        }
        if (type === "DISTRICT" && body.districtName) {
            body.district = body.districtName;
        }
        if (body.stateID) {
            body.stateid = body.stateID;
        }
        if (body.districtID) {
            body.districtid = body.districtID;
        }
        const validKeys = Object.keys(body).filter((key) => config.cols.includes(key));
        if (validKeys.length === 0) {
            console.error("Invalid Body Received:", body);
            throw new common_1.BadRequestException("No valid fields provided");
        }
        const columns = validKeys.join(", ");
        const placeholders = validKeys.map((_, i) => `$${i + 1}`).join(", ");
        const values = validKeys.map((key) => body[key]);
        const sql = `INSERT INTO ${config.table} (${columns}) VALUES (${placeholders}) RETURNING *`;
        try {
            const res = await this.pool.query(sql, values);
            return res.rows[0];
        }
        catch (err) {
            console.error("Insert Error:", err.message);
            throw new common_1.InternalServerErrorException(`Insert Failed: ${err.message}`);
        }
    }
    async update(type, id, body) {
        const config = this.tableMap[type];
        if (!config)
            throw new common_1.BadRequestException(`Invalid Master Type: ${type}`);
        this.normalizeBody(type, body);
        const validKeys = Object.keys(body).filter((key) => config.cols.includes(key));
        if (validKeys.length === 0)
            throw new common_1.BadRequestException("No valid fields provided");
        const setClause = validKeys
            .map((key, i) => `${key} = $${i + 1}`)
            .join(", ");
        const values = validKeys.map((key) => body[key]);
        values.push(id);
        const sql = `UPDATE ${config.table} SET ${setClause} WHERE ${config.pk} = $${values.length} RETURNING *`;
        try {
            const res = await this.pool.query(sql, values);
            if (res.rowCount === 0)
                throw new common_1.NotFoundException(`Record not found`);
            return res.rows[0];
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async remove(type, id) {
        const config = this.tableMap[type];
        if (!config)
            throw new common_1.BadRequestException(`Invalid Master Type: ${type}`);
        const sql = `DELETE FROM ${config.table} WHERE ${config.pk} = $1 RETURNING ${config.pk}`;
        try {
            const res = await this.pool.query(sql, [id]);
            if (res.rowCount === 0)
                throw new common_1.NotFoundException(`Record not found`);
            return { deleted: true, id };
        }
        catch (err) {
            if (err.code === "23503") {
                throw new common_1.BadRequestException("Cannot delete: This record is used by other data.");
            }
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    normalizeBody(type, body) {
        if (type === "STATE" && body.stateName)
            body.state = body.stateName;
        if (type === "DISTRICT" && body.districtName)
            body.district = body.districtName;
        if (body.stateID)
            body.stateid = body.stateID;
        if (body.districtID)
            body.districtid = body.districtID;
    }
};
exports.MastersService = MastersService;
exports.MastersService = MastersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)("DATABASE_POOL")),
    __metadata("design:paramtypes", [pg_1.Pool])
], MastersService);
//# sourceMappingURL=masters.service.js.map