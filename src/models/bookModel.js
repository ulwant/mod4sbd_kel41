import { pool } from '../config/db.js';

export const BookModel = {
  // Mengambil semua buku dengan nama penulis dan kategori (JOIN)
  async getAll() {
    const query = `
      SELECT b.*, a.name as author_name, c.name as category_name 
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async create(data) {
    const { isbn, title, author_id, category_id, total_copies } = data;
    const query = `
      INSERT INTO books (isbn, title, author_id, category_id, total_copies, available_copies)
      VALUES ($1, $2, $3, $4, $5, $5) RETURNING *
    `;
    const result = await pool.query(query, [isbn, title, author_id, category_id, total_copies]);
    return result.rows[0];
  },

  async getByISBN(isbn) {
    const query = 'SELECT * FROM books WHERE isbn = $1 LIMIT 1';
    const result = await pool.query(query, [isbn]);
    return result.rows[0];
  },

  async getById(id) {
    const query = `
      SELECT b.*, a.name as author_name, c.name as category_name 
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, data) {
    // allow updating isbn, title, author_id, category_id, total_copies
    const { isbn, title, author_id, category_id, total_copies } = data;
    // compute new available_copies based on borrowed count
    const cur = await pool.query('SELECT total_copies, available_copies FROM books WHERE id = $1', [id]);
    if (cur.rows.length === 0) throw new Error('Book not found');
    const { total_copies: curTotal, available_copies: curAvailable } = cur.rows[0];
    const borrowed = curTotal - curAvailable;
    const newTotal = typeof total_copies === 'number' ? total_copies : curTotal;
    const newAvailable = Math.max(0, newTotal - borrowed);
    const query = `
      UPDATE books SET isbn=$1, title=$2, author_id=$3, category_id=$4, total_copies=$5, available_copies=$6
      WHERE id = $7 RETURNING *
    `;
    const result = await pool.query(query, [isbn, title, author_id, category_id, newTotal, newAvailable, id]);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM books WHERE id = $1';
    await pool.query(query, [id]);
    return { message: "Buku berhasil dihapus dari sistem." };
  }
};