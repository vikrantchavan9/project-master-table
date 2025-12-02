import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { MASTER_DB_CONFIG } from "./masters.config";

@Injectable()
export class MastersService {
  constructor(@Inject("DATABASE_POOL") private pool: Pool) {}

  // Configuration
  private tableMap = MASTER_DB_CONFIG;

  async findAll(type: string, query: any) {
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    // Pagination & Sorting Defaults
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search || "";

    // We use this alias for WHERE, SORT and COUNT clauses.
    const aliasMap: Record<string, string> = {
      COUNTRY: "c",
      STATE: "s",
      DISTRICT: "d",
      PINCODE_MASTER: "p",
    };

    // Default to empty string for simple tables (Skills, etc), specific char for hierarchies
    const mainAlias = aliasMap[type] || "m";
    const prefix = `${mainAlias}.`;

    // --- Dynamic WHERE Clause ---
    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIdx = 1;

    // A. Search Filter
    if (search) {
      whereClauses.push(`${prefix}${config.sort} ILIKE $${paramIdx}`);
      values.push(`%${search}%`);
      paramIdx++;
    }

    // [STATE MASTER]: Filter by Country Code
    // Used when selecting a Country in the State form.
    if (type === "STATE" && query.country_code) {
      whereClauses.push(`TRIM(s.country_code) = TRIM($${paramIdx})`);
      values.push(query.country_code);
      paramIdx++;
    }

    // [DISTRICT MASTER]: Filter Logic
    if (type === "DISTRICT") {
      // console.log("📌 [SERVICE] DISTRICT Query:", query);
      // console.log("📌 [SERVICE] state_code received:", query.state_code);
      // console.log("📌 [SERVICE] state (name) received:", query.state);
      // console.log("📌 [SERVICE] country_code received:", query.country_code);

      // Filter by State Code (Code-based)
      if (query.state_code) {
        // FIX: Add TRIM() to handle 'TS ' vs 'TS' mismatch
        whereClauses.push(`TRIM(d.state_code) = TRIM($${paramIdx})`);
        values.push(query.state_code);
        paramIdx++;
      }
      // Filter by State Name (Name-based)
      if (query.state) {
        // FIX: Add UPPER() and TRIM() for name mismatches
        whereClauses.push(`TRIM(UPPER(s.state)) = TRIM(UPPER($${paramIdx}))`);
        values.push(query.state);
        paramIdx++;
      }
      // Filter by Country
      if (query.country_code) {
        whereClauses.push(`TRIM(d.country_code) = TRIM($${paramIdx})`);
        values.push(query.country_code);
        paramIdx++;
      }
    }

    // [PINCODE MASTER]: Filter Logic
    if (type === "PINCODE_MASTER") {
      if (query.district) {
        // FIX: Filter 'p.district' directly (Pincode table column)
        whereClauses.push(`p.district = $${paramIdx}`);
        values.push(query.district);
        paramIdx++;
      }
      if (query.state) {
        // FIX: Filter 'p.state' directly (Pincode table column)
        whereClauses.push(`TRIM(UPPER(p.state)) = TRIM(UPPER($${paramIdx}))`);
        values.push(query.state);
        paramIdx++;
      }
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- 2. Build SELECT Query ---
    let selectSql = `SELECT ${mainAlias}.* FROM ${config.table} ${mainAlias}`;

    // Define Joins
    if (type === "STATE") {
      selectSql = `
        SELECT s.*, c.country as parent_name
        FROM mast_state s
        LEFT JOIN mast_country c ON s.country_code = c.country_code
      `;
    } else if (type === "DISTRICT") {
      // FIX: Robust Join using TRIM
      selectSql = `
        SELECT d.*, s.state as parent_name
        FROM mast_district d
        LEFT JOIN mast_state s 
          ON TRIM(d.state_code) = TRIM(s.state_code) 
          AND TRIM(d.country_code) = TRIM(s.country_code)
      `;
    } else if (type === "PINCODE_MASTER") {
      selectSql = `
        SELECT p.*, c.country as country_name
        FROM mast_pincode p
        LEFT JOIN mast_country c ON p.country_code = c.country_code
      `;
    }

    // --- 3. Run Query ---
    const dataQuery = `
      ${selectSql}
      ${whereSql}
      ORDER BY ${prefix}${config.sort} ASC, ${prefix}${config.pk} ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Count Query: Must use same WHERE clauses
    const fromClause = selectSql.substring(
      selectSql.toUpperCase().indexOf("FROM")
    );
    const countQuery = `SELECT COUNT(*) as total ${fromClause} ${whereSql}`;

    try {
      console.log(`\n🔍 [${type}] SQL:\n${dataQuery}`); // Debug SQL

      console.log("📌 [SERVICE] SQL Params:", values);

      const [dataRes, countRes] = await Promise.all([
        this.pool.query(dataQuery, values),
        this.pool.query(countQuery, values),
      ]);

      const totalRecords = parseInt(countRes.rows[0]?.total || "0", 10);

      return {
        data: dataRes.rows,
        total: totalRecords,
        page,
        lastPage: Math.ceil(totalRecords / limit),
      };
    } catch (err) {
      console.error("\n❌ DB Error:", err.message);
      throw new InternalServerErrorException(err.message);
    }
  }

  // --- GENERIC CREATE ---
  async create(type: string, body: any) {
    if (body.state_code && !body.state) {
      // 🔥 FIX: Use TRIM() here to match 'AN ' with 'AN'
      const stateRes = await this.pool.query(
        `SELECT state FROM mast_state WHERE TRIM(state_code) = TRIM($1) LIMIT 1`,
        [body.state_code]
      );
      if (stateRes.rows[0]) {
        body.state = stateRes.rows[0].state;
      } else {
        // Optional: Fail explicitly if State Name not found to avoid DB constraint error
        throw new BadRequestException(
          `Could not find State Name for code: ${body.state_code}`
        );
      }
    }
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    this.normalizeBody(type, body);

    // Validate fields against Config
    const validKeys = Object.keys(body).filter((key) =>
      config.cols.includes(key)
    );
    if (validKeys.length === 0)
      throw new BadRequestException("No valid fields provided");

    // Build Insert Query
    const columns = validKeys.join(", ");
    const placeholders = validKeys.map((_, i) => `$${i + 1}`).join(", ");
    const values = validKeys.map((key) => body[key]);

    const sql = `INSERT INTO ${config.table} (${columns}) VALUES (${placeholders}) RETURNING *`;

    try {
      const res = await this.pool.query(sql, values);
      return res.rows[0];
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  // --- GENERIC UPDATE ---
  async update(type: string, id: string, body: any) {
    if (type === "PINCODE_MASTER" && body.state_code && !body.state) {
      // 🔥 FIX: Use TRIM() here too
      const stateRes = await this.pool.query(
        `SELECT state FROM mast_state WHERE TRIM(state_code) = TRIM($1) LIMIT 1`,
        [body.state_code]
      );
      if (stateRes.rows[0]) body.state = stateRes.rows[0].state;
    }

    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    this.normalizeBody(type, body);

    const validKeys = Object.keys(body).filter((key) =>
      config.cols.includes(key)
    );
    if (validKeys.length === 0)
      throw new BadRequestException("No valid fields provided");

    // Build Update Query (col1 = $1, col2 = $2)
    const setClause = validKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");
    const values = validKeys.map((key) => body[key]);
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

  // --- GENERIC DELETE ---
  async remove(type: string, id: string) {
    const config = this.tableMap[type];
    if (!config) throw new BadRequestException(`Invalid Master Type: ${type}`);

    const sql = `DELETE FROM ${config.table} WHERE ${config.pk} = $1 RETURNING ${config.pk}`;

    try {
      const res = await this.pool.query(sql, [id]);
      if (res.rowCount === 0) throw new NotFoundException(`Record not found`);
      return { deleted: true, id };
    } catch (err) {
      if (err.code === "23503") {
        // Foreign Key Violation code
        throw new BadRequestException(
          "Cannot delete: This record is used by other data."
        );
      }
      throw new InternalServerErrorException(err.message);
    }
  }

  // Helper: Standardize Frontend inputs to Database Column names
  private normalizeBody(type: string, body: any) {
    if (type === "STATE" && body.stateName) body.state = body.stateName;
    if (type === "DISTRICT" && body.districtName)
      body.district = body.districtName;
    if (body.stateID) body.stateid = body.stateID;
    if (body.districtID) body.districtid = body.districtID;
  }
}
