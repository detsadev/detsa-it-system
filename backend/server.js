const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database Setup
const db = new sqlite3.Database('./detsa_system.db');

// Initialize Database Tables
db.serialize(() => {
  // Count Submissions table
  db.run(`CREATE TABLE IF NOT EXISTS count_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    count_period_id INTEGER NOT NULL,
    submission_data TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    submitted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users (email),
    FOREIGN KEY (count_period_id) REFERENCES count_periods (id),
    UNIQUE(user_email, count_period_id)
  )`);

  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Verification codes table
  db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tickets table (Arıza, Sayım, Değişim, Genel)
  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    type TEXT NOT NULL, -- 'ariza', 'sayim', 'degisim', 'genel'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'closed'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    product_id INTEGER, -- Ürün ile ilişkili arıza için
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users (email),
    FOREIGN KEY (product_id) REFERENCES inventory (id)
  )`);

  // Inventory table (geliştirilmiş şema)
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_code TEXT UNIQUE NOT NULL,
    product_code TEXT UNIQUE NOT NULL,
    assigned_user_email TEXT,
    category_id INTEGER,
    location TEXT,
    notes TEXT,
    purchase_date DATE,
    warranty_end_date DATE,
    assignment_date DATETIME,
    unassignment_date DATETIME,
    status TEXT DEFAULT 'active',
    added_by_email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_user_email) REFERENCES users (email),
    FOREIGN KEY (added_by_email) REFERENCES users (email),
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  // Categories table (Kategori yönetimi)
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Count Periods table (Sayım Periyotları) - SAKLANAN VERSİYON
  db.run(`CREATE TABLE IF NOT EXISTS count_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_by_email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Count periods tablosu oluşturma hatası:', err);
    } else {
      console.log('Count periods tablosu kontrol edildi');
    }
  });

  // Varsayılan kategoriler ekle
  db.run(`INSERT OR IGNORE INTO categories (name, description) VALUES 
    ('Bilgisayar', 'Masaüstü ve dizüstü bilgisayarlar'),
    ('Monitor', 'LCD, LED ve OLED monitörler'),
    ('Yazıcı', 'Lazer, mürekkep püskürtmeli yazıcılar'),
    ('Telefon', 'Masa telefonu ve IP telefonlar'),
    ('Ağ Cihazı', 'Switch, router, modem'),
    ('Klavye', 'Kablolu ve kablosuz klavyeler'),
    ('Mouse', 'Optik ve lazer mouse'),
    ('Projeksiyon', 'Projektör ve sunum cihazları'),
    ('Tablet', 'Android ve iOS tabletler'),
    ('Genel', 'Diğer IT ekipmanları')
  `);

  // Inventory assignments table (Kullanıcı atama geçmişi)
  db.run(`CREATE TABLE IF NOT EXISTS inventory_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unassigned_at DATETIME,
    notes TEXT,
    FOREIGN KEY (inventory_id) REFERENCES inventory (id),
    FOREIGN KEY (user_email) REFERENCES users (email)
  )`);

  // Add admin users if not exists
  db.run(`INSERT OR IGNORE INTO users (email, role) VALUES ('admin@detsa.com', 'admin')`);
  db.run(`INSERT OR IGNORE INTO users (email, role) VALUES ('ferhattola@gmail.com', 'admin')`);
});

// Email Configuration (Gmail SMTP - Ücretsiz)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Gmail adresiniz
    pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'detsa_secret_key_2025';

// Helper Functions
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Detsa IT Sistemi - Giriş Kodu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Detsa IT Sistemi</h2>
        <p>Merhaba,</p>
        <p>Sisteme giriş yapmak için aşağıdaki kodu kullanın:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p>Bu kod 10 dakika süreyle geçerlidir.</p>
        <p>Eğer bu isteği siz yapmadıysanız, lütfen bu mesajı göz ardı edin.</p>
        <hr>
        <p style="color: #6c757d; font-size: 12px;">Detsa IT Sistemi</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return false;
  }
};

// Routes

// 1. Kullanıcı email kontrolü ve kod gönderme
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email gerekli' });
  }

  try {
    // Kullanıcının sistemde kayıtlı olup olmadığını kontrol et
    db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Bu email adresi sistemde kayıtlı değil' });
      }

      // Yeni doğrulama kodu oluştur
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

      // Eski kodları pasif yap
      db.run('UPDATE verification_codes SET used = 1 WHERE email = ?', [email]);

      // Yeni kodu kaydet
      db.run(
        'INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)',
        [email, code, expiresAt.toISOString()],
        async function(err) {
          if (err) {
            return res.status(500).json({ error: 'Kod kaydetme hatası' });
          }

          // Email gönder
          const emailSent = await sendVerificationEmail(email, code);
          
          if (emailSent) {
            res.json({ 
              message: 'Doğrulama kodu email adresinize gönderildi',
              email: email 
            });
          } else {
            res.status(500).json({ error: 'Email gönderilemedi' });
          }
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 2. Kod doğrulama ve giriş
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email ve kod gerekli' });
  }

  // Kodu kontrol et
  db.get(
    `SELECT * FROM verification_codes 
     WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`,
    [email, code],
    (err, verificationRecord) => {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }

      if (!verificationRecord) {
        return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş kod' });
      }

      // Kodu kullanılmış olarak işaretle
      db.run('UPDATE verification_codes SET used = 1 WHERE id = ?', [verificationRecord.id]);

      // Kullanıcı bilgilerini al
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Kullanıcı bulunamadı' });
        }

        // JWT token oluştur
        const token = jwt.sign(
          { 
            email: user.email, 
            role: user.role,
            id: user.id 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Giriş başarılı',
          token: token,
          user: {
            email: user.email,
            role: user.role,
            id: user.id
          }
        });
      });
    }
  );
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

// 3. Ticket oluşturma (Arıza, Sayım, Değişim, Genel)
app.post('/api/tickets', authenticateToken, (req, res) => {
  const { type, title, description, priority = 'normal', product_id } = req.body;
  const userEmail = req.user.email;

  if (!type || !title || !description) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }

  const validTypes = ['ariza', 'sayim', 'degisim', 'genel'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Geçersiz ticket türü' });
  }

  db.run(
    `INSERT INTO tickets (user_email, type, title, description, priority, product_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userEmail, type, title, description, priority, product_id || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ticket oluşturulamadı' });
      }

      res.json({
        message: 'Ticket başarıyla oluşturuldu',
        ticketId: this.lastID
      });
    }
  );
});

// 4. Kullanıcının ticketlarını getir
app.get('/api/my-tickets', authenticateToken, (req, res) => {
  const userEmail = req.user.email;

  db.all(
    `SELECT t.*, i.product_name, i.serial_code as product_code 
     FROM tickets t 
     LEFT JOIN inventory i ON t.product_id = i.id 
     WHERE t.user_email = ? 
     ORDER BY t.created_at DESC`,
    [userEmail],
    (err, tickets) => {
      if (err) {
        console.error('Kullanıcı ticketları getirme hatası:', err);
        return res.status(500).json({ error: 'Ticketlar getirilemedi' });
      }
      res.json(tickets);
    }
  );
});

// 5. Admin: Tüm ticketları getir
app.get('/api/admin/tickets', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  db.all(
    `SELECT t.*, i.product_name, i.serial_code as product_code 
     FROM tickets t 
     LEFT JOIN inventory i ON t.product_id = i.id 
     ORDER BY t.created_at DESC`,
    (err, tickets) => {
      if (err) {
        console.error('Admin ticketları getirme hatası:', err);
        return res.status(500).json({ error: 'Ticketlar getirilemedi' });
      }
      res.json(tickets);
    }
  );
});

// 6. Admin: Kullanıcı ekleme
app.post('/api/admin/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { email, role = 'user' } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email gerekli' });
  }

  db.run(
    'INSERT INTO users (email, role) VALUES (?, ?)',
    [email, role],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
        }
        return res.status(500).json({ error: 'Kullanıcı eklenemedi' });
      }

      res.json({
        message: 'Kullanıcı başarıyla eklendi',
        userId: this.lastID
      });
    }
  );
});

// 7. Admin: Tüm kullanıcıları getir
app.get('/api/admin/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  db.all(
    'SELECT id, email, role, is_active, created_at FROM users ORDER BY created_at DESC',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
      }
      res.json(users);
    }
  );
});

// 8. Ticket durumu güncelleme (Admin)
app.put('/api/admin/tickets/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['open', 'in_progress', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }

  db.run(
    'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Durum güncellenemedi' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Ticket bulunamadı' });
      }

      res.json({ message: 'Ticket durumu güncellendi' });
    }
  );
});

// 9. Admin: Ürün ekleme (geliştirilmiş)
app.post('/api/admin/inventory', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { 
    product_name, 
    brand, 
    model, 
    serial_code, 
    product_code, 
    assigned_user_email, 
    category_id, 
    location, 
    notes, 
    purchase_date, 
    warranty_end_date 
  } = req.body;

  if (!product_name || !serial_code || !product_code) {
    return res.status(400).json({ error: 'Ürün adı, seri no ve ürün kodu gerekli' });
  }

  // Eğer kullanıcı atanmışsa, kullanıcının var olup olmadığını kontrol et
  if (assigned_user_email) {
    db.get('SELECT email FROM users WHERE email = ? AND is_active = 1', [assigned_user_email], (err, user) => {
      if (err) {
        console.error('Kullanıcı kontrol hatası:', err);
        return res.status(500).json({ error: 'Kullanıcı kontrol edilirken hata oluştu' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Atanan kullanıcı sistemde bulunamadı' });
      }

      // Kullanıcı varsa ürünü ekle
      addInventoryItem();
    });
  } else {
    // Kullanıcı atanmamışsa direkt ürünü ekle
    addInventoryItem();
  }

  function addInventoryItem() {
    const assignmentDate = assigned_user_email ? new Date().toISOString() : null;

    db.run(
      `INSERT INTO inventory (
        product_name, brand, model, serial_code, product_code, 
        assigned_user_email, category_id, location, notes, 
        purchase_date, warranty_end_date, assignment_date, 
        status, added_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        brand || null,
        model || null,
        serial_code,
        product_code,
        assigned_user_email || null,
        category_id || null,
        location || null,
        notes || null,
        purchase_date || null,
        warranty_end_date || null,
        assignmentDate,
        'active', // HER ZAMAN AKTİF OLARAK BAŞLASIN - atanmış olsun ya da olmasın
        req.user.email
      ],
      function(err) {
        if (err) {
          console.error('Ürün ekleme hatası:', err);
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Bu seri no veya ürün kodu zaten kayıtlı' });
          }
          return res.status(500).json({ error: 'Ürün eklenemedi: ' + err.message });
        }

        // Eğer kullanıcıya atandıysa, atama geçmişine ekle
        if (assigned_user_email) {
          db.run(
            'INSERT INTO inventory_assignments (inventory_id, user_email, notes) VALUES (?, ?, ?)',
            [this.lastID, assigned_user_email, 'İlk atama'],
            (assignErr) => {
              if (assignErr) {
                console.error('Atama geçmişi kaydetme hatası:', assignErr);
              }
            }
          );
        }

        res.json({
          message: 'Ürün başarıyla eklendi',
          inventoryId: this.lastID
        });
      }
    );
  }
});

// 10. Admin: Tüm envanteri getir (geliştirilmiş)
app.get('/api/admin/inventory', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  db.all(
    `SELECT i.*, u.email as assigned_user_name, c.name as category_name 
     FROM inventory i 
     LEFT JOIN users u ON i.assigned_user_email = u.email 
     LEFT JOIN categories c ON i.category_id = c.id
     ORDER BY i.created_at DESC`,
    (err, inventory) => {
      if (err) {
        console.error('Envanter getirme hatası:', err);
        return res.status(500).json({ error: 'Envanter getirilemedi' });
      }
      res.json(inventory);
    }
  );
});

// 11. Admin: Ürün güncelleme (geliştirilmiş)
app.put('/api/admin/inventory/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;
  const { 
    product_name, 
    brand, 
    model, 
    serial_code, 
    product_code, 
    assigned_user_email, 
    category_id, 
    location, 
    notes, 
    purchase_date, 
    warranty_end_date, 
    status 
  } = req.body;

  // Mevcut ürünü al
  db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, currentProduct) => {
    if (err) {
      console.error('Ürün getirme hatası:', err);
      return res.status(500).json({ error: 'Ürün bulunamadı' });
    }

    if (!currentProduct) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Atama değişikliği kontrolü
    let assignmentDate = currentProduct.assignment_date;
    let unassignmentDate = currentProduct.unassignment_date;

    if (currentProduct.assigned_user_email !== assigned_user_email) {
      // Eski atamanın bitişini kaydet
      if (currentProduct.assigned_user_email && !assigned_user_email) {
        // Ürün boşa çıkarılıyor
        unassignmentDate = new Date().toISOString();
        db.run(
          'UPDATE inventory_assignments SET unassigned_at = CURRENT_TIMESTAMP WHERE inventory_id = ? AND user_email = ? AND unassigned_at IS NULL',
          [id, currentProduct.assigned_user_email]
        );
      }

      // Yeni atama kaydı oluştur
      if (assigned_user_email) {
        assignmentDate = new Date().toISOString();
        if (!currentProduct.assigned_user_email) {
          // İlk defa atanıyor
          unassignmentDate = null;
        }
        db.run(
          'INSERT INTO inventory_assignments (inventory_id, user_email, notes) VALUES (?, ?, ?)',
          [id, assigned_user_email, 'Atama güncellendi']
        );
      }
    }

    // Durum kontrolü - eğer manuel olarak durum belirtilmemişse 'active' olarak bırak
    const finalStatus = status || 'active';

    db.run(
      `UPDATE inventory 
       SET product_name = ?, brand = ?, model = ?, serial_code = ?, product_code = ?, 
           assigned_user_email = ?, category_id = ?, location = ?, notes = ?, 
           purchase_date = ?, warranty_end_date = ?, assignment_date = ?, 
           unassignment_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        product_name, 
        brand || null, 
        model || null, 
        serial_code, 
        product_code, 
        assigned_user_email || null, 
        category_id || null, 
        location || null, 
        notes || null, 
        purchase_date || null, 
        warranty_end_date || null, 
        assignmentDate, 
        unassignmentDate, 
        finalStatus, // Varsayılan olarak 'active'
        id
      ],
      function(err) {
        if (err) {
          console.error('Ürün güncelleme hatası:', err);
          return res.status(500).json({ error: 'Ürün güncellenemedi: ' + err.message });
        }

        res.json({ message: 'Ürün başarıyla güncellendi' });
      }
    );
  });
});

// 12. Admin: Ürün silme
app.delete('/api/admin/inventory/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;

  db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Ürün silinemedi' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json({ message: 'Ürün başarıyla silindi' });
  });
});

// 13. Kullanıcı: Kendine atanan ürünleri getir (geliştirilmiş)
app.get('/api/my-inventory', authenticateToken, (req, res) => {
  const userEmail = req.user.email;

  db.all(
    `SELECT i.*, c.name as category_name 
     FROM inventory i 
     LEFT JOIN categories c ON i.category_id = c.id 
     WHERE i.assigned_user_email = ? 
     ORDER BY i.created_at DESC`,
    [userEmail],
    (err, inventory) => {
      if (err) {
        console.error('Kullanıcı envanteri getirme hatası:', err);
        return res.status(500).json({ error: 'Envanter getirilemedi' });
      }
      res.json(inventory);
    }
  );
});

// 14. Kullanıcı: Atanan ürünler için arıza kaydı oluşturma yardımcı endpoint (geliştirilmiş)
app.get('/api/my-assigned-products', authenticateToken, (req, res) => {
  const userEmail = req.user.email;

  db.all(
    'SELECT id, product_name, brand, model, serial_code FROM inventory WHERE assigned_user_email = ? AND status = "active"',
    [userEmail],
    (err, products) => {
      if (err) {
        console.error('Atanan ürünler getirme hatası:', err);
        return res.status(500).json({ error: 'Ürünler getirilemedi' });
      }
      res.json(products);
    }
  );
});

// 15. Admin: Kullanıcı rolü güncelleme
app.put('/api/admin/users/:id/role', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Geçersiz rol' });
  }

  // Kendi rolünü değiştirmeyi engelle
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Kendi rolünüzü değiştiremezsiniz' });
  }

  db.run(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, id],
    function(err) {
      if (err) {
        console.error('Kullanıcı rolü güncelleme hatası:', err);
        return res.status(500).json({ error: 'Rol güncellenemedi' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      res.json({ message: 'Kullanıcı rolü başarıyla güncellendi' });
    }
  );
});

// 16. Admin: Kullanıcı durumu güncelleme (aktif/pasif)
app.put('/api/admin/users/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;
  const { is_active } = req.body;

  // Kendi durumunu değiştirmeyi engelle
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Kendi durumunuzu değiştiremezsiniz' });
  }

  db.run(
    'UPDATE users SET is_active = ? WHERE id = ?',
    [is_active ? 1 : 0, id],
    function(err) {
      if (err) {
        console.error('Kullanıcı durumu güncelleme hatası:', err);
        return res.status(500).json({ error: 'Durum güncellenemedi' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      res.json({ message: 'Kullanıcı durumu başarıyla güncellendi' });
    }
  );
});

// 17. Admin: Kullanıcı silme
app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;

  // Kendi hesabını silmeyi engelle
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
  }

  // Önce kullanıcının email'ini al
  db.get('SELECT email FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Kullanıcı bulunamadı:', err);
      return res.status(500).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Kullanıcının atanmış ürünlerini temizle
    db.run('UPDATE inventory SET assigned_user_email = NULL WHERE assigned_user_email = ?', [user.email], (err) => {
      if (err) {
        console.error('Ürün atamaları temizlenirken hata:', err);
      }

      // Kullanıcıyı sil
      db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Kullanıcı silme hatası:', err);
          return res.status(500).json({ error: 'Kullanıcı silinemedi' });
        }

        res.json({ message: 'Kullanıcı başarıyla silindi' });
      });
    });
  });
});

// 18. Admin: Kategorileri getir
app.get('/api/admin/categories', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  db.all(
    'SELECT * FROM categories ORDER BY name ASC',
    (err, categories) => {
      if (err) {
        console.error('Kategori getirme hatası:', err);
        return res.status(500).json({ error: 'Kategoriler getirilemedi' });
      }
      res.json(categories);
    }
  );
});

// 19. Admin: Kategori ekleme
app.post('/api/admin/categories', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Kategori adı gerekli' });
  }

  db.run(
    'INSERT INTO categories (name, description) VALUES (?, ?)',
    [name, description || null],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Bu kategori zaten mevcut' });
        }
        console.error('Kategori ekleme hatası:', err);
        return res.status(500).json({ error: 'Kategori eklenemedi' });
      }

      res.json({
        message: 'Kategori başarıyla eklendi',
        categoryId: this.lastID
      });
    }
  );
});

// 20. Admin: Kategori silme
app.delete('/api/admin/categories/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;

  // Önce bu kategoride ürün var mı kontrol et
  db.get('SELECT COUNT(*) as count FROM inventory WHERE category_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Kategori kontrol hatası:', err);
      return res.status(500).json({ error: 'Kategori kontrol edilemedi' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Bu kategoride ürünler bulunuyor, önce ürünleri taşıyın' });
    }

    // Kategoriyi sil
    db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Kategori silme hatası:', err);
        return res.status(500).json({ error: 'Kategori silinemedi' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kategori bulunamadı' });
      }

      res.json({ message: 'Kategori başarıyla silindi' });
    });
  });
});

// 21. Admin: Sayım Periyodu oluşturma
app.post('/api/admin/count-period', authenticateToken, (req, res) => {
  console.log('Count period POST endpoint çağrıldı');
  console.log('User:', req.user);
  console.log('Request body:', req.body);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  try {
    const { title, description, start_date, end_date } = req.body;

    if (!title || !start_date || !end_date) {
      console.log('Eksik alanlar:', { title, start_date, end_date });
      return res.status(400).json({ 
        error: 'Başlık, başlangıç ve bitiş tarihi gerekli',
        received: { title, start_date, end_date }
      });
    }

    // Tarih kontrolü
    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'Başlangıç tarihi bitiş tarihinden önce olmalı' });
    }

    // Frontend'den title geldiği için name kolonuna kaydet
    const query = `INSERT INTO count_periods (name, description, start_date, end_date, created_by_email) VALUES (?, ?, ?, ?, ?)`;
    const params = [title, description || '', start_date, end_date, req.user.email];
    
    console.log('SQL Query:', query);
    console.log('Parameters:', params);

    db.run(query, params, function(err) {
      if (err) {
        console.error('Database hatası:', err);
        return res.status(500).json({ 
          error: 'Veritabanı hatası: ' + err.message,
          details: err
        });
      }

      console.log('Sayım periyodu başarıyla oluşturuldu, ID:', this.lastID);
      res.json({
        message: 'Sayım periyodu başarıyla oluşturuldu',
        periodId: this.lastID
      });
    });

  } catch (error) {
    console.error('Genel hata:', error);
    res.status(500).json({ 
      error: 'Sunucu hatası: ' + error.message,
      stack: error.stack
    });
  }
});

// 22. Admin: Tüm sayım periyotlarını getir
app.get('/api/admin/count-period', authenticateToken, (req, res) => {
  console.log('Count period GET endpoint çağrıldı');
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  try {
    // Basit sorgu - JOIN yapmadan
    db.all('SELECT * FROM count_periods ORDER BY created_at DESC', (err, periods) => {
      if (err) {
        console.error('Sayım periyotları getirme hatası:', err);
        return res.status(500).json({ error: 'Sayım periyotları getirilemedi: ' + err.message });
      }
      
      console.log('Bulunan sayım periyotları:', periods);
      res.json(periods);
    });
  } catch (error) {
    console.error('Genel hata:', error);
    res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
  }
});

// 23. Admin: Sayım periyodu güncelleme
app.put('/api/admin/count-period/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;
  console.log('Güncelleme Request Body:', req.body);

  const { title, description, start_date, end_date, status } = req.body;

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ 
      error: 'Başlık, başlangıç ve bitiş tarihi gerekli',
      received: { title, start_date, end_date }
    });
  }

  // Tarih kontrolü
  if (new Date(start_date) >= new Date(end_date)) {
    return res.status(400).json({ error: 'Başlangıç tarihi bitiş tarihinden önce olmalı' });
  }

  const validStatuses = ['active', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }

  db.run(
    `UPDATE count_periods 
     SET name = ?, description = ?, start_date = ?, end_date = ?, 
         status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [title, description || '', start_date, end_date, status, id],
    function(err) {
      if (err) {
        console.error('Sayım periyodu güncelleme hatası:', err);
        return res.status(500).json({ error: 'Sayım periyodu güncellenemedi' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sayım periyodu bulunamadı' });
      }

      res.json({ message: 'Sayım periyodu başarıyla güncellendi' });
    }
  );
});

// 24. Admin: Sayım periyodu silme
app.delete('/api/admin/count-period/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { id } = req.params;

  db.run('DELETE FROM count_periods WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Sayım periyodu silme hatası:', err);
      return res.status(500).json({ error: 'Sayım periyodu silinemedi' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sayım periyodu bulunamadı' });
    }

    res.json({ message: 'Sayım periyodu başarıyla silindi' });
  });
});

// 25. Admin: Aktif sayım periyodunu getir
app.get('/api/admin/count-period/active', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  db.get(
    `SELECT * FROM count_periods 
     WHERE status = 'active' AND start_date <= date('now') AND end_date >= date('now')
     ORDER BY created_at DESC LIMIT 1`,
    (err, period) => {
      if (err) {
        console.error('Aktif sayım periyodu getirme hatası:', err);
        return res.status(500).json({ error: 'Aktif sayım periyodu getirilemedi' });
      }
      
      res.json(period || null);
    }
  );
});

// 26. Kullanıcı: Aktif sayım periyodunu getir (YENİ ENDPOINT)
app.get('/api/count-period', authenticateToken, (req, res) => {
  console.log('Kullanıcı sayım periyodu GET endpoint çağrıldı');
  console.log('Kullanıcı:', req.user);

  try {
    // Aktif sayım periyodunu getir - kullanıcılar için
    const query = `SELECT * FROM count_periods 
                   WHERE status = 'active' 
                   ORDER BY created_at DESC LIMIT 1`;
    
    console.log('SQL Query:', query);

    db.get(query, (err, period) => {
      if (err) {
        console.error('Kullanıcı sayım periyodu getirme hatası:', err);
        return res.status(500).json({ error: 'Sayım periyodu getirilemedi: ' + err.message });
      }
      
      console.log('Bulunan sayım periyodu:', period);
      
      // Eğer periyot varsa, tarih kontrolü yap
      if (period) {
        const now = new Date();
        const startDate = new Date(period.start_date);
        const endDate = new Date(period.end_date);
        
        // Sayım periyodu içinde mi kontrolü
        const isInPeriod = now >= startDate && now <= endDate;
        
        console.log('Tarih kontrolü:', {
          now: now.toISOString(),
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          isInPeriod
        });
        
        // Period objesine ek bilgi ekle
        period.is_in_period = isInPeriod;
        period.title = period.name; // Frontend title bekliyor
        
        // Kullanıcının bu periyot için daha önce sayım yapıp yapmadığını kontrol et
        db.get(
          'SELECT * FROM count_submissions WHERE user_email = ? AND count_period_id = ?',
          [req.user.email, period.id],
          (submissionErr, existingSubmission) => {
            if (submissionErr) {
              console.error('Mevcut sayım kontrol hatası:', submissionErr);
              return res.status(500).json({ error: 'Sayım kontrol edilemedi' });
            }
            
            // Kullanıcının sayım durumunu period objesine ekle
            period.user_submission = existingSubmission;
            period.has_submitted = existingSubmission && existingSubmission.status === 'submitted';
            period.has_draft = existingSubmission && existingSubmission.status === 'draft';
            
            console.log('Kullanıcı sayım durumu:', {
              has_submitted: period.has_submitted,
              has_draft: period.has_draft,
              submission: existingSubmission
            });
            
            res.json(period);
          }
        );
      } else {
        res.json(null);
      }
    });
  } catch (error) {
    console.error('Genel hata:', error);
    res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
  }
});

// 27. Sayım gönderimi
app.post('/api/count-submission', authenticateToken, async (req, res) => {
  const { count_period_id, submission_data, status = 'draft' } = req.body;
  const userEmail = req.user.email;

  if (!count_period_id || !submission_data) {
    return res.status(400).json({ error: 'Sayım periyodu ve veri gerekli' });
  }

  try {
    // Mevcut sayımı kontrol et
    db.get(
      'SELECT * FROM count_submissions WHERE user_email = ? AND count_period_id = ?',
      [userEmail, count_period_id],
      (err, existingSubmission) => {
        if (err) {
          return res.status(500).json({ error: 'Veritabanı hatası' });
        }

        // Eğer kullanıcı daha önce 'submitted' durumunda sayım göndermiş ise, tekrar sayım yapmasına izin verme
        if (existingSubmission && existingSubmission.status === 'submitted') {
          return res.status(400).json({ 
            error: 'Bu sayım periyodu için zaten sayım gönderilmiş. Tekrar sayım yapamazsınız.',
            submission_date: existingSubmission.submitted_at 
          });
        }

        const submissionDataJson = JSON.stringify(submission_data);
        const now = new Date().toISOString();

        if (existingSubmission && existingSubmission.status === 'draft') {
          // Sadece draft durumundaki sayımları güncelle
          db.run(
            `UPDATE count_submissions 
             SET submission_data = ?, status = ?, updated_at = ?, 
                 submitted_at = CASE WHEN ? = 'submitted' THEN ? ELSE submitted_at END
             WHERE user_email = ? AND count_period_id = ?`,
            [submissionDataJson, status, now, status, now, userEmail, count_period_id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Sayım güncellenemedi' });
              }
              res.json({ 
                message: status === 'submitted' ? 'Sayım başarıyla gönderildi!' : 'Sayım taslak olarak kaydedildi!',
                submissionId: existingSubmission.id,
                final_submission: status === 'submitted'
              });
            }
          );
        } else if (!existingSubmission) {
          // Yeni kayıt oluştur (sadece hiç sayım yoksa)
          db.run(
            `INSERT INTO count_submissions (user_email, count_period_id, submission_data, status, submitted_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [userEmail, count_period_id, submissionDataJson, status, status === 'submitted' ? now : null],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Sayım kaydedilemedi' });
              }
              res.json({ 
                message: status === 'submitted' ? 'Sayım başarıyla gönderildi!' : 'Sayım taslak olarak kaydedildi!',
                submissionId: this.lastID,
                final_submission: status === 'submitted'
              });
            }
          );
        } else {
          // Bu duruma normalde gelmemeli ama güvenlik için
          return res.status(400).json({ error: 'Beklenmeyen sayım durumu' });
        }
      }
    );
  } catch (error) {
    console.error('Sayım gönderimi hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 28. Kullanıcının sayım verilerini getirme endpoint'i
app.get('/api/admin/count-submissions/:periodId', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { periodId } = req.params;

  db.all(
    `SELECT cs.*, cp.name as period_title, u.email as user_name
     FROM count_submissions cs 
     JOIN count_periods cp ON cs.count_period_id = cp.id
     JOIN users u ON cs.user_email = u.email
     WHERE cs.count_period_id = ?
     ORDER BY cs.updated_at DESC`,
    [periodId],
    (err, submissions) => {
      if (err) {
        console.error('Sayım gönderimleri getirme hatası:', err);
        return res.status(500).json({ error: 'Sayım gönderimleri getirilemedi' });
      }

      // Her submission için ürün bilgilerini getir
      const processSubmissions = async () => {
        const processedSubmissions = [];

        for (const submission of submissions) {
          try {
            // JSON verisini parse et
            const submissionData = JSON.parse(submission.submission_data || '{}');
            
            // Ürün ID'lerini topla
            const productIds = Object.keys(submissionData);
            
            if (productIds.length > 0) {
              // Ürün bilgilerini getir
              const placeholders = productIds.map(() => '?').join(',');
              const query = `SELECT id, product_name, product_code, serial_code FROM inventory WHERE id IN (${placeholders})`;
              
              const products = await new Promise((resolve, reject) => {
                db.all(query, productIds, (err, products) => {
                  if (err) reject(err);
                  else resolve(products);
                });
              });

              // Ürün bilgilerini submission_data ile birleştir
              const enrichedSubmissionData = {};
              
              for (const [productId, countData] of Object.entries(submissionData)) {
                const product = products.find(p => p.id.toString() === productId);
                
                enrichedSubmissionData[productId] = {
                  ...countData,
                  product_info: product ? {
                    id: product.id,
                    product_name: product.product_name,
                    product_code: product.product_code,
                    serial_code: product.serial_code
                  } : {
                    id: productId,
                    product_name: 'Ürün Bulunamadı',
                    product_code: 'N/A',
                    serial_code: 'N/A'
                  }
                };
              }

              submission.submission_data = enrichedSubmissionData;
            } else {
              submission.submission_data = {};
            }

            processedSubmissions.push(submission);

          } catch (parseErr) {
            console.error('JSON parse hatası:', parseErr);
            submission.submission_data = {};
            processedSubmissions.push(submission);
          }
        }

        res.json(processedSubmissions);
      };

      processSubmissions().catch(error => {
        console.error('Submission işleme hatası:', error);
        res.status(500).json({ error: 'Veri işleme hatası' });
      });
    }
  );
});

// 29. Sayımı silme endpoint'i (sadece draft durumunda)
app.delete('/api/count-submission/:periodId', authenticateToken, (req, res) => {
  const { periodId } = req.params;
  const userEmail = req.user.email;

  // Önce sayımı kontrol et
  db.get(
    'SELECT status FROM count_submissions WHERE user_email = ? AND count_period_id = ?',
    [userEmail, periodId],
    (err, submission) => {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }

      if (!submission) {
        return res.status(404).json({ error: 'Sayım bulunamadı' });
      }

      if (submission.status === 'submitted') {
        return res.status(400).json({ error: 'Gönderilmiş sayım silinemez. Bu sayım kalıcı olarak kaydedilmiştir.' });
      }

      // Sadece draft durumundaki sayımları sil
      db.run(
        'DELETE FROM count_submissions WHERE user_email = ? AND count_period_id = ? AND status = "draft"',
        [userEmail, periodId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Sayım silinemedi' });
          }

          if (this.changes === 0) {
            return res.status(400).json({ error: 'Silme işlemi gerçekleştirilemedi' });
          }

          res.json({ message: 'Sayım taslağı silindi' });
        }
      );
    }
  );
});

// Server başlat
app.listen(PORT, () => {
  console.log(`🚀 Detsa IT Sistemi çalışıyor: http://localhost:${PORT}`);
  console.log('📧 Email ayarlarını .env dosyasında yapılandırmayı unutmayın!');
});