// Scope aplikasi untuk menghindari polusi variabel global
(() => {
    // === STATE & PERSISTENCE ===
    const REORDER_LEVEL = 5; // Level stok minimum sebelum masuk daftar reorder
    let db = {
        products: [],
        transactions: [],
        cart: {}
    };

    // === UTILITIES ===
    const qs = s => document.querySelector(s);
    const qa = s => document.querySelectorAll(s);
    const rupiah = n => 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const showToast = (message, type = 'info') => {
        alert(message);
    }

    // === RENDER FUNCTIONS (Tidak ada perubahan di sini) ===

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
        const todayTxs = db.transactions.filter(t => t.date && t.date.startsWith(today));

        qs('#totalProducts').innerText = db.products.length;
        qs('#totalStock').innerText = db.products.reduce((acc, p) => acc + p.stock, 0);
        qs('#txCount').innerText = todayTxs.length;
        qs('#todaySales').innerText = rupiah(todayTxs.reduce((acc, t) => acc + t.total, 0));

        const salesCount = {};
        todayTxs.forEach(tx => {
            for (const code in tx.items) {
                salesCount[code] = (salesCount[code] || 0) + tx.items[code].qty;
            }
        });
        const sortedProducts = Object.entries(salesCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

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
        txs.slice().reverse().forEach(t => {
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
            <td>${rupiah(item.price * item.qty)}</td>
        `; // Perbaikan kecil di struk agar lebih jelas
            tbody.appendChild(tr);
        }

        qs('#receiptModal').classList.remove('hidden');
    };
    
    // [FIREBASE] Fungsi baru untuk memuat data dari Firestore
    const loadDataFromFirestore = async () => {
        try {
            // Muat produk
            const productSnapshot = await firestoreDB.collection('products').get();
            db.products = productSnapshot.docs.map(doc => ({ code: doc.id, ...doc.data() }));

            // Muat transaksi
            const txSnapshot = await firestoreDB.collection('transactions').get();
            db.transactions = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log("Data berhasil dimuat dari Firestore!");
        } catch (error) {
            console.error("Error memuat data: ", error);
            showToast('Gagal terhubung ke database. Cek konsol.', 'error');
        }
    };


    // === CORE LOGIC & EVENT HANDLERS ===

    // Inisialisasi Aplikasi
    const init = async () => {
        const loginModalContent = qs('#loginModal').innerHTML;
        qs('#loginModal').innerHTML = '<div class="modal-card"><h2>Menghubungkan ke database...</h2></div>';

        await loadDataFromFirestore();

        qs('#loginModal').innerHTML = loginModalContent;
        setupEventListeners();
    };


    const setupEventListeners = () => {
        qs('#loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const u = qs('#username').value.trim();
            const p = qs('#password').value.trim();
            if (u === 'admin' && p === 'admin') {
                qs('#loginModal').classList.add('hidden');
                qs('#app').classList.remove('hidden');
                renderAll();
            } else {
                showToast('Username atau password salah. Coba: admin / admin', 'error');
            }
        });

        qa('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
            qa('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            qa('.view').forEach(v => v.classList.remove('active'));
            qs('#' + btn.dataset.view).classList.add('active');
        }));

        qs('#showAddProduct').addEventListener('click', () => {
            qs('#productForm').reset();
            qs('#p_is_edit').value = '';
            qs('#p_code').disabled = false;
            qs('#addProductCard h4').innerText = 'Tambah Produk';
            qs('#addProductCard').classList.remove('hidden');
        });
        qs('#cancelAdd').addEventListener('click', () => qs('#addProductCard').classList.add('hidden'));

        qs('#productForm').addEventListener('submit', async (e) => {
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

            const productData = { name, price, stock };
            const button = e.target.querySelector('button[type=submit]');
            button.disabled = true;
            button.innerText = 'Menyimpan...';

            try {
                if (isEdit) {
                    await firestoreDB.collection('products').doc(isEdit).update(productData);
                    const product = db.products.find(p => p.code === isEdit);
                    if (product) Object.assign(product, productData);
                    showToast('Produk berhasil diperbarui.');
                } else {
                    const doc = await firestoreDB.collection('products').doc(code).get();
                    if (doc.exists) {
                        showToast('Produk dengan kode ini sudah ada.', 'error');
                        return;
                    }
                    await firestoreDB.collection('products').doc(code).set(productData);
                    db.products.push({ code, ...productData });
                    showToast('Produk berhasil ditambahkan.');
                }
                renderProducts();
                renderDashboard();
                qs('#addProductCard').classList.add('hidden');
                e.target.reset();
            } catch (error) {
                console.error("Error saving product: ", error);
                showToast('Gagal menyimpan produk ke database.', 'error');
            } finally {
                button.disabled = false;
                button.innerText = 'Simpan Produk';
            }
        });

        qs('#productTable').addEventListener('click', async (e) => {
            const code = e.target.dataset.code;
            if (e.target.classList.contains('edit')) {
                const p = db.products.find(x => x.code === code);
                if (p) {
                    qs('#addProductCard h4').innerText = 'Edit Produk';
                    qs('#p_code').value = p.code;
                    qs('#p_code').disabled = true;
                    qs('#p_name').value = p.name;
                    qs('#p_price').value = p.price;
                    qs('#p_stock').value = p.stock;
                    qs('#p_is_edit').value = p.code;
                    qs('#addProductCard').classList.remove('hidden');
                }
            }
            if (e.target.classList.contains('del')) {
                if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
                    try {
                        await firestoreDB.collection('products').doc(code).delete();
                        db.products = db.products.filter(x => x.code !== code);
                        renderAll();
                        showToast('Produk berhasil dihapus.');
                    } catch (error) {
                        console.error("Error deleting product: ", error);
                        showToast('Gagal menghapus produk dari database.', 'error');
                    }
                }
            }
        });
        
        const handleStockUpdate = async (form, type) => {
            const code = form.querySelector('input[type=text]').value.trim();
            const qty = parseInt(form.querySelector('input[type=number]').value) || 0;
            const product = db.products.find(p => p.code === code);
            if (!product) return showToast('Produk tidak ditemukan.', 'error');
            if (qty <= 0) return showToast('Jumlah harus lebih dari 0.', 'error');
            
            let newStock;
            if (type === 'IN') {
                newStock = product.stock + qty;
            } else {
                if (product.stock < qty) return showToast('Stok tidak mencukupi.', 'error');
                newStock = product.stock - qty;
            }

            try {
                await firestoreDB.collection('products').doc(code).update({ stock: newStock });
                product.stock = newStock;
                renderAll();
                qs(`#${type.toLowerCase()}Log`).innerHTML += `<li>[${type}] ${new Date().toLocaleTimeString()} - ${product.name}: ${type === 'IN' ? '+' : '-'}${qty}</li>`;
                form.reset();
                form.querySelector('input[type=text]').focus();
            } catch (error) {
                console.error("Error updating stock: ", error);
                showToast('Gagal update stok di database.', 'error');
            }
        };

        qs('#stockInForm').addEventListener('submit', e => { e.preventDefault(); handleStockUpdate(e.target, 'IN'); });
        qs('#stockOutForm').addEventListener('submit', e => { e.preventDefault(); handleStockUpdate(e.target, 'OUT'); });

        qs('#scanForm').addEventListener('submit', e => {
            e.preventDefault();
            const code = qs('#scanInput').value.trim();
            if (!code) return;
            const product = db.products.find(p => p.code === code);
            if (!product) return showToast('Produk tidak ditemukan.', 'error');

            const cartItem = db.cart[code];
            if (product.stock <= (cartItem ? cartItem.qty : 0)) return showToast('Stok produk tidak mencukupi.', 'error');

            if (cartItem) {
                cartItem.qty++;
            } else {
                db.cart[code] = { code: product.code, name: product.name, price: product.price, qty: 1 };
            }
            renderCart();
            qs('#scanInput').value = '';
        });

        qs('#openCart').addEventListener('click', () => qs('#cartDrawer').classList.remove('hidden'));
        qs('#closeCart').addEventListener('click', () => qs('#cartDrawer').classList.add('hidden'));

        qs('#cartTable').addEventListener('click', e => {
            if (e.target.classList.contains('del-cart-item')) {
                delete db.cart[e.target.dataset.code];
                renderCart();
            }
        });

        qs('#payBtn').addEventListener('click', async () => {
            if (Object.keys(db.cart).length === 0 || !confirm('Proses pembayaran? Stok akan dikurangi.')) return;

            const total = Object.values(db.cart).reduce((acc, item) => acc + (item.price * item.qty), 0);
            const transactionId = 'TX' + Date.now();
            const transaction = {
                date: new Date().toISOString(),
                items: { ...db.cart },
                total: total
            };
            
            const button = qs('#payBtn');
            button.disabled = true;
            button.innerText = 'Memproses...';

            try {
                const batch = firestoreDB.batch();
                const txRef = firestoreDB.collection('transactions').doc(transactionId);
                batch.set(txRef, transaction);

                for (const code in db.cart) {
                    const productRef = firestoreDB.collection('products').doc(code);
                    const product = db.products.find(p => p.code === code);
                    if (product) {
                        const newStock = product.stock - db.cart[code].qty;
                        batch.update(productRef, { stock: newStock });
                    }
                }
                
                await batch.commit();

                db.transactions.push({ id: transactionId, ...transaction });
                for (const code in db.cart) {
                    const product = db.products.find(p => p.code === code);
                    if (product) product.stock -= db.cart[code].qty;
                }
                db.cart = {};

                renderAll();
                qs('#cartDrawer').classList.add('hidden');
                showReceipt({ id: transactionId, ...transaction });
            } catch (error) {
                console.error("Error processing payment: ", error);
                showToast('GAGAL memproses pembayaran. Stok tidak berubah. Coba lagi.', 'error');
            } finally {
                 button.disabled = false;
                 button.innerText = 'Bayar Sekarang';
            }
        });

        qs('#filterTx').addEventListener('click', () => {
            const from = qs('#fromDate').value;
            const to = qs('#toDate').value;
            if (!from || !to) return renderTransactions(db.transactions);
            const filtered = db.transactions.filter(t => {
                const txDate = t.date.slice(0, 10);
                return txDate >= from && txDate <= to;
            });
            renderTransactions(filtered);
        });

        qs('#exportTx').addEventListener('click', () => {
            const printContent = qs('#txTable').outerHTML;
            const printWindow = window.open('', '', 'height=500,width=800');
            printWindow.document.write('<html><head><title>Laporan Transaksi</title>');
            printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:8px;}</style>');
            printWindow.document.write('</head><body><h1>Laporan Transaksi</h1>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        });

        qs('#closeReceiptBtn').addEventListener('click', () => {
            qs('#receiptModal').classList.add('hidden');
            showToast('Pembayaran berhasil!');
        });

        qs('#printReceiptBtn').addEventListener('click', () => {
            const receiptHtml = qs('#receiptContent').innerHTML;
            const printWindow = window.open('', '', 'height=600,width=400');
            printWindow.document.write('<html><head><title>Struk Pembelian</title>');
            printWindow.document.write(`<style>body{font-family:'Courier New',Courier,monospace;font-size:14px;color:#000;width:300px;}.receipt-actions{display:none;}h3,h4{text-align:center;margin:5px 0;}p{margin:2px 0;}hr{border:none;border-top:1px dashed #000;margin:8px 0;}table{width:100%;border-collapse:collapse;}td,th{padding:2px;font-size:13px;text-align:left;vertical-align:top;}</style>`);
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