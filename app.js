// Scope aplikasi untuk menghindari polusi variabel global
(() => {
    // === STATE & PERSISTENCE ===
    const REORDER_LEVEL = 5; // Level stok minimum sebelum masuk daftar reorder
    let db = {
        products: [],
        transactions: [],
        cart: {}
    };

    // Fungsi untuk menyimpan state ke localStorage
    const saveState = () => {
        localStorage.setItem('superkasir_db', JSON.stringify(db));
    };

    // Fungsi untuk memuat state dari localStorage
    const loadState = () => {
        const savedDb = localStorage.getItem('superkasir_db');
        if (savedDb) {
            db = JSON.parse(savedDb);
        } else {
            // Jika tidak ada data, isi dengan data demo
            db = {
                products: [{
                    code: '8992761134037',
                    name: 'Indomie Goreng',
                    price: 3500,
                    stock: 50
                }, {
                    code: '8999909012039',
                    name: 'Teh Pucuk Harum 350ml',
                    price: 4000,
                    stock: 80
                }, {
                    code: '89686642003',
                    name: 'Le Minerale 600ml',
                    price: 3000,
                    stock: 3
                }],
                transactions: [],
                cart: {}
            };
            saveState();
        }
    };


    // === UTILITIES ===
    const qs = s => document.querySelector(s);
    const qa = s => document.querySelectorAll(s);
    const rupiah = n => 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const showToast = (message, type = 'info') => {
        // Untuk masa depan, bisa diganti dengan library notifikasi yang lebih baik
        alert(message);
    }

    // === RENDER FUNCTIONS ===

    // Render semua data ke UI
    const renderAll = () => {
        renderProducts();
        renderDashboard();
        renderCart();
        renderTransactions();
    }

    // Render tabel produk
    const renderProducts = () => {
        const tbody = qs('#productTable tbody');
        tbody.innerHTML = '';
        if (db.products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada produk.</td></tr>`;
            return;
        }
        db.products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>${rupiah(p.price)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="edit" data-code="${p.code}">Edit</button>
          <button class="del" data-code="${p.code}">Hapus</button>
        </td>`;
            tbody.appendChild(tr);
        });
    };

    // Render data di dashboard
    const renderDashboard = () => {
        // [BARU] Logika untuk Sapaan Dinamis
        const hour = new Date().getHours();
        let greetingText = 'Selamat Datang, Admin!';
        if (hour < 11) {
            greetingText = 'Selamat Pagi, Admin!';
        } else if (hour < 15) {
            greetingText = 'Selamat Siang, Admin!';
        } else if (hour < 19) {
            greetingText = 'Selamat Sore, Admin!';
        } else {
            greetingText = 'Selamat Malam, Admin!';
        }
        qs('#greeting').innerText = greetingText;


        const today = new Date().toISOString().slice(0, 10);
        const todayTxs = db.transactions.filter(t => t.date.startsWith(today));

        qs('#totalProducts').innerText = db.products.length;
        qs('#totalStock').innerText = db.products.reduce((acc, p) => acc + p.stock, 0);
        qs('#txCount').innerText = todayTxs.length;
        qs('#todaySales').innerText = rupiah(todayTxs.reduce((acc, t) => acc + t.total, 0));

        // Render produk terlaris
        const salesCount = {};
        todayTxs.forEach(tx => {
            for (const code in tx.items) {
                salesCount[code] = (salesCount[code] || 0) + tx.items[code].qty;
            }
        });
        const sortedProducts = Object.entries(salesCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5); // Ambil 5 teratas

        const topProductsList = qs('#topProducts');
        topProductsList.innerHTML = '';
        if (sortedProducts.length === 0) {
            topProductsList.innerHTML = '<li>Belum ada penjualan hari ini.</li>';
        } else {
            sortedProducts.forEach(([code, qty]) => {
                const product = db.products.find(p => p.code === code);
                if (product) {
                    const li = document.createElement('li');
                    li.innerText = `${product.name} (${qty} terjual)`;
                    topProductsList.appendChild(li);
                }
            });
        }

        // Render info reorder
        const reorderItems = db.products.filter(p => p.stock <= REORDER_LEVEL);
        const reorderList = qs('#reorderList');
        reorderList.innerHTML = '';
        if (reorderItems.length === 0) {
            reorderList.innerHTML = '<li>Semua stok aman.</li>';
        } else {
            reorderItems.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `${p.name} (Sisa: <strong>${p.stock}</strong>)`;
                reorderList.appendChild(li);
            });
        }
    };

    // Render keranjang belanja
    const renderCart = () => {
        const tbody = qs('#cartTable tbody');
        const cartItems = Object.values(db.cart);
        tbody.innerHTML = '';
        let total = 0;

        if (cartItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Keranjang kosong</td></tr>`;
        } else {
            cartItems.forEach(item => {
                const subtotal = item.price * item.qty;
                total += subtotal;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">${rupiah(item.price)}</div>
                </td>
                <td>${item.qty}</td>
                <td>${rupiah(subtotal)}</td>
                <td><button class="del-cart-item" data-code="${item.code}">×</button></td>
            `;
                tbody.appendChild(tr);
            });
        }
        qs('#cartTotal').innerText = rupiah(total);
        qs('#cartCount').innerText = cartItems.reduce((acc, item) => acc + item.qty, 0);
        qs('#payBtn').disabled = cartItems.length === 0;
    };

    // Render laporan transaksi
    const renderTransactions = (txs = db.transactions) => {
        const tbody = qs('#txTable tbody');
        tbody.innerHTML = '';
        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada transaksi.</td></tr>';
            return;
        }
        txs.slice().reverse().forEach(t => { // Tampilkan dari yang terbaru
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${t.id}</td>
        <td>${new Date(t.date).toLocaleString('id-ID')}</td>
        <td>${Object.values(t.items).length} item</td>
        <td>${rupiah(t.total)}</td>
      `;
            tbody.appendChild(tr);
        });
    };

    // Fungsi untuk menampilkan struk
    const showReceipt = (transaction) => {
        qs('#receiptTxId').innerText = transaction.id;
        qs('#receiptDate').innerText = new Date(transaction.date).toLocaleString('id-ID');
        qs('#receiptTotal').innerText = rupiah(transaction.total);

        const tbody = qs('#receiptTable tbody');
        tbody.innerHTML = '';
        for (const code in transaction.items) {
            const item = transaction.items[code];
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${item.name}<br><small>${item.qty} x ${rupiah(item.price)}</small></td>
            <td>${item.qty}</td>
            <td>${rupiah(item.price * item.qty)}</td>
        `;
            tbody.appendChild(tr);
        }

        qs('#receiptModal').classList.remove('hidden');
    };

    // === CORE LOGIC & EVENT HANDLERS ===

    // Inisialisasi Aplikasi
    const init = () => {
        loadState();
        renderAll();
        setupEventListeners();
    };

    const setupEventListeners = () => {
        // Login
        qs('#loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const u = qs('#username').value.trim();
            const p = qs('#password').value.trim();
            if (u === 'admin' && p === 'admin') {
                qs('#loginModal').classList.add('hidden');
                qs('#app').classList.remove('hidden');
            } else {
                showToast('Username atau password salah. Coba: admin / admin', 'error');
            }
        });

        // Navigasi
        qa('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
            qa('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            qa('.view').forEach(v => v.classList.remove('active'));
            qs('#' + btn.dataset.view).classList.add('active');
        }));

        // Manajemen Produk
        qs('#showAddProduct').addEventListener('click', () => {
            qs('#productForm').reset();
            qs('#p_is_edit').value = '';
            qs('#addProductCard h4').innerText = 'Tambah Produk';
            qs('#addProductCard').classList.remove('hidden');
        });
        qs('#cancelAdd').addEventListener('click', () => qs('#addProductCard').classList.add('hidden'));

        qs('#productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const code = qs('#p_code').value.trim();
            const name = qs('#p_name').value.trim();
            const price = parseInt(qs('#p_price').value) || 0;
            const stock = parseInt(qs('#p_stock').value) || 0;
            const isEdit = qs('#p_is_edit').value;

            if (!code || !name || price <= 0) {
                showToast('Mohon isi semua data dengan benar.', 'error');
                return;
            }

            if (isEdit) {
                const product = db.products.find(p => p.code === isEdit);
                if (product) {
                    product.name = name;
                    product.price = price;
                    product.stock = stock;
                    showToast('Produk berhasil diperbarui.');
                }
            } else {
                if (db.products.some(p => p.code === code)) {
                    showToast('Produk dengan kode ini sudah ada.', 'error');
                    return;
                }
                db.products.push({
                    code,
                    name,
                    price,
                    stock
                });
                showToast('Produk berhasil ditambahkan.');
            }

            saveState();
            renderProducts();
            renderDashboard();
            qs('#addProductCard').classList.add('hidden');
            e.target.reset();
        });

        qs('#productTable').addEventListener('click', (e) => {
            const code = e.target.dataset.code;
            if (e.target.classList.contains('edit')) {
                const p = db.products.find(x => x.code === code);
                if (p) {
                    qs('#addProductCard h4').innerText = 'Edit Produk';
                    qs('#p_code').value = p.code;
                    qs('#p_name').value = p.name;
                    qs('#p_price').value = p.price;
                    qs('#p_stock').value = p.stock;
                    qs('#p_is_edit').value = p.code; // Tandai mode edit
                    qs('#addProductCard').classList.remove('hidden');
                }
            }
            if (e.target.classList.contains('del')) {
                if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
                    db.products = db.products.filter(x => x.code !== code);
                    saveState();
                    renderAll();
                    showToast('Produk berhasil dihapus.');
                }
            }
        });

        // Manajemen Stok
        qs('#stockInForm').addEventListener('submit', e => {
            e.preventDefault();
            const code = qs('#in_barcode').value.trim();
            const qty = parseInt(qs('#in_qty').value) || 0;
            const product = db.products.find(p => p.code === code);
            if (!product) {
                showToast('Produk tidak ditemukan.', 'error');
                return;
            }
            if (qty <= 0) {
                showToast('Jumlah harus lebih dari 0.', 'error');
                return;
            }
            product.stock += qty;
            saveState();
            renderAll();
            qs('#inLog').innerHTML += `<li>[IN] ${new Date().toLocaleTimeString()} - ${product.name}: +${qty}</li>`;
            e.target.reset();
            qs('#in_barcode').focus();
        });

        qs('#stockOutForm').addEventListener('submit', e => {
            e.preventDefault();
            const code = qs('#out_barcode').value.trim();
            const qty = parseInt(qs('#out_qty').value) || 0;
            const product = db.products.find(p => p.code === code);
            if (!product) {
                showToast('Produk tidak ditemukan.', 'error');
                return;
            }
            if (qty <= 0) {
                showToast('Jumlah harus lebih dari 0.', 'error');
                return;
            }
            if (product.stock < qty) {
                showToast('Stok tidak mencukupi.', 'error');
                return;
            }
            product.stock -= qty;
            saveState();
            renderAll();
            qs('#outLog').innerHTML += `<li>[OUT] ${new Date().toLocaleTimeString()} - ${product.name}: -${qty}</li>`;
            e.target.reset();
            qs('#out_barcode').focus();
        });

        // Fungsionalitas Kasir & Keranjang
        qs('#scanForm').addEventListener('submit', e => {
            e.preventDefault();
            const code = qs('#scanInput').value.trim();
            if (!code) return;
            addToCart(code);
            qs('#scanInput').value = '';
        });

        const addToCart = (code) => {
            const product = db.products.find(p => p.code === code);
            if (!product) {
                showToast('Produk tidak ditemukan.', 'error');
                return;
            }

            const cartItem = db.cart[code];
            if (product.stock <= (cartItem ? cartItem.qty : 0)) {
                showToast('Stok produk tidak mencukupi.', 'error');
                return;
            }

            if (cartItem) {
                cartItem.qty++;
            } else {
                db.cart[code] = {
                    code: product.code,
                    name: product.name,
                    price: product.price,
                    qty: 1
                };
            }
            saveState();
            renderCart();
        }

        qs('#openCart').addEventListener('click', () => qs('#cartDrawer').classList.remove('hidden'));
        qs('#closeCart').addEventListener('click', () => qs('#cartDrawer').classList.add('hidden'));

        qs('#cartTable').addEventListener('click', e => {
            if (e.target.classList.contains('del-cart-item')) {
                const code = e.target.dataset.code;
                delete db.cart[code];
                saveState();
                renderCart();
            }
        });

        // Proses Pembayaran
        qs('#payBtn').addEventListener('click', () => {
            if (Object.keys(db.cart).length === 0) return;
            if (!confirm('Proses pembayaran? Stok akan dikurangi.')) return;

            const total = Object.values(db.cart).reduce((acc, item) => acc + (item.price * item.qty), 0);

            // Buat record transaksi
            const transaction = {
                id: 'TX' + Date.now(),
                date: new Date().toISOString(),
                items: { ...db.cart
                }, // Salin item keranjang agar tidak hilang
                total: total
            };
            db.transactions.push(transaction);

            // Kurangi stok produk
            for (const code in db.cart) {
                const product = db.products.find(p => p.code === code);
                if (product) {
                    product.stock -= db.cart[code].qty;
                }
            }

            // Kosongkan keranjang
            db.cart = {};

            saveState();

            // Render ulang UI di belakang layar
            renderAll();
            qs('#cartDrawer').classList.add('hidden');

            // Tampilkan struk sebagai konfirmasi akhir
            showReceipt(transaction);
        });

        // Laporan
        qs('#filterTx').addEventListener('click', () => {
            const from = qs('#fromDate').value;
            const to = qs('#toDate').value;
            if (!from || !to) {
                renderTransactions(db.transactions);
                return;
            }
            const filtered = db.transactions.filter(t => {
                const txDate = t.date.slice(0, 10);
                return txDate >= from && txDate <= to;
            });
            renderTransactions(filtered);
        });

        qs('#exportTx').addEventListener('click', () => {
            // Fungsi print sederhana
            const printContent = qs('#txTable').outerHTML;
            const printWindow = window.open('', '', 'height=500,width=800');
            printWindow.document.write('<html><head><title>Laporan Transaksi</title>');
            printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:8px;}</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write('<h1>Laporan Transaksi</h1>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        });

        // Event listener untuk tombol di modal struk
        qs('#closeReceiptBtn').addEventListener('click', () => {
            qs('#receiptModal').classList.add('hidden');
            showToast('Pembayaran berhasil!'); // Notifikasi ditampilkan setelah struk ditutup
        });

        qs('#printReceiptBtn').addEventListener('click', () => {
            const receiptHtml = qs('#receiptContent').innerHTML;
            const printWindow = window.open('', '', 'height=600,width=400');
            printWindow.document.write('<html><head><title>Struk Pembelian</title>');
            printWindow.document.write(`
            <style>
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    font-size: 14px;
                    color: #000;
                    width: 300px; /* Lebar kertas struk thermal */
                }
                .receipt-actions { display: none; } /* Sembunyikan tombol saat cetak */
                h3, h4 { text-align: center; margin: 5px 0; }
                p { margin: 2px 0; }
                hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; }
                td, th { padding: 2px; font-size: 13px; text-align: left; vertical-align: top;}
            </style>
        `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(receiptHtml);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        });

    };

    // Jalankan aplikasi saat DOM siap
    document.addEventListener('DOMContentLoaded', init);

})();