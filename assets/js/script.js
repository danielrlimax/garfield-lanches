const whatsappNumber = "5519995219372"; 
let cart = [];
const CART_EXPIRATION_MS = 60 * 60 * 1000; 

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
// MODAL DE ITENS
// ==========================================
let currentItem = null;

function openAddonModal(name, price, category = 'normal') {
    currentItem = { name: name, basePrice: price, currentPrice: price, isDrink: false, category: category };
    
    document.getElementById('item-observation').value = '';
    document.getElementById('modal-burger-name').innerText = name;
    document.getElementById('addon-section').style.display = 'block';
    document.getElementById('flavor-section').style.display = 'none';

    const addons = category === 'gigantes' ? [
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

function openDrinkModal(name, defaultPrice, flavorsString = '') {
    currentItem = { name: name, basePrice: defaultPrice, currentPrice: defaultPrice, isDrink: true, selectedFlavorName: '' };
    document.getElementById('item-observation').value = '';
    document.getElementById('modal-burger-name').innerText = name;
    document.getElementById('addon-section').style.display = 'none';
    
    const flavorSection = document.getElementById('flavor-section');
    const flavorList = document.getElementById('flavor-list');
    flavorList.innerHTML = '';
    
    if (flavorsString) {
        flavorSection.style.display = 'block';
        const flavors = flavorsString.split(',');
        flavors.forEach((flavorData, index) => {
            let flavorName = flavorData.trim();
            let flavorPrice = defaultPrice;
            if (flavorName.includes('|')) {
                const parts = flavorName.split('|');
                flavorName = parts[0].trim();
                flavorPrice = parseFloat(parts[1]);
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
            isDrink: currentItem.isDrink // Importante para o cálculo de tempo
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
let estimatedTimeRange = ""; 
let storeCoords = null; 

async function getCoordinates(cep) {
    const resViaCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dataCep = await resViaCep.json();
    if (dataCep.erro) throw new Error("CEP não encontrado");
    const query = `${dataCep.logradouro}, ${dataCep.localidade}, ${dataCep.uf}, Brazil`;
    const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const dataGeo = await resGeo.json();
    if (dataGeo.length === 0) throw new Error("Localização não encontrada");
    return {
        lat: parseFloat(dataGeo[0].lat),
        lon: parseFloat(dataGeo[0].lon),
        addressName: `${dataCep.logradouro}, ${dataCep.bairro}, ${dataCep.localidade}`
    };
}

async function calculateDelivery() {
    let cepInput = document.getElementById('cep').value.replace(/\D/g, '');
    const infoDiv = document.getElementById('frete-info');
    
    if (cepInput.length !== 8) {
        infoDiv.innerText = "Digite um CEP válido.";
        return;
    }

    infoDiv.innerText = "Calculando frete e tempo...";
    try {
        if (!storeCoords) storeCoords = await getCoordinates("13484489"); 
        const userCoords = await getCoordinates(cepInput);
        document.getElementById('address').value = userCoords.addressName;
        const distance = getDistanceFromLatLonInKm(storeCoords.lat, storeCoords.lon, userCoords.lat, userCoords.lon);
        
        // Valor do frete
        if (distance <= 1.5) deliveryFee = 5.00;
        else if (distance <= 7.5) deliveryFee = 15.00;
        else deliveryFee = 20.00;

        // --- CÁLCULO DO TEMPO ---
        // 1 lanche = 15 min. Lanches extras = +5 min cada. (Bebidas ignoradas)
        const totalLanches = cart.filter(item => !item.isDrink).reduce((acc, item) => acc + item.quantity, 0);
        let timePrep = 0;
        if (totalLanches > 0) {
            timePrep = 15 + ((totalLanches - 1) * 5);
        } else {
            timePrep = 10; // Caso seja apenas bebidas
        }

        // +3 minutos por cada km
        const timeTravel = distance * 3;
        const totalEstimated = timePrep + timeTravel;

        // Criar o intervalo (ex: de -5 min até +20 min do total calculado)
        const minTime = Math.max(15, Math.floor(totalEstimated - 5));
        const maxTime = Math.ceil(totalEstimated + 20);
        estimatedTimeRange = `${minTime} à ${maxTime} minutos`;

        infoDiv.innerHTML = `Frete: R$ ${deliveryFee.toFixed(2).replace('.', ',')} (Aprox. ${distance.toFixed(1)} km)<br>
                             <span style="color: #2e7d32; font-weight: bold;">Tempo: ${estimatedTimeRange}</span>`;
        
        updateCheckoutTotal();
    } catch (error) {
        infoDiv.innerText = "Erro ao calcular automaticamente. Insira os dados abaixo.";
        document.getElementById('address').readOnly = false;
        deliveryFee = 0;
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
                <button onclick="removeItem(${index})" style="background:#ff4d4d; color:white; border:none; padding:5px 10px; border-radius:5px; margin-left:10px;">X</button>
            </div>`;
    });
    toggleOrderType();
    document.getElementById('checkout-modal').style.display = 'flex';
}

function toggleOrderType() {
    const orderType = document.getElementById('orderType').value;
    const deliveryFields = document.getElementById('delivery-fields');
    const dineInFields = document.getElementById('dine-in-fields');
    if (orderType === 'entrega') {
        deliveryFields.style.display = 'block'; 
        dineInFields.style.display = 'none';
        if (document.getElementById('cep').value.length >= 8) calculateDelivery();
        else updateCheckoutTotal();
    } else {
        deliveryFields.style.display = 'none'; 
        dineInFields.style.display = 'block';
        deliveryFee = 0; 
        estimatedTimeRange = "15 à 30 minutos"; // Tempo fixo para mesa
        updateCheckoutTotal();
    }
}

function updateCheckoutTotal() {
    const totalItems = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const orderType = document.getElementById('orderType').value;
    const currentFee = orderType === 'entrega' ? deliveryFee : 0;
    document.getElementById('checkout-subtotal').innerText = totalItems.toFixed(2).replace('.', ',');
    document.getElementById('checkout-final-total').innerText = (totalItems + currentFee).toFixed(2).replace('.', ',');
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
    const payment = document.getElementById('payment').value;
    const troco = document.getElementById('troco').value;

    let message = `*🍔 NOVO PEDIDO - GARFIELD LANCHES*\n`;
    message += `*TEMPO ESTIMADO:* ${estimatedTimeRange}\n`; // Adicionado o tempo no topo
    message += `---------------------------------\n`;

    cart.forEach(item => {
        message += `• ${item.quantity}x - ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
        if (item.addons && item.addons.length > 0) message += `  + ${item.addons.map(a => a.name).join(', ')}\n`;
        if (item.observation) message += `  *Obs:* ${item.observation}\n`;
    });

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    message += `---------------------------------\n`;
    message += `*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (orderType === 'entrega') message += `*Frete:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
    message += `*TOTAL: R$ ${(subtotal + (orderType === 'entrega' ? deliveryFee : 0)).toFixed(2).replace('.', ',')}*\n\n`;
    
    message += `*Pagamento:* ${payment}\n`;
    if (payment === 'Dinheiro' && troco) message += `*Troco para:* ${troco}\n`;

    if (orderType === 'entrega') {
        message += `\n*Endereço:* ${document.getElementById('address').value}, Nº ${document.getElementById('addressNumber').value}`;
    } else {
        message += `\n*Mesa:* ${document.getElementById('tableNumber').value}`;
    }

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
}