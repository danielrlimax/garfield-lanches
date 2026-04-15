const whatsappNumber = "5519995219372"; 
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnLf_1axOm0heHogz8sYxV7GhVQDMZo99oDht1SzTi8FBKayakJXtMTi0NB6QVMqd2KCghPRNSACwe/pub?gid=0&single=true&output=csv";

let cart = [];
let globalMenuItems = []; 
const CART_EXPIRATION_MS = 60 * 60 * 1000; 

// ==========================================
// PROCURAR DADOS DA PLANILHA (CSV)
// ==========================================
async function loadMenuData() {
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        parseCSVAndRender(csvText);
    } catch (error) {
        console.error("Erro ao carregar cardápio:", error);
        document.getElementById('menu-container').innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar o cardápio. Verifique a sua ligação.</div>`;
    }
}

function parseCSVAndRender(csvText) {
    const arr = [];
    let quote = false;
    let col = 0, row = 0;
    for (let c = 0; c < csvText.length; c++) {
        let cc = csvText[c], nc = csvText[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }

    globalMenuItems = arr.slice(1).map(row => {
        return {
            id: row[0],
            category: row[1] ? row[1].toLowerCase().trim() : '',
            name: row[2],
            description: row[3],
            price: parseFloat(row[4] ? row[4].replace(',', '.') : 0),
            pricePrefix: row[5],
            variations: row[6],
            imageUrl: row[7]
        };
    }).filter(item => item.id && item.name); 

    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = ''; 

    const categoriesOrder = ['hotdogs', 'lanches', 'gigantes', 'bebidas'];
    const categoryTitles = {
        'hotdogs': 'HOT DOGS',
        'lanches': 'LANCHES',
        'gigantes': 'GIGANTES',
        'bebidas': 'BEBIDAS'
    };

    categoriesOrder.forEach(cat => {
        const catItems = globalMenuItems.filter(i => i.category === cat);
        if (catItems.length === 0) return;

        container.innerHTML += `
        <div class="category-divider" data-category="${cat}">
            <div class="divider-content"><h2>${categoryTitles[cat]}</h2><hr></div>
        </div>`;

        catItems.forEach(item => {
            const hasVariations = item.variations && item.variations.trim().length > 0;
            const btnText = hasVariations ? 'Ver Opções' : 'Adicionar';
            
            let priceHtml = '';
            if (item.pricePrefix && item.pricePrefix.trim() !== '') {
                priceHtml += `<span class="price-prefix">${item.pricePrefix}</span>`;
            }
            priceHtml += `R$ ${item.price.toFixed(2).replace('.', ',')}`;

            let imgHtml = '';
            if (item.imageUrl && item.imageUrl.trim() !== '') {
                imgHtml = `<img src="${item.imageUrl}" alt="${item.name}" class="item-image">`;
            }

            const descriptionHtml = item.description && item.description.trim() !== '' ? `<p>${item.description}</p>` : '';

            container.innerHTML += `
            <div class="menu-item ${hasVariations ? 'single-price' : ''}" data-category="${cat}">
                ${imgHtml}
                <div class="item-details">
                    <h3>${item.name}</h3>
                    ${descriptionHtml}
                    <div class="price-actions">
                        <span class="price">${priceHtml}</span>
                        <button class="btn-add" onclick="openItemModal('${item.id}')">${btnText}</button>
                    </div>
                </div>
            </div>`;
        });
    });

    const activeCategoryBtn = document.querySelector('.cat-btn.active');
    if(activeCategoryBtn) {
        const match = activeCategoryBtn.getAttribute('onclick').match(/'([^']+)'/);
        if(match) filterMenu(match[1]);
    }
}

loadMenuData();


// ==========================================
// CARRINHO E NAVEGAÇÃO
// ==========================================
function saveCart() {
    const cartData = { items: cart, timestamp: new Date().getTime() };
    localStorage.setItem('garfieldLanchesCart', JSON.stringify(cartData));
}

function loadCart() {
    const savedCartData = localStorage.getItem('garfieldLanchesCart');
    if (savedCartData) {
        const parsedData = JSON.parse(savedCartData);
        const currentTime = new Date().getTime();
        if (currentTime - parsedData.timestamp < CART_EXPIRATION_MS) {
            cart = parsedData.items;
            updateCartUI();
        } else {
            localStorage.removeItem('garfieldLanchesCart');
        }
    }
}
loadCart();

function filterMenu(category) {
    const buttons = document.querySelectorAll('.cat-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(`'${category}'`)) {
            btn.classList.add('active');
        }
    });

    const items = document.querySelectorAll('.menu-item');
    items.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (category === 'todos' || itemCategory === category) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    const dividers = document.querySelectorAll('.category-divider');
    dividers.forEach(div => {
        const divCategory = div.getAttribute('data-category');
        if (category === 'todos' || divCategory === category) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    });
}

// ==========================================
// MODAL DE ITENS DINÂMICOS
// ==========================================
let currentItem = null;

function openItemModal(itemId) {
    const item = globalMenuItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.category === 'bebidas') {
        openDrinkModal(item);
    } else {
        openAddonModal(item);
    }
}

function openAddonModal(item) {
    currentItem = { name: item.name, basePrice: item.price, currentPrice: item.price, isDrink: false, category: item.category };
    
    document.getElementById('item-observation').value = '';
    document.getElementById('modal-burger-name').innerText = item.name;
    document.getElementById('addon-section').style.display = 'block';
    document.getElementById('flavor-section').style.display = 'none';

    const addons = item.category === 'gigantes' ? [
        { name: 'Catupiry', price: 12.00 },
        { name: 'Cheddar', price: 14.00 },
        { name: 'Cream Cheese', price: 14.00 },
        { name: 'Purê', price: 12.00 }
    ] : [
        { name: 'Catupiry', price: 6.00 },
        { name: 'Cheddar', price: 7.00 },
        { name: 'Cream Cheese', price: 7.00 },
        { name: 'Purê', price: 6.00 }
    ];

    const addonContainer = document.getElementById('addon-list-container');
    addonContainer.innerHTML = '';
    addons.forEach(addon => {
        addonContainer.innerHTML += `
            <label class="addon-item">
                <input type="checkbox" class="addon-checkbox" value="${addon.price}" data-name="${addon.name}" onchange="updateModalPrice()"> 
                <div class="addon-details">
                    <span class="addon-name">${addon.name}</span>
                    <span class="addon-price">+ R$ ${addon.price.toFixed(2).replace('.', ',')}</span>
                </div>
            </label>
        `;
    });

    updateModalPrice();
    document.getElementById('addon-modal').style.display = 'flex';
}

function openDrinkModal(item) {
    currentItem = { name: item.name, basePrice: item.price, currentPrice: item.price, isDrink: true, selectedFlavorName: '' };
    document.getElementById('item-observation').value = '';
    document.getElementById('modal-burger-name').innerText = item.name;
    document.getElementById('addon-section').style.display = 'none';
    
    const flavorSection = document.getElementById('flavor-section');
    const flavorList = document.getElementById('flavor-list');
    flavorList.innerHTML = '';
    
    if (item.variations && item.variations.trim() !== '') {
        flavorSection.style.display = 'block';
        const flavors = item.variations.split(',');
        flavors.forEach((flavorData, index) => {
            let flavorName = flavorData.trim();
            let flavorPrice = item.price; 
            if (flavorName.includes('|')) {
                const parts = flavorName.split('|');
                flavorName = parts[0].trim();
                flavorPrice = parseFloat(parts[1].trim());
            }
            flavorList.innerHTML += `
                <label class="addon-item" style="cursor: pointer;">
                    <input type="radio" name="drink-flavor" value="${flavorName}" data-price="${flavorPrice}" class="flavor-radio" ${index === 0 ? 'checked' : ''} onchange="updateDrinkPrice(this)">
                    <div class="addon-details">
                        <span class="addon-name">${flavorName}</span>
                        <span class="addon-price">R$ ${flavorPrice.toFixed(2).replace('.', ',')}</span>
                    </div>
                </label>
            `;
            if (index === 0) {
                currentItem.basePrice = flavorPrice;
                currentItem.currentPrice = flavorPrice;
                currentItem.selectedFlavorName = flavorName;
            }
        });
    } else {
        flavorSection.style.display = 'none';
    }
    updateModalPrice();
    document.getElementById('addon-modal').style.display = 'flex';
}

function updateDrinkPrice(radioElement) {
    currentItem.basePrice = parseFloat(radioElement.getAttribute('data-price'));
    currentItem.selectedFlavorName = radioElement.value;
    updateModalPrice();
}

function closeAddonModal() {
    document.getElementById('addon-modal').style.display = 'none';
    currentItem = null;
}

function updateModalPrice() {
    let total = currentItem.basePrice;
    document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
        total += parseFloat(cb.value);
    });
    currentItem.currentPrice = total;
    document.getElementById('modal-total-price').innerText = total.toFixed(2).replace('.', ',');
}

function confirmItemWithAddons() {
    let selectedAddons = [];
    let finalName = currentItem.name;

    if (currentItem.isDrink) {
        if (currentItem.selectedFlavorName) finalName = `${currentItem.name} (${currentItem.selectedFlavorName})`;
    } else {
        document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
            selectedAddons.push({ name: cb.getAttribute('data-name'), price: parseFloat(cb.value) });
        });
    }

    const observation = document.getElementById('item-observation').value.trim();
    const addonsString = selectedAddons.map(a => a.name).sort().join('|');
    const itemKey = `${finalName}-${addonsString}-${observation}`;
    const existingItem = cart.find(item => item.key === itemKey);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ 
            key: itemKey, 
            name: finalName, 
            price: currentItem.currentPrice, 
            quantity: 1, 
            addons: selectedAddons,
            observation: observation,
            isDrink: currentItem.isDrink 
        });
    }
    
    saveCart(); 
    updateCartUI();
    closeAddonModal();
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    document.getElementById('cart-count').innerText = totalItems;
    document.getElementById('cart-total').innerText = totalPrice.toFixed(2).replace('.', ',');
}

// ==========================================
// CÁLCULO DE FRETE E TEMPO ESTIMADO
// ==========================================
let deliveryFee = 0;
let consultFee = false; 
let estimatedTimeRange = ""; 
let storeCoords = null; 

async function getCoordinates(cep) {
    const resViaCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dataCep = await resViaCep.json();
    if (dataCep.erro) throw new Error("CEP não encontrado");
    
    // TENTATIVA 1: Busca pela Rua, Cidade, Estado
    let query = `${dataCep.logradouro}, ${dataCep.localidade}, ${dataCep.uf}`;
    let resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    let dataGeo = await resGeo.json();
    
    // TENTATIVA 2: Busca por Bairro, Cidade, Estado (Fallback para CEPs como 13484-500)
    if (dataGeo.length === 0) {
        query = `${dataCep.bairro}, ${dataCep.localidade}, ${dataCep.uf}`;
        resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        dataGeo = await resGeo.json();
    }
    
    if (dataGeo.length === 0) throw new Error("Localização não encontrada");
    
    let addressFormat = dataCep.logradouro ? `${dataCep.logradouro}, ` : '';
    addressFormat += dataCep.bairro ? `${dataCep.bairro}, ` : '';
    addressFormat += dataCep.localidade ? dataCep.localidade : '';

    return {
        lat: parseFloat(dataGeo[0].lat),
        lon: parseFloat(dataGeo[0].lon),
        addressName: addressFormat
    };
}

async function calculateDelivery() {
    let cepInput = document.getElementById('cep').value.replace(/\D/g, '');
    const infoDiv = document.getElementById('frete-info');
    const addressGroup = document.getElementById('address-details-group');
    
    if (cepInput.length !== 8) {
        infoDiv.innerText = "Digite um CEP válido para calcular.";
        addressGroup.style.display = 'none'; 
        return;
    }

    infoDiv.innerText = "A calcular o frete e o tempo...";
    try {
        if (!storeCoords) storeCoords = await getCoordinates("13484489"); 
        const userCoords = await getCoordinates(cepInput);
        document.getElementById('address').value = userCoords.addressName;
        const distance = getDistanceFromLatLonInKm(storeCoords.lat, storeCoords.lon, userCoords.lat, userCoords.lon);
        
        consultFee = false;
        
        if (distance <= 0.5) deliveryFee = 6.00;
        else if (distance <= 1.0) deliveryFee = 7.00;
        else if (distance <= 1.5) deliveryFee = 8.00;
        else if (distance <= 2.0) deliveryFee = 9.00;
        else if (distance <= 2.5) deliveryFee = 10.00;
        else if (distance <= 3.0) deliveryFee = 11.00;
        else if (distance <= 3.5) deliveryFee = 12.00;
        else if (distance <= 4.0) deliveryFee = 13.00;
        else if (distance <= 4.5) deliveryFee = 14.00;
        else if (distance <= 5.0) deliveryFee = 15.00;
        else if (distance <= 5.5) deliveryFee = 16.00;
        else if (distance <= 6.0) deliveryFee = 17.00;
        else if (distance <= 6.5) deliveryFee = 18.00;
        else if (distance <= 7.0) deliveryFee = 19.00;
        else if (distance <= 7.5) deliveryFee = 20.00;
        else if (distance <= 8.0) deliveryFee = 21.00;
        else if (distance > 8.0) {
            deliveryFee = 0;
            consultFee = true;
        }

        const totalLanches = cart.filter(item => !item.isDrink).reduce((acc, item) => acc + item.quantity, 0);
        let timePrep = totalLanches > 0 ? 15 + ((totalLanches - 1) * 5) : 10;
        const timeTravel = distance * 3;
        const totalEstimated = timePrep + timeTravel;

        estimatedTimeRange = `${Math.max(15, Math.floor(totalEstimated - 5))} a ${Math.ceil(totalEstimated + 20)} minutos`;

        if (consultFee) {
            infoDiv.innerHTML = `Frete: <span style="color: #d32f2f; font-weight: bold;">Consulte taxa de entrega</span> (Aprox. ${distance.toFixed(1)} km)<br>
                                 <span style="color: #2e7d32; font-weight: bold;">Tempo: ${estimatedTimeRange}</span>`;
        } else {
            infoDiv.innerHTML = `Frete: R$ ${deliveryFee.toFixed(2).replace('.', ',')} (Aprox. ${distance.toFixed(1)} km)<br>
                                 <span style="color: #2e7d32; font-weight: bold;">Tempo: ${estimatedTimeRange}</span>`;
        }
        
        addressGroup.style.display = 'block'; 
        updateCheckoutTotal();
    } catch (error) {
        infoDiv.innerText = "CEP não localizado. Insira a morada abaixo.";
        document.getElementById('address').readOnly = false;
        document.getElementById('address').value = '';
        addressGroup.style.display = 'block'; 
        deliveryFee = 0;
        consultFee = true; 
        estimatedTimeRange = "A combinar";
        updateCheckoutTotal();
    }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2-lat1) * (Math.PI/180);
    const dLon = (lon2-lon1) * (Math.PI/180); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
}

// ==========================================
// CHECKOUT E WHATSAPP
// ==========================================
function openCheckoutModal() {
    if (cart.length === 0) { alert("Carrinho vazio!"); return; }
    const itemsContainer = document.getElementById('checkout-items');
    itemsContainer.innerHTML = '';
    cart.forEach((item, index) => {
        itemsContainer.innerHTML += `
            <div class="checkout-item-row">
                <div style="flex: 1;"><strong>${item.quantity}x</strong> ${item.name}</div>
                <div style="font-weight: 800;">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</div>
                <button onclick="removeItem(${index})">X</button>
            </div>`;
    });
    toggleOrderType();
    document.getElementById('checkout-modal').style.display = 'flex';
}

function toggleOrderType() {
    const orderType = document.getElementById('orderType').value;
    const deliveryFields = document.getElementById('delivery-fields');
    const dineInFields = document.getElementById('dine-in-fields');
    const addressGroup = document.getElementById('address-details-group');
    const paymentSection = document.getElementById('payment-section'); // Puxando a secção de pagamento (se tiver adicionado a div no HTML)
    
    if (orderType === 'entrega') {
        deliveryFields.style.display = 'block'; 
        dineInFields.style.display = 'none';
        if(paymentSection) paymentSection.style.display = 'block'; // Mostra pagamento na entrega
        
        if (document.getElementById('cep').value.length >= 8) {
            calculateDelivery();
        } else {
            addressGroup.style.display = 'none'; 
            updateCheckoutTotal();
        }
    } else {
        deliveryFields.style.display = 'none'; 
        dineInFields.style.display = 'block';
        if(paymentSection) paymentSection.style.display = 'none'; // Esconde pagamento na mesa
        
        deliveryFee = 0; 
        consultFee = false; 
        estimatedTimeRange = "15 a 50 minutos"; 
        updateCheckoutTotal();
    }
}

function updateCheckoutTotal() {
    const totalItems = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const orderType = document.getElementById('orderType').value;
    const currentFee = orderType === 'entrega' ? deliveryFee : 0;
    
    document.getElementById('checkout-subtotal').innerText = totalItems.toFixed(2).replace('.', ',');
    
    if (orderType === 'entrega' && consultFee) {
        document.getElementById('checkout-final-total').innerText = totalItems.toFixed(2).replace('.', ',') + " + Frete";
    } else {
        document.getElementById('checkout-final-total').innerText = (totalItems + currentFee).toFixed(2).replace('.', ',');
    }
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    if (cart.length === 0) closeCheckoutModal(); else openCheckoutModal();
}

function closeCheckoutModal() { document.getElementById('checkout-modal').style.display = 'none'; }

function toggleTroco() {
    document.getElementById('troco-container').style.display = document.getElementById('payment').value === 'Dinheiro' ? 'block' : 'none';
}

function sendToWhatsApp() {
    const orderType = document.getElementById('orderType').value;
    const paymentElement = document.getElementById('payment');
    const payment = paymentElement ? paymentElement.value : '';
    const troco = document.getElementById('troco') ? document.getElementById('troco').value : '';

    // ==========================================
    // BLOQUEIO SE NÃO PREENCHER O ENDEREÇO/MESA
    // ==========================================
    if (orderType === 'entrega') {
        const cep = document.getElementById('cep').value;
        const address = document.getElementById('address').value;
        const addressNumber = document.getElementById('addressNumber').value;
        
        if (!cep || !address || !addressNumber) {
            alert("Por favor, preencha o CEP, a morada (Rua) e o Número para poder entregar.");
            return; // Bloqueia e não envia
        }
    } else {
        const tableNumber = document.getElementById('tableNumber').value;
        if (!tableNumber) {
            alert("Por favor, informe o número da mesa.");
            return; // Bloqueia e não envia
        }
    }

    let message = `*NOVO PEDIDO - GARFIELD LANCHES*\n`;
    message += `TEMPO ESTIMADO: ${estimatedTimeRange}\n`; 
    message += `---------------------------------\n`;

    cart.forEach(item => {
        message += `- ${item.quantity}x - ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
        
        if (item.addons && item.addons.length > 0) {
            item.addons.forEach(addon => {
                message += `+ ${addon.name}\n`;
            });
        }
        
        if (item.observation) message += `*Obs: ${item.observation}\n`;
        message += `\n`; 
    });

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    message += `---------------------------------\n`;
    message += `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    
    if (orderType === 'entrega') {
        if (consultFee) {
            message += `Frete: Consulte taxa de entrega\n`;
            message += `TOTAL (Sem frete): R$ ${subtotal.toFixed(2).replace('.', ',')}\n\n`;
        } else {
            message += `Frete: R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
            message += `TOTAL: R$ ${(subtotal + deliveryFee).toFixed(2).replace('.', ',')}\n\n`;
        }
        
        // Forma de pagamento aparece APENAS no Delivery
        if (payment) {
            message += `Pagamento: ${payment}\n`;
            if (payment === 'Dinheiro' && troco) message += `Troco para: ${troco}\n`;
        }

        message += `\nMorada: ${document.getElementById('address').value}, N ${document.getElementById('addressNumber').value}`;
        if (document.getElementById('addressComplement').value) {
            message += ` (${document.getElementById('addressComplement').value})`;
        }
    } else {
        message += `TOTAL: R$ ${subtotal.toFixed(2).replace('.', ',')}\n\n`;
        message += `\n*Mesa:* ${document.getElementById('tableNumber').value}`;
    }

    message = message.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
    message = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
}