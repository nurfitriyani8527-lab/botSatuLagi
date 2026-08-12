function getJakartaHour() {
    return Number(
        new Date().toLocaleString("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "numeric",
            hour12: false
        })
    );
}

module.exports = { getJakartaHour };