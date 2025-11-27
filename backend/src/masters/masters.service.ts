import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
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
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search || "";

    // --- Alias Map ---
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

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    let selectSql = `SELECT * FROM ${config.table}`;

    // JOIN LOGIC: Ensure we fetch parent IDs so the Edit Form works
    if (type === "STATE") {
      selectSql = `
        SELECT s.*, c.country as parent_name
        FROM mast_state s
        LEFT JOIN mast_country c ON s.country_code = c.country_code
      `;
    } else if (type === "DISTRICT") {
      // Fetch 'country_code' from state so cascading dropdowns work on Edit
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
    } catch (err) {
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

  // --- UPDATE (NEW) ---
  async update(type: string, id: string, body: any) {
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    this.normalizeBody(type, body);

    const validKeys = Object.keys(body).filter((key) =>
      config.cols.includes(key)
    );
    if (validKeys.length === 0)
      throw new BadRequestException("No valid fields provided");

    // Build SET clause: "col1 = $1, col2 = $2"
    const setClause = validKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");
    const values = validKeys.map((key) => body[key]);

    // Add ID as the last parameter
    values.push(id);

    const sql = `UPDATE ${config.table} SET ${setClause} WHERE ${config.pk} = $${values.length} RETURNING *`;

    try {
      const res = await this.pool.query(sql, values);
      if (res.rowCount === 0) throw new NotFoundException(`Record not found`);
      return res.rows[0];
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // --- DELETE (NEW) ---
  async remove(type: string, id: string) {
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    const sql = `DELETE FROM ${config.table} WHERE ${config.pk} = $1 RETURNING ${config.pk}`;

    try {
      const res = await this.pool.query(sql, [id]);
      if (res.rowCount === 0) throw new NotFoundException(`Record not found`);
      return { deleted: true, id };
    } catch (err) {
      // Handle Foreign Key constraints (e.g. trying to delete a Country used by a State)
      if (err.code === "23503") {
        throw new BadRequestException(
          "Cannot delete: This record is used by other data."
        );
      }
      throw new InternalServerErrorException(err.message);
    }
  }

  // Helper to fix Frontend vs Backend naming mismatches
  private normalizeBody(type: string, body: any) {
    if (type === "STATE" && body.stateName) body.state = body.stateName;
    if (type === "DISTRICT" && body.districtName)
      body.district = body.districtName;
    if (body.stateID) body.stateid = body.stateID;
    if (body.districtID) body.districtid = body.districtID;
  }
}
