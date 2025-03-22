// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC03jHJLUTcHnWhkWwwFBtR_L4So9sXWl0",
    authDomain: "kargner-5c462.firebaseapp.com",
    projectId: "kargner-5c462",
    storageBucket: "kargner-5c462.firebasestorage.app",
    messagingSenderId: "742154397087",
    appId: "1:742154397087:web:bc12af179060e59f7fc9aa",
    measurementId: "G-PY5EQK170H"
  };

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser = null; // Текущий пользователь

// Регистрация пользователя
document.getElementById("registration-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const phone = document.getElementById("phone").value;

    const newUser = {
        id: Date.now().toString(),
        firstName,
        lastName,
        phone,
    };

    // Сохраняем пользователя в Firebase
    database.ref(`users/${newUser.id}`).set(newUser);
    currentUser = newUser;

    // Скрываем регистрацию и показываем доску заказов
    document.getElementById("registration-section").style.display = "none";
    showSection("orders-board");
    renderOrdersBoard();
});

// Отображение доски заказов
function renderOrdersBoard() {
    const ordersList = document.getElementById("orders-list");
    ordersList.innerHTML = "";

    database.ref("orders").on("value", (snapshot) => {
        const orders = snapshot.val() || {};
        Object.values(orders).forEach((order) => {
            const orderCard = document.createElement("div");
            orderCard.className = "order-card";
            orderCard.innerHTML = `
                <img src="${order.photo}" alt="Фото заказа">
                <h3>${order.title}</h3>
                <p>Адрес: ${order.address}</p>
                <p>Статус: ${order.status === "active" ? "Активен" : "Завершён"}</p>
            `;
            orderCard.addEventListener("click", () => showOrderDetails(order.id));
            ordersList.appendChild(orderCard);
        });
    });
}

// Детали заказа
function showOrderDetails(orderId) {
    database.ref(`orders/${orderId}`).once("value", (snapshot) => {
        const order = snapshot.val();
        const orderContent = document.getElementById("order-content");
        orderContent.innerHTML = `
            <img src="${order.photo}" alt="Фото заказа" style="width: 100%;">
            <p>Адрес: ${order.address}</p>
            <p>Описание: ${order.description}</p>
            <div id="bids-list"></div>
            <input type="number" id="bid-amount" placeholder="Ваша ставка">
            <button onclick="placeBid('${orderId}')">Сделать ставку</button>
        `;
        renderBids(orderId);
        showSection("order-details");
    });
}

// Ставки
function placeBid(orderId) {
    const amount = parseFloat(document.getElementById("bid-amount").value);
    if (!amount) return alert("Введите сумму ставки!");

    const bid = {
        userId: currentUser.id,
        amount,
        timestamp: Date.now(),
    };

    database.ref(`orders/${orderId}/bids`).push(bid);
}

// Отображение ставок
function renderBids(orderId) {
    const bidsList = document.getElementById("bids-list");
    bidsList.innerHTML = "";

    database.ref(`orders/${orderId}/bids`).on("value", (snapshot) => {
        const bids = snapshot.val() || {};
        Object.values(bids).forEach((bid) => {
            const bidElement = document.createElement("p");
            bidElement.textContent = `Ставка: ${bid.amount} руб.`;
            bidsList.appendChild(bidElement);
        });
    });
}

// Навигация
function showSection(sectionId) {
    document.querySelectorAll(".container > div").forEach((div) => {
        div.style.display = "none";
    });
    document.getElementById(sectionId).style.display = "block";

    if (sectionId === "my-orders") renderMyOrders();
    if (sectionId === "profile") renderProfile();
}

function goBack() {
    showSection("orders-board");
}

// Раздел "Мои заказы"
function renderMyOrders() {
    const myOrdersList = document.getElementById("my-orders-list");
    myOrdersList.innerHTML = "";

    database.ref("orders").on("value", (snapshot) => {
        const orders = snapshot.val() || {};
        Object.values(orders).forEach((order) => {
            if (order.winnerId === currentUser.id) {
                const orderCard = document.createElement("div");
                orderCard.className = "order-card";
                orderCard.innerHTML = `
                    <img src="${order.photo}" alt="Фото заказа">
                    <h3>${order.title}</h3>
                    <p>Адрес: ${order.address}</p>
                    <p>Описание: ${order.description}</p>
                `;
                myOrdersList.appendChild(orderCard);
            }
        });
    });
}

// Раздел "Мой профиль"
function renderProfile() {
    const profileInfo = document.getElementById("profile-info");
    profileInfo.innerHTML = `
        <p>Имя: ${currentUser.firstName}</p>
        <p>Фамилия: ${currentUser.lastName}</p>
        <p>Телефон: ${currentUser.phone}</p>
    `;
}