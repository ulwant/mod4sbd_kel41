import { BookModel } from '../models/bookModel.js';

export const BookController = {
  async getAllBooks(req, res) {
    try {
      const { title } = req.query;
      const books = title ? await BookModel.getAll().then(all => all.filter(b => b.title && b.title.toLowerCase().includes(title.toLowerCase()))) : await BookModel.getAll();
      res.json(books);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async createBook(req, res) {
    try {
      const newBook = await BookModel.create(req.body);
      res.status(201).json(newBook);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
  ,
  async getBookById(req, res) {
    try {
      const book = await BookModel.getById(req.params.id);
      if (!book) return res.status(404).json({ error: 'Book not found' });
      res.json(book);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  async updateBook(req, res) {
    try {
      const updated = await BookModel.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  async deleteBook(req, res) {
    try {
      await BookModel.delete(req.params.id);
      res.json({ message: 'Book deleted' });
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
};
