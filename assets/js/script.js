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
// MODAL DE ITENS (Acréscimos e Sabores Dinâmicos)
// ==========================================
let currentItem = null;

function openAddonModal(name, price) {
    currentItem = { name: name, basePrice: price, currentPrice: price, isDrink: false };
    
    document.querySelectorAll('.addon-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('item-observation').value = '';
    document.getElementById('modal-burger-name').innerText = name;
    
    document.getElementById('addon-section').style.display = 'block';
    document.getElementById('flavor-section').style.display = 'none';

    updateModalPrice();
    document.getElementById('addon-modal').style.display = 'flex';
}

function openDrinkModal(name, defaultPrice, flavorsString = '') {
    currentItem = { name: name, basePrice: defaultPrice, currentPrice: defaultPrice, isDrink: true, selectedFlavorName: '' };
    
    document.querySelectorAll('.addon-checkbox').forEach(cb => cb.checked = false);
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
            
            // Verifica se possui preço específico usando o separador '|'
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
            
            // O primeiro item marcado define o preço inicial do modal
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

// Atualiza o preço da bebida assim que o usuário seleciona uma nova opção na lista
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
        const flavorSection = document.getElementById('flavor-section');
        if (flavorSection.style.display === 'block' && currentItem.selectedFlavorName) {
            // Se tiver sabor selecionado, o nome final no carrinho exibe de onde veio a bebida
            finalName = `${currentItem.name} (${currentItem.selectedFlavorName})`;
        }
    } else {
        document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
            selectedAddons.push({
                name: cb.getAttribute('data-name'),
                price: parseFloat(cb.value)
            });
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
            observation: observation 
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
// CÁLCULO DE FRETE (VIACEP + Nominatim)
// ==========================================
let deliveryFee = 0;
let storeCoords = null; 

async function getCoordinates(cep) {
    const resViaCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dataCep = await resViaCep.json();
    if (dataCep.erro) throw new Error("CEP não encontrado");

    const query = `${dataCep.logradouro}, ${dataCep.localidade}, ${dataCep.uf}, Brazil`;
    const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const dataGeo = await resGeo.json();
    
    if (dataGeo.length === 0) throw new Error("Localização exata não encontrada");
    
    return {
        lat: parseFloat(dataGeo[0].lat),
        lon: parseFloat(dataGeo[0].lon),
        addressName: `${dataCep.logradouro}, ${dataCep.bairro}, ${dataCep.localidade} - ${dataCep.uf}`
    };
}

async function calculateDelivery() {
    let cepInput = document.getElementById('cep').value.replace(/\D/g, '');
    const infoDiv = document.getElementById('frete-info');
    
    if (cepInput.length !== 8) {
        infoDiv.innerText = "Digite um CEP válido com 8 dígitos.";
        return;
    }

    infoDiv.innerText = "Procurando endereço e calculando frete...";
    deliveryFee = 0;

    try {
        if (!storeCoords) {
            storeCoords = await getCoordinates("13484489"); // CEP Garfield Lanches
        }

        const userCoords = await getCoordinates(cepInput);
        
        document.getElementById('address').value = userCoords.addressName;

        const distance = getDistanceFromLatLonInKm(storeCoords.lat, storeCoords.lon, userCoords.lat, userCoords.lon);
        
        // REGRA DE FRETE (RAIO LINHA RETA)
        if (distance <= 1.5) { 
            deliveryFee = 5.00;
        } else if (distance <= 7.5) {
            deliveryFee = 15.00;
        } else {
            deliveryFee = 20.00; 
        }

        infoDiv.innerText = `Frete: R$ ${deliveryFee.toFixed(2).replace('.', ',')} (Aprox. ${distance.toFixed(1)} km)`;
        updateCheckoutTotal();
        
    } catch (error) {
        infoDiv.innerText = "Não foi possível calcular o frete automaticamente. Digite os dados manualmente.";
        document.getElementById('address').readOnly = false; 
        document.getElementById('address').value = "";
        deliveryFee = 0; 
        updateCheckoutTotal();
    }
}

// Fórmula de Haversine
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = deg2rad(lat2-lat1);  
    const dLon = deg2rad(lon2-lon1); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}
function deg2rad(deg) { return deg * (Math.PI/180); }

// ==========================================
// CHECKOUT E WHATSAPP
// ==========================================
function openCheckoutModal() {
    if (cart.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    const itemsContainer = document.getElementById('checkout-items');
    itemsContainer.innerHTML = '';
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        
        let extrasHtml = '';
        if (item.addons && item.addons.length > 0) {
            const addonNames = item.addons.map(a => a.name).join(', ');
            extrasHtml += `<div style="font-size: 0.8rem; color: #666; margin-top: 4px;">+ ${addonNames}</div>`;
        }
        
        if (item.observation) {
            extrasHtml += `<div style="font-size: 0.8rem; color: var(--primary-color); margin-top: 2px;">Obs: ${item.observation}</div>`;
        }

        itemsContainer.innerHTML += `
            <div class="checkout-item-row">
                <div style="flex: 1;">
                    <strong style="color: var(--primary-color);">${item.quantity}x</strong> <span style="font-weight: 700;">${item.name}</span>
                    ${extrasHtml}
                </div>
                <div style="font-weight: 800; margin-left: 10px; margin-right: 15px;">R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
                <button onclick="removeItem(${index})" style="background: #ff4d4d; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">X</button>
            </div>
        `;
    });

    updateCheckoutTotal();
    document.getElementById('checkout-modal').style.display = 'flex';
}

function updateCheckoutTotal() {
    const totalItems = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const grandTotal = totalItems + deliveryFee;
    
    document.getElementById('checkout-subtotal').innerText = totalItems.toFixed(2).replace('.', ',');
    document.getElementById('checkout-final-total').innerText = grandTotal.toFixed(2).replace('.', ',');
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    
    if (cart.length === 0) {
        closeCheckoutModal();
    } else {
        openCheckoutModal();
    }
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function toggleTroco() {
    const payment = document.getElementById('payment').value;
    const trocoContainer = document.getElementById('troco-container');
    if (payment === 'Dinheiro') {
        trocoContainer.style.display = 'block';
    } else {
        trocoContainer.style.display = 'none';
    }
}

function sendToWhatsApp() {
    const cep = document.getElementById('cep').value;
    const address = document.getElementById('address').value;
    const addressNumber = document.getElementById('addressNumber').value;
    const addressComplement = document.getElementById('addressComplement').value;
    
    const payment = document.getElementById('payment').value;
    const troco = document.getElementById('troco').value;

    if (address.trim() === '' || addressNumber.trim() === '') {
        alert("Por favor, calcule o frete pelo CEP e digite o número da sua residência.");
        return;
    }

    let message = `*🍔 NOVO PEDIDO - GARFIELD LANCHES*\n`;
    message += `---------------------------------\n`;

    let totalItems = 0;
    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        totalItems += itemTotal;
        message += `• ${item.quantity}x - ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;
        
        if (item.addons && item.addons.length > 0) {
            const addonNames = item.addons.map(a => a.name).join(', ');
            message += `    + _${addonNames}_\n`;
        }
        if (item.observation) {
            message += `    *Obs:* ${item.observation}\n`;
        }
    });

    const grandTotal = totalItems + deliveryFee;

    message += `---------------------------------\n`;
    message += `*Subtotal:* R$ ${totalItems.toFixed(2).replace('.', ',')}\n`;
    if (deliveryFee > 0) {
        message += `*Frete:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
    } else {
        message += `*Frete:* A combinar com o atendente\n`;
    }
    message += `💰 *TOTAL DO PEDIDO: R$ ${grandTotal.toFixed(2).replace('.', ',')}*\n\n`;
    
    message += `*Forma de pagamento:* ${payment}\n`;
    if (payment === 'Dinheiro' && troco.trim() !== '') {
        message += `*Troco para:* R$ ${troco}\n`;
    }
    
    message += `\n*Endereço de entrega:*\n`;
    if (cep) message += `CEP: ${cep}\n`;
    message += `${address}, Nº: ${addressNumber}\n`;
    if (addressComplement) message += `Comp: ${addressComplement}\n`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');

    cart = [];
    saveCart();
    updateCartUI();
    closeCheckoutModal();
}