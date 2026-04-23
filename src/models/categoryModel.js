import { pool } from '../config/db.js';

export const CategoryModel = {
  async getAll() {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    return result.rows;
  },

  async search(name) {
    const q = `%${name}%`;
    const { rows } = await pool.query('SELECT * FROM categories WHERE name ILIKE $1 ORDER BY name ASC', [q]);
    return rows;
  },

  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1 LIMIT 1', [id]);
    return rows[0];
  },

  async create(name) {
    const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING *';
    const result = await pool.query(query, [name]);
    return result.rows[0];
  },

  async update(id, { name }) {
    const { rows } = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    return { message: 'Category deleted' };
  }
};