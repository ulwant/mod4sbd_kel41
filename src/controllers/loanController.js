import { LoanModel } from '../models/loanModel.js';
import { BookModel } from '../models/bookModel.js';
import { MemberModel } from '../models/memberModel.js';

export const LoanController = {
  // Create loan by ISBN + member email
  async createLoan(req, res) {
    const { isbn, member_email, due_date } = req.body;
    if (!isbn || !member_email || !due_date) {
      return res.status(400).json({ error: 'isbn, member_email, dan due_date harus diisi' });
    }

    try {
      const book = await BookModel.getByISBN(isbn);
      if (!book) return res.status(400).json({ error: 'Buku dengan ISBN tersebut tidak ditemukan' });

      let member = await MemberModel.getByEmail(member_email);
      if (!member) {
        // fallback: try to search by name and match email
        const maybe = await MemberModel.search(member_email);
        member = maybe.find(m => m.email && m.email.toLowerCase() === member_email.toLowerCase());
      }
      if (!member) return res.status(400).json({ error: 'Member dengan email tersebut tidak ditemukan' });

      const loan = await LoanModel.createLoan(book.id, member.id, due_date);
      res.status(201).json({ message: 'Peminjaman berhasil dicatat!', data: loan });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getLoans(req, res) {
    try {
      const loans = await LoanModel.getAllLoans();
      res.json(loans);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Return loan by providing member_email and loan_id (verifies ownership)
  async returnLoan(req, res) {
    const { member_email, loan_id, return_date } = req.body;
    if (!member_email || !loan_id) return res.status(400).json({ error: 'member_email dan loan_id harus diisi' });

    try {
      const member = await MemberModel.getByEmail(member_email);
      if (!member) return res.status(400).json({ error: 'Member tidak ditemukan' });

      const loan = await LoanModel.returnLoanByMember(loan_id, member.id, return_date || new Date().toISOString().split('T')[0]);
      res.status(200).json({ message: 'Peminjaman berhasil dikembalikan!', data: loan });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getTopBooks(req, res) {
    try {
      const topBooks = await LoanModel.getTopBooks();
      res.json(topBooks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};
