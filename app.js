// Конфигурация Firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.MainButton.show();
tg.MainButton.setText("Закрыть");
tg.MainButton.onClick(() => tg.close());

let currentUser = null; // Текущий пользователь

// Проверка, является ли пользователь администратором
function isAdmin(userId) {
    return new Promise((resolve) => {
        database.ref(`admins/${userId}`).once("value", (snapshot) => {
            resolve(snapshot.exists());
        });
    });
}

// Получаем данные пользователя из Telegram
const user = tg.initDataUnsafe.user;
if (user) {
    isAdmin(user.id.toString()).then((isAdmin) => {
        currentUser = {
            id: user.id.toString(),
            firstName: user.first_name,
            lastName: user.last_name || "",
            phone: "", // Телефон не передаётся через Telegram Web App
            isAdmin: isAdmin, // Указываем, является ли админом
        };
        document.getElementById("registration-section").style.display = "none";
        showSection("orders-board");
        renderOrdersBoard();
        renderBottomMenu();

        // Показываем кнопку администратора, если пользователь — админ
        if (currentUser.isAdmin) {
            document.getElementById("admin-button").style.display = "block";
        }
    });
}

// Регистрация пользователя
document.getElementById("registration-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const phone = document.getElementById("phone").value;

    const newUser = {
        id: user ? user.id.toString() : Date.now().toString(), // Используем ID из Telegram, если есть
        firstName,
        lastName,
        phone,
        isAdmin: false, // По умолчанию пользователь не админ
    };

    // Сохраняем пользователя в Firebase
    database.ref(`users/${newUser.id}`).set(newUser);
    currentUser = newUser;

    // Скрываем регистрацию и показываем доску заказов
    document.getElementById("registration-section").style.display = "none";
    showSection("orders-board");
    renderOrdersBoard();
    renderBottomMenu();
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

// Завершение аукциона через 1 час
function startAuctionTimer(orderId) {
    setTimeout(() => {
        database.ref(`orders/${orderId}`).once("value", (snapshot) => {
            const order = snapshot.val();
            if (!order || order.status !== "active") return;

            if (order.bids && Object.keys(order.bids).length > 0) {
                // Находим минимальную ставку
                const winningBid = Object.values(order.bids).reduce((min, bid) => (bid.amount < min.amount ? bid : min));
                database.ref(`orders/${orderId}/winnerId`).set(winningBid.userId);

                // Уведомляем победителя
                notifyWinner(winningBid.userId, order);
            }

            database.ref(`orders/${orderId}/status`).set("completed");
        });
    }, 3600000); // 1 час = 3600000 мс
}

// Уведомление победителя
function notifyWinner(userId, order) {
    const message = `🎉 Поздравляем! Вы выиграли заказ "${order.title}".`;
    sendNotification(userId, message);

    // Всплывающее уведомление в интерфейсе
    if (currentUser && currentUser.id === userId) {
        alert(message);
    }
}

// Отправка уведомления через Telegram Bot API
function sendNotification(userId, message) {
    const botToken = "ВАШ_BOT_TOKEN";
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: userId,
            text: message,
        }),
    });
}

// Назначение администратора
function assignAdmin() {
    const adminId = document.getElementById("admin-id").value;
    if (!adminId) return alert("Введите Telegram ID!");

    // Добавляем ID в список администраторов
    database.ref(`admins/${adminId}`).set(true)
        .then(() => {
            alert("Администратор назначен!");
        })
        .catch((error) => {
            console.error("Ошибка:", error);
            alert("Произошла ошибка при назначении администратора.");
        });
}

// Навигация
function showSection(sectionId) {
    if (!currentUser && sectionId !== "registration-section") {
        alert("Пожалуйста, зарегистрируйтесь!");
        return;
    }

    document.querySelectorAll(".container > div").forEach((div) => {
        div.style.display = "none";
    });
    document.getElementById(sectionId).style.display = "block";

    if (sectionId === "my-orders") renderMyOrders();
    if (sectionId === "profile") renderProfile();
    if (sectionId === "admin") renderAdminPanel();
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

// Кабинет администратора
function renderAdminPanel() {
    const adminPanel = document.getElementById("admin");
    adminPanel.innerHTML = `
        <h2>Кабинет администратора</h2>
        <form id="create-order-form">
            <input type="text" id="order-title" placeholder="Название заказа" required>
            <textarea id="order-description" placeholder="Описание заказа" required></textarea>
            <input type="text" id="order-address" placeholder="Адрес" required>
            <input type="file" id="order-photo" accept="image/*" required>
            <button type="submit">Создать заказ</button>
        </form>
        <h3>Назначить администратора</h3>
        <input type="text" id="admin-id" placeholder="Введите Telegram ID">
        <button onclick="assignAdmin()">Назначить</button>
    `;

    document.getElementById("create-order-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("order-title").value;
        const description = document.getElementById("order-description").value;
        const address = document.getElementById("order-address").value;
        const photoFile = document.getElementById("order-photo").files[0];

        if (!photoFile) return alert("Загрузите фотографию!");

        const reader = new FileReader();
        reader.onload = (event) => {
            const photo = event.target.result;

            const newOrder = {
                id: Date.now().toString(),
                title,
                description,
                address,
                photo,
                status: "active",
                bids: {},
                createdAt: Date.now(),
                winnerId: null,
            };

            // Сохраняем заказ в Firebase
            database.ref(`orders/${newOrder.id}`).set(newOrder);

            // Запуск таймера на 1 час
            startAuctionTimer(newOrder.id);

            alert("Заказ успешно создан!");
        };
        reader.readAsDataURL(photoFile);
    });
}

// Рендер нижнего меню
function renderBottomMenu() {
    const bottomMenu = document.querySelector(".bottom-menu");
    bottomMenu.innerHTML = "";

    const sections = [
        { id: "orders-board", icon: "fas fa-home", label: "Заказы" },
        { id: "my-orders", icon: "fas fa-tasks", label: "Мои заказы" },
        { id: "profile", icon: "fas fa-user", label: "Профиль" },
    ];

    sections.forEach((section) => {
        const button = document.createElement("button");
        button.innerHTML = `<i class="${section.icon}"></i><span>${section.label}</span>`;
        button.onclick = () => showSection(section.id);
        bottomMenu.appendChild(button);
    });

    if (currentUser && currentUser.isAdmin) {
        const adminButton = document.createElement("button");
        adminButton.innerHTML = `<i class="fas fa-cog"></i><span>Админ</span>`;
        adminButton.onclick = () => showSection("admin");
        bottomMenu.appendChild(adminButton);
    }
}