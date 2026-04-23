import { pool } from '../config/db.js';

export const LoanModel = {
  async createLoan(book_id, member_id, due_date) {
    const client = await pool.connect(); // Menggunakan client untuk transaksi
    try {
      await client.query('BEGIN'); // Mulai transaksi database

      // 1. Cek ketersediaan buku
      const bookCheck = await client.query('SELECT available_copies FROM books WHERE id = $1', [book_id]);
      if (bookCheck.rows[0].available_copies <= 0) {
        throw new Error('Buku sedang tidak tersedia (stok habis).');
      }

      // 2. Kurangi stok buku
      await client.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = $1', [book_id]);

      // 3. Catat transaksi peminjaman
      const loanQuery = `
        INSERT INTO loans (book_id, member_id, due_date) 
        VALUES ($1, $2, $3) RETURNING *
      `;
      const result = await client.query(loanQuery, [book_id, member_id, due_date]);

      await client.query('COMMIT'); // Simpan semua perubahan

      // Kembalikan record ter-join supaya frontend mudah menampilkan info
      const joined = await pool.query(
        `SELECT l.*, b.title as book_title, m.full_name as member_name
         FROM loans l
         JOIN books b ON l.book_id = b.id
         JOIN members m ON l.member_id = m.id
         WHERE l.id = $1`,
        [result.rows[0].id]
      );
      return joined.rows[0];
    } catch (error) {
      await client.query('ROLLBACK'); // Batalkan jika ada error
      throw error;
    } finally {
      client.release();
    }
  },

  async getAllLoans() {
    const query = `
      SELECT l.*, b.title as book_title, m.full_name as member_name 
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async returnLoan(loan_id, return_date) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Determine if loan_id looks like a UUID. If not, match against id::text to avoid uuid cast errors.
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      let actualLoanId = loan_id;
      let loanResult;
      if (uuidRegex.test(loan_id)) {
        loanResult = await client.query('SELECT book_id FROM loans WHERE id = $1 AND status = $2', [loan_id, 'BORROWED']);
      } else {
        // try to find loan by matching text representation of id (helps when user pastes numeric substrings)
        loanResult = await client.query('SELECT id, book_id FROM loans WHERE id::text LIKE $1 AND status = $2 LIMIT 1', [`%${loan_id}%`, 'BORROWED']);
        if (loanResult.rows.length > 0) actualLoanId = loanResult.rows[0].id;
      }

      if (!loanResult || loanResult.rows.length === 0) {
        throw new Error('Peminjaman tidak ditemukan atau sudah dikembalikan.');
      }

      const { book_id } = loanResult.rows[0];

      // 2. Update status pinjaman menjadi RETURNED dan set return_date
      const updateLoanQuery = `
        UPDATE loans SET status = $1, return_date = $2 
        WHERE id = $3 RETURNING *
      `;
      await client.query(updateLoanQuery, ['RETURNED', return_date, actualLoanId]);

      // 3. Tambah stok buku (+1)
      await client.query(
        'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
        [book_id]
      );

      await client.query('COMMIT');
      
      const result = await pool.query('SELECT * FROM loans WHERE id = $1', [actualLoanId]);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Return loan but ensure the loan belongs to member_id
  async returnLoanByMember(loan_id, member_id, return_date) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Check loan exists, belongs to member and is BORROWED
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      let actualLoanId = loan_id;
      let loanResult;
      if (uuidRegex.test(loan_id)) {
        loanResult = await client.query('SELECT book_id FROM loans WHERE id = $1 AND member_id = $2 AND status = $3', [loan_id, member_id, 'BORROWED']);
      } else {
        loanResult = await client.query('SELECT id, book_id FROM loans WHERE id::text LIKE $1 AND member_id = $2 AND status = $3 LIMIT 1', [`%${loan_id}%`, member_id, 'BORROWED']);
        if (loanResult.rows.length > 0) actualLoanId = loanResult.rows[0].id;
      }

      if (!loanResult || loanResult.rows.length === 0) {
        throw new Error('Peminjaman tidak ditemukan, bukan milik anggota ini, atau sudah dikembalikan.');
      }

      const { book_id } = loanResult.rows[0];

      const updateLoanQuery = `
        UPDATE loans SET status = $1, return_date = $2
        WHERE id = $3 RETURNING *
      `;
      const updated = await client.query(updateLoanQuery, ['RETURNED', return_date, actualLoanId]);

      await client.query('UPDATE books SET available_copies = available_copies + 1 WHERE id = $1', [book_id]);

      await client.query('COMMIT');

      const result = await pool.query('SELECT * FROM loans WHERE id = $1', [actualLoanId]);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getTopBooks() {
    const query = `
      SELECT 
        b.id,
        b.title,
        b.isbn,
        a.name as author_name,
        c.name as category_name,
        b.total_copies,
        b.available_copies,
        COUNT(l.id) as loan_count
      FROM books b
      LEFT JOIN loans l ON b.id = l.book_id
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      GROUP BY b.id, b.title, b.isbn, a.name, c.name, b.total_copies, b.available_copies
      ORDER BY loan_count DESC
      LIMIT 2
    `;
    const result = await pool.query(query);
    return result.rows;
  }
};
