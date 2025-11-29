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

    // Define Table Alias to prevent Ambiguity Errors (s=state, d=district)
    // We use this alias for WHERE, SORT and COUNT clauses.
    const alias =
      type === "STATE"
        ? "s"
        : type === "DISTRICT"
        ? "d"
        : type === "PINCODE_MASTER"
        ? "p"
        : "";
    const prefix = alias ? `${alias}.` : "";

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

    // B. Context Filters

    // Filter States by Country
    if (type === "STATE" && query.country_code) {
      whereClauses.push(`s.country_code = $${paramIdx}`); // <--- FIXED: Added 's.'
      values.push(query.country_code);
      paramIdx++;
    }

    // Filter Districts by State
    if (type === "DISTRICT") {
      // A. Filter by State Code (Standard District Master)
      if (query.state_code) {
        whereClauses.push(`d.state_code = $${paramIdx}`);
        values.push(query.state_code);
        paramIdx++;
      }
      // B. Filter by State Name (For Pincode Master Dropdown) <<-- NEW LOGIC
      if (query.state) {
        whereClauses.push(`s.state = $${paramIdx}`);
        values.push(query.state);
        paramIdx++;
      }
      // C. Filter by Country
      if (query.country_code) {
        whereClauses.push(`d.country_code = $${paramIdx}`);
        values.push(query.country_code);
        paramIdx++;
      }
    }

    // Pincode Filters
    if (type === "PINCODE_MASTER") {
      if (query.district) {
        whereClauses.push(`p.district = $${paramIdx}`);
        values.push(query.district);
        paramIdx++;
      }
      // If filtering by State Name
      if (query.state) {
        whereClauses.push(`p.state = $${paramIdx}`);
        values.push(query.state);
        paramIdx++;
      }
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- 2. Build SELECT Query ---
    let selectSql = `SELECT * FROM ${config.table}`;

    // Define Joins
    if (type === "STATE") {
      // Join to show Country Name
      selectSql = `
        SELECT s.*, c.country as parent_name
        FROM mast_state s
        LEFT JOIN mast_country c ON s.country_code = c.country_code
      `;
    } else if (type === "DISTRICT") {
      // Join on STATE_CODE (Not ID)
      selectSql = `
        SELECT d.*, s.state as parent_name
        FROM mast_district d
        LEFT JOIN mast_state s ON d.state_code = s.state_code AND d.country_code = s.country_code
      `;
    } else if (type === "PINCODE_MASTER") {
      // No joins needed! The table already has 'state' and 'district' names.
      // We just join Country for the country name.
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
      ORDER BY ${prefix}${config.sort} ASC  -- <--- FIXED: Added prefix to sort too
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM ${config.table} ${alias} ${whereSql}`;

    try {
      const [dataRes, countRes] = await Promise.all([
        this.pool.query(dataQuery, values),
        this.pool.query(countQuery, values),
      ]);
      return {
        data: dataRes.rows,
        total: parseInt(countRes.rows[0]?.total || "0"),
        page,
        lastPage: Math.ceil(parseInt(countRes.rows[0]?.total || "0") / limit),
      };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // --- GENERIC CREATE ---
  async create(type: string, body: any) {
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
