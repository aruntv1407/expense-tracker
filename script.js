let transactions = [];
let chart;

// Auto set today's date
document.getElementById("date").valueAsDate = new Date();

function addTransaction() {

    let description = document.getElementById("description").value;
    let amount = parseFloat(document.getElementById("amount").value);
    let type = document.getElementById("type").value;
    let category = document.getElementById("category").value;
    let date = document.getElementById("date").value;

    if(description === "" || isNaN(amount) || date === "") {
        alert("Please enter valid details");
        return;
    }

    transactions.push({
        id: Date.now(),
        description,
        amount,
        type,
        category,
        date
    });

    saveData();
    updateUI();

    document.getElementById("description").value = "";
    document.getElementById("amount").value = "";
}

function updateUI() {

    let list = document.getElementById("transactionList");
    list.innerHTML = "";

    let balance = 0;
    let income = 0;
    let expense = 0;
    let categoryTotals = {};

    transactions.sort((a, b) => b.id - a.id);

    transactions.forEach(t => {

        let li = document.createElement("li");

        li.innerHTML = `
            <div>
                <strong>${t.description}</strong><br>
                <small>${t.category}</small><br>
                <small>${t.date}</small>
            </div>
            <div>
                ${t.type === "income" ? "+" : "-"} ₹${t.amount}
                <br>
                <button onclick="deleteTransaction(${t.id})" class="delete-btn">
                    Delete
                </button>
            </div>
        `;

        list.appendChild(li);

        if(t.type === "income") {
            income += t.amount;
            balance += t.amount;
        } else if(t.type === "expense") {
            expense += t.amount;
            balance -= t.amount;

            categoryTotals[t.category] =
                (categoryTotals[t.category] || 0) + t.amount;
        }
    });

    document.getElementById("balance").textContent = balance;
    document.getElementById("income").textContent = income;
    document.getElementById("expense").textContent = expense;

    updateChart(categoryTotals);
}

function updateChart(categoryTotals) {

    const ctx = document.getElementById("expenseChart").getContext("2d");

    if(chart) chart.destroy();

    if(Object.keys(categoryTotals).length === 0) return;

    chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: [
                    "#ff6384",
                    "#36a2eb",
                    "#ffce56",
                    "#4bc0c0",
                    "#9966ff"
                ]
            }]
        }
    });
}

function deleteTransaction(id) {

    if(!confirm("Delete this transaction?")) return;

    transactions = transactions.filter(t => t.id !== id);

    saveData();
    updateUI();
}

function saveData() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

function loadData() {
    let data = localStorage.getItem("transactions");
    if(data) {
        transactions = JSON.parse(data);
        updateUI();
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
}

loadData();