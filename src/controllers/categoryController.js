import { CategoryModel } from '../models/categoryModel.js';

export const CategoryController = {
  async getCategories(req, res) {
    try {
      const { name } = req.query;
      const categories = name ? await CategoryModel.search(name) : await CategoryModel.getAll();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async addCategory(req, res) {
    try {
      const category = await CategoryModel.create(req.body.name);
      res.status(201).json(category);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
  ,
  async getCategoryById(req, res) {
    try {
      const cat = await CategoryModel.getById(req.params.id);
      if (!cat) return res.status(404).json({ error: 'Category not found' });
      res.json(cat);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  async updateCategory(req, res) {
    try {
      const updated = await CategoryModel.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  async deleteCategory(req, res) {
    try {
      await CategoryModel.delete(req.params.id);
      res.json({ message: 'Category deleted' });
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
};