// Admin Inventory Component
const AdminInventory = ({ inventory, users, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [newItem, setNewItem] = useState({
    product_name: '',
    brand: '',
    model: '',
    serial_code: '',
    product_code: '',
    assigned_user_email: '',
    category_id: '',
    location: '',
    notes: '',
    purchase_date: '',
    warranty_end_date: ''
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const success = await onAddItem({
      ...newItem,
      category_id: newItem.category_id || null
    });
    
    if (success) {
      setMessage('Ürün başarıyla eklendi! Durum: Aktif');
      setNewItem({
        product_name: '',
        brand: '',
        model: '',
        serial_code: '',
        product_code: '',
        assigned_user_email: '',
        category_id: '',
        location: '',
        notes: '',
        purchase_date: '',
        warranty_end_date: ''
      });
      setShowAddForm(false);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Ürün eklenirken hata oluştu!');
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    const success = await onUpdateItem(editingItem.id, {
      ...editingItem,
      category_id: editingItem.category_id || null
    });
    
    if (success) {
      setMessage('Ürün başarıyla güncellendi!');
      setEditingItem(null);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Ürün güncellenirken hata oluştu!');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      const success = await onDeleteItem(itemId);
      
      if (success) {
        setMessage('Ürün başarıyla silindi!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Ürün silinirken hata oluştu!');
      }
    }
  };

  const handleAddInlineCategory = async () => {
    if (!newCategory.name.trim()) {
      setMessage('Kategori adı boş olamaz!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCategory)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Kategori başarıyla eklendi!');
        setNewCategory({ name: '', description: '' });
        setShowInlineCategoryForm(false);
        
        await fetchCategories();
        
        const categoryId = data.id || data.category_id || data.insertId;
        if (categoryId) {
          setNewItem({...newItem, category_id: categoryId.toString()});
        }
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Kategori eklenirken hata oluştu!');
      }
    } catch (error) {
      setMessage('Bağlantı hatası: ' + error.message);
    }
  };

  // GÜNCELLENMIŞ: Durum etiketleri
  const getStatusLabel = (status) => {
    const labels = {
      active: '🟢 Aktif',        // Varsayılan durum - yeni eklenen tüm ürünler
      assigned: '🟡 Atanmış',    // Eski veriler için - artık yeni ürünlerde kullanılmayacak
      maintenance: '🟠 Bakımda', // Manuel olarak bakıma alınan ürünler
      broken: '🔴 Arızalı'       // Arızalı olarak işaretlenen ürünler
    };
    return labels[status] || '🟢 Aktif'; // Varsayılan olarak aktif göster
  };

  // GÜNCELLENMIŞ: Durum açıklaması helper fonksiyonu
  const getStatusDescription = (item) => {
    if (item.assigned_user_email) {
      return `${getStatusLabel(item.status)} (${item.assigned_user_email} tarafından kullanılıyor)`;
    }
    return getStatusLabel(item.status);
  };

  // GÜNCELLENMIŞ: Durum renk sınıfı
  const getStatusClass = (status) => {
    const classes = {
      active: 'status-active',
      assigned: 'status-assigned', 
      maintenance: 'status-maintenance',
      broken: 'status-broken'
    };
    return classes[status] || 'status-active';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <div className="admin-inventory">
      <div className="inventory-header">
        <h3>Envanter ({inventory.length})</h3>
        <div className="header-buttons">
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            + Ürün Ekle
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="add-item-form">
          <h4>Yeni Ürün Ekle</h4>
          <div className="status-info">
            <p><strong>ℹ️ Bilgi:</strong> Yeni eklenen tüm ürünler varsayılan olarak "Aktif" durumunda başlar.</p>
          </div>
          <form onSubmit={handleAddItem}>
            <div className="form-row">
              <div className="form-group">
                <label>Ürün Adı *:</label>
                <input
                  type="text"
                  placeholder="Ürün adı"
                  value={newItem.product_name}
                  onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Marka:</label>
                <input
                  type="text"
                  placeholder="Marka"
                  value={newItem.brand}
                  onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Model:</label>
                <input
                  type="text"
                  placeholder="Model"
                  value={newItem.model}
                  onChange={(e) => setNewItem({...newItem, model: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Seri No *:</label>
                <input
                  type="text"
                  placeholder="Seri numarası"
                  value={newItem.serial_code}
                  onChange={(e) => setNewItem({...newItem, serial_code: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ürün Kodu *:</label>
                <input
                  type="text"
                  placeholder="Ürün kodu"
                  value={newItem.product_code}
                  onChange={(e) => setNewItem({...newItem, product_code: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Kategori:</label>
                <div className="category-input-group">
                  <select
                    value={newItem.category_id}
                    onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                  >
                    <option value="">Kategori seçin...</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => setShowInlineCategoryForm(!showInlineCategoryForm)}
                    className="btn-add-category"
                    title="Yeni kategori ekle"
                  >
                    +
                  </button>
                </div>
                
                {showInlineCategoryForm && (
                  <div className="inline-category-form">
                    <div className="inline-form-group">
                      <input
                        type="text"
                        placeholder="Kategori adı"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      />
                      <input
                        type="text"
                        placeholder="Açıklama (isteğe bağlı)"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                      />
                      <div className="inline-form-actions">
                        <button 
                          type="button" 
                          onClick={handleAddInlineCategory}
                          className="btn-primary-sm"
                          disabled={!newCategory.name.trim()}
                        >
                          Ekle
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setShowInlineCategoryForm(false)}
                          className="btn-secondary-sm"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Atanan Kullanıcı (İsteğe Bağlı):</label>
                <select
                  value={newItem.assigned_user_email}
                  onChange={(e) => setNewItem({...newItem, assigned_user_email: e.target.value})}
                >
                  <option value="">Kullanıcı seçin (boş bırakılabilir)...</option>
                  {users.filter(u => u.role === 'user').map(user => (
                    <option key={user.id} value={user.email}>
                      {user.email}
                    </option>
                  ))}
                </select>
                <small className="form-hint">Not: Kullanıcı atanmasa da ürün "Aktif" durumunda olacaktır.</small>
              </div>
              <div className="form-group">
                <label>Lokasyon:</label>
                <input
                  type="text"
                  placeholder="Ofis 1, Depo, Saha vb."
                  value={newItem.location}
                  onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Alış Tarihi:</label>
                <input
                  type="date"
                  value={newItem.purchase_date}
                  onChange={(e) => setNewItem({...newItem, purchase_date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Garanti Bitiş Tarihi:</label>
                <input
                  type="date"
                  value={newItem.warranty_end_date}
                  onChange={(e) => setNewItem({...newItem, warranty_end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notlar:</label>
              <textarea
                placeholder="İsteğe bağlı notlar"
                value={newItem.notes}
                onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Ekle</button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Form */}
      {editingItem && (
        <div className="edit-item-form">
          <h4>Ürün Düzenle</h4>
          <form onSubmit={handleUpdateItem}>
            <div className="form-row">
              <div className="form-group">
                <label>Ürün Adı *:</label>
                <input
                  type="text"
                  value={editingItem.product_name}
                  onChange={(e) => setEditingItem({...editingItem, product_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Marka:</label>
                <input
                  type="text"
                  value={editingItem.brand || ''}
                  onChange={(e) => setEditingItem({...editingItem, brand: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Model:</label>
                <input
                  type="text"
                  value={editingItem.model || ''}
                  onChange={(e) => setEditingItem({...editingItem, model: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Seri No *:</label>
                <input
                  type="text"
                  value={editingItem.serial_code}
                  onChange={(e) => setEditingItem({...editingItem, serial_code: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ürün Kodu *:</label>
                <input
                  type="text"
                  value={editingItem.product_code}
                  onChange={(e) => setEditingItem({...editingItem, product_code: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Kategori:</label>
                <select
                  value={editingItem.category_id || ''}
                  onChange={(e) => setEditingItem({...editingItem, category_id: e.target.value})}
                >
                  <option value="">Kategori seçin...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Atanan Kullanıcı:</label>
                <select
                  value={editingItem.assigned_user_email || ''}
                  onChange={(e) => setEditingItem({...editingItem, assigned_user_email: e.target.value})}
                >
                  <option value="">Kullanıcı seçin...</option>
                  {users.filter(u => u.role === 'user').map(user => (
                    <option key={user.id} value={user.email}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Lokasyon:</label>
                <input
                  type="text"
                  value={editingItem.location || ''}
                  onChange={(e) => setEditingItem({...editingItem, location: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Durum:</label>
                <select
                  value={editingItem.status || 'active'}
                  onChange={(e) => setEditingItem({...editingItem, status: e.target.value})}
                >
                  <option value="active">🟢 Aktif</option>
                  <option value="maintenance">🟠 Bakımda</option>
                  <option value="broken">🔴 Arızalı</option>
                </select>
                <small className="form-hint"></small>
              </div>
              <div className="form-group">
                <label>Alış Tarihi:</label>
                <input
                  type="date"
                  value={editingItem.purchase_date || ''}
                  onChange={(e) => setEditingItem({...editingItem, purchase_date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Garanti Bitiş Tarihi:</label>
                <input
                  type="date"
                  value={editingItem.warranty_end_date || ''}
                  onChange={(e) => setEditingItem({...editingItem, warranty_end_date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Notlar:</label>
                <textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Güncelle</button>
              <button 
                type="button" 
                onClick={() => setEditingItem(null)}
                className="btn-secondary"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Inventory List */}
      <div className="inventory-table">
        {inventory.length === 0 ? (
          <div className="no-data">Henüz hiç ürün bulunmuyor.</div>
        ) : (
          <div className="inventory-grid">
            {inventory.map(item => (
              <div key={item.id} className="inventory-item-card">
                <div className="item-header">
                  <h4>{item.product_name}</h4>
                  <span className={`item-status ${getStatusClass(item.status)}`}>
                  {getStatusLabel(item.status)}
                  </span>
                </div>
                <div className="item-details">
                  <p><strong>Marka/Model:</strong> {item.brand} {item.model}</p>
                  <p><strong>Seri No:</strong> {item.serial_code}</p>
                  <p><strong>Ürün Kodu:</strong> {item.product_code}</p>
                  <p><strong>Kategori:</strong> {item.category_name || 'Belirtilmemiş'}</p>
                  <p><strong>Atanan:</strong> {item.assigned_user_email || 'Kimseye atanmadı'}</p>
                  {item.location && <p><strong>Konum:</strong> {item.location}</p>}
                  {item.purchase_date && <p><strong>Alış Tarihi:</strong> {formatDate(item.purchase_date)}</p>}
                  {item.warranty_end_date && <p><strong>Garanti:</strong> {formatDate(item.warranty_end_date)}</p>}
                  {item.assignment_date && <p><strong>Atanma:</strong> {formatDate(item.assignment_date)}</p>}
                  {item.unassignment_date && <p><strong>Boşa Çıkma:</strong> {formatDate(item.unassignment_date)}</p>}
                  {item.notes && <p><strong>Not:</strong> {item.notes}</p>}
                  <p><strong>Eklenme:</strong> {formatDate(item.created_at)}</p>
                  
                  {/* GÜNCELLENMIŞ: Atama durumu açıklaması */}
                  {item.assigned_user_email && (
                    <div className="assignment-info">
                      <p><strong>📋 Atama Durumu:</strong></p>
                      <div className="assignment-details">
                        <span className="assigned-user">👤 {item.assigned_user_email}</span>
                        <span className="assignment-status">✅ Kullanımda (Aktif)</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="item-actions">
                  <button 
                    onClick={() => setEditingItem(item)}
                    className="btn-secondary"
                  >
                    Düzenle
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="btn-danger"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

// Ana App Component'inde güncellenmiş routing
function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
        setCurrentPage(payload.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
      } catch (error) {
        localStorage.removeItem('token');
        setToken(null);
      }
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCurrentPage('login');
  };

  return (
    <div className="App">
      <Header user={user} onLogout={logout} />
      
      {currentPage === 'login' && (
        <LoginPage 
          onLogin={(token, user) => {
            setToken(token);
            setUser(user);
            localStorage.setItem('token', token);
            setCurrentPage(user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
          }}
        />
      )}
      
      {currentPage === 'user-dashboard' && user && (
        <UserDashboard 
          user={user} 
          token={token}
          onNavigate={setCurrentPage}
        />
      )}
      
      {currentPage === 'admin-dashboard' && user && user.role === 'admin' && (
        <AdminDashboard 
          user={user} 
          token={token}
          onNavigate={setCurrentPage}
        />
      )}
      
      {/* Kaldırılan create-ticket sayfası yerine spesifik sayfalar */}
      {currentPage === 'create-fault-report' && user && (
        <CreateFaultReport 
          user={user} 
          token={token}
          onBack={() => setCurrentPage('user-dashboard')}
        />
      )}
      
      {currentPage === 'create-change-request' && user && (
        <CreateChangeRequest 
          user={user} 
          token={token}
          onBack={() => setCurrentPage('user-dashboard')}
        />
      )}
      
      {currentPage === 'create-general-request' && user && (
        <CreateGeneralRequest 
          user={user} 
          token={token}
          onBack={() => setCurrentPage('user-dashboard')}
        />
      )}
      
      {currentPage === 'my-tickets' && user && (
        <MyTickets 
          user={user} 
          token={token}
          onBack={() => setCurrentPage('user-dashboard')}
        />
      )}

      {currentPage === 'my-inventory' && user && (
        <MyInventory 
          user={user} 
          token={token}
          onBack={() => setCurrentPage('user-dashboard')}
          onNavigate={setCurrentPage}
        />
      )}

      {currentPage === 'inventory-count' && user && (
        <InventoryCount 
          user={user} 
          token={token}
          onBack={() => setCurrentPage('user-dashboard')}
        />
      )}
    </div>
  );
}

// Header Component
const Header = ({ user, onLogout }) => (
  <header className="header">
    <div className="container">
      <h1>🔧 Detsa IT Sistemi</h1>
      {user && (
        <div className="user-info">
          <span>{user.email} ({user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'})</span>
          <button onClick={onLogout} className="logout-btn">Çıkış</button>
        </div>
      )}
    </div>
  </header>
);

// Login Page Component
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: email, 2: code
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Doğrulama kodu email adresinize gönderildi!');
        setStep(2);
      } else {
        setMessage(data.error || 'Hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setLoading(false);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setMessage(data.error || 'Geçersiz kod');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Sisteme Giriş</h2>
        
        {step === 1 ? (
          <form onSubmit={sendCode}>
            <div className="form-group">
              <label>Email Adresi:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ornek@detsa.com"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Gönderiliyor...' : 'Onay Kodu Gönder'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <div className="form-group">
              <label>Email: {email}</label>
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="btn-link"
              >
                Değiştir
              </button>
            </div>
            <div className="form-group">
              <label>Doğrulama Kodu:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="6 haneli kod"
                maxLength="6"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
          </form>
        )}
        
        {message && (
          <div className={`message ${message.includes('gönderildi') || message.includes('başarı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// User Dashboard Component - Güncellenmiş navigasyon
const UserDashboard = ({ user, token, onNavigate }) => {
  return (
    <div className="dashboard-container">
      <div className="dashboard">
        <h2>Kullanıcı Paneli</h2>
        <p>Hoş geldiniz, {user.email}!</p>
        
        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => onNavigate('create-fault-report')}>
            <h3>🔧 Arıza Bildirimi</h3>
            <p>Sistem arızalarını bildirin</p>
          </div>
          
          <div className="dashboard-card" onClick={() => onNavigate('inventory-count')}>
            <h3>📊 Sayım Tamamlama</h3>
            <p>Sayım işlemlerini tamamlayın</p>
          </div>
          
          <div className="dashboard-card" onClick={() => onNavigate('create-change-request')}>
            <h3>🔄 Değişim Talebi</h3>
            <p>Değişim taleplerini oluşturun</p>
          </div>
          
          <div className="dashboard-card" onClick={() => onNavigate('create-general-request')}>
            <h3>✉️ Genel Talep</h3>
            <p>Diğer taleplerinizi iletin</p>
          </div>
          
          <div className="dashboard-card" onClick={() => onNavigate('my-tickets')}>
            <h3>📋 Taleplerim</h3>
            <p>Gönderdiğiniz talepleri görüntüleyin</p>
          </div>

          <div className="dashboard-card" onClick={() => onNavigate('my-inventory')}>
            <h3>📦 Envanter Listesi</h3>
            <p>Size atanan ürünleri görüntüleyin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Change Request Component (Yeni)
const CreateChangeRequest = ({ user, token, onBack }) => {
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [formData, setFormData] = useState({
    product_id: '',
    title: '',
    description: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAssignedProducts();
  }, []);

  const fetchAssignedProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/my-assigned-products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignedProducts(data);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'degisim',
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          product_id: formData.product_id || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Değişim talebi başarıyla oluşturuldu!');
        setFormData({ product_id: '', title: '', description: '', priority: 'normal' });
        setTimeout(() => onBack(), 2000);
      } else {
        setMessage(data.error || 'Hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <div className="form-container">
        <button onClick={onBack} className="btn-back">← Geri Dön</button>
        <h2>🔄 Değişim Talebi</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>İlgili Ürün (İsteğe Bağlı):</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({...formData, product_id: e.target.value})}
            >
              <option value="">Ürün seçin...</option>
              {assignedProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.product_name} ({product.serial_code})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Talep Başlığı:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              placeholder="Değişim talebinizi kısaca özetleyin"
            />
          </div>
          
          <div className="form-group">
            <label>Talep Detayı:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows="6"
              placeholder="Değişim talebinizi detaylı olarak açıklayın..."
            />
          </div>
          
          <div className="form-group">
            <label>Öncelik:</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Gönderiliyor...' : 'Değişim Talebi Oluştur'}
          </button>
        </form>
        
        {message && (
          <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// Create General Request Component (Yeni)
const CreateGeneralRequest = ({ user, token, onBack }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'genel',
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          product_id: null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Genel talep başarıyla oluşturuldu!');
        setFormData({ title: '', description: '', priority: 'normal' });
        setTimeout(() => onBack(), 2000);
      } else {
        setMessage(data.error || 'Hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <div className="form-container">
        <button onClick={onBack} className="btn-back">← Geri Dön</button>
        <h2>✉️ Genel Talep</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Talep Başlığı:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              placeholder="Talebinizi kısaca özetleyin"
            />
          </div>
          
          <div className="form-group">
            <label>Talep Detayı:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows="6"
              placeholder="Talebinizi detaylı olarak açıklayın..."
            />
          </div>
          
          <div className="form-group">
            <label>Öncelik:</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Gönderiliyor...' : 'Genel Talep Oluştur'}
          </button>
        </form>
        
        {message && (
          <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};



// My Tickets Component
const MyTickets = ({ user, token, onBack }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      const response = await fetch(`${API_BASE}/my-tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Tickets yüklenirken hata:', error);
    }
    setLoading(false);
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: '🔴 Açık',
      in_progress: '🟡 İşlemde',
      closed: '🟢 Kapalı'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: '🟢 Düşük',
      normal: '🟡 Normal',
      high: '🟠 Yüksek',
      urgent: '🔴 Acil'
    };
    return labels[priority] || priority;
  };

  const getTypeLabel = (type) => {
    const labels = {
      ariza: '🔧 Arıza',
      sayim: '📊 Sayım',
      degisim: '🔄 Değişim',
      genel: '✉️ Genel'
    };
    return labels[type] || type;
  };

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Geri Dön</button>
      <h2>Taleplerim</h2>
      
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : tickets.length === 0 ? (
        <div className="no-data">Henüz hiç talebiniz bulunmuyor.</div>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <h3>{ticket.title}</h3>
                <div className="ticket-meta">
                  <span className="ticket-type">{getTypeLabel(ticket.type)}</span>
                  <span className="ticket-status">{getStatusLabel(ticket.status)}</span>
                  <span className="ticket-priority">{getPriorityLabel(ticket.priority)}</span>
                </div>
              </div>
              {ticket.product_name && (
                <p className="ticket-product">
                  <strong>İlgili Ürün:</strong> {ticket.product_name} ({ticket.product_code})
                </p>
              )}
              <p className="ticket-description">{ticket.description}</p>
              <div className="ticket-footer">
                <small>Oluşturulma: {new Date(ticket.created_at).toLocaleString('tr-TR')}</small>
                {ticket.updated_at !== ticket.created_at && (
                  <small>Güncelleme: {new Date(ticket.updated_at).toLocaleString('tr-TR')}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// My Inventory Component
const MyInventory = ({ user, token, onBack, onNavigate }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyInventory();
  }, []);

  const fetchMyInventory = async () => {
    try {
      const response = await fetch(`${API_BASE}/my-inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Envanter yüklenirken hata:', error);
    }
    setLoading(false);
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '🟢 Aktif',
      assigned: '🟡 Atanmış',
      maintenance: '🟠 Bakımda',
      broken: '🔴 Arızalı'
    };
    return labels[status] || status;
  };

  return (
    <div className="container">
      <button onClick={onBack} className="btn-back">← Geri Dön</button>
      <div className="inventory-header">
        <h2>Envanter Listesi</h2>
        <button 
          onClick={() => onNavigate('create-fault-report')} 
          className="btn-primary"
        >
          🔧 Arıza Bildir
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : inventory.length === 0 ? (
        <div className="no-data">Size atanan hiç ürün bulunmuyor.</div>
      ) : (
        <div className="inventory-grid">
          {inventory.map(item => (
            <div key={item.id} className="inventory-card">
              <div className="inventory-header">
                <h3>{item.product_name}</h3>
                <span className={`inventory-status status-${item.status}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <div className="inventory-details">
                <p><strong>Marka/Model:</strong> {item.brand} {item.model}</p>
                <p><strong>Seri No:</strong> {item.serial_code}</p>
                <p><strong>Ürün Kodu:</strong> {item.product_code}</p>
                <p><strong>Kategori:</strong> {item.category_name || 'Belirtilmemiş'}</p>
                {item.location && <p><strong>Konum:</strong> {item.location}</p>}
                <p><strong>Atanma Tarihi:</strong> {new Date(item.assignment_date || item.created_at).toLocaleDateString('tr-TR')}</p>
                {item.purchase_date && <p><strong>Alış Tarihi:</strong> {new Date(item.purchase_date).toLocaleDateString('tr-TR')}</p>}
                {item.warranty_end_date && <p><strong>Garanti Bitiş:</strong> {new Date(item.warranty_end_date).toLocaleDateString('tr-TR')}</p>}
                {item.notes && (
                  <p><strong>Notlar:</strong> {item.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Create Fault Report Component
const CreateFaultReport = ({ user, token, onBack }) => {
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [formData, setFormData] = useState({
    product_id: '',
    title: '',
    description: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAssignedProducts();
  }, []);

  const fetchAssignedProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/my-assigned-products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignedProducts(data);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'ariza',
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          product_id: formData.product_id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Arıza bildirimi başarıyla oluşturuldu!');
        setFormData({ product_id: '', title: '', description: '', priority: 'normal' });
        setTimeout(() => onBack(), 2000);
      } else {
        setMessage(data.error || 'Hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <div className="form-container">
        <button onClick={onBack} className="btn-back">← Geri Dön</button>
        <h2>🔧 Arıza Bildirimi</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Arızalı Ürün:</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({...formData, product_id: e.target.value})}
              required
            >
              <option value="">Ürün seçin...</option>
              {assignedProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.product_name} ({product.serial_code})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Arıza Başlığı:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              placeholder="Arıza kısaca tanımlayın"
            />
          </div>
          
          <div className="form-group">
            <label>Arıza Detayı:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows="6"
              placeholder="Arızayı detaylı olarak açıklayın..."
            />
          </div>
          
          <div className="form-group">
            <label>Öncelik:</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading || !formData.product_id} className="btn-primary">
            {loading ? 'Gönderiliyor...' : 'Arıza Bildir'}
          </button>
        </form>
        
        {message && (
          <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// Güncellenmiş InventoryCount komponenti - App.js'te değiştirilecek

// Güncellenmiş InventoryCount komponenti - App.js'te değiştirilecek

const InventoryCount = ({ user, token, onBack }) => {
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [countData, setCountData] = useState({});
  const [countPeriod, setCountPeriod] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isCountPeriodActive, setIsCountPeriodActive] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    fetchCountPeriod();
    fetchAssignedProducts();
  }, []);

  const fetchCountPeriod = async () => {
    try {
      const response = await fetch(`${API_BASE}/count-period`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCountPeriod(data);
        
        if (data && data.start_date && data.end_date) {
          const now = new Date();
          const startDate = new Date(data.start_date);
          const endDate = new Date(data.end_date);
          setIsCountPeriodActive(now >= startDate && now <= endDate);
          
          // Backend'den gelen sayım durumu bilgilerini kullan
          setHasSubmitted(data.has_submitted || false);
          setHasDraft(data.has_draft || false);
          setExistingSubmission(data.user_submission);
          
          if (data.user_submission) {
            setIsDraft(data.user_submission.status === 'draft');
            
            // Mevcut sayım verilerini yükle
            if (data.user_submission.submission_data) {
              try {
                const submissionData = typeof data.user_submission.submission_data === 'string' 
                  ? JSON.parse(data.user_submission.submission_data)
                  : data.user_submission.submission_data;
                setCountData(submissionData);
              } catch (parseError) {
                console.error('Sayım verisi parse hatası:', parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Sayım periyodu yüklenirken hata:', error);
    }
  };

  const fetchAssignedProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/my-inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignedProducts(data);
        
        // Initialize count data if no existing submission
        if (!existingSubmission) {
          const initialCount = {};
          data.forEach(product => {
            initialCount[product.id] = {
              expected: 1,
              actual: '',
              notes: ''
            };
          });
          setCountData(initialCount);
        }
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
    setLoading(false);
  };

  const updateCount = (productId, field, value) => {
    // Eğer sayım gönderilmişse değişiklik yapılmasın
    if (hasSubmitted) {
      setMessage('Gönderilmiş sayım değiştirilemez!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setCountData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const saveAsDraft = async () => {
    if (!countPeriod || !isCountPeriodActive) {
      setMessage('Sayım periyodu aktif değil!');
      return;
    }

    if (hasSubmitted) {
      setMessage('Bu sayım periyodu için zaten sayım gönderilmiş!');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/count-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          count_period_id: countPeriod.id,
          submission_data: countData,
          status: 'draft'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Sayım taslak olarak kaydedildi!');
        setHasDraft(true);
        setExistingSubmission({
          ...existingSubmission,
          submission_data: countData,
          status: 'draft'
        });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setSubmitting(false);
  };

  const submitFinal = async () => {
    if (!countPeriod || !isCountPeriodActive) {
      setMessage('Sayım periyodu aktif değil!');
      return;
    }

    if (hasSubmitted) {
      setMessage('Bu sayım periyodu için zaten sayım gönderilmiş!');
      return;
    }

    // Tüm ürünlerin sayılıp sayılmadığını kontrol et
    const incompleteCounts = assignedProducts.filter(product => {
      const count = countData[product.id];
      return !count || count.actual === '';
    });

    if (incompleteCounts.length > 0) {
      setMessage(`${incompleteCounts.length} ürün için sayım tamamlanmamış!`);
      return;
    }

    if (!window.confirm('Sayımı kesin olarak göndermek istediğinizden emin misiniz? Bu işlem sonrası değişiklik yapılamaz ve bir daha sayım yapamazsınız.')) {
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/count-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          count_period_id: countPeriod.id,
          submission_data: countData,
          status: 'submitted'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Sayım başarıyla gönderildi! Artık değişiklik yapamazsınız.');
        setIsDraft(false);
        setHasSubmitted(true);
        setHasDraft(false);
        setExistingSubmission({
          ...existingSubmission,
          submission_data: countData,
          status: 'submitted'
        });
        setTimeout(() => onBack(), 5000);
      } else {
        setMessage(data.error || 'Hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası');
    }

    setSubmitting(false);
  };

  const deleteDraft = async () => {
    if (hasSubmitted) {
      setMessage('Gönderilmiş sayım silinemez!');
      return;
    }

    if (!window.confirm('Sayım taslağını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/count-submission/${countPeriod.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Sayım taslağı silindi!');
        setExistingSubmission(null);
        setIsDraft(true);
        setHasDraft(false);
        
        // Reset count data
        const initialCount = {};
        assignedProducts.forEach(product => {
          initialCount[product.id] = {
            expected: 1,
            actual: '',
            notes: ''
          };
        });
        setCountData(initialCount);
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Silme işleminde hata oluştu!');
      }
    } catch (error) {
      setMessage('Bağlantı hatası!');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    if (!countPeriod?.end_date) return null;
    const endDate = new Date(countPeriod.end_date);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCompletionRate = () => {
    if (assignedProducts.length === 0) return 0;
    const completedCount = assignedProducts.filter(product => {
      const count = countData[product.id];
      return count && count.actual !== '';
    }).length;
    return Math.round((completedCount / assignedProducts.length) * 100);
  };

  if (loading) {
    return <div className="container"><div className="loading">Yükleniyor...</div></div>;
  }

  return (
    <div className="container">
      <div className="form-container">
        <button onClick={onBack} className="btn-back">← Geri Dön</button>
        <h2>📊 Envanter Sayımı</h2>
        
        {/* Sayım Periyodu Bilgisi */}
        {countPeriod ? (
          <div className={`count-period-info ${isCountPeriodActive ? 'active' : 'inactive'}`}>
            <h3>{countPeriod.title}</h3>
            <p><strong>Başlangıç:</strong> {formatDate(countPeriod.start_date)}</p>
            <p><strong>Bitiş:</strong> {formatDate(countPeriod.end_date)}</p>
            {countPeriod.description && (
              <p><strong>Açıklama:</strong> {countPeriod.description}</p>
            )}
            
            {isCountPeriodActive ? (
              <div className="period-status active">
                ✅ Sayım periyodu aktif
                {getDaysRemaining() > 0 && (
                  <span className="days-remaining"> - {getDaysRemaining()} gün kaldı</span>
                )}
              </div>
            ) : (
              <div className="period-status inactive">
                ❌ Sayım periyodu aktif değil
              </div>
            )}
          </div>
        ) : (
          <div className="count-period-info inactive">
            <div className="period-status inactive">
              ⏳ Henüz aktif bir sayım periyodu belirlenmemiş
            </div>
          </div>
        )}

        {/* Kullanıcının Sayım Durumu */}
        {hasSubmitted && (
          <div className="submitted-info">
            <h4>✅ Sayım Tamamlandı</h4>
            <p>Bu sayım periyodu için sayımınızı zaten gönderdiniz.</p>
            {existingSubmission?.submitted_at && (
              <p><strong>Gönderim Tarihi:</strong> {formatDate(existingSubmission.submitted_at)}</p>
            )}
            <p><strong>Tamamlanma Oranı:</strong> {getCompletionRate()}%</p>
            <div style={{marginTop: '1rem'}}>
              <strong>🔒 Bu sayım kalıcı olarak kaydedilmiştir ve değiştirilemez.</strong>
            </div>
          </div>
        )}

        {/* Mevcut Sayım Durumu (sadece submitted değilse) */}
        {!hasSubmitted && existingSubmission && (
          <div className={`existing-submission ${isDraft ? 'draft' : 'submitted'}`}>
            <h4>📝 Taslak Sayım</h4>
            <p>
              <strong>Son Güncelleme:</strong> {formatDate(existingSubmission.updated_at)}
            </p>
            <div className="completion-rate">
              <strong>Tamamlanma Oranı:</strong> {getCompletionRate()}% ({assignedProducts.filter(p => countData[p.id]?.actual !== '').length}/{assignedProducts.length})
            </div>
          </div>
        )}

        {!isCountPeriodActive ? (
          <div className="count-disabled">
            <h3>Sayım Yapılamıyor</h3>
            <p>Sayım işlemi sadece belirlenen tarih aralığında yapılabilir.</p>
            {countPeriod && (
              <p>
                Bir sonraki sayım periyodu: 
                <strong> {formatDate(countPeriod.start_date)} - {formatDate(countPeriod.end_date)}</strong>
              </p>
            )}
          </div>
        ) : hasSubmitted ? (
          <div className="count-completed">
            <h3>✅ Sayım Tamamlandı</h3>
            <p>Bu sayım periyodu için sayımınız başarıyla gönderilmiş ve kaydedilmiştir.</p>
            <p>Sayım sonuçlarınızı aşağıda görüntüleyebilirsiniz:</p>
            
            {/* Tamamlanmış Sayım Sonuçları */}
            <div className="completed-count-results">
              {assignedProducts.map(product => (
                <div key={product.id} className="completed-count-item">
                  <div className="product-info">
                    <h4>{product.product_name}</h4>
                    <p>Seri No: {product.serial_code}</p>
                    <p>Ürün Kodu: {product.product_code}</p>
                  </div>
                  
                  <div className="count-result">
                    {countData[product.id]?.actual === '1' ? (
                      <span className="result-found">✅ Mevcut</span>
                    ) : countData[product.id]?.actual === '0' ? (
                      <span className="result-missing">❌ Kayıp</span>
                    ) : (
                      <span className="result-unknown">❓ Bilinmiyor</span>
                    )}
                    
                    {countData[product.id]?.notes && (
                      <div className="count-notes">
                        <strong>Not:</strong> {countData[product.id].notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p>Size atanan ürünlerin sayımını yapın:</p>
            
            <div className="count-actions">
              {isDraft && !hasSubmitted && (
                <>
                  <button 
                    onClick={saveAsDraft}
                    disabled={submitting}
                    className="btn-secondary"
                  >
                    {submitting ? 'Kaydediliyor...' : '💾 Taslak Kaydet'}
                  </button>
                  {hasDraft && (
                    <button 
                      onClick={deleteDraft}
                      className="btn-danger"
                    >
                      🗑️ Taslağı Sil
                    </button>
                  )}
                </>
              )}
            </div>
            
            {assignedProducts.length === 0 ? (
              <div className="no-data">Size atanan hiç ürün bulunmuyor.</div>
            ) : (
              <div className="count-list">
                {assignedProducts.map(product => (
                  <div key={product.id} className="count-item">
                    <div className="product-info">
                      <h4>{product.product_name}</h4>
                      <p>Marka/Model: {product.brand} {product.model}</p>
                      <p>Seri No: {product.serial_code}</p>
                      <p>Ürün Kodu: {product.product_code}</p>
                      <p>Beklenen: Mevcut (1 adet)</p>
                    </div>
                    
                    <div className="count-inputs">
                      <div className="form-group">
                        <label>Ürün Durumu:</label>
                        <select
                          value={countData[product.id]?.actual || ''}
                          onChange={(e) => updateCount(product.id, 'actual', e.target.value)}
                          disabled={hasSubmitted}
                        >
                          <option value="">Durum seçin...</option>
                          <option value="1">✅ Mevcut</option>
                          <option value="0">❌ Kayıp/Bulunamadı</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Not (İsteğe bağlı):</label>
                        <input
                          type="text"
                          value={countData[product.id]?.notes || ''}
                          onChange={(e) => updateCount(product.id, 'notes', e.target.value)}
                          placeholder="Varsa ek açıklama"
                          disabled={hasSubmitted}
                        />
                      </div>
                      
                      {countData[product.id]?.actual && (
                        <div className="count-difference">
                          <strong>
                            Durum: {parseInt(countData[product.id].actual) === 1 ? '✅ Mevcut' : '❌ Kayıp'}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {assignedProducts.length > 0 && !hasSubmitted && (
              <div className="final-actions">
                <button 
                  onClick={submitFinal}
                  disabled={submitting || getCompletionRate() < 100}
                  className="btn-primary"
                >
                  {submitting ? 'Gönderiliyor...' : '📤 Kesin Sayımı Gönder (Kalıcı)'}
                </button>
                {getCompletionRate() < 100 && (
                  <p className="completion-warning">
                    ⚠️ Tüm ürünlerin sayımını tamamlayın ({getCompletionRate()}% tamamlandı)
                  </p>
                )}
                <div className="final-warning">
                  <strong>⚠️ Uyarı:</strong> Sayımınızı gönderdikten sonra değişiklik yapılamaz ve bu sayım periyodu için tekrar sayım yapamazsınız.
                </div>
              </div>
            )}
          </>
        )}
        
        {message && (
          <div className={`message ${message.includes('başarı') || message.includes('kaydedildi') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ user, token, onNavigate }) => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    totalUsers: 0,
    totalInventory: 0,
    faultReports: 0,
    changeRequests: 0
  });
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Tüm ticketları getir
      const ticketsResponse = await fetch(`${API_BASE}/admin/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData);
        setStats(prev => ({
          ...prev,
          totalTickets: ticketsData.length,
          openTickets: ticketsData.filter(t => t.status === 'open').length,
          faultReports: ticketsData.filter(t => t.type === 'ariza').length,
          changeRequests: ticketsData.filter(t => t.type === 'degisim').length
        }));
      }

      // Tüm kullanıcıları getir
      const usersResponse = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length
        }));
      }

      // Tüm envanteri getir
      const inventoryResponse = await fetch(`${API_BASE}/admin/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventory(inventoryData);
        setStats(prev => ({
          ...prev,
          totalInventory: inventoryData.length
        }));
      }
    } catch (error) {
      console.error('Admin data yüklenirken hata:', error);
    }
    setLoading(false);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Ticket durumu güncellenirken hata:', error);
    }
  };

  const addUser = async (email, role = 'user') => {
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, role })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Kullanıcı eklenirken hata:', error);
      return false;
    }
  };

  // AdminCountPeriod komponenti burada tanımlanacak (önceki artifact'taki gibi)
  const AdminCountPeriod = ({ token }) => {
    const [countPeriod, setCountPeriod] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      start_date: '',
      end_date: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
  
    useEffect(() => {
      fetchCountPeriod();
    }, []);
  
    const fetchCountPeriod = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/count-period`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const period = Array.isArray(data) ? data[0] : data;
          if (period) {
            period.title = period.title || period.name;
          }
          setCountPeriod(period);
        }
      } catch (error) {
        console.error('Sayım periyodu yüklenirken hata:', error);
      }
      setLoading(false);
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        setMessage('Bitiş tarihi başlangıç tarihinden sonra olmalıdır!');
        return;
      }
    
      try {
        const url = countPeriod ? 
          `${API_BASE}/admin/count-period/${countPeriod.id}` : 
          `${API_BASE}/admin/count-period`;
        
        const method = countPeriod ? 'PUT' : 'POST';
    
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
    
        const data = await response.json();
    
        if (response.ok) {
          setMessage(`Sayım periyodu başarıyla ${countPeriod ? 'güncellendi' : 'oluşturuldu'}!`);
          setFormData({ title: '', description: '', start_date: '', end_date: '' });
          setShowForm(false);
          fetchCountPeriod();
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage(data.error || 'Hata oluştu');
        }
      } catch (error) {
        setMessage('Bağlantı hatası');
      }
    };
  
    const handleDelete = async () => {
      if (window.confirm('Sayım periyodunu silmek istediğinizden emin misiniz?')) {
        try {
          const response = await fetch(`${API_BASE}/admin/count-period/${countPeriod.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
  
          if (response.ok) {
            setMessage('Sayım periyodu silindi!');
            setCountPeriod(null);
            setTimeout(() => setMessage(''), 3000);
          } else {
            setMessage('Silme işleminde hata oluştu!');
          }
        } catch (error) {
          setMessage('Bağlantı hatası!');
        }
      }
    };
  
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
  
    const isActive = () => {
      if (!countPeriod) return false;
      const now = new Date();
      const start = new Date(countPeriod.start_date);
      const end = new Date(countPeriod.end_date);
      return now >= start && now <= end;
    };
  
    if (loading) {
      return <div className="loading">Yükleniyor...</div>;
    }
  
    return (
      <div className="admin-count-period">
        <div className="count-period-header">
          <h3>Sayım Periyodu Yönetimi</h3>
          {!countPeriod && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              + Sayım Periyodu Oluştur
            </button>
          )}
        </div>
  
        {countPeriod && (
          <div className={`current-period ${isActive() ? 'active' : 'inactive'}`}>
            <h4>{countPeriod.title}</h4>
            <div className="period-details">
              <p><strong>Başlangıç:</strong> {formatDate(countPeriod.start_date)}</p>
              <p><strong>Bitiş:</strong> {formatDate(countPeriod.end_date)}</p>
              {countPeriod.description && (
                <p><strong>Açıklama:</strong> {countPeriod.description}</p>
              )}
              <p><strong>Durum:</strong> 
                <span className={`status ${isActive() ? 'active' : 'inactive'}`}>
                  {isActive() ? ' 🟢 Aktif' : ' 🔴 Pasif'}
                </span>
              </p>
              <p><strong>Oluşturulma:</strong> {formatDate(countPeriod.created_at)}</p>
            </div>
            <div className="period-actions">
              <button 
                onClick={() => {
                  setFormData({
                    title: countPeriod.title || countPeriod.name || '',
                    description: countPeriod.description || '',
                    start_date: countPeriod.start_date ? countPeriod.start_date.split('T')[0] : '',
                    end_date: countPeriod.end_date ? countPeriod.end_date.split('T')[0] : ''
                  });
                  setShowForm(true);
                }}
                className="btn-secondary"
              >
                Düzenle
              </button>
              <button 
                onClick={handleDelete}
                className="btn-danger"
              >
                Sil
              </button>
            </div>
          </div>
        )}
  
        {showForm && (
          <div className="count-period-form">
            <h4>{countPeriod ? 'Sayım Periyodunu Düzenle' : 'Yeni Sayım Periyodu'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Sayım Başlığı *:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Örn: 2025 Yıl Sonu Sayımı"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Başlangıç Tarihi *:</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Bitiş Tarihi *:</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Açıklama:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="Sayım hakkında ek bilgiler..."
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {countPeriod ? 'Güncelle' : 'Oluştur'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}
  
        {message && (
          <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    );
  };
  const AdminCountResults = ({ token }) => {
    const [countPeriods, setCountPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
    useEffect(() => {
      fetchCountPeriods();
    }, []);
  
    const fetchCountPeriods = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/count-period`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCountPeriods(Array.isArray(data) ? data : [data].filter(Boolean));
        }
      } catch (error) {
        console.error('Sayım periyotları yüklenirken hata:', error);
      }
      setLoading(false);
    };
  
    const fetchSubmissions = async (periodId) => {
      setLoadingSubmissions(true);
      try {
        const response = await fetch(`${API_BASE}/admin/count-submissions/${periodId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSubmissions(data);
        }
      } catch (error) {
        console.error('Sayım gönderimleri yüklenirken hata:', error);
      }
      setLoadingSubmissions(false);
    };
  
    const handlePeriodSelect = (period) => {
      setSelectedPeriod(period);
      fetchSubmissions(period.id);
    };
  
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
  
    const getSubmissionStats = () => {
      const total = submissions.length;
      const submitted = submissions.filter(s => s.status === 'submitted').length;
      const draft = submissions.filter(s => s.status === 'draft').length;
      
      return { total, submitted, draft };
    };
  
    const getProductStats = () => {
      let totalProducts = 0;
      let foundProducts = 0;
      let missingProducts = 0;
  
      submissions.forEach(submission => {
        if (submission.submission_data) {
          Object.values(submission.submission_data).forEach(item => {
            totalProducts++;
            if (item.actual === '1') {
              foundProducts++;
            } else if (item.actual === '0') {
              missingProducts++;
            }
          });
        }
      });
  
      return { totalProducts, foundProducts, missingProducts };
    };
  
    if (loading) {
      return <div className="loading">Yükleniyor...</div>;
    }
  
    return (
      <div className="admin-count-results">
        <h3>Sayım Sonuçları</h3>
        
        {countPeriods.length === 0 ? (
          <div className="no-data">Henüz sayım periyodu oluşturulmamış.</div>
        ) : (
          <>
            <div className="period-selector">
              <h4>Sayım Periyodu Seçin:</h4>
              <div className="period-list">
                {countPeriods.map(period => (
                  <button
                    key={period.id}
                    onClick={() => handlePeriodSelect(period)}
                    className={`period-button ${selectedPeriod?.id === period.id ? 'active' : ''}`}
                  >
                    <strong>{period.name || period.title}</strong>
                    <br />
                    <small>
                      {formatDate(period.start_date)} - {formatDate(period.end_date)}
                    </small>
                  </button>
                ))}
              </div>
            </div>
  
            {selectedPeriod && (
              <div className="period-results">
                <h4>📊 {selectedPeriod.name || selectedPeriod.title} - Sonuçlar</h4>
                
                {loadingSubmissions ? (
                  <div className="loading">Sonuçlar yükleniyor...</div>
                ) : (
                  <>
                    <div className="results-stats">
                      <div className="stats-grid">
                        <div className="stat-card">
                          <h3>{getSubmissionStats().total}</h3>
                          <p>Toplam Kullanıcı</p>
                        </div>
                        <div className="stat-card success">
                          <h3>{getSubmissionStats().submitted}</h3>
                          <p>Sayım Tamamlanan</p>
                        </div>
                        <div className="stat-card warning">
                          <h3>{getSubmissionStats().draft}</h3>
                          <p>Taslak</p>
                        </div>
                      </div>
                      
                      {getSubmissionStats().submitted > 0 && (
                        <div className="product-stats">
                          <h5>Ürün İstatistikleri (Tamamlanan Sayımlar)</h5>
                          <div className="stats-grid">
                            <div className="stat-card">
                              <h3>{getProductStats().totalProducts}</h3>
                              <p>Toplam Ürün</p>
                            </div>
                            <div className="stat-card success">
                              <h3>{getProductStats().foundProducts}</h3>
                              <p>Bulunan Ürün</p>
                            </div>
                            <div className="stat-card error">
                              <h3>{getProductStats().missingProducts}</h3>
                              <p>Kayıp Ürün</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
  
                    <div className="user-submissions">
                      <h5>Kullanıcı Sayımları</h5>
                      {submissions.length === 0 ? (
                        <div className="no-data">Bu periyot için henüz sayım yapılmamış.</div>
                      ) : (
                        <div className="submissions-list">
                          {submissions.map(submission => (
                            <div key={submission.id} className={`submission-card ${submission.status}`}>
                              <div className="submission-header">
                                <div className="submission-user">
                                  👤 {submission.user_email}
                                </div>
                                <span className={`submission-status ${submission.status}`}>
                                  {submission.status === 'submitted' ? '✅ Tamamlandı' : '📝 Taslak'}
                                </span>
                              </div>
                              
                              <div className="submission-details">
                                <div className="detail-item">
                                  <div className="detail-label">Son Güncelleme</div>
                                  <div className="detail-value">{formatDate(submission.updated_at)}</div>
                                </div>
                                {submission.submitted_at && (
                                  <div className="detail-item">
                                    <div className="detail-label">Gönderim Tarihi</div>
                                    <div className="detail-value">{formatDate(submission.submitted_at)}</div>
                                  </div>
                                )}
                                <div className="detail-item">
                                  <div className="detail-label">Toplam Ürün</div>
                                  <div className="detail-value">
                                    {Object.keys(submission.submission_data || {}).length}
                                  </div>
                                </div>
                                <div className="detail-item">
                                  <div className="detail-label">Tamamlanan</div>
                                  <div className="detail-value">
                                    {Object.values(submission.submission_data || {}).filter(item => item.actual !== '').length}
                                  </div>
                                </div>
                              </div>
  
                              {submission.status === 'submitted' && submission.submission_data && (
                                <div className="submission-products">
                                  <h5>Sayım Detayları</h5>
                                  {Object.entries(submission.submission_data).map(([productId, countData]) => {
                                    const isFound = countData.actual === '1';
                                    const isMissing = countData.actual === '0';
                                    const productInfo = countData.product_info;
                                    
                                    return (
                                      <div 
                                        key={productId} 
                                        className={`product-count-result ${isFound ? 'found' : isMissing ? 'missing' : ''}`}
                                      >
                                        <div className="product-name">
                                          {productInfo ? 
                                            `${productInfo.product_name} (${productInfo.product_code})` : 
                                            `Ürün ID: ${productId}`
                                          }
                                        </div>
                                        <div className="count-result">
                                          <span className="result-icon">
                                            {isFound ? '✅' : isMissing ? '❌' : '⏳'}
                                          </span>
                                          <span>
                                            {isFound ? 'Mevcut' : isMissing ? 'Kayıp' : 'Sayılmadı'}
                                          </span>
                                        </div>
                                        {countData.notes && (
                                          <div className="product-notes">
                                            Not: {countData.notes}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  
  const addInventoryItem = async (itemData) => {
    try {
      const response = await fetch(`${API_BASE}/admin/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(itemData)
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      return false;
    }
  };

  const updateInventoryItem = async (itemId, itemData) => {
    try {
      const response = await fetch(`${API_BASE}/admin/inventory/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(itemData)
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ürün güncellenirken hata:', error);
      return false;
    }
  };

  const deleteInventoryItem = async (itemId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/inventory/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ürün silinirken hata:', error);
      return false;
    }
  };

  if (loading) {
    return <div className="container"><div className="loading">Yükleniyor...</div></div>;
  }
  const AdminFaultReports = ({ tickets, onUpdateStatus }) => {
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const faultTickets = tickets.filter(ticket => ticket.type === 'ariza');

    const filteredTickets = faultTickets.filter(ticket => {
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ticket.product_name && ticket.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesStatus && matchesPriority && matchesSearch;
    });

    const getStatusLabel = (status) => {
      const labels = {
        open: '🔴 Açık',
        in_progress: '🟡 İşlemde',
        closed: '🟢 Kapalı'
      };
      return labels[status] || status;
    };

    const getPriorityLabel = (priority) => {
      const labels = {
        low: '🟢 Düşük',
        normal: '🟡 Normal',
        high: '🟠 Yüksek',
        urgent: '🔴 Acil'
      };
      return labels[priority] || priority;
    };

    const getStatusStats = () => {
      return {
        total: faultTickets.length,
        open: faultTickets.filter(t => t.status === 'open').length,
        inProgress: faultTickets.filter(t => t.status === 'in_progress').length,
        closed: faultTickets.filter(t => t.status === 'closed').length
      };
    };

    const stats = getStatusStats();

    return (
      <div className="admin-fault-reports">
        <div className="fault-reports-header">
          <h3>🔧 Arıza Kayıtları ({faultTickets.length})</h3>
          
          {/* İstatistikler */}
          <div className="fault-stats-grid">
            <div className="fault-stat-item total">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Toplam</span>
            </div>
            <div className="fault-stat-item open">
              <span className="stat-number">{stats.open}</span>
              <span className="stat-label">Açık</span>
            </div>
            <div className="fault-stat-item progress">
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">İşlemde</span>
            </div>
            <div className="fault-stat-item closed">
              <span className="stat-number">{stats.closed}</span>
              <span className="stat-label">Kapalı</span>
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="fault-filters">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Arıza ara... (başlık, kullanıcı, ürün)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="open">Açık</option>
              <option value="in_progress">İşlemde</option>
              <option value="closed">Kapalı</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="urgent">Acil</option>
              <option value="high">Yüksek</option>
              <option value="normal">Normal</option>
              <option value="low">Düşük</option>
            </select>
          </div>
        </div>

        {/* Arıza Listesi */}
        {filteredTickets.length === 0 ? (
          <div className="no-data">
            {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
              ? 'Filtrelere uygun arıza kaydı bulunamadı.' 
              : 'Henüz hiç arıza kaydı bulunmuyor.'}
          </div>
        ) : (
          <div className="fault-tickets-list">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className={`fault-ticket-card priority-${ticket.priority} status-${ticket.status}`}>
                <div className="fault-ticket-header">
                  <div className="fault-info">
                    <h4>{ticket.title}</h4>
                    <div className="fault-meta">
                      <span className="fault-user">👤 {ticket.user_email}</span>
                      <span className="fault-date">📅 {new Date(ticket.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="fault-badges">
                    <span className={`priority-badge ${ticket.priority}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span className={`status-badge ${ticket.status}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                </div>

                {ticket.product_name && (
                  <div className="fault-product">
                    <strong>🔧 Arızalı Ürün:</strong> {ticket.product_name} ({ticket.product_code})
                  </div>
                )}

                <div className="fault-description">
                  <strong>📝 Arıza Açıklaması:</strong>
                  <p>{ticket.description}</p>
                </div>

                <div className="fault-actions">
                  <div className="status-update">
                    <label>Durum Güncelle:</label>
                    <div className="status-buttons">
                      <button 
                        onClick={() => onUpdateStatus(ticket.id, 'open')}
                        className={`btn-status-fault ${ticket.status === 'open' ? 'active' : ''}`}
                      >
                        🔴 Aç
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(ticket.id, 'in_progress')}
                        className={`btn-status-fault ${ticket.status === 'in_progress' ? 'active' : ''}`}
                      >
                        🟡 İşlemde
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(ticket.id, 'closed')}
                        className={`btn-status-fault ${ticket.status === 'closed' ? 'active' : ''}`}
                      >
                        🟢 Kapat
                      </button>
                    </div>
                  </div>
                </div>

                <div className="fault-footer">
                  <small>
                    Oluşturulma: {new Date(ticket.created_at).toLocaleString('tr-TR')}
                    {ticket.updated_at !== ticket.created_at && (
                      <> | Güncelleme: {new Date(ticket.updated_at).toLocaleString('tr-TR')}</>
                    )}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // YENİ: Değişim Talepleri Komponenti
  const AdminChangeRequests = ({ tickets, onUpdateStatus }) => {
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const changeTickets = tickets.filter(ticket => ticket.type === 'degisim');

    const filteredTickets = changeTickets.filter(ticket => {
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ticket.product_name && ticket.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesStatus && matchesPriority && matchesSearch;
    });

    const getStatusLabel = (status) => {
      const labels = {
        open: '🔴 Beklemede',
        in_progress: '🟡 Değerlendiriliyor',
        closed: '🟢 Tamamlandı'
      };
      return labels[status] || status;
    };

    const getPriorityLabel = (priority) => {
      const labels = {
        low: '🟢 Düşük',
        normal: '🟡 Normal',
        high: '🟠 Yüksek',
        urgent: '🔴 Acil'
      };
      return labels[priority] || priority;
    };

    const getStatusStats = () => {
      return {
        total: changeTickets.length,
        open: changeTickets.filter(t => t.status === 'open').length,
        inProgress: changeTickets.filter(t => t.status === 'in_progress').length,
        closed: changeTickets.filter(t => t.status === 'closed').length
      };
    };

    const stats = getStatusStats();

    return (
      <div className="admin-change-requests">
        <div className="change-requests-header">
          <h3>🔄 Değişim Talepleri ({changeTickets.length})</h3>
          
          {/* İstatistikler */}
          <div className="change-stats-grid">
            <div className="change-stat-item total">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Toplam</span>
            </div>
            <div className="change-stat-item pending">
              <span className="stat-number">{stats.open}</span>
              <span className="stat-label">Beklemede</span>
            </div>
            <div className="change-stat-item review">
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">Değerlendiriliyor</span>
            </div>
            <div className="change-stat-item completed">
              <span className="stat-number">{stats.closed}</span>
              <span className="stat-label">Tamamlandı</span>
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="change-filters">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Değişim talebi ara... (başlık, kullanıcı, ürün)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="open">Beklemede</option>
              <option value="in_progress">Değerlendiriliyor</option>
              <option value="closed">Tamamlandı</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="urgent">Acil</option>
              <option value="high">Yüksek</option>
              <option value="normal">Normal</option>
              <option value="low">Düşük</option>
            </select>
          </div>
        </div>

        {/* Değişim Talepleri Listesi */}
        {filteredTickets.length === 0 ? (
          <div className="no-data">
            {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
              ? 'Filtrelere uygun değişim talebi bulunamadı.' 
              : 'Henüz hiç değişim talebi bulunmuyor.'}
          </div>
        ) : (
          <div className="change-tickets-list">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className={`change-ticket-card priority-${ticket.priority} status-${ticket.status}`}>
                <div className="change-ticket-header">
                  <div className="change-info">
                    <h4>{ticket.title}</h4>
                    <div className="change-meta">
                      <span className="change-user">👤 {ticket.user_email}</span>
                      <span className="change-date">📅 {new Date(ticket.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="change-badges">
                    <span className={`priority-badge ${ticket.priority}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span className={`status-badge ${ticket.status}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                </div>

                {ticket.product_name && (
                  <div className="change-product">
                    <strong>🔄 İlgili Ürün:</strong> {ticket.product_name} ({ticket.product_code})
                  </div>
                )}

                <div className="change-description">
                  <strong>📝 Talep Açıklaması:</strong>
                  <p>{ticket.description}</p>
                </div>

                <div className="change-actions">
                  <div className="status-update">
                    <label>Durum Güncelle:</label>
                    <div className="status-buttons">
                      <button 
                        onClick={() => onUpdateStatus(ticket.id, 'open')}
                        className={`btn-status-change ${ticket.status === 'open' ? 'active' : ''}`}
                      >
                        🔴 Beklemede
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(ticket.id, 'in_progress')}
                        className={`btn-status-change ${ticket.status === 'in_progress' ? 'active' : ''}`}
                      >
                        🟡 Değerlendir
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(ticket.id, 'closed')}
                        className={`btn-status-change ${ticket.status === 'closed' ? 'active' : ''}`}
                      >
                        🟢 Tamamla
                      </button>
                    </div>
                  </div>
                </div>

                <div className="change-footer">
                  <small>
                    Oluşturulma: {new Date(ticket.created_at).toLocaleString('tr-TR')}
                    {ticket.updated_at !== ticket.created_at && (
                      <> | Güncelleme: {new Date(ticket.updated_at).toLocaleString('tr-TR')}</>
                    )}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="admin-dashboard">
        <h2>Yönetici Paneli</h2>
        
        {/* Admin Tabs - Güncellenmiş */}
        <div className="admin-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            📊 Genel Bakış
          </button>
          <button 
            className={activeTab === 'tickets' ? 'active' : ''}
            onClick={() => setActiveTab('tickets')}
          >
            🎫 Tüm Talepler
          </button>
          <button 
            className={activeTab === 'fault-reports' ? 'active' : ''}
            onClick={() => setActiveTab('fault-reports')}
          >
            🔧 Arıza Kayıtları
          </button>
          <button 
            className={activeTab === 'change-requests' ? 'active' : ''}
            onClick={() => setActiveTab('change-requests')}
          >
            🔄 Değişim Talepleri
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            👥 Kullanıcılar
          </button>
          <button 
            className={activeTab === 'inventory' ? 'active' : ''}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Envanter
          </button>
          <button 
            className={activeTab === 'count-period' ? 'active' : ''}
            onClick={() => setActiveTab('count-period')}
          >
            📅 Sayım Periyodu
          </button>
          <button 
            className={activeTab === 'count-results' ? 'active' : ''}
            onClick={() => setActiveTab('count-results')}
          >
            📈 Sayım Sonuçları
          </button>
        </div>

        {/* Tab İçerikleri */}
        {activeTab === 'overview' && (
          <div className="admin-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{stats.totalTickets}</h3>
                <p>Toplam Talep</p>
              </div>
              <div className="stat-card">
                <h3>{stats.openTickets}</h3>
                <p>Açık Talep</p>
              </div>
              <div className="stat-card fault-stat">
                <h3>{stats.faultReports}</h3>
                <p>Arıza Kaydı</p>
              </div>
              <div className="stat-card change-stat">
                <h3>{stats.changeRequests}</h3>
                <p>Değişim Talebi</p>
              </div>
              <div className="stat-card">
                <h3>{stats.totalUsers}</h3>
                <p>Toplam Kullanıcı</p>
              </div>
              <div className="stat-card">
                <h3>{stats.totalInventory}</h3>
                <p>Toplam Ürün</p>
              </div>
            </div>
            
            <div className="recent-activities">
              <div className="recent-faults">
                <h3>Son Arıza Kayıtları</h3>
                {tickets.filter(t => t.type === 'ariza').slice(0, 3).map(ticket => (
                  <div key={ticket.id} className="activity-item fault-item">
                    <span className="activity-icon">🔧</span>
                    <div className="activity-content">
                      <span className="activity-title">{ticket.title}</span>
                      <span className="activity-user">{ticket.user_email}</span>
                      <span className={`activity-status status-${ticket.status}`}>
                        {ticket.status === 'open' ? 'Açık' : ticket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="recent-changes">
                <h3>Son Değişim Talepleri</h3>
                {tickets.filter(t => t.type === 'degisim').slice(0, 3).map(ticket => (
                  <div key={ticket.id} className="activity-item change-item">
                    <span className="activity-icon">🔄</span>
                    <div className="activity-content">
                      <span className="activity-title">{ticket.title}</span>
                      <span className="activity-user">{ticket.user_email}</span>
                      <span className={`activity-status status-${ticket.status}`}>
                        {ticket.status === 'open' ? 'Beklemede' : ticket.status === 'in_progress' ? 'Değerlendiriliyor' : 'Tamamlandı'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <AdminTickets 
            tickets={tickets} 
            onUpdateStatus={updateTicketStatus}
          />
        )}

        {/* YENİ: Arıza Kayıtları Tab'ı */}
        {activeTab === 'fault-reports' && (
          <AdminFaultReports 
            tickets={tickets} 
            onUpdateStatus={updateTicketStatus}
          />
        )}

        {/* YENİ: Değişim Talepleri Tab'ı */}
        {activeTab === 'change-requests' && (
          <AdminChangeRequests 
            tickets={tickets} 
            onUpdateStatus={updateTicketStatus}
          />
        )}

        {activeTab === 'users' && (
          <AdminUsers 
            users={users} 
            onAddUser={addUser}
          />
        )}

        {activeTab === 'inventory' && (
          <AdminInventory 
            inventory={inventory}
            users={users}
            onAddItem={addInventoryItem}
            onUpdateItem={updateInventoryItem}
            onDeleteItem={deleteInventoryItem}
          />
        )}

       

        {activeTab === 'count-period' && (
          <AdminCountPeriod token={token} />
        )}

        {/* YENİ: Sayım Sonuçları Tab'ı */}
        {activeTab === 'count-results' && (
          <AdminCountResults token={token} />
        )}
      </div>
    </div>
  );
};

// Admin Tickets Component
const AdminTickets = ({ tickets, onUpdateStatus }) => {
  const getStatusLabel = (status) => {
    const labels = {
      open: '🔴 Açık',
      in_progress: '🟡 İşlemde',
      closed: '🟢 Kapalı'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type) => {
    const labels = {
      ariza: '🔧 Arıza',
      sayim: '📊 Sayım',
      degisim: '🔄 Değişim',
      genel: '✉️ Genel'
    };
    return labels[type] || type;
  };

  return (
    <div className="admin-tickets">
      <h3>Tüm Talepler ({tickets.length})</h3>
      
      {tickets.length === 0 ? (
        <div className="no-data">Henüz hiç talep bulunmuyor.</div>
      ) : (
        <div className="tickets-table">
          {tickets.map(ticket => (
            <div key={ticket.id} className="admin-ticket-card">
              <div className="ticket-info">
                <h4>{ticket.title}</h4>
                <p><strong>Kullanıcı:</strong> {ticket.user_email}</p>
                <p><strong>Tür:</strong> {getTypeLabel(ticket.type)}</p>
                {ticket.product_name && (
                  <p><strong>İlgili Ürün:</strong> {ticket.product_name} ({ticket.product_code})</p>
                )}
                <p><strong>Açıklama:</strong> {ticket.description}</p>
                <p><strong>Tarih:</strong> {new Date(ticket.created_at).toLocaleString('tr-TR')}</p>
              </div>
              
              <div className="ticket-actions">
                <div className="current-status">
                  <strong>Durum:</strong> {getStatusLabel(ticket.status)}
                </div>
                
                <div className="status-buttons">
                  <button 
                    onClick={() => onUpdateStatus(ticket.id, 'open')}
                    className={`btn-status ${ticket.status === 'open' ? 'active' : ''}`}
                  >
                    Aç
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(ticket.id, 'in_progress')}
                    className={`btn-status ${ticket.status === 'in_progress' ? 'active' : ''}`}
                  >
                    İşlemde
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(ticket.id, 'closed')}
                    className={`btn-status ${ticket.status === 'closed' ? 'active' : ''}`}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Users Component
const AdminUsers = ({ users, onAddUser }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', role: 'user' });
  const [message, setMessage] = useState('');

  const handleAddUser = async (e) => {
    e.preventDefault();
    const success = await onAddUser(newUser.email, newUser.role);
    
    if (success) {
      setMessage('Kullanıcı başarıyla eklendi!');
      setNewUser({ email: '', role: 'user' });
      setShowAddForm(false);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Kullanıcı eklenirken hata oluştu!');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Kullanıcı rolü başarıyla güncellendi!');
        setEditingUser(null);
        // Refresh users list
        window.location.reload();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Rol güncellenirken hata oluştu!');
      }
    } catch (error) {
      setMessage('Bağlantı hatası!');
    }
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Kullanıcı ${newStatus ? 'aktif' : 'pasif'} edildi!`);
        // Refresh users list
        window.location.reload();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Durum güncellenirken hata oluştu!');
      }
    } catch (error) {
      setMessage('Bağlantı hatası!');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setMessage('Kullanıcı başarıyla silindi!');
          // Refresh users list
          window.location.reload();
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage(data.error || 'Kullanıcı silinirken hata oluştu!');
        }
      } catch (error) {
        setMessage('Bağlantı hatası!');
      }
    }
  };

  return (
    <div className="admin-users">
      <div className="users-header">
        <h3>Kullanıcılar ({users.length})</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          + Kullanıcı Ekle
        </button>
      </div>

      {showAddForm && (
        <div className="add-user-form">
          <h4>Yeni Kullanıcı Ekle</h4>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <input
                type="email"
                placeholder="Email adresi"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Ekle</button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Form */}
      {editingUser && (
        <div className="edit-user-form">
          <h4>Kullanıcı Düzenle</h4>
          <div className="user-edit-info">
            <p><strong>Email:</strong> {editingUser.email}</p>
            <div className="form-group">
              <label>Rol:</label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            <div className="form-actions">
              <button 
                onClick={() => handleUpdateRole(editingUser.id, editingUser.role)}
                className="btn-primary"
              >
                Rolü Güncelle
              </button>
              <button 
                onClick={() => setEditingUser(null)}
                className="btn-secondary"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h4>{user.email}</h4>
              <p>Rol: {user.role === 'admin' ? '👑 Yönetici' : '👤 Kullanıcı'}</p>
              <p>Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}</p>
              <div className="user-status">
                {user.is_active ? '🟢 Aktif' : '🔴 Pasif'}
              </div>
            </div>
            <div className="user-actions">
              <button 
                onClick={() => setEditingUser(user)}
                className="btn-secondary"
                title="Rolü Düzenle"
              >
                ✏️ Düzenle
              </button>
              <button 
                onClick={() => handleUpdateStatus(user.id, !user.is_active)}
                className={user.is_active ? 'btn-warning' : 'btn-success'}
                title={user.is_active ? 'Pasif Et' : 'Aktif Et'}
              >
                {user.is_active ? '⏸️ Pasif Et' : '▶️ Aktif Et'}
              </button>
              <button 
                onClick={() => handleDeleteUser(user.id)}
                className="btn-danger"
                title="Kullanıcıyı Sil"
              >
                🗑️ Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



export default App;