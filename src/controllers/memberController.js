import { MemberModel } from '../models/memberModel.js';

export const MemberController = {
  // Mendapatkan semua daftar anggota
  async getAllMembers(req, res) {
    try {
      const { name } = req.query;
      let members;
      if (name) members = await MemberModel.search(name);
      else members = await MemberModel.getAll();
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Mendaftarkan anggota baru
  async registerMember(req, res) {
    try {
      const { full_name, email, member_type } = req.body;

      if (!full_name || !email || !member_type) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      // Normalisasi member_type ke uppercase sesuai constraint DB
      const allowed = ['STUDENT', 'FACULTY', 'STAFF'];
      const normalized = member_type.toString().trim().toUpperCase();
      if (!allowed.includes(normalized)) {
        return res.status(400).json({ error: `member_type harus salah satu: ${allowed.join(', ')}` });
      }

      const newMember = await MemberModel.create({ full_name, email, member_type: normalized });
      res.status(201).json({ message: 'Anggota berhasil didaftarkan!', data: newMember });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
  ,
  async getMemberById(req, res) {
    try {
      const member = await MemberModel.getById(req.params.id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      res.json(member);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  async updateMember(req, res) {
    try {
      const updated = await MemberModel.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  async deleteMember(req, res) {
    try {
      await MemberModel.delete(req.params.id);
      res.json({ message: 'Member deleted' });
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
};