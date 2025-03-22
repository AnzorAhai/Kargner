// Инициализация Supabase
const supabaseUrl = "https://ycsxkmrroywcyvamfvoz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljc3hrbXJyb3l3Y3l2YW1mdm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MjUzMzYsImV4cCI6MjA1ODIwMTMzNn0._XpzVMDhYF3tLjqoC72_2kOZ5baTE3OeOIZyyuonK2s";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.MainButton.show();
tg.MainButton.setText("Закрыть");
tg.MainButton.onClick(() => tg.close());

let currentUser = null; // Текущий пользователь

// Проверка, является ли пользователь администратором
async function isAdmin(userId) {
    const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("id", userId)
        .single();
    return !!data;
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
document.getElementById("registration-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const phone = document.getElementById("phone").value;

    const newUser = {
        id: user ? user.id.toString() : Date.now().toString(), // Используем ID из Telegram, если есть
        first_name: firstName,
        last_name: lastName,
        phone,
        is_admin: false, // По умолчанию пользователь не админ
    };

    // Сохраняем пользователя в Supabase
    const { data, error } = await supabase
        .from("users")
        .insert([newUser]);

    if (error) {
        console.error("Ошибка при регистрации:", error);
        alert("Произошла ошибка при регистрации.");
        return;
    }

    currentUser = newUser;

    // Скрываем регистрацию и показываем доску заказов
    document.getElementById("registration-section").style.display = "none";
    showSection("orders-board");
    renderOrdersBoard();
    renderBottomMenu();
});

// Отображение доски заказов
async function renderOrdersBoard() {
    const ordersList = document.getElementById("orders-list");
    ordersList.innerHTML = "";

    const { data: orders, error } = await supabase
        .from("orders")
        .select("*");

    if (error) {
        console.error("Ошибка при загрузке заказов:", error);
        return;
    }

    orders.forEach((order) => {
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
}

// Детали заказа
async function showOrderDetails(orderId) {
    const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (error) {
        console.error("Ошибка при загрузке заказа:", error);
        return;
    }

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
}

// Ставки
async function placeBid(orderId) {
    const amount = parseFloat(document.getElementById("bid-amount").value);
    if (!amount) return alert("Введите сумму ставки!");

    const bid = {
        order_id: orderId,
        user_id: currentUser.id,
        amount,
        timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("bids")
        .insert([bid]);

    if (error) {
        console.error("Ошибка при создании ставки:", error);
        alert("Произошла ошибка при создании ставки.");
        return;
    }

    renderBids(orderId);
}

// Отображение ставок
async function renderBids(orderId) {
    const bidsList = document.getElementById("bids-list");
    bidsList.innerHTML = "";

    const { data: bids, error } = await supabase
        .from("bids")
        .select("*")
        .eq("order_id", orderId);

    if (error) {
        console.error("Ошибка при загрузке ставок:", error);
        return;
    }

    bids.forEach((bid) => {
        const bidElement = document.createElement("p");
        bidElement.textContent = `Ставка: ${bid.amount} руб.`;
        bidsList.appendChild(bidElement);
    });
}

// Завершение аукциона через 1 час
function startAuctionTimer(orderId) {
    setTimeout(async () => {
        const { data: order, error } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();

        if (error || !order || order.status !== "active") return;

        const { data: bids, error: bidsError } = await supabase
            .from("bids")
            .select("*")
            .eq("order_id", orderId);

        if (bidsError || !bids.length) return;

        // Находим минимальную ставку
        const winningBid = bids.reduce((min, bid) => (bid.amount < min.amount ? bid : min));

        // Обновляем заказ
        await supabase
            .from("orders")
            .update({ winner_id: winningBid.user_id, status: "completed" })
            .eq("id", orderId);

        // Уведомляем победителя
        notifyWinner(winningBid.user_id, order);
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
    const botToken = "8030616864:AAHYDXWyKIXcJ4gb-Y6PpxndYLBZIKtz6_4";
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
async function assignAdmin() {
    const adminId = document.getElementById("admin-id").value;
    if (!adminId) return alert("Введите Telegram ID!");

    // Добавляем ID в список администраторов
    const { data, error } = await supabase
        .from("admins")
        .insert([{ id: adminId }]);

    if (error) {
        console.error("Ошибка при назначении администратора:", error);
        alert("Произошла ошибка при назначении администратора.");
        return;
    }

    alert("Администратор назначен!");
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
async function renderMyOrders() {
    const myOrdersList = document.getElementById("my-orders-list");
    myOrdersList.innerHTML = "";

    const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("winner_id", currentUser.id);

    if (error) {
        console.error("Ошибка при загрузке заказов:", error);
        return;
    }

    orders.forEach((order) => {
        const orderCard = document.createElement("div");
        orderCard.className = "order-card";
        orderCard.innerHTML = `
            <img src="${order.photo}" alt="Фото заказа">
            <h3>${order.title}</h3>
            <p>Адрес: ${order.address}</p>
            <p>Описание: ${order.description}</p>
        `;
        myOrdersList.appendChild(orderCard);
    });
}

// Раздел "Мой профиль"
function renderProfile() {
    const profileInfo = document.getElementById("profile-info");
    profileInfo.innerHTML = `
        <p>Имя: ${currentUser.first_name}</p>
        <p>Фамилия: ${currentUser.last_name}</p>
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

    document.getElementById("create-order-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("order-title").value;
        const description = document.getElementById("order-description").value;
        const address = document.getElementById("order-address").value;
        const photoFile = document.getElementById("order-photo").files[0];

        if (!photoFile) return alert("Загрузите фотографию!");

        const reader = new FileReader();
        reader.onload = async (event) => {
            const photo = event.target.result;

            const newOrder = {
                title,
                description,
                address,
                photo,
                status: "active",
                created_at: new Date().toISOString(),
                winner_id: null,
            };

            // Сохраняем заказ в Supabase
            const { data, error } = await supabase
                .from("orders")
                .insert([newOrder]);

            if (error) {
                console.error("Ошибка при создании заказа:", error);
                alert("Произошла ошибка при создании заказа.");
                return;
            }

            // Запуск таймера на 1 час
            startAuctionTimer(data[0].id);

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

    if (currentUser && currentUser.is_admin) {
        const adminButton = document.createElement("button");
        adminButton.innerHTML = `<i class="fas fa-cog"></i><span>Админ</span>`;
        adminButton.onclick = () => showSection("admin");
        bottomMenu.appendChild(adminButton);
    }
}