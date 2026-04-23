import { LoanModel } from '../models/loanModel.js';

export const ReportController = {
  async getTopBooks(req, res) {
    try {
      const topBooks = await LoanModel.getTopBooks();
      res.json(topBooks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  ,
  async getStats(req, res) {
    try {
      // Use pool from config
      const { pool } = await import('../config/db.js');
      const [booksRes, authorsRes, categoriesRes, borrowedRes] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total_books FROM books'),
        pool.query('SELECT COUNT(*) AS total_authors FROM authors'),
        pool.query('SELECT COUNT(*) AS total_categories FROM categories'),
        pool.query("SELECT COUNT(*) AS borrowed_count FROM loans WHERE status = 'BORROWED'")
      ]);

      res.json({
        total_books: parseInt(booksRes.rows[0].total_books, 10),
        total_authors: parseInt(authorsRes.rows[0].total_authors, 10),
        total_categories: parseInt(categoriesRes.rows[0].total_categories, 10),
        borrowed_count: parseInt(borrowedRes.rows[0].borrowed_count, 10)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};
