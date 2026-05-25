// 🌟 روابط قاعدة البيانات (جوجل شيت) 🌟
const PRODUCTS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?output=csv";
const COUPONS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?gid=793714854&single=true&output=csv"; 

let productsDB = [];
let categories = [];
let couponsDB = {};

let cart = JSON.parse(localStorage.getItem('daralfath_cart')) || [];
let currentProduct = null;
let currentVersionIndex = 0; 
let appliedCoupon = null; 
const baseTitle = "دار الفتح للنشر والتوزيع عمان";
let wishlist = JSON.parse(localStorage.getItem('daralfath_wishlist')) || [];

function saveCartToMemory() { localStorage.setItem('daralfath_cart', JSON.stringify(cart)); }

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                    type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-brand-dark border-blue-200';
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
                 type === 'error' ? '<i class="fas fa-heart-broken"></i>' : '<i class="fas fa-info-circle"></i>';

    toast.className = `toast-enter flex items-center justify-center gap-3 px-6 py-3 rounded-full shadow-lg border text-sm font-bold whitespace-nowrap absolute left-1/2 -translate-x-1/2 ${bgColor} z-[100]`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-leave');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 🎟️ دالة تطبيق الكوبون المطورة
// ==========================================
function applyCoupon() {
    const codeInput = document.getElementById('coupon-input');
    const code = codeInput.value.trim().toUpperCase(); 
    let total = cart.reduce((sum, item) => sum + (item.cartPrice * item.qty), 0);

    if (code === '') {
        appliedCoupon = null; 
        showToast('تم إزالة الكوبون', 'info');
    } else if (couponsDB[code] && couponsDB[code].isActive) {
        if (total < couponsDB[code].min_cart) {
            showToast(`هذا الكود يعمل للطلبات فوق ${couponsDB[code].min_cart} ر.ع`, 'error');
            appliedCoupon = null;
        } else {
            appliedCoupon = { code: code, type: couponsDB[code].type, value: couponsDB[code].value, min_cart: couponsDB[code].min_cart };
            let discountMsg = couponsDB[code].type === 'percentage' ? `${couponsDB[code].value}%` : `${couponsDB[code].value} ر.ع.`;
            showToast(`تم تطبيق كود الخصم (${discountMsg}) بنجاح! 🎉`, 'success');
        }
    } else if (code === 'FATH15') {
        appliedCoupon = { code: 'FATH15', type: 'percentage', value: 15, min_cart: 0 };
        showToast('تم تطبيق كود الخصم (15%) بنجاح! 🎉', 'success');
    } else {
        appliedCoupon = null; 
        showToast('كود الخصم غير صحيح أو منتهي الصلاحية ⚠️', 'error'); 
        codeInput.value = ''; 
    }
    openCart(); 
}

function toggleWishlist(id, event) {
    if(event) event.stopPropagation(); 
    const index = wishlist.indexOf(id);
    if(index > -1) {
        wishlist.splice(index, 1); showToast('تمت إزالة الكتاب من المفضلة', 'error');
    } else {
        wishlist.push(id); showToast('تمت إضافة الكتاب للمفضلة ❤️', 'success');
    }
    localStorage.setItem('daralfath_wishlist', JSON.stringify(wishlist));
    
    document.querySelectorAll(`.heart-icon-${id}`).forEach(icon => {
        if (wishlist.includes(id)) {
            icon.classList.remove('text-gray-300'); icon.classList.add('text-red-500');
        } else {
            icon.classList.remove('text-red-500'); icon.classList.add('text-gray-300');
        }
    });
    if (document.getElementById('wishlist-page').classList.contains('active')) showWishlistPage();
}

function showWishlistPage() {
    const grid = document.getElementById('wishlist-products-grid');
    const emptyMsg = document.getElementById('wishlist-empty-msg');
    grid.innerHTML = '';
    
    const likedProducts = productsDB.filter(p => wishlist.includes(p.id));

    if (likedProducts.length > 0) {
        emptyMsg.classList.add('hidden');
        likedProducts.forEach(p => { grid.innerHTML += createBookCard(p); });
    } else { 
        emptyMsg.classList.remove('hidden'); 
        if (wishlist.length > 0) {
            wishlist = [];
            localStorage.setItem('daralfath_wishlist', JSON.stringify(wishlist));
            document.querySelectorAll('.fa-heart').forEach(icon => {
                if(icon.classList.contains('text-red-500') && !icon.closest('h2')) {
                    icon.classList.remove('text-red-500');
                    icon.classList.add('text-gray-300');
                }
            });
        }
    }
    navigateTo('wishlist-page');
}

function shareProduct() {
    if(!currentProduct) return;
    const text = `شاهد هذا الكتاب الرائع من متجر دار الفتح 📚\n*${currentProduct.title}*\n\nتصفح المتجر الآن: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function performSearch() {
    const query = document.getElementById('search-input').value;
    liveSearch(query);
    closeModal('search-modal');
    document.getElementById('home-books').scrollIntoView({behavior: 'smooth'});
}

function liveSearch(query) {
    const container = document.getElementById('all-products-grid');
    if (!container) return;
    container.innerHTML = '';
    
    if (query.trim() === '') {
        container.className = "flex flex-col gap-6 md:gap-8"; 
        let booksFound = false;

        categories.forEach(cat => {
            const catProducts = productsDB.filter(p => p.seriesId && p.seriesId.split(',').map(s => s.trim()).includes(cat.id));
            if(catProducts.length > 0) {
                booksFound = true;
                let sectionHTML = `
                <div class="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div class="flex items-center justify-between mb-5 relative z-10">
                        <h2 class="text-lg md:text-2xl font-black text-brand-dark flex items-center gap-2">
                            <span class="w-8 h-8 bg-blue-50 text-brand-light rounded-full flex items-center justify-center"><i class="fas fa-layer-group text-sm"></i></span>
                            ${cat.name}
                        </h2>
                        <button onclick="showSeries('${cat.id}', '${cat.name}')" class="text-xs md:text-sm font-bold text-brand-light hover:text-white hover:bg-brand-light bg-blue-50 px-4 py-2 rounded-full transition-all flex items-center gap-1">
                            عرض الكل <i class="fas fa-chevron-left text-[10px]"></i>
                        </button>
                    </div>
                    <div class="flex gap-4 overflow-x-auto hide-scroll snap-x pb-4 pt-2 px-2">
                `;
                
                catProducts.forEach(p => {
                    let cardHTML = createBookCard(p);
                    cardHTML = cardHTML.replace('class="book-card', 'class="book-card min-w-[170px] md:min-w-[220px] max-w-[170px] md:max-w-[220px] snap-start shrink-0');
                    sectionHTML += cardHTML;
                });

                sectionHTML += `</div></div>`;
                container.innerHTML += sectionHTML;
            }
        });

        if(!booksFound) container.innerHTML = `<div class="text-center py-16 text-gray-400 font-bold bg-white rounded-3xl border border-dashed border-gray-300">جاري التحميل...</div>`;

    } else {
        container.className = "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6";
        const filtered = productsDB.filter(p => p.title.includes(query) || p.seriesName.includes(query));
        if(filtered.length === 0) {
            container.innerHTML = `<div class="col-span-2 md:col-span-4 lg:col-span-5 text-center py-10 text-gray-400 font-bold bg-white rounded-3xl border border-dashed border-gray-200">لا توجد نتائج مطابقة لبحثك.</div>`;
        } else {
            filtered.forEach(p => container.innerHTML += createBookCard(p));
        }
    }
}

function navigateTo(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if(targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'home-page') {
        document.title = baseTitle; 
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = ''; 
        liveSearch(''); 
    } else if (pageId === 'series-page') {
        updatePageTitle(document.getElementById('series-title-text').innerText);
    } else if (pageId === 'wishlist-page') {
        updatePageTitle("قائمة الإعجابات ❤️");
    } else if (pageId === 'contact-page') {
        updatePageTitle("تواصل معنا");
    } else if (pageId === 'terms-page') {
        updatePageTitle("الشروط والأحكام");
    }
}

function updatePageTitle(pageName) { document.title = `${pageName} | ${baseTitle}`; }

function showSeries(targetSeriesId, seriesName) {
    document.getElementById('series-title-text').innerText = seriesName;
    const seriesGrid = document.getElementById('series-products-grid');
    const emptyMsg = document.getElementById('series-empty-msg');
    seriesGrid.innerHTML = '';
    
    const filtered = productsDB.filter(p => p.seriesId && p.seriesId.split(',').map(s => s.trim()).includes(targetSeriesId.trim()));
    
    if (filtered.length > 0) {
        emptyMsg.classList.add('hidden'); 
        filtered.forEach(p => { seriesGrid.innerHTML += createBookCard(p); });
    } else { 
        emptyMsg.classList.remove('hidden'); 
    }
    navigateTo('series-page');
}

function getActionHTML(p) {
    if (p.hasOwnProperty('inStock') && p.inStock === false) {
        return `<button disabled class="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-auto cursor-not-allowed border border-gray-200">نفذت الكمية <i class="fas fa-ban"></i></button>`;
    }
    if (p.versions) {
        return `<button onclick="openProduct(${p.id}); event.stopPropagation();" class="w-full bg-brand-light text-white py-3 rounded-xl font-bold hover:bg-brand-dark hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 mt-auto shadow-md">اختر النسخة <i class="fas fa-list-ul"></i></button>`;
    }
    const item = cart.find(i => i.cartKey === p.id.toString());
    if (item) {
        return `<div class="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-xl p-1.5 w-full mt-auto"><button onclick="updateCartQty('${item.cartKey}', -1, event)" class="w-10 h-10 bg-white border border-blue-200 rounded-lg shadow-sm font-bold text-brand-dark hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fas ${item.qty === 1 ? 'fa-trash-alt text-sm' : 'fa-minus'}"></i></button><span class="text-xl font-black w-8 text-center text-brand-dark">${item.qty}</span><button onclick="updateCartQty('${item.cartKey}', 1, event)" class="w-10 h-10 bg-brand-dark text-white rounded-lg shadow-md font-bold hover:bg-brand-light transition flex items-center justify-center"><i class="fas fa-plus"></i></button></div>`;
    } else {
        return `<button onclick="addToCartById(${p.id}, null, event)" class="w-full bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-brand-light hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 mt-auto shadow-md">أضف للسلة <i class="fas fa-cart-plus"></i></button>`;
    }
}

function getModalActionHTML(p) {
    if (p.hasOwnProperty('inStock') && p.inStock === false) {
        return `<button disabled class="w-full bg-gray-100 text-gray-400 py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-auto cursor-not-allowed border border-gray-200 text-lg">هذا الكتاب غير متوفر حالياً <i class="fas fa-ban"></i></button>`;
    }

    const version = p.versions ? p.versions[currentVersionIndex] : null;
    const cartKey = version ? `${p.id}-${version.name}` : p.id.toString();
    const item = cart.find(i => i.cartKey === cartKey);
    
    if (item) {
        return `<div class="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-xl p-2 w-full mt-auto"><button onclick="updateCartQty('${cartKey}', -1, event)" class="w-12 h-12 bg-white border border-blue-200 rounded-lg shadow-sm font-bold text-brand-dark hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center text-lg"><i class="fas ${item.qty === 1 ? 'fa-trash-alt' : 'fa-minus'}"></i></button><span class="text-2xl font-black w-10 text-center text-brand-dark">${item.qty}</span><button onclick="updateCartQty('${cartKey}', 1, event)" class="w-12 h-12 bg-brand-dark text-white rounded-lg shadow-md font-bold hover:bg-brand-light transition flex items-center justify-center text-lg"><i class="fas fa-plus"></i></button></div>`;
    } else {
        return `<button onclick="addToCartById(${p.id}, ${currentVersionIndex}, event)" class="w-full bg-brand-dark text-white py-4 rounded-xl font-bold hover:bg-brand-light hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 mt-auto shadow-md text-lg">أضف للسلة <i class="fas fa-cart-plus"></i></button>`;
    }
}

function refreshAllProductActions() {
    document.querySelectorAll('.book-card').forEach(card => {
        const idAttr = card.getAttribute('data-id');
        if(idAttr) {
            const p = productsDB.find(x => x.id == idAttr);
            const container = card.querySelector('.action-container');
            if(container && p) container.innerHTML = getActionHTML(p);
        }
    });
    if (currentProduct) {
        const modalContainer = document.getElementById('modal-action-container');
        if (modalContainer) modalContainer.innerHTML = getModalActionHTML(currentProduct);
    }
}

function createBookCard(p) {
    const imgSrc = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/300x450/1c3d8a/ffffff?text=Book';
    const isWished = wishlist.includes(p.id);
    
    const badgeHTML = p.hasOwnProperty('inStock') && p.inStock === false ? 
        `<span class="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">نفذت الكمية</span>` : 
        `<span class="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">متاح</span>`;

    const displayPrice = p.versions ? p.versions[0].price : p.price;
    const pricePrefix = p.versions ? '<span class="text-xs text-gray-400 font-normal mr-1">يبدأ من</span> ' : '';

    return `
        <div data-id="${p.id}" onclick="openProduct(${p.id})" class="book-card cursor-pointer bg-white rounded-2xl shadow-[0_5px_15px_rgba(0,0,0,0.04)] border border-gray-100 p-4 flex flex-col items-center text-center relative h-full hover:-translate-y-2 hover:shadow-2xl hover:border-blue-100 transition-all duration-300">
            
            <div class="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">${badgeHTML}</div>

            <button onclick="toggleWishlist(${p.id}, event)" class="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow flex items-center justify-center hover:bg-red-50 transition">
                <i class="heart-icon-${p.id} fas fa-heart text-lg ${isWished ? 'text-red-500' : 'text-gray-300'} hover:scale-110 transition-transform"></i>
            </button>

            <div class="w-full bg-gray-50 rounded-xl mb-4 p-3 flex justify-center relative overflow-hidden group">
                <img src="${imgSrc}" class="h-40 object-contain drop-shadow-md group-hover:scale-110 transition duration-500 rounded" onerror="this.src='https://via.placeholder.com/300x450/1c3d8a/ffffff?text=Book'">
            </div>
            <p class="text-[10px] text-brand-light font-bold mb-1 px-2 py-0.5 bg-blue-50 rounded-full truncate w-full">${p.seriesName}</p>
            <h3 class="text-sm md:text-base font-black text-gray-800 line-clamp-2 mb-2 hover:text-brand-light transition min-h-[40px]">${p.title}</h3>
            <div class="text-yellow-400 text-[10px] mb-2"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
            <p class="text-brand-dark font-black text-xl mb-4 mt-auto">${pricePrefix}${displayPrice} <span class="text-xs font-bold text-gray-500">ر.ع.</span></p>
            
            <div class="w-full action-container" onclick="event.stopPropagation()">${getActionHTML(p)}</div>
        </div>
    `;
}

function renderVersionsUI() {
    const container = document.getElementById('modal-versions-container');
    if(currentProduct.versions && currentProduct.versions.length > 0) {
        container.innerHTML = currentProduct.versions.map((v, idx) => `
            <button onclick="selectVersion(${idx})" class="px-5 py-2 border-2 rounded-xl font-bold text-sm transition hover:scale-105 active:scale-95 ${currentVersionIndex === idx ? 'border-brand-dark bg-brand-dark text-white shadow-md' : 'border-gray-200 text-gray-600 hover:border-brand-light'}">${v.name}</button>
        `).join('');
        container.classList.remove('hidden');
        document.getElementById('modal-price').innerText = currentProduct.versions[currentVersionIndex].price + ' ر.ع.';
    } else {
        container.classList.add('hidden');
        document.getElementById('modal-price').innerText = currentProduct.price + ' ر.ع.';
    }
    document.getElementById('modal-action-container').innerHTML = getModalActionHTML(currentProduct);
}

function selectVersion(idx) {
    currentVersionIndex = idx; renderVersionsUI();
}

function openProduct(id) {
    currentProduct = productsDB.find(p => p.id === id);
    currentVersionIndex = 0; 
    updatePageTitle(currentProduct.title);

    const mainImgSrc = currentProduct.images && currentProduct.images.length > 0 ? currentProduct.images[0] : 'https://via.placeholder.com/300x450/1c3d8a/ffffff?text=Book';
    document.getElementById('modal-img').src = mainImgSrc;
    
    const thumbnailsContainer = document.getElementById('modal-thumbnails');
    thumbnailsContainer.innerHTML = '';
    if(currentProduct.images && currentProduct.images.length > 1) {
        currentProduct.images.forEach((imgSrc, idx) => {
            thumbnailsContainer.innerHTML += `<img src="${imgSrc}" onclick="changeMainImage(event, '${imgSrc}')" class="w-14 h-14 object-cover rounded-lg bg-white p-1 shadow-sm thumbnail-img cursor-pointer hover:border-brand-light border-2 ${idx === 0 ? 'border-brand-dark active' : 'border-transparent'}">`;
        });
    }

    document.getElementById('modal-series').innerText = currentProduct.seriesName;
    document.getElementById('modal-title').innerText = currentProduct.title;
    document.getElementById('modal-desc').innerHTML = currentProduct.desc ? currentProduct.desc.replace(/\n/g, '<br>') : 'لا يوجد تفاصيل إضافية لهذا الكتاب.';
    
    renderVersionsUI(); 
    
    const relatedBooks = productsDB.filter(p => p.seriesId === currentProduct.seriesId && p.id !== id).slice(0, 4);
    const relatedContainer = document.getElementById('modal-related-books');
    const relatedSection = document.getElementById('modal-related-section');
    
    if(relatedBooks.length > 0) {
        relatedSection.classList.remove('hidden');
        relatedContainer.innerHTML = relatedBooks.map(p => {
            const img = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/300x450/1c3d8a/ffffff';
            return `
                <div onclick="openProduct(${p.id})" class="min-w-[100px] w-[100px] bg-white border border-gray-100 rounded-xl p-2 text-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all">
                    <img src="${img}" class="h-20 w-full object-contain mx-auto mb-2 rounded" onerror="this.src='https://via.placeholder.com/300x450/1c3d8a/ffffff'">
                    <h4 class="text-[9px] font-bold text-gray-800 line-clamp-2 leading-tight">${p.title}</h4>
                </div>
            `;
        }).join('');
    } else {
        relatedSection.classList.add('hidden');
    }

    openModal('product-modal');
}

function closeProductModal() {
    closeModal('product-modal');
    if(document.getElementById('home-page').classList.contains('active')) {
        document.title = baseTitle;
    } else if (document.getElementById('series-page').classList.contains('active')) {
        updatePageTitle(document.getElementById('series-title-text').innerText);
    } else if (document.getElementById('wishlist-page').classList.contains('active')) {
        updatePageTitle("قائمة الإعجابات ❤️");
    }
}

function changeMainImage(event, src) {
    document.getElementById('modal-img').src = src;
    document.querySelectorAll('.thumbnail-img').forEach(el => el.classList.remove('border-brand-dark', 'active'));
    event.target.classList.add('border-brand-dark', 'active');
}

function openFullscreenImage() {
    const src = document.getElementById('modal-img').src;
    document.getElementById('fullscreen-img').src = src;
    openModal('image-viewer-modal');
}

function animateCartIcon() {
    const cartBtnIcon = document.getElementById('cart-btn-icon');
    if (cartBtnIcon) {
        cartBtnIcon.classList.add('animate-shake');
        setTimeout(() => cartBtnIcon.classList.remove('animate-shake'), 500);
    }
}

function updateCartQty(cartKey, change, event) {
    if(event) event.stopPropagation();
    const item = cart.find(i => i.cartKey === cartKey);
    
    if (item) { 
        const p = productsDB.find(x => x.id === item.id);
        
        if (change > 0 && p && item.qty >= p.stock) {
            showToast(`عذراً، المتاح لدينا هو (${p.stock}) فقط من هذا الكتاب`, 'error');
            return;
        }

        item.qty += change; 
        if (item.qty <= 0) cart = cart.filter(i => i.cartKey !== cartKey); 
    }
    
    saveCartToMemory(); updateCartIcon(); refreshAllProductActions();
    if(document.getElementById('cart-drawer') && document.getElementById('cart-drawer').classList.contains('translate-x-0')) openCart();
}

function addToCartById(id, versionIdx = null, event) {
    if(event) event.stopPropagation();
    const p = productsDB.find(x => x.id === id);
    
    if(p.hasOwnProperty('inStock') && p.inStock === false) return; 
    if(p.stock <= 0) {
        showToast('عذراً، هذا الكتاب نفذ من المخزون ⚠️', 'error');
        return;
    }

    const version = (versionIdx !== null && p.versions) ? p.versions[versionIdx] : null;
    const cartKey = version ? `${p.id}-${version.name}` : p.id.toString();
    const cartTitle = version ? `${p.title} (${version.name})` : p.title;
    const cartPrice = version ? version.price : p.price;

    let existingItem = cart.find(i => i.cartKey === cartKey);
    
    if(existingItem) {
        if (existingItem.qty >= p.stock) {
            showToast(`عذراً، المتاح لدينا هو (${p.stock}) فقط من هذا الكتاب`, 'error');
            return;
        }
        existingItem.qty += 1;
    } else {
        cart.push({ ...p, cartKey, cartTitle, cartPrice, qty: 1 });
    }
    
    saveCartToMemory(); animateCartIcon(); showToast(`تم إضافة (${cartTitle}) للسلة 🛒`); 
    updateCartIcon(); refreshAllProductActions();
}

function updateCartIcon() { document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0); }

// ==========================================
// 🛒 دالة السلة المطورة لحساب الخصومات بشكل قاطع
// ==========================================
function openCart() {
    updatePageTitle("سلة المشتريات 🛒");
    const container = document.getElementById('cart-items'); 
    const promoContainer = document.getElementById('cart-promo-banner');
    container.innerHTML = ''; let total = 0; let totalQty = 0;

    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center py-16 text-gray-400"><div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100"><i class="fas fa-shopping-basket text-5xl text-gray-200"></i></div><p class="font-bold text-lg text-brand-dark">سلتك فارغة حالياً</p><p class="text-sm mt-2">تصفح المتجر وأضف بعض الكتب الرائعة!</p></div>';
        document.getElementById('cart-summary-container').innerHTML = ''; 
        promoContainer.innerHTML = `<div class="bg-blue-50 border border-blue-200 text-brand-dark p-3 rounded-xl text-sm font-bold text-center leading-relaxed"><i class="fas fa-gift text-brand-light mr-1 text-lg"></i> عرض خاص:<br> احصل على خصم 10% عند وصول مشترياتك إلى 20 ريال عماني أو أكثر!</div>`;
    } else {
        cart.forEach((item) => {
            total += (item.cartPrice * item.qty); totalQty += item.qty;
            const imgSrc = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/300x450';
            container.innerHTML += `
            <div class="flex gap-4 items-center bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                <div class="w-20 h-24 bg-gray-50 rounded-xl p-1 flex shrink-0 items-center justify-center">
                    <img src="${imgSrc}" class="max-w-full max-h-full object-contain">
                </div>
                <div class="flex-1 flex flex-col justify-between py-1">
                    <p class="font-bold text-gray-800 text-sm md:text-base leading-snug line-clamp-2 mb-1">${item.cartTitle}</p>
                    <p class="text-brand-light font-black mb-3">${item.cartPrice} ر.ع.</p>
                    <div class="flex items-center gap-3 bg-gray-50 w-fit rounded-lg border border-gray-200 p-1">
                        <button onclick="updateCartQty('${item.cartKey}', -1)" class="w-7 h-7 bg-white rounded flex items-center justify-center hover:text-red-500 hover:shadow-sm transition text-gray-600"><i class="fas ${item.qty === 1 ? 'fa-trash text-sm' : 'fa-minus text-xs'}"></i></button>
                        <span class="font-bold text-brand-dark w-6 text-center text-sm">${item.qty}</span>
                        <button onclick="updateCartQty('${item.cartKey}', 1)" class="w-7 h-7 bg-brand-dark text-white rounded flex items-center justify-center hover:bg-brand-light hover:scale-105 active:scale-95 shadow-sm transition"><i class="fas fa-plus text-xs"></i></button>
                    </div>
                </div>
            </div>`;
        });

        // رسائل التنبيه العلوية في السلة بناءً على حالة الكوبون
        if (total < 20 && !appliedCoupon) {
            let needed = (20 - total).toFixed(2);
            promoContainer.innerHTML = `<div class="bg-blue-50 border border-blue-200 text-brand-dark p-3 rounded-xl text-sm font-bold flex flex-col gap-2 shadow-sm"><span class="flex items-center gap-2"><i class="fas fa-bullhorn text-brand-light text-xl"></i> باقي ${needed} ر.ع. لخصم 10%</span></div>`;
        } else if (!appliedCoupon) {
            promoContainer.innerHTML = `<div class="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2"><i class="fas fa-check-circle text-2xl"></i> مبروك! لقد حصلت على خصم 10% التلقائي</div>`;
        } else {
            promoContainer.innerHTML = `<div class="bg-gradient-to-r from-brand-dark to-brand-light text-white p-3 rounded-xl text-sm font-bold shadow-sm flex items-center justify-between gap-2"><span class="flex items-center gap-2"><i class="fas fa-ticket-alt text-2xl text-yellow-300"></i> تم تفعيل كوبون (${appliedCoupon.code})</span> <button onclick="document.getElementById('coupon-input').value=''; applyCoupon();" class="bg-white/20 hover:bg-white/30 text-white rounded-full w-6 h-6 flex items-center justify-center"><i class="fas fa-times"></i></button></div>`;
        }

        let finalDiscountValue = 0; 
        let discountText = "";

        // أولوية مطلقة للكوبون بدون أي تدخل أو مقارنة
        if (appliedCoupon) {
            if(appliedCoupon.type === 'percentage') {
                finalDiscountValue = total * (appliedCoupon.value / 100);
                discountText = `🎟️ كوبون (${appliedCoupon.code} - ${appliedCoupon.value}%):`;
            } else {
                finalDiscountValue = appliedCoupon.value;
                discountText = `🎟️ كوبون (${appliedCoupon.code}):`;
            }
        } else if (total >= 20) {
            // الخصم التلقائي لا يظهر إلا في حالة عدم وجود أي كوبون مطبق
            finalDiscountValue = total * 0.10;
            discountText = `🎁 خصم تلقائي (10%):`;
        }

        let finalTotal = total - finalDiscountValue;
        const summaryContainer = document.getElementById('cart-summary-container');
        let summaryHTML = `<div class="flex justify-between items-center text-sm font-bold text-gray-500 mb-2"><span>المجموع (${totalQty} كتب):</span><span>${total.toFixed(2)} ر.ع.</span></div>`;
        
        if (finalDiscountValue > 0) summaryHTML += `<div class="flex justify-between items-center text-sm font-bold text-green-600 mb-2 bg-green-50 p-2 rounded-lg border border-green-200"><span>${discountText}</span><span>- ${finalDiscountValue.toFixed(2)} ر.ع.</span></div>`;
        
        summaryHTML += `<div class="flex justify-between items-center text-lg font-black text-brand-dark border-t border-gray-100 pt-3 mt-2"><span>الإجمالي النهائي:</span><span>${finalTotal.toFixed(2)} ر.ع.</span></div>`;
        summaryContainer.innerHTML = summaryHTML;

        const codeInput = document.getElementById('coupon-input');
        if(codeInput && appliedCoupon) codeInput.value = appliedCoupon.code;
    }

    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    drawer.classList.remove('-translate-x-full'); drawer.classList.add('translate-x-0');
}

function closeCartModal() {
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    drawer.classList.remove('translate-x-0'); drawer.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0'); setTimeout(() => overlay.classList.add('hidden'), 300);
}

function toggleMenu() { document.getElementById('side-menu').classList.toggle('translate-x-full'); document.getElementById('menu-overlay').classList.toggle('hidden'); }

function toggleSubmenu(id, btn) {
    const submenu = document.getElementById(id); 
    const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');
    
    if (submenu.style.display === 'none' || submenu.style.display === '') {
        submenu.style.display = 'block';
        if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
    } else {
        submenu.style.display = 'none';
        if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
    }
}

const _modalCloseTimers = {};
function openModal(modalId) {
    clearTimeout(_modalCloseTimers[modalId]);
    const el = document.getElementById(modalId);
    el.classList.remove('hidden');
    // setTimeout(16) ≈ one frame — reliable even in background tabs
    setTimeout(() => el.classList.add('modal-open'), 16);
}
function closeModal(modalId) {
    const el = document.getElementById(modalId);
    el.classList.remove('modal-open');
    _modalCloseTimers[modalId] = setTimeout(() => el.classList.add('hidden'), 300);
}
function openVideo(videoUrl) {
    const iframe = document.getElementById('video-iframe');
    if (iframe) iframe.src = videoUrl + "?autoplay=1";
    openModal('video-modal');
}
function closeVideoModal() {
    const iframe = document.getElementById('video-iframe');
    if (iframe) iframe.src = ""; 
    closeModal('video-modal');
}

function validateCheckoutForm() {
    const name = document.getElementById('cust-name'); const phone = document.getElementById('cust-phone'); const address = document.getElementById('cust-address');
    let isValid = true; const fields = [name, phone, address];
    fields.forEach(f => f.classList.remove('border-red-500', 'focus:ring-red-100'));
    if (!name.value.trim()) { name.classList.add('border-red-500', 'focus:ring-red-100'); isValid = false; }
    if (!phone.value.trim()) { phone.classList.add('border-red-500', 'focus:ring-red-100'); isValid = false; }
    if (!address.value.trim()) { address.classList.add('border-red-500', 'focus:ring-red-100'); isValid = false; }
    return isValid;
}

function checkoutWhatsApp() {
    if (cart.length === 0) { alert('السلة فارغة!'); return; }
    if (!validateCheckoutForm()) { showToast('الرجاء إكمال بيانات التوصيل المحددة بالأحمر ⚠️', 'error'); return; }
    const name = document.getElementById('cust-name').value; const phone = document.getElementById('cust-phone').value; const address = document.getElementById('cust-address').value;
    localStorage.setItem('daralfath_customer', JSON.stringify({ name, phone, address }));

    const whatsappNumber = "96899383940"; 
    let message = `*✨ طلب جديد من متجر دار الفتح ✨*\n━━━━━━━━━━━━━━━━━\n👤 *العميل:* ${name}\n📱 *الهاتف:* ${phone}\n📍 *العنوان:* ${address}\n━━━━━━━━━━━━━━━━━\n*📚 تفاصيل الطلب:*\n\n`;
    
    let total = 0;
    cart.forEach((item) => { 
        const itemTotal = item.cartPrice * item.qty; 
        message += `▪️ *${item.cartTitle}*\n   (العدد: ${item.qty} × ${item.cartPrice} = ${itemTotal.toFixed(2)} ر.ع.)\n`; 
        total += itemTotal; 
    });

    let finalDiscountValue = 0; 
    let discountMsg = "";

    // نفس التعديل لرسالة الواتساب: الأولوية المطلقة للكوبون بدون مقارنة
    if (appliedCoupon) {
        if(appliedCoupon.type === 'percentage') {
            finalDiscountValue = total * (appliedCoupon.value / 100);
        } else {
            finalDiscountValue = appliedCoupon.value;
        }
        discountMsg = `🎟️ *كوبون خصم (${appliedCoupon.code}):* - ${finalDiscountValue.toFixed(2)} ر.ع.\n`;
    } else if (total >= 20) {
        finalDiscountValue = total * 0.10; 
        discountMsg = `🎁 *خصم تلقائي (10%):* - ${finalDiscountValue.toFixed(2)} ر.ع.\n`;
    }

    let finalTotal = total - finalDiscountValue;

    message += `━━━━━━━━━━━━━━━━━\n🔖 *المجموع:* ${total.toFixed(2)} ر.ع.\n`;
    if (finalDiscountValue > 0) message += discountMsg;
    message += `💰 *الإجمالي النهائي: ${finalTotal.toFixed(2)} ر.ع.*\n━━━━━━━━━━━━━━━━━\nشكراً لاختياركم دار الفتح للنشر والتوزيع عمان 🤍`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');

    setTimeout(() => {
        cart = []; appliedCoupon = null; saveCartToMemory(); updateCartIcon(); closeCartModal(); refreshAllProductActions();
    }, 2000);
}

window.addEventListener('scroll', () => {
    const btn = document.getElementById('back-to-top');
    if(window.scrollY > 400) btn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-10');
    else btn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-10');
});
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ==========================================
// 🔍 دالة قراءة الإكسيل المطورة (تتجاوز أخطاء الإكسيل)
// ==========================================
async function loadGoogleSheetsData() {
    try {
        const prodRes = await fetch(PRODUCTS_SHEET_URL);
        const prodCSV = await prodRes.text();

        Papa.parse(prodCSV, {
            header: true, skipEmptyLines: true,
            complete: async function(prodResults) {
                const uniqueCategories = new Map();

                productsDB = prodResults.data.map(row => {
                    if(!row.title) return null; 
                    let sId = row.seriesId ? row.seriesId.trim() : 'general';
                    let sName = row.seriesName ? row.seriesName.trim() : 'إصدارات متنوعة';
                    uniqueCategories.set(sId, sName);

                    let availableStock = (row.stock !== undefined && row.stock.trim() !== '') ? parseInt(row.stock) : 1000;

                    let book = {
                        id: parseInt(row.id) || Math.floor(Math.random() * 10000),
                        seriesId: sId, seriesName: sName, title: row.title,
                        price: parseFloat(row.price) || parseFloat(row.Price) || 0,
                        desc: row.desc || '', images: row.images ? row.images.split(',').map(i => i.trim()) : [],
                        inStock: row.inStock ? row.inStock.toUpperCase() !== 'FALSE' : true,
                        stock: availableStock 
                    };

                    if (book.stock <= 0) book.inStock = false;

                    let priceA4Val = parseFloat(row.priceA4);
                    if (row.priceA4 && row.priceA4.trim() !== '' && !isNaN(priceA4Val) && priceA4Val > 0) {
                        book.versions = [{ name: 'نسخة عادية', price: book.price }, { name: 'نسخة A4', price: priceA4Val }];
                    }
                    
                    return book;
                }).filter(item => item !== null);

                categories = Array.from(uniqueCategories, ([id, name]) => ({ id, name }));

                if (COUPONS_SHEET_URL !== "") {
                    try {
                        const coupRes = await fetch(COUPONS_SHEET_URL); const coupCSV = await coupRes.text();
                        Papa.parse(coupCSV, {
                            header: true, skipEmptyLines: true,
                            complete: function(coupResults) {
                                coupResults.data.forEach(row => {
                                    // هنا السر في تخطي مشاكل الإكسيل: بننظف أسماء العواميد من أي مسافات
                                    const cleanRow = {};
                                    for(let key in row) {
                                        cleanRow[key.trim().toLowerCase()] = row[key];
                                    }

                                    if (!cleanRow.code) return; 

                                    let code = cleanRow.code.toString().trim().toUpperCase();
                                    
                                    couponsDB[code] = { 
                                        type: cleanRow.type ? cleanRow.type.toString().trim().toLowerCase() : 'percentage',
                                        value: parseFloat(cleanRow.value) || parseFloat(cleanRow.discount) || 0,
                                        min_cart: parseFloat(cleanRow.min_cart) || 0,
                                        isActive: cleanRow.active ? cleanRow.active.toString().toUpperCase() !== 'FALSE' : true 
                                    };
                                });
                                finishInit();
                            }
                        });
                    } catch(e) { console.log(e); finishInit(); }
                } else { finishInit(); }
            }
        });
    } catch (error) { console.error("خطأ:", error); }
}

function finishInit() {
    // Move 'english' (منهج اللغة الإنجليزية) to appear right after 'fath-moalem' (كتب المعلم)
    const _moalemIdx = categories.findIndex(c => c.id === 'fath-moalem');
    const _engIdx    = categories.findIndex(c => c.id === 'english');
    if (_moalemIdx > -1 && _engIdx > -1) {
        const [_eng] = categories.splice(_engIdx, 1);
        categories.splice(categories.findIndex(c => c.id === 'fath-moalem') + 1, 0, _eng);
    }

    renderSmartFilters();
    renderFathRabbaniSlider(); 
    navigateTo('home-page'); 
    
    document.querySelectorAll('.submenu').forEach(sub => {
        sub.style.display = 'none';
    });
    
    updateCartIcon();
    const savedCustomer = JSON.parse(localStorage.getItem('daralfath_customer'));
    if (savedCustomer) {
        if (savedCustomer.name) document.getElementById('cust-name').value = savedCustomer.name;
        if (savedCustomer.phone) document.getElementById('cust-phone').value = savedCustomer.phone;
        if (savedCustomer.address) document.getElementById('cust-address').value = savedCustomer.address;
    }
    if(cart.length > 0) setTimeout(refreshAllProductActions, 100);
}

document.addEventListener('DOMContentLoaded', () => { loadGoogleSheetsData(); });

// ==========================================
// 🎯 برمجة الفلاتر الذكية المطورة
// ==========================================
const smartTags = [
    { id: 'all', name: 'الكل 🌟', series: [] },
    { id: 'kids', name: 'تأسيس الأطفال 🖍️', series: ['fath-qeraa', 'qalam', 'horof', 'hesab', 'english','hedia','fath','imlaa-series','nahw-series'] },
    { id: 'teachers', name: 'المعلمين 👨‍🏫', series: ['fath-moalem', 'records','summer-course','fath-tajweed','fath','imlaa-series','nahw-series'] },
    { id: 'stories', name: 'قصص وموسوعات 📚', series: ['qasas', 'mawsoat', 'color-learn','activities','hedia'] },
    { id: 'grammar', name: 'قواعد ولغة 📝', series: ['nahw-series', 'imlaa-series','english','fath-tajweed'] }
];

let activeFilter = 'all';

function renderSmartFilters() {
    const container = document.getElementById('smart-filters-container');
    if(!container) return;
    container.innerHTML = smartTags.map(tag => `
        <button onclick="applySmartFilter('${tag.id}')" class="snap-start shrink-0 px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 border-2 ${activeFilter === tag.id ? 'border-brand-dark bg-brand-dark text-white shadow-[0_5px_15px_rgba(28,61,138,0.3)] scale-105' : 'border-gray-100 bg-white text-gray-500 hover:border-brand-light hover:text-brand-light shadow-sm'}">
            ${tag.name}
        </button>
    `).join('');
}

function applySmartFilter(tagId) {
    activeFilter = tagId; renderSmartFilters(); 
    const container = document.getElementById('all-products-grid');
    if(!container) return;

    if(tagId === 'all') { liveSearch(''); return; }

    const selectedTag = smartTags.find(t => t.id === tagId);
    container.className = "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"; container.innerHTML = ''; 
    
    const filtered = productsDB.filter(p => {
        if (!p.seriesId) return false;
        const productSeriesList = p.seriesId.split(',').map(s => s.trim());
        return productSeriesList.some(sId => selectedTag.series.includes(sId));
    });

    if(filtered.length === 0) {
        container.innerHTML = `<div class="col-span-2 md:col-span-4 lg:col-span-5 text-center py-16 text-gray-400 font-bold bg-white rounded-3xl border border-dashed border-gray-200"><i class="fas fa-search text-4xl mb-3 text-gray-300"></i><br>قريباً.. سيتم إضافة إصدارات جديدة لهذا القسم.</div>`;
    } else {
        filtered.forEach(p => container.innerHTML += createBookCard(p));
    }
}

// ==========================================
// 📱 2. برمجة تثبيت التطبيق
// ==========================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    setTimeout(() => {
        const promptEl = document.getElementById('pwa-install-prompt');
        if(promptEl) promptEl.classList.remove('translate-y-[200%]');
    }, 3000); 
});

function hideInstallPrompt() {
    const promptEl = document.getElementById('pwa-install-prompt');
    if(promptEl) promptEl.classList.add('translate-y-[200%]');
}

document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('pwa-install-btn');
    if(installBtn) {
        installBtn.addEventListener('click', async () => {
            hideInstallPrompt();
            if (deferredPrompt) {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
            }
        });
    }
});

// ==========================================
// 🏫 برمجة طلبات المدارس والجملة (B2B)
// ==========================================
function switchCheckoutTab(tab) {
    const tabInd = document.getElementById('tab-individual'); const tabSch = document.getElementById('tab-schools');
    const formInd = document.getElementById('form-individual'); const formSch = document.getElementById('form-schools');

    if (tab === 'schools') {
        tabInd.className = "w-1/2 py-2 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-brand-dark transition";
        tabSch.className = "w-1/2 py-2 text-sm font-black border-b-2 border-brand-dark text-brand-dark transition";
        formInd.classList.add('hidden'); formSch.classList.remove('hidden');
    } else {
        tabSch.className = "w-1/2 py-2 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-brand-dark transition";
        tabInd.className = "w-1/2 py-2 text-sm font-black border-b-2 border-brand-dark text-brand-dark transition";
        formSch.classList.add('hidden'); formInd.classList.remove('hidden');
    }
}

function checkoutSchoolsWhatsApp() {
    const sName = document.getElementById('school-name').value;
    const sSeries = document.getElementById('school-series').value;
    const sNotes = document.getElementById('school-notes').value;

    if (!sName.trim() || !sSeries.trim()) { showToast('الرجاء إدخال اسم المدرسة والكميات المطلوبة ⚠️', 'error'); return; }

    const whatsappNumber = "96899383940"; 
    let message = `*🏢 طلب عرض سعر للمدارس (جملة) 🏢*\n━━━━━━━━━━━━━━━━━\n🏫 *اسم المؤسسة:* ${sName}\n📚 *السلاسل والكميات المبدئية:* ${sSeries}\n`;
    if (sNotes.trim()) message += `💬 *ملاحظات:* ${sNotes}\n`;
    message += `━━━━━━━━━━━━━━━━━\n`;

    if (cart.length > 0) {
        message += `*🛒 الكتب الموجودة في سلة العميل حالياً:*\n\n`;
        cart.forEach((item) => { message += `▪️ *${item.cartTitle}*\n`; });
        message += `━━━━━━━━━━━━━━━━━\n`;
    }
    message += `نحن مهتمون بالتعاون معكم وننتظر تواصلكم لتقديم أفضل تسعيرة 🤍`;

    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#1c3d8a', '#0072bc', '#ff0000', '#ffffff'], zIndex: 9999 });

    setTimeout(() => {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
        cart = []; appliedCoupon = null; saveCartToMemory(); updateCartIcon(); closeCartModal(); refreshAllProductActions();
        document.getElementById('school-name').value = ''; document.getElementById('school-series').value = ''; document.getElementById('school-notes').value = '';
    }, 1200);
}

// ==========================================
// 🔄 برمجة شريط الفتح الرباني المتحرك تلقائياً
// ==========================================
function renderFathRabbaniSlider() {
    const slider = document.getElementById('fath-rabbani-slider');
    if(!slider) return;

    const fathSeriesIds = ['fath-magmoat', 'fath-moalem', 'fath-qeraa', 'fath-tajweed', 'qalam', 'horof', 'baraem'];
    const fathBooks = productsDB.filter(p => {
        if(!p.seriesId) return false;
        const pSeries = p.seriesId.split(',').map(s => s.trim());
        return pSeries.some(sId => fathSeriesIds.includes(sId));
    });

    if(fathBooks.length === 0) {
        slider.innerHTML = '<div class="w-full text-center text-gray-400 font-bold py-10 border border-dashed rounded-3xl">سيتم إضافة الحقائب والكتب قريباً...</div>'; return;
    }

    slider.innerHTML = '';
    fathBooks.forEach(p => { slider.innerHTML += `<div class="w-[160px] md:w-[220px] snap-start shrink-0 flex flex-col h-full">${createBookCard(p)}</div>`; });

    let isHovered = false;
    slider.addEventListener('mouseenter', () => isHovered = true);
    slider.addEventListener('mouseleave', () => isHovered = false);
    slider.addEventListener('touchstart', () => isHovered = true);
    slider.addEventListener('touchend', () => { setTimeout(() => isHovered = false, 1500); });

    setInterval(() => {
        if(isHovered) return; 
        const previousScroll = slider.scrollLeft;
        slider.scrollBy({ left: -230, behavior: 'smooth' }); 
        setTimeout(() => {
            if (Math.abs(slider.scrollLeft - previousScroll) < 5 && slider.scrollLeft !== 0) {
                slider.scrollTo({ left: 0, behavior: 'smooth' });
            }
        }, 800);
    }, 3000); 
}