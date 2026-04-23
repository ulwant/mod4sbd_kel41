const API_URL = 'http://localhost:3000/api';

// ============ Utility ============
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => notification.classList.remove('show'), 3000);
}

// ============ API Helpers ============
async function fetchBooks() {
    try {
        const r = await fetch(`${API_URL}/books`);
        if (!r.ok) throw new Error('Gagal mengambil buku');
        return await r.json();
    } catch (e) {
        console.error(e);
        showNotification('Gagal memuat buku', 'error');
        return [];
    }
}

async function fetchTopBooks() {
    try {
        const r = await fetch(`${API_URL}/reports/top-books`);
        if (!r.ok) throw new Error('Gagal mengambil top books');
        return await r.json();
    } catch (e) {
        console.error(e);
        showNotification('Gagal memuat top books', 'error');
        return [];
    }
}

async function fetchAuthors(name) {
    try {
        const url = name ? `${API_URL}/authors?name=${encodeURIComponent(name)}` : `${API_URL}/authors`;
        const r = await fetch(url);
        if (!r.ok) throw new Error('Gagal mengambil penulis');
        return await r.json();
    } catch (e) { console.error(e); showNotification('Gagal memuat penulis', 'error'); return []; }
}

async function fetchCategories(name) {
    try {
        const url = name ? `${API_URL}/categories?name=${encodeURIComponent(name)}` : `${API_URL}/categories`;
        const r = await fetch(url);
        if (!r.ok) throw new Error('Gagal mengambil kategori');
        return await r.json();
    } catch (e) { console.error(e); showNotification('Gagal memuat kategori', 'error'); return []; }
}

async function registerMember(full_name, email, member_type) {
    try {
        const r = await fetch(`${API_URL}/members`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, member_type })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Gagal mendaftar member');
        showNotification(data.message, 'success');
        document.getElementById('registerForm').reset();
        const container = document.getElementById('memberResult');
        container.innerHTML = `Member terdaftar: <strong>${data.data.full_name}</strong> (ID ${data.data.id})`;
        return data.data;
    } catch (e) { console.error(e); showNotification(e.message, 'error'); return null; }
}

async function borrowBookByIsbn(isbn, member_email, due_date) {
    if (!isbn || !member_email || !due_date) { showNotification('Semua field harus diisi', 'error'); return null; }
    try {
        const r = await fetch(`${API_URL}/loans`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isbn, member_email, due_date })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Gagal meminjam buku');
        showNotification(data.message, 'success');
        // show modal with loan info
        showLoanModal(data.data);
        document.getElementById('borrowForm').reset();
        return data.data;
    } catch (e) { console.error(e); showNotification(e.message, 'error'); return null; }
}

function extractLongestDigits(s) {
    if (!s) return null;
    const matches = s.match(/\d+/g);
    if (!matches) return null;
    // return the longest sequence (most likely the numeric loan id)
    return matches.reduce((a, b) => a.length >= b.length ? a : b, '');
}

async function returnBook(member_email, loan_id_raw, return_date) {
    if (!member_email || !loan_id_raw || !return_date) { showNotification('Semua field harus diisi', 'error'); return null; }

    const extracted = extractLongestDigits(loan_id_raw);
    if (!extracted) { showNotification('Tidak menemukan angka pada ID peminjaman', 'error'); return null; }

    try {
        const r = await fetch(`${API_URL}/loans/return`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_email, loan_id: extracted, return_date })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Gagal mengembalikan buku');
        showNotification(data.message, 'success');
        document.getElementById('returnForm').reset();
        return data.data;
    } catch (e) { console.error(e); showNotification(e.message, 'error'); return null; }
}

// ============ UI Helpers ============
function renderBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    if (!books || books.length === 0) { booksGrid.innerHTML = '<p class="loading">Tidak ada buku tersedia</p>'; return; }
    booksGrid.innerHTML = books.map(book => `
        <div class="book-card">
            <h3>${book.title}</h3>
            <div class="book-info"><strong>Penulis:</strong> ${book.author_name || 'N/A'}</div>
            <div class="book-info"><strong>Kategori:</strong> ${book.category_name || 'N/A'}</div>
            <div class="book-info"><strong>ID:</strong> ${book.id}</div>
            <div class="book-info"><strong>ISBN:</strong> ${book.isbn}</div>
            <span class="stock-available ${getStockClass(book.available_copies)}">Sisa Stok: ${book.available_copies}/${book.total_copies}</span>
        </div>
    `).join('');
}

function renderTopBooks(books) {
    const container = document.getElementById('topBooksContainer');
    if (!books || books.length === 0) { container.innerHTML = '<p class="loading">Belum ada data buku yang dipinjam</p>'; return; }
    container.innerHTML = books.map((book, i) => `
        <div class="top-book-card">
            <div class="top-book-rank">🏆 #${i+1}</div>
            <h3>${book.title}</h3>
            <div class="top-book-info"><strong>👤 Penulis:</strong> ${book.author_name || 'N/A'}</div>
            <div class="top-book-info"><strong>📚 Kategori:</strong> ${book.category_name || 'N/A'}</div>
            <div class="top-book-info"><strong>📇 ISBN:</strong> ${book.isbn}</div>
            <div class="top-book-info"><strong>📦 Stok Tersedia:</strong> ${book.available_copies}/${book.total_copies}</div>
            <div class="top-book-count">✨ Dipinjam ${book.loan_count} kali</div>
        </div>
    `).join('');
}

function getStockClass(stock) { if (stock === 0) return 'out-of-stock'; if (stock <= 2) return 'low-stock'; return 'in-stock'; }

function showLoanModal(loan) {
    const modal = document.getElementById('loanModal');
    const info = document.getElementById('loanInfo');
    info.innerHTML = `
        <p><strong>ID Peminjaman:</strong> ${loan.id}</p>
        <p><strong>Buku:</strong> ${loan.book_title}</p>
        <p><strong>Member:</strong> ${loan.member_name}</p>
        <p><strong>Due date:</strong> ${loan.due_date ? loan.due_date.split('T')[0] : ''}</p>
    `;
    modal.style.display = 'block';
}

function hideLoanModal() { document.getElementById('loanModal').style.display = 'none'; }

// ============ Search Rendering ============
function renderAuthors(authors) {
    const booksGrid = document.getElementById('booksGrid');
    if (!authors || authors.length === 0) return booksGrid.innerHTML = '<p class="loading">Tidak ada penulis</p>';
    booksGrid.innerHTML = authors.map(a => `
        <div class="book-card">
            <h3>${a.name}</h3>
            <div class="book-info"><strong>Nationality:</strong> ${a.nationality || 'N/A'}</div>
            <div class="book-info"><strong>ID:</strong> ${a.id}</div>
        </div>
    `).join('');
}

function renderCategories(categories) {
    const booksGrid = document.getElementById('booksGrid');
    if (!categories || categories.length === 0) return booksGrid.innerHTML = '<p class="loading">Tidak ada kategori</p>';
    booksGrid.innerHTML = categories.map(c => `
        <div class="book-card">
            <h3>${c.name}</h3>
            <div class="book-info"><strong>ID:</strong> ${c.id}</div>
        </div>
    `).join('');
}

// ============ Init & Handlers ============
document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('borrowDueDate').value = today;
    document.getElementById('returnDate').value = today;

    // Load lists
    const books = await fetchBooks(); renderBooks(books);
    const top = await fetchTopBooks(); renderTopBooks(top);

    // Close modal
    document.getElementById('modalClose').addEventListener('click', hideLoanModal);
    window.addEventListener('click', (e) => { if (e.target.id === 'loanModal') hideLoanModal(); });

    // Search handlers
    document.getElementById('searchBtn').addEventListener('click', async () => {
        const type = document.getElementById('searchType').value;
        const q = document.getElementById('searchQuery').value.trim();
        if (!q) {
            // if empty, reload default listing
            const books = await fetchBooks(); renderBooks(books);
            return;
        }
        if (type === 'books') {
            const books = await fetchBooks();
            const filtered = books.filter(b => b.title && b.title.toLowerCase().includes(q.toLowerCase()));
            renderBooks(filtered);
        } else if (type === 'authors') {
            const authors = await fetchAuthors(q);
            renderAuthors(authors);
        } else if (type === 'categories') {
            const cats = await fetchCategories(q);
            renderCategories(cats);
        }
    });

    document.getElementById('clearSearchBtn').addEventListener('click', async () => {
        document.getElementById('searchQuery').value = '';
        const books = await fetchBooks(); renderBooks(books);
    });

    // Borrow form
    document.getElementById('borrowForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const isbn = document.getElementById('borrowIsbn').value.trim();
        const member_email = document.getElementById('borrowMemberEmail').value.trim();
        const due_date = document.getElementById('borrowDueDate').value;
        if (!isbn || !member_email || !due_date) return showNotification('Semua field harus diisi', 'error');
        const result = await borrowBookByIsbn(isbn, member_email, due_date);
        if (result) {
            const updated = await fetchBooks(); renderBooks(updated);
            const updatedTop = await fetchTopBooks(); renderTopBooks(updatedTop);
        }
    });

    // Return form
    document.getElementById('returnForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const member_email = document.getElementById('returnMemberEmail').value.trim();
        const loan_raw = document.getElementById('returnLoanId').value.trim();
        const return_date = document.getElementById('returnDate').value;
        if (!member_email || !loan_raw || !return_date) return showNotification('Semua field harus diisi', 'error');
        const result = await returnBook(member_email, loan_raw, return_date);
        if (result) {
            const updated = await fetchBooks(); renderBooks(updated);
            const updatedTop = await fetchTopBooks(); renderTopBooks(updatedTop);
        }
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const member_type = document.getElementById('regType').value.trim();
        if (!full_name || !email || !member_type) return showNotification('Semua field harus diisi', 'error');
        await registerMember(full_name, email, member_type);
    });
});