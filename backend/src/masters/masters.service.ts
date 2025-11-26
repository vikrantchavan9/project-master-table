import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Pool } from "pg";

interface MasterConfig {
  table: string;
  pk: string;
  sort: string;
  cols: string[];
}

@Injectable()
export class MastersService {
  constructor(@Inject("DATABASE_POOL") private pool: Pool) {}

  // 1. Configuration
  private tableMap: Record<string, MasterConfig> = {
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

  async findAll(type: string, query: any) {
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    const page = parseInt(query.page) || 1;
    // IF limit is passed in query (for dropdowns), use it. Otherwise default to 10.
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search || "";

    // --- Alias Map ---
    // We define aliases here to avoid "Ambiguous Column" errors
    let mainAlias = "";
    if (type === "STATE") mainAlias = "s";
    else if (type === "DISTRICT") mainAlias = "d";
    else if (type === "PINCODE") mainAlias = "p";

    // Helper to prefix column with alias if alias exists
    const prefix = (col: string) => (mainAlias ? `${mainAlias}.${col}` : col);

    // --- Dynamic WHERE Clause ---
    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIdx = 1;

    // 1. Search
    if (search) {
      whereClauses.push(`${prefix(config.sort)} ILIKE $${paramIdx}`);
      values.push(`%${search}%`);
      paramIdx++;
    }

    // 2. Context Filters
    if (type === "STATE" && query.country_code) {
      // FIX: Explicitly use alias 's.country_code'
      whereClauses.push(`${prefix("country_code")} = $${paramIdx}`);
      values.push(query.country_code);
      paramIdx++;
    }

    if (type === "DISTRICT" && query.stateID) {
      // FIX: Explicitly use alias 'd.stateid'
      whereClauses.push(`${prefix("stateid")} = $${paramIdx}`);
      values.push(query.stateID);
      paramIdx++;
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- Dynamic SELECT Query ---
    let selectSql = `SELECT * FROM ${config.table}`;

    // CUSTOM JOINS: Fetch parent names for grid display
    if (type === "STATE") {
      selectSql = `
        SELECT s.*, c.country as country_name
        FROM mast_state s
        LEFT JOIN mast_country c ON s.country_code = c.country_code
      `;
    } else if (type === "DISTRICT") {
      selectSql = `
        SELECT d.*, s.state as state_name, c.country as country_name
        FROM mast_district d
        LEFT JOIN mast_state s ON d.stateid = s.stateid
        LEFT JOIN mast_country c ON s.country_code = c.country_code
      `;
    } else if (type === "PINCODE") {
      selectSql = `
        SELECT p.*, 
               c.country as country_name, 
               s.state as state_name, 
               d.district as district_name
        FROM mast_place p
        LEFT JOIN mast_country c ON p.country_code = c.country_code
        LEFT JOIN mast_state s ON p.stateid = s.stateid
        LEFT JOIN mast_district d ON p.districtid = d.districtid
      `;
    }

    const dataQuery = `
      ${selectSql}
      ${whereSql}
      ORDER BY ${prefix(config.pk)} DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM ${config.table} ${
      mainAlias ? "AS " + mainAlias : ""
    } ${whereSql}`;

    try {
      // console.log(`Executing: ${dataQuery}`);
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
    } catch (err) {
      console.error("Database Query Error:", err.message);
      console.error("Failed Query:", dataQuery);
      throw new InternalServerErrorException(err.message);
    }
  }

  async create(type: string, body: any) {
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    // --- Data Transformation ---
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

    const validKeys = Object.keys(body).filter((key) =>
      config.cols.includes(key)
    );

    if (validKeys.length === 0) {
      console.error("Invalid Body Received:", body);
      throw new BadRequestException("No valid fields provided");
    }

    const columns = validKeys.join(", ");
    const placeholders = validKeys.map((_, i) => `$${i + 1}`).join(", ");
    const values = validKeys.map((key) => body[key]);

    const sql = `INSERT INTO ${config.table} (${columns}) VALUES (${placeholders}) RETURNING *`;

    try {
      const res = await this.pool.query(sql, values);
      return res.rows[0];
    } catch (err) {
      console.error("Insert Error:", err.message);
      throw new InternalServerErrorException(`Insert Failed: ${err.message}`);
    }
  }
}
