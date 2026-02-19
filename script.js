let transactions = [];
let chart;

function addTransaction() {

    let description = document.getElementById("description").value;
    let amount = parseFloat(document.getElementById("amount").value);
    let type = document.getElementById("type").value;
    let category = document.getElementById("category").value;
    let date = new Date().toISOString().slice(0,7);

    if(description === "" || isNaN(amount)) {
        alert("Enter valid details");
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
}

function updateUI() {

    let list = document.getElementById("transactionList");
    list.innerHTML = "";

    let balance = 0;
    let income = 0;
    let expense = 0;
    let categoryTotals = {};

    transactions.forEach(t => {

        let li = document.createElement("li");

        li.innerHTML = `
    <div>
        <strong>${t.description}</strong> 
        <br>
        <small>${t.category}</small>
    </div>
    <div>
        ₹${t.amount}
        <br>
        <button onclick="deleteTransaction(${t.id})" class="delete-btn">
            Delete Transaction
        </button>
    </div>
`;

        list.appendChild(li);

        if(t.type === "income") {
            income += t.amount;
            balance += t.amount;
        } else {
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
        },
        options: {
            animation: {
                animateRotate: true,
                duration: 1000
            }
        }
    });
}

function deleteTransaction(id) {
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
    document.body.classList.toggle("light-mode");

    const btn = document.querySelector(".theme-toggle button");
    btn.textContent = document.body.classList.contains("light-mode")
        ? "☀ Light Mode"
        : "🌙 Dark Mode";
}

loadData();