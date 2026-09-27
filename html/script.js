const isBrowserPreview = typeof GetParentResourceName !== "function";

window.addEventListener("message", function (event) {
    const data = event.data;
    if (data.action === "VehicleList") {
        const garageLabel = data.garageLabel;
        const vehicles = data.vehicles;
        populateVehicleList(garageLabel, vehicles);
        displayUI();
    }
});

if (isBrowserPreview) {
    const previewVehicles = [
        {
            vehicle: "sultan",
            vehicleLabel: "Karin Sultan",
            plate: "PREVIEW1",
            state: 1,
            fuel: 82,
            engine: 910,
            body: 760,
            distance: 1240,
            garage: "Legion Square",
            type: "public",
            index: "legion",
            depotPrice: 0,
            balance: 0,
        },
        {
            vehicle: "blista",
            vehicleLabel: "Dinka Blista",
            plate: "PREVIEW2",
            state: 1,
            fuel: 45,
            engine: 620,
            body: 480,
            distance: 3875,
            garage: "Legion Square",
            type: "public",
            index: "legion",
            depotPrice: 0,
            balance: 1250,
        },
        {
            vehicle: "buffalo",
            vehicleLabel: "Bravado Buffalo",
            plate: "PREVIEW3",
            state: 0,
            fuel: 68,
            engine: 840,
            body: 930,
            distance: 520,
            garage: "Legion Square",
            type: "public",
            index: "legion",
            depotPrice: 500,
            balance: 0,
        },
    ];

    document.body.classList.add("browser-preview");
    populateVehicleList("Legion Square", previewVehicles);
    displayUI();
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeGarageMenu();
    }
});

function closeGarageMenu() {
    const container = document.querySelector(".container");
    container.style.display = "none";

    postNui("closeGarage", {})
        .then((data) => {
            if (data === "ok") {
                return;
            } else {
                console.error("Failed to close Garage UI");
            }
        });
}

function postNui(endpoint, payload) {
    if (isBrowserPreview) {
        return Promise.resolve("ok");
    }

    return fetch(`https://qb-garages/${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(payload),
    }).then((response) => response.json());
}

function displayUI() {
    const container = document.querySelector(".container");
    container.style.display = "block";
}

function populateVehicleList(garageLabel, vehicles) {
    const vehicleContainerElem = document.querySelector(".vehicle-table");
    const fragment = document.createDocumentFragment();

    while (vehicleContainerElem.firstChild) {
        vehicleContainerElem.removeChild(vehicleContainerElem.firstChild);
    }

    const garageHeader = document.getElementById("garage-header");
    garageHeader.textContent = garageLabel;

    vehicles.forEach((v) => {
        const vehicleItem = document.createElement("div");
        vehicleItem.classList.add("vehicle-item");

        // Vehicle Info: Name, Plate & Mileage
        const vehicleInfo = document.createElement("div");
        vehicleInfo.classList.add("vehicle-info");

        const vehicleName = document.createElement("span");
        vehicleName.classList.add("vehicle-name");
        vehicleName.textContent = v.vehicleLabel;
        vehicleInfo.appendChild(vehicleName);

        const plate = document.createElement("span");
        plate.classList.add("plate");
        plate.textContent = v.plate;
        vehicleInfo.appendChild(plate);

        const mileage = document.createElement("span");
        mileage.classList.add("mileage");
        mileage.textContent = `${v.distance}mi`;
        vehicleInfo.appendChild(mileage);

        vehicleItem.appendChild(vehicleInfo);

        // Finance Info
        const financeDriveContainer = document.createElement("div");
        financeDriveContainer.classList.add("finance-drive-container");
        const financeInfo = document.createElement("div");
        financeInfo.classList.add("finance-info");

        if (v.balance && v.balance > 0) {
            financeInfo.textContent = "Balance: $" + v.balance.toFixed(0);
        } else {
            financeInfo.textContent = "Paid Off";
        }

        financeDriveContainer.appendChild(financeInfo);

        // Drive Button
        let status;
        let isDepotPrice = false;

        if (v.state === 0) {
            if (v.depotPrice && v.depotPrice > 0) {
                isDepotPrice = true;

                if (v.type === "public") {
                    status = "Depot";
                } else if (v.type === "depot") {
                    status = "$" + v.depotPrice.toFixed(0);
                } else {
                    status = "Out";
                }
            } else {
                status = "Out";
            }
        } else if (v.state === 1) {
            if (v.depotPrice && v.depotPrice > 0) {
                isDepotPrice = true;

                if (v.type === "depot") {
                    status = "$" + v.depotPrice.toFixed(0);
                } else if (v.type === "public") {
                    status = "Depot";
                } else {
                    status = "Drive";
                }
            } else {
                status = "Drive";
            }
        } else if (v.state === 2) {
            status = "Impound";
        }

        const driveButton = document.createElement("button");
        driveButton.classList.add("drive-btn");
        driveButton.textContent = status;

        if (status === "Depot" || status === "Impound") {
            driveButton.style.backgroundColor = "#222";
            driveButton.disabled = true;
        }

        if (status === "Out") {
            driveButton.style.backgroundColor = "#222";
        }

        driveButton.onclick = function () {
            if (driveButton.disabled) return;

            const vehicleStats = {
                fuel: v.fuel,
                engine: v.engine,
                body: v.body,
            };

            const vehicleData = {
                vehicle: v.vehicle,
                garage: v.garage,
                index: v.index,
                plate: v.plate,
                type: v.type,
                depotPrice: v.depotPrice,
                stats: vehicleStats,
            };

            if (status === "Out") {
                postNui("trackVehicle", v.plate)
                    .then((data) => {
                        if (data === "ok") {
                            closeGarageMenu();
                        } else {
                            return;
                        }
                    });
            } else if (isDepotPrice) {
                postNui("takeOutDepo", vehicleData)
                    .then((data) => {
                        if (data === "ok") {
                            closeGarageMenu();
                        } else {
                            console.error("Failed to pay depot price.");
                        }
                    });
            } else {
                postNui("takeOutVehicle", vehicleData)
                    .then((data) => {
                        if (data === "ok") {
                            closeGarageMenu();
                        } else {
                            console.error("Failed to close Garage UI.");
                        }
                    });
            }
        };

        financeDriveContainer.appendChild(driveButton);
        vehicleItem.appendChild(financeDriveContainer);

        // Progress Bars: Fuel, Engine, Body
        const stats = document.createElement("div");
        stats.classList.add("stats");

        const maxValues = {
            fuel: 100,
            engine: 1000,
            body: 1000,
        };

        ["fuel", "engine", "body"].forEach((statLabel) => {
            const stat = document.createElement("div");
            stat.classList.add("stat");
            const label = document.createElement("div");
            label.classList.add("label");
            label.textContent = statLabel.charAt(0).toUpperCase() + statLabel.slice(1);
            stat.appendChild(label);
            const progressBar = document.createElement("div");
            progressBar.classList.add("progress-bar");
            const progress = document.createElement("span");
            const progressText = document.createElement("span");
            progressText.classList.add("progress-text");
            const percentage = (v[statLabel] / maxValues[statLabel]) * 100;
            progress.style.width = percentage + "%";
            progressText.textContent = Math.round(percentage) + "%";

            if (percentage >= 75) {
                progress.classList.add("bar-green");
                if (percentage > 45) {
                    progressText.style.color = "var(--md-on-success)";
                }
            } else if (percentage >= 50) {
                progress.classList.add("bar-yellow");
                if (percentage > 45) {
                    progressText.style.color = "var(--md-on-warning)";
                }
            } else {
                progress.classList.add("bar-red");
                // Keep default text color for low percentages
            }

            progressBar.appendChild(progressText);
            progressBar.appendChild(progress);
            stat.appendChild(progressBar);
            stats.appendChild(stat);
            vehicleItem.appendChild(stats);
        });

        fragment.appendChild(vehicleItem);
    });

    vehicleContainerElem.appendChild(fragment);
}
