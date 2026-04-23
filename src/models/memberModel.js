import { pool } from '../config/db.js';

export const MemberModel = {
  async getAll() {
    const result = await pool.query('SELECT * FROM members ORDER BY joined_at DESC');
    return result.rows;
  },

  async create(data) {
    const { full_name, email, member_type } = data;
    const query = `
      INSERT INTO members (full_name, email, member_type) 
      VALUES ($1, $2, $3) RETURNING *
    `;
    const result = await pool.query(query, [full_name, email, member_type]);
    return result.rows[0];
  }
  ,
  // Search members by name (case-insensitive, partial)
  async search(name) {
    const q = `%${name}%`;
    const { rows } = await pool.query(
      'SELECT * FROM members WHERE full_name ILIKE $1 ORDER BY id',
      [q]
    );
    return rows;
  }
  ,
  async getByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM members WHERE email = $1 LIMIT 1', [email]);
    return rows[0];
  }
  ,
  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM members WHERE id = $1 LIMIT 1', [id]);
    return rows[0];
  },

  async update(id, data) {
    const { full_name, email, member_type } = data;
    const { rows } = await pool.query(
      'UPDATE members SET full_name=$1, email=$2, member_type=$3 WHERE id=$4 RETURNING *',
      [full_name, email, member_type, id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM members WHERE id = $1', [id]);
    return { message: 'Member deleted' };
  }
};